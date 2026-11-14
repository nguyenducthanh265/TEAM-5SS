"""GET /speak: một câu ngắn -> mp3 bằng OpenAI TTS (app phát tự động sau khi quét xong).

Thiết kế (không tin client):
- Chỉ nhận văn bản <= MAX_CHARS ký tự; bỏ ký tự điều khiển; rỗng hoặc quá dài trả 422.
- Giới hạn mỗi máy PER_DEVICE_PER_MIN lượt/phút (id máy chỉ giữ dạng băm) và MAX_INFLIGHT lượt song song,
  để người có URL không đốt credit.
- Bộ nhớ đệm LRU theo nội dung: các câu lặp lại (cùng món) không gọi OpenAI lần hai, nên nhanh và không tốn thêm.
- Mã ở đây không ghi log văn bản. Lưu ý: log truy cập của uvicorn/Render có ghi chuỗi truy vấn của GET /speak, mà văn bản
  nằm trong đó; đó chỉ là tên món và mẹo (không có ảnh, không có thông tin cá nhân). Lỗi trả JSON {"error": ...} để app chuyển sang giọng điện thoại, không bao giờ im lặng.
Biến môi trường: OPENAI_API_KEY (chung với /classify), OPENAI_TTS_MODEL, OPENAI_TTS_VOICE, TTS_TIMEOUT_S,
TTS_PER_DEVICE_PER_MIN, TTS_MAX_INFLIGHT.
"""
from __future__ import annotations

import hashlib
import os
import re
import threading
import time
from collections import OrderedDict

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response

MAX_CHARS = 240
CACHE_MAX = 200
WINDOW_S = 60.0

TTS_MODEL = os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
TTS_VOICE = os.environ.get("OPENAI_TTS_VOICE", "coral")
TTS_TIMEOUT_S = float(os.environ.get("TTS_TIMEOUT_S", "12"))
PER_DEVICE_PER_MIN = int(os.environ.get("TTS_PER_DEVICE_PER_MIN", "20"))
MAX_INFLIGHT = int(os.environ.get("TTS_MAX_INFLIGHT", "4"))
INSTRUCTIONS = "Đọc tiếng Việt tự nhiên, giọng ấm, rõ ràng, tốc độ vừa phải, ngắt nghỉ đúng chỗ."

router = APIRouter()
_lock = threading.Lock()
_cache: "OrderedDict[str, bytes]" = OrderedDict()
_hits: dict[str, list[float]] = {}
_slots = threading.BoundedSemaphore(MAX_INFLIGHT)
_CTRL = re.compile(r"[\x00-\x1f\x7f]")


def clean_text(raw: str) -> str:
    """Bỏ ký tự điều khiển, gộp khoảng trắng. Trả chuỗi rỗng nếu không còn gì."""
    return re.sub(r"\s+", " ", _CTRL.sub(" ", raw or "")).strip()


def _key(text: str) -> str:
    return hashlib.sha256(f"{TTS_MODEL}|{TTS_VOICE}|{text}".encode("utf-8")).hexdigest()


def _device_hash(device: str) -> str:
    return hashlib.sha256((device or "-").encode("utf-8")).hexdigest()[:12]


def _allow(dev: str, now: float) -> bool:
    """Cửa sổ trượt 60 giây cho mỗi máy. Gọi khi đang giữ _lock."""
    recent = [t for t in _hits.get(dev, []) if now - t < WINDOW_S]
    if len(recent) >= PER_DEVICE_PER_MIN:
        _hits[dev] = recent
        return False
    recent.append(now)
    _hits[dev] = recent
    if len(_hits) > 5000:  # chặn RAM phình khi bị quét nhiều id giả
        for k in [k for k, v in _hits.items() if not v or now - v[-1] >= WINDOW_S]:
            _hits.pop(k, None)
    return True


def _synthesize(text: str) -> bytes:
    """Gọi OpenAI TTS, trả mp3. Tách riêng để test thay bằng hàm giả."""
    import openai

    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=TTS_TIMEOUT_S, max_retries=0)
    r = client.audio.speech.create(
        model=TTS_MODEL, voice=TTS_VOICE, input=text, response_format="mp3", instructions=INSTRUCTIONS,
    )
    data = r.content
    if not data:
        raise RuntimeError("empty_audio")
    return data


def reset() -> None:
    """Chỉ dùng cho test."""
    with _lock:
        _cache.clear()
        _hits.clear()


def _audio(data: bytes) -> Response:
    return Response(content=data, media_type="audio/mpeg", headers={"Cache-Control": "private, max-age=3600"})


@router.get("/speak")
def speak(t: str = Query(default="", max_length=2000), d: str = Query(default="", max_length=128)):
    text = clean_text(t)
    if not text or len(text) > MAX_CHARS:
        return JSONResponse({"error": "bad_text"}, status_code=422)
    key = _key(text)
    with _lock:
        cached = _cache.get(key)
        if cached is not None:
            _cache.move_to_end(key)
            return _audio(cached)
        if not _allow(_device_hash(d), time.time()):
            return JSONResponse({"error": "rate_limited"}, status_code=429)
    if not _slots.acquire(blocking=False):
        return JSONResponse({"error": "busy"}, status_code=503)
    try:
        data = _synthesize(text)
    except Exception as e:  # chỉ trả tên lớp lỗi: không lộ key hay nội dung
        return JSONResponse({"error": type(e).__name__}, status_code=502)
    finally:
        _slots.release()
    with _lock:
        _cache[key] = data
        while len(_cache) > CACHE_MAX:
            _cache.popitem(last=False)
    return _audio(data)
