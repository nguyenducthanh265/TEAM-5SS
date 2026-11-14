"""Nhóm bằng mã + bảng xếp hạng (WP-08).

Lưu trữ:
- Nếu có biến môi trường DATABASE_URL: dùng Postgres (bền vững qua các lần khởi động lại).
- Nếu không có DATABASE_URL: lưu trong RAM có khóa threading.Lock; dữ liệu MẤT KHI SERVER KHỞI ĐỘNG LẠI (đủ cho demo trong ngày).

Hợp đồng HTTP (khóa camelCase):
- POST /groups/score {code, deviceId, xpDelta, items} -> cộng điểm, trả {code, xp, members, rank, top:[{code, xp}]}.
- GET  /groups/{code} -> {code, xp, members, rank, top:[{code, xp}]}.
Mã nhóm: 3-20 ký tự chữ/số/gạch ngang, chuẩn hóa chữ hoa (sai trả 422).
xpDelta mỗi lần gọi bị chặn tối đa 200; giá trị âm bị từ chối (422).
Id máy chỉ giữ dạng băm ngắn để đếm thành viên duy nhất, không lưu dạng gốc.
"""
from __future__ import annotations

import hashlib
import os
import re
import threading

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

MAX_XP_DELTA = 200
MAX_ITEMS = 100
MAX_GROUPS = 5000   # chặn việc tạo nhóm vô hạn làm đầy RAM
TOP_N = 10
_CODE_RE = re.compile(r"^[A-Z0-9-]{3,20}$")

router = APIRouter()
_lock = threading.Lock()
_groups: dict[str, dict] = {}  # code -> {"xp": int, "items": int, "members": set[str]}
_pg_schema_ready = False


class ScoreReq(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    deviceId: str = Field(min_length=1, max_length=128)
    xpDelta: int = Field(default=0, ge=0)
    items: int = Field(default=0, ge=0)


def normalize_code(code: str) -> str | None:
    """Chuẩn hóa mã nhóm thành chữ hoa hợp lệ, hoặc None."""
    c = code.strip().upper() if isinstance(code, str) else ""
    return c if _CODE_RE.match(c) else None


def _hash_device(device_id: str) -> str:
    return hashlib.sha256(device_id.encode("utf-8")).hexdigest()[:12]


def _database_url() -> str | None:
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        return None
    if raw.startswith("postgres://"):
        return "postgresql://" + raw[len("postgres://"):]
    return raw


def _pg_connect(dsn: str):
    import psycopg
    return psycopg.connect(dsn)


def _ensure_pg_schema(conn) -> None:
    global _pg_schema_ready
    if _pg_schema_ready:
        return
    with _lock:
        if _pg_schema_ready:
            return
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ecohanoi_groups (
                    code TEXT PRIMARY KEY,
                    xp INTEGER NOT NULL DEFAULT 0,
                    items INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS ecohanoi_group_members (
                    code TEXT NOT NULL REFERENCES ecohanoi_groups(code) ON DELETE CASCADE,
                    device_hash TEXT NOT NULL,
                    PRIMARY KEY (code, device_hash)
                );
                """
            )
        conn.commit()
        _pg_schema_ready = True


def _pg_view(conn, code: str) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("SELECT xp FROM ecohanoi_groups WHERE code = %s", (code,))
        row = cur.fetchone()
        if row is None:
            return None
        xp = int(row[0])
        cur.execute("SELECT COUNT(*) FROM ecohanoi_group_members WHERE code = %s", (code,))
        members = int(cur.fetchone()[0])
        cur.execute(
            "SELECT COUNT(*) + 1 FROM ecohanoi_groups WHERE xp > %s OR (xp = %s AND code < %s)",
            (xp, xp, code),
        )
        rank = int(cur.fetchone()[0])
        cur.execute(
            "SELECT code, xp FROM ecohanoi_groups ORDER BY xp DESC, code ASC LIMIT %s",
            (TOP_N,),
        )
        top = [{"code": r[0], "xp": int(r[1])} for r in cur.fetchall()]
    return {"code": code, "xp": xp, "members": members, "rank": rank, "top": top}


def _ram_view(code: str) -> dict:
    """Gọi khi đang giữ _lock."""
    ranked = sorted(_groups.items(), key=lambda kv: (-kv[1]["xp"], kv[0]))
    g = _groups[code]
    rank = next(i for i, (c, _) in enumerate(ranked, 1) if c == code)
    return {
        "code": code,
        "xp": g["xp"],
        "members": len(g["members"]),
        "rank": rank,
        "top": [{"code": c, "xp": v["xp"]} for c, v in ranked[:TOP_N]],
    }


def reset() -> None:
    """Chỉ dùng cho test."""
    global _pg_schema_ready
    with _lock:
        _groups.clear()
        _pg_schema_ready = False
    dsn = _database_url()
    if dsn:
        with _pg_connect(dsn) as conn:
            _ensure_pg_schema(conn)
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE ecohanoi_group_members, ecohanoi_groups")
            conn.commit()


def _bad_code() -> JSONResponse:
    return JSONResponse({"error": "bad_code"}, status_code=422)


@router.post("/groups/score")
def score(req: ScoreReq):
    code = normalize_code(req.code)
    if not code:
        return _bad_code()
    delta = min(MAX_XP_DELTA, req.xpDelta)
    items_delta = min(MAX_ITEMS, req.items)
    dev = _hash_device(req.deviceId)

    dsn = _database_url()
    if dsn:
        with _pg_connect(dsn) as conn:
            _ensure_pg_schema(conn)
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO ecohanoi_groups (code, xp, items)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (code) DO UPDATE
                        SET xp = ecohanoi_groups.xp + EXCLUDED.xp,
                            items = ecohanoi_groups.items + EXCLUDED.items
                        """,
                        (code, delta, items_delta),
                    )
                    cur.execute(
                        """
                        INSERT INTO ecohanoi_group_members (code, device_hash)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (code, dev),
                    )
                return _pg_view(conn, code)

    with _lock:
        g = _groups.get(code)
        if g is None:
            if len(_groups) >= MAX_GROUPS:
                return JSONResponse({"error": "too_many_groups"}, status_code=503)
            g = _groups[code] = {"xp": 0, "items": 0, "members": set()}
        g["xp"] += delta
        g["items"] += items_delta
        g["members"].add(dev)
        return _ram_view(code)


@router.get("/groups/{code}")
def get_group(code: str):
    c = normalize_code(code)
    if not c:
        return _bad_code()

    dsn = _database_url()
    if dsn:
        with _pg_connect(dsn) as conn:
            _ensure_pg_schema(conn)
            view = _pg_view(conn, c)
            if view is None:
                return JSONResponse({"error": "not_found", "code": c}, status_code=404)
            return view

    with _lock:
        if c not in _groups:
            return JSONResponse({"error": "not_found", "code": c}, status_code=404)
        return _ram_view(c)
