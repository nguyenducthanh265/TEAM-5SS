"""Điểm và chuỗi ngày do SERVER tính (chống gian lận: app không tự quyết điểm, ngày, hay số món).

Luật (đổi ở các hằng số đầu file):
- Mỗi món AI nhận ra thật (source=ai, không phải 'unknown') được XP_PER_ITEM điểm, tính tối đa MAX_ITEMS_PER_DAY món/ngày.
- Ngày có >= MIN_ITEMS_FOR_STREAK món được tính vào chuỗi và nhận MỘT lần thưởng chuỗi trong ngày theo STREAK_BONUS
  (ngày 1..7 của tuần chuỗi, sau ngày 7 vòng lại ngày 1).
- Bỏ lỡ đúng 1 ngày: chuỗi được khôi phục tự động, tối đa MAX_RESTORES_PER_MONTH lần mỗi tháng. Hết lượt hoặc bỏ lỡ
  từ 2 ngày trở lên: chuỗi về ngày 1.
- "Hôm nay" luôn là ngày giờ Việt Nam (UTC+7) của SERVER. Đổi đồng hồ điện thoại không có tác dụng.

Chống nuôi điểm bằng cách gửi số giả: server tự đếm món hợp lệ ở /classify (observe). Khi app xác nhận (claim), số món
được cộng = min(số app báo, số server đã thấy chưa được cộng, phần trần còn lại). Cùng một ảnh gửi lại không được đếm lần hai.

Lưu trữ:
- Có biến DATABASE_URL: Postgres (bảng ecohanoi_rewards, mỗi máy một dòng JSONB, khóa dòng khi đọc-sửa-ghi). Bền qua các
  lần server ngủ/khởi động lại. Lỗi cơ sở dữ liệu: /progress trả 503 storage_unavailable, còn observe() nuốt lỗi để KHÔNG
  làm hỏng /classify.
- Không có DATABASE_URL: RAM, MẤT KHI SERVER KHỞI ĐỘNG LẠI (gói free của Render ngủ sau ~15 phút rảnh). Chỉ để chạy thử.
Id máy chỉ giữ dạng băm ngắn.
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

XP_PER_ITEM = 2
MAX_ITEMS_PER_DAY = 15
MIN_ITEMS_FOR_STREAK = 5
STREAK_BONUS = (20, 20, 30, 40, 40, 50, 70)
MAX_RESTORES_PER_MONTH = 3
MAX_DEVICES = 20000
VN_TZ = timezone(timedelta(hours=7))

router = APIRouter()
_lock = threading.Lock()
_devices: dict[str, dict] = {}
_schema_ready = False


def _now() -> datetime:
    return datetime.now(VN_TZ)


def _hash(device_id: str) -> str:
    return hashlib.sha256(device_id.encode("utf-8")).hexdigest()[:12]


def _today(now: datetime) -> date:
    return now.astimezone(VN_TZ).date()


def _database_url() -> str | None:
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        return None
    if raw.startswith("postgres://"):
        return "postgresql://" + raw[len("postgres://"):]
    return raw


def _new_state() -> dict:
    return {"xp": 0, "streak": 0, "last_day": None, "restores": {}, "day": None, "observed": 0, "claimed": 0,
            "bonus": False, "seen": set(), "group_credited": 0}


def _roll_day(st: dict, today: date) -> None:
    """Sang ngày mới thì đưa bộ đếm của ngày về 0 (điểm và chuỗi được giữ)."""
    key = today.isoformat()
    if st["day"] != key:
        st["day"], st["observed"], st["claimed"], st["bonus"], st["seen"] = key, 0, 0, False, set()


def _encode(st: dict) -> dict:
    return {"xp": st["xp"], "streak": st["streak"], "last_day": st["last_day"].isoformat() if st["last_day"] else None,
            "restores": dict(st["restores"]), "day": st["day"], "observed": st["observed"], "claimed": st["claimed"],
            "bonus": bool(st["bonus"]), "seen": sorted(st["seen"]), "group_credited": st["group_credited"]}


def _decode(raw) -> dict:
    """Dữ liệu JSON (dict hoặc chuỗi) -> trạng thái. Trường thiếu hoặc hỏng thì dùng giá trị mặc định."""
    if isinstance(raw, (str, bytes)):
        raw = json.loads(raw)
    st = _new_state()
    if not isinstance(raw, dict):
        return st
    st["xp"] = max(0, int(raw.get("xp") or 0))
    st["streak"] = max(0, int(raw.get("streak") or 0))
    last = raw.get("last_day")
    st["last_day"] = date.fromisoformat(last) if last else None
    st["restores"] = {str(k): int(v) for k, v in (raw.get("restores") or {}).items()}
    st["day"] = raw.get("day")
    st["observed"] = max(0, int(raw.get("observed") or 0))
    st["claimed"] = max(0, int(raw.get("claimed") or 0))
    st["bonus"] = raw.get("bonus") is True
    st["seen"] = set(raw.get("seen") or [])
    st["group_credited"] = max(0, int(raw.get("group_credited") or 0))
    return st


def _ensure_schema(conn) -> None:
    global _schema_ready
    if _schema_ready:
        return
    with _lock:
        if _schema_ready:
            return
        with conn.cursor() as cur:
            cur.execute(
                "CREATE TABLE IF NOT EXISTS ecohanoi_rewards ("
                "device_hash TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            )
        conn.commit()
        _schema_ready = True


def _run_pg(dsn: str, dev: str, today: date, fn):
    """Đọc-sửa-ghi một máy trong một giao dịch, khóa dòng để hai request cùng lúc không ghi đè nhau."""
    import psycopg

    with psycopg.connect(dsn) as conn:
        _ensure_schema(conn)
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute("SELECT state FROM ecohanoi_rewards WHERE device_hash = %s FOR UPDATE", (dev,))
                row = cur.fetchone()
                if row is None:
                    cur.execute("SELECT COUNT(*) FROM ecohanoi_rewards")
                    if int(cur.fetchone()[0]) >= MAX_DEVICES:
                        return None
                    cur.execute(
                        "INSERT INTO ecohanoi_rewards (device_hash, state) VALUES (%s, %s::jsonb) ON CONFLICT DO NOTHING",
                        (dev, json.dumps(_encode(_new_state()))),
                    )
                    cur.execute("SELECT state FROM ecohanoi_rewards WHERE device_hash = %s FOR UPDATE", (dev,))
                    row = cur.fetchone()
                st = _decode(row[0])
                _roll_day(st, today)
                out = fn(st, today)
                cur.execute(
                    "UPDATE ecohanoi_rewards SET state = %s::jsonb, updated_at = now() WHERE device_hash = %s",
                    (json.dumps(_encode(st)), dev),
                )
                return out


def _run(device_id: str, now: datetime | None, fn):
    """Chạy fn(trạng thái, hôm nay) trên trạng thái của máy này, lưu lại kết quả. None nếu server đã đầy."""
    today = _today(now or _now())
    dev = _hash(device_id)
    dsn = _database_url()
    if dsn:
        return _run_pg(dsn, dev, today, fn)
    with _lock:
        st = _devices.get(dev)
        if st is None:
            if len(_devices) >= MAX_DEVICES:
                return None
            st = _devices[dev] = _new_state()
        _roll_day(st, today)
        return fn(st, today)


def _month(today: date) -> str:
    return today.strftime("%Y-%m")


def _restores_left(st: dict, today: date) -> int:
    return max(0, MAX_RESTORES_PER_MONTH - int(st["restores"].get(_month(today), 0)))


def _gap(st: dict, today: date) -> int | None:
    return None if st["last_day"] is None else (today - st["last_day"]).days


def _view(st: dict, today: date, **extra) -> dict:
    gap = _gap(st, today)
    streak = st["streak"]
    restorable = gap == 2 and streak > 0 and _restores_left(st, today) > 0 and not st["bonus"]
    if gap is not None and gap >= 2 and not restorable and not st["bonus"]:
        streak = 0  # chuỗi đã đứt: hiển thị 0 cho tới khi quét đủ ngày tiếp theo
    return {
        "xp": st["xp"],
        "streak": streak,
        "dayIndex": ((streak - 1) % 7 + 1) if streak > 0 else 0,
        "todayItems": st["claimed"],
        "todayCap": MAX_ITEMS_PER_DAY,
        "minItems": MIN_ITEMS_FOR_STREAK,
        "qualifiedToday": st["bonus"],
        "nextBonus": STREAK_BONUS[streak % 7] if streak > 0 else STREAK_BONUS[0],
        "restoresLeft": _restores_left(st, today),
        "restorable": restorable,
        "today": today.isoformat(),
        **extra,
    }


def _advance_streak(st: dict, today: date) -> tuple[int, bool]:
    """Chuỗi mới sau khi ngày hôm nay đủ điều kiện. -> (chuỗi, có dùng lượt khôi phục)."""
    gap = _gap(st, today)
    if gap is None:
        return 1, False
    if gap <= 0:
        return max(1, st["streak"]), False
    if gap == 1:
        return st["streak"] + 1, False
    if gap == 2 and _restores_left(st, today) > 0:
        month = _month(today)
        st["restores"][month] = int(st["restores"].get(month, 0)) + 1
        return st["streak"] + 1, True
    return 1, False


def observe(device_id: str | None, valid_items: int, image_key: str | None = None, now: datetime | None = None) -> None:
    """Gọi sau mỗi /classify thành công: ghi nhận số món hợp lệ server đã thấy. Cùng ảnh gửi lại không đếm lần hai.
    Không bao giờ ném lỗi: lỗi lưu trữ không được làm hỏng việc quét."""
    if not device_id or valid_items <= 0:
        return
    img = hashlib.sha256(image_key.encode("utf-8")).hexdigest()[:16] if image_key else None

    def apply(st: dict, today: date):
        if img is not None:
            if img in st["seen"]:
                return None
            st["seen"].add(img)
        st["observed"] = min(MAX_ITEMS_PER_DAY, st["observed"] + valid_items)
        return None

    try:
        _run(device_id, now, apply)
    except Exception as e:  # chỉ tên lớp lỗi, không lộ chuỗi kết nối
        print(f"REWARDS observe failed: {type(e).__name__}", flush=True)


def claim(device_id: str, items: int, now: datetime | None = None) -> dict | None:
    """App xác nhận `items` món vừa lưu. Trả trạng thái mới (None nếu server đầy)."""

    def apply(st: dict, today: date):
        claimable = max(0, min(int(items), st["observed"] - st["claimed"], MAX_ITEMS_PER_DAY - st["claimed"]))
        st["claimed"] += claimable
        item_xp = claimable * XP_PER_ITEM
        bonus, restored = 0, False
        if st["claimed"] >= MIN_ITEMS_FOR_STREAK and not st["bonus"]:
            st["streak"], restored = _advance_streak(st, today)
            st["last_day"] = today
            st["bonus"] = True
            bonus = STREAK_BONUS[(st["streak"] - 1) % 7]
        st["xp"] += item_xp + bonus
        return _view(st, today, gained=item_xp + bonus, gainedItems=claimable, gainedItemXp=item_xp,
                     gainedBonus=bonus, restored=restored)

    return _run(device_id, now, apply)


def credit_group(device_id: str, requested: int, now: datetime | None = None) -> int:
    """Điểm được phép cộng cho nhóm của máy này: không vượt quá điểm THẬT (server tính) mà máy đã kiếm được và chưa chuyển
    cho nhóm. Chặn việc gọi thẳng /groups/score với số tự bịa để nâng hạng. Trả số điểm được cộng (có thể 0)."""
    want = max(0, int(requested))

    def apply(st: dict, today: date):
        allowed = max(0, min(want, st["xp"] - st["group_credited"]))
        st["group_credited"] += allowed
        return allowed

    out = _run(device_id, now, apply)
    return 0 if out is None else out


def status(device_id: str, now: datetime | None = None) -> dict | None:
    return _run(device_id, now, lambda st, today: _view(st, today))


def reset() -> None:
    """Chỉ dùng cho test (xóa RAM và buộc tạo lại bảng ở lần dùng Postgres kế tiếp)."""
    global _schema_ready
    with _lock:
        _devices.clear()
        _schema_ready = False


class ClaimReq(BaseModel):
    deviceId: str = Field(min_length=1, max_length=128)
    items: int = Field(default=0, ge=0, le=100)


def _respond(call):
    try:
        out = call()
    except Exception as e:
        print(f"REWARDS storage error: {type(e).__name__}", flush=True)
        return JSONResponse({"error": "storage_unavailable"}, status_code=503)
    return JSONResponse({"error": "too_many_devices"}, status_code=503) if out is None else out


@router.post("/progress/claim")
def progress_claim(req: ClaimReq):
    return _respond(lambda: claim(req.deviceId, req.items))


@router.get("/progress")
def progress_status(d: str = Query(min_length=1, max_length=128)):
    return _respond(lambda: status(d))
