"""Nhóm bằng mã + bảng xếp hạng (WP-08). Lưu trong RAM, có khóa: MẤT KHI SERVER KHỞI ĐỘNG LẠI (đủ cho demo trong ngày).

POST /groups/score {code, deviceId, xpDelta, items} -> cộng điểm, trả trạng thái nhóm.
GET  /groups/{code} -> {code, xp, members, rank, top:[{code, xp}]}
Mã nhóm: 3-20 ký tự chữ/số/gạch ngang, chuẩn hóa chữ hoa. xpDelta mỗi lần gọi bị chặn trong [0, 200].
Id máy chỉ giữ dạng băm ngắn để đếm thành viên.
"""
from __future__ import annotations

import hashlib
import re
import threading

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

MAX_XP_DELTA = 200
MAX_GROUPS = 5000   # chặn việc tạo nhóm vô hạn làm đầy RAM
TOP_N = 10
_CODE_RE = re.compile(r"^[A-Z0-9-]{3,20}$")

router = APIRouter()
_lock = threading.Lock()
_groups = {}  # code -> {"xp": int, "items": int, "members": set(băm máy)}


class ScoreReq(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    deviceId: str = Field(min_length=1, max_length=128)
    xpDelta: int = 0
    items: int = 0


def normalize_code(code):
    """-> mã chữ hoa hợp lệ, hoặc None."""
    c = code.strip().upper() if isinstance(code, str) else ""
    return c if _CODE_RE.match(c) else None


def reset():
    """Chỉ dùng cho test."""
    with _lock:
        _groups.clear()


def _view(code):
    """Gọi khi đang giữ _lock."""
    ranked = sorted(_groups.items(), key=lambda kv: (-kv[1]["xp"], kv[0]))
    g = _groups[code]
    rank = next(i for i, (c, _) in enumerate(ranked, 1) if c == code)
    return {"code": code, "xp": g["xp"], "members": len(g["members"]), "rank": rank,
            "top": [{"code": c, "xp": v["xp"]} for c, v in ranked[:TOP_N]]}


def _bad_code():
    return JSONResponse({"error": "bad_code"}, status_code=422)


@router.post("/groups/score")
def score(req: ScoreReq):
    code = normalize_code(req.code)
    if not code:
        return _bad_code()
    delta = max(0, min(MAX_XP_DELTA, req.xpDelta))
    dev = hashlib.sha256(req.deviceId.encode("utf-8")).hexdigest()[:12]
    with _lock:
        g = _groups.get(code)
        if g is None:
            if len(_groups) >= MAX_GROUPS:
                return JSONResponse({"error": "too_many_groups"}, status_code=503)
            g = _groups[code] = {"xp": 0, "items": 0, "members": set()}
        g["xp"] += delta
        g["items"] += max(0, min(100, req.items))
        g["members"].add(dev)
        return _view(code)


@router.get("/groups/{code}")
def get_group(code: str):
    c = normalize_code(code)
    if not c:
        return _bad_code()
    with _lock:
        if c not in _groups:
            return JSONResponse({"error": "not_found", "code": c}, status_code=404)
        return _view(c)
