"""Mẫu API JSON cho tính năng AI gọi LLM/RAG/mô hình bất kỳ (app mobile/web gọi vào đây, KHÔNG gọi thẳng nhà cung cấp).

  SYSTEM=examples.toy_system:run uvicorn serve.app_llm:app --host 0.0.0.0 --port 8000
POST /predict {"input": "..."} -> {"output": "...", "latency_ms": ..., "source": "ai" | "fallback"}

Hành vi khi chậm/lỗi (để một đợt request chậm không làm nghẽn cả buổi demo):
- Timeout thật nằm ở client gọi nhà cung cấp: nếu hàm hệ thống nhận tham số `timeout`, server truyền TIMEOUT_S vào đó
  (ví dụ anthropic.Anthropic(timeout=...), httpx timeout). Python không thể dừng cưỡng bức một thread đang chạy.
- Server chờ tối đa TIMEOUT_S rồi trả fallback có nhãn source="fallback". Lời gọi đã bắt đầu vẫn chạy nốt ở nền,
  nhưng vẫn chiếm một chỗ trong giới hạn MAX_INFLIGHT cho tới khi xong.
- Không có hàng chờ: quá MAX_INFLIGHT lời gọi đang chạy thì trả ngay 503 {"source": "busy"}; app hiển thị "đang bận, thử lại".
- Kết quả hệ thống theo hợp đồng mlkit/result.py: chỉ output hợp lệ, không error, source (nếu có) == "ai" mới thành source="ai".
  Hệ thống tự trả fallback/error thì API trả source="fallback" kèm error. Hệ thống được gọi đúng một lần mỗi request.
- source="ai" chỉ có nghĩa là hàm hệ thống báo thành công; nó KHÔNG tự chứng minh đã gọi model thật (hệ thống giả cũng trả được).
- API key chỉ nằm trong biến môi trường của server.
- Kiểm tra nhánh fallback trên URL thật: đặt ALLOW_FORCE_FALLBACK=1 rồi gửi header X-Force-Fallback: 1 (tắt khi demo xong).
- Đếm người dùng thật (bằng chứng cho pitch): app gửi header X-Device-Id (id ngẫu nhiên lưu trên máy). GET /stats trả số lượt
  ai/fallback/busy và số máy. Bộ đếm nằm trong RAM, mất khi server khởi động lại; mỗi request cũng in một dòng
  `USAGE source=... device=...` ra log (Render giữ log), id máy chỉ lưu dạng băm.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import importlib
import inspect
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FTimeout
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

SYSTEM = os.environ.get("SYSTEM", "examples.toy_system:run")
TIMEOUT_S = float(os.environ.get("TIMEOUT_S", "20"))
MAX_INFLIGHT = int(os.environ.get("MAX_INFLIGHT", "8"))
FALLBACK = os.environ.get("FALLBACK_TEXT", "Không kết nối được AI. Đây là câu trả lời mẫu.")
MAX_CHARS = int(os.environ.get("MAX_CHARS", "4000"))
ALLOW_FORCE_FALLBACK = os.environ.get("ALLOW_FORCE_FALLBACK") == "1"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # để import mlkit.result khi chạy từ ml/
from mlkit.result import normalize  # noqa: E402  (chỉ dùng thư viện chuẩn)

mod, fn = SYSTEM.split(":")
system = getattr(importlib.import_module(mod), fn)
pool = ThreadPoolExecutor(MAX_INFLIGHT)        # số worker = số chỗ: không bao giờ có tác vụ nằm chờ trong queue
slots = threading.BoundedSemaphore(MAX_INFLIGHT)
app = FastAPI(title="AI API")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])
_stats_lock = threading.Lock()
_stats = {"ai": 0, "fallback": 0, "busy": 0}
_devices, _devices_ai = set(), set()
_device_days = {}  # băm máy -> tập ngày (YYYY-MM-DD) có lượt AI thành công; dùng đếm người quay lại
_started = time.strftime("%Y-%m-%dT%H:%M:%S%z")


def _today():
    return time.strftime("%Y-%m-%d")


def _record(source, device, latency_ms=None):
    """Đếm một request theo nhãn cuối cùng mà app nhận được. Id máy chỉ giữ dạng băm ngắn."""
    dev = hashlib.sha256(device.encode("utf-8")).hexdigest()[:12] if device else None
    with _stats_lock:
        _stats[source] = _stats.get(source, 0) + 1
        if dev:
            _devices.add(dev)
            if source == "ai":
                _devices_ai.add(dev)
                _device_days.setdefault(dev, set()).add(_today())
    print(f"USAGE source={source} device={dev or '-'} latency_ms={latency_ms if latency_ms is not None else '-'}", flush=True)


class Req(BaseModel):
    input: str = Field(min_length=1, max_length=MAX_CHARS)


def _accepts_timeout(f):
    """Chỉ bước đọc chữ ký nằm trong try; lỗi của chính hàm hệ thống không bao giờ bị bắt ở đây."""
    try:
        params = inspect.signature(f).parameters
    except (TypeError, ValueError):
        return False
    return "timeout" in params or any(p.kind is inspect.Parameter.VAR_KEYWORD for p in params.values())


def _call(f, text):
    """Gọi hệ thống ĐÚNG MỘT LẦN. Không tự thử lại: lỗi được trả về lớp trên để thành fallback có nhãn."""
    if _accepts_timeout(f):
        return f(text, timeout=TIMEOUT_S)
    return f(text)


def _run_and_release(f, text):
    try:
        return _call(f, text)
    finally:
        slots.release()  # chỉ trả chỗ khi lời gọi thật sự kết thúc, kể cả sau khi request đã nhận fallback


@app.get("/health")
def health():
    return {"status": "ok", "system": SYSTEM, "max_inflight": MAX_INFLIGHT, "timeout_s": TIMEOUT_S}


@app.get("/stats")
def stats():
    """Số liệu dùng thật kể từ lần khởi động server (không gồm /health). devices_ai: số máy có ít nhất một lượt AI thành công.
    devices_returning: số máy có lượt AI thành công ở từ 2 ngày khác nhau. Số liệu nằm trong RAM: server khởi động lại là mất,
    nên chụp màn hình /stats trước khi deploy lại và ngay trước giờ pitch (dòng log USAGE vẫn còn trong log Render)."""
    with _stats_lock:
        return {"ai_requests": _stats["ai"], "fallback": _stats["fallback"], "busy": _stats["busy"],
                "devices_total": len(_devices), "devices_ai": len(_devices_ai),
                "devices_returning": sum(1 for d in _device_days.values() if len(d) >= 2), "since": _started}


def _fallback(t, reason, output=None):
    """Trả câu mẫu có nhãn. Nếu hệ thống đã tự trả câu mẫu của nó thì giữ câu đó, nhưng nhãn vẫn là fallback."""
    out = output if isinstance(output, str) and output.strip() else FALLBACK
    return {"output": out, "latency_ms": round((time.time() - t) * 1000), "source": "fallback", "error": reason}


@app.post("/predict")
def predict(req: Req, request: Request):
    res = _predict(req, request)
    body = res if isinstance(res, dict) else None
    source = body["source"] if body else "busy"
    _record(source, request.headers.get("x-device-id"), body.get("latency_ms") if body else None)
    return res


def _predict(req: Req, request: Request):
    t = time.time()
    if ALLOW_FORCE_FALLBACK and request.headers.get("x-force-fallback") == "1":
        return _fallback(t, "forced")
    if not slots.acquire(blocking=False):
        return JSONResponse({"output": "", "source": "busy", "error": "too_many_inflight"}, status_code=503)
    try:
        fut = pool.submit(_run_and_release, system, req.input)
    except Exception as e:
        slots.release()
        return _fallback(t, type(e).__name__)
    try:
        n = normalize(fut.result(timeout=TIMEOUT_S))
        if not n["ok"]:  # hệ thống báo fallback/lỗi/rỗng: giữ nguyên trạng thái, KHÔNG gắn nhãn ai
            return _fallback(t, n["error"], n["output"])
        return {"output": n["output"], "latency_ms": round((time.time() - t) * 1000), "source": "ai"}
    except FTimeout:
        fut.cancel()  # chỉ có tác dụng nếu chưa bắt đầu; tác vụ đang chạy giữ chỗ tới khi xong
        return _fallback(t, "timeout")
    except Exception as e:
        return _fallback(t, type(e).__name__)


# ---------- EcoHanoi: POST /classify (ảnh rác -> món + nhóm theo file luật) ----------
# Dùng chung hàm hệ thống, timeout, giới hạn đồng thời và bộ đếm /stats với /predict.
# Ảnh chỉ nằm trong bộ nhớ của request: không ghi đĩa, không in ra log.
MAX_IMAGE_CHARS = int(os.environ.get("MAX_IMAGE_CHARS", "1500000"))
_IMAGE_MIMES = ("image/jpeg", "image/png", "image/webp")
_ITEM_KEYS = (("name", "name"), ("group_id", "groupId"), ("confidence", "confidence"), ("reason", "reason"), ("tip", "tip"),
              ("hazardous", "hazardous"), ("sellable", "sellable"), ("misplaced", "misplaced"))


class ClassifyReq(BaseModel):
    image: str = Field(min_length=1)
    mode: Literal["item", "bag"] = "item"


def _data_url(image):
    """base64 trần hoặc data URL -> data URL đã kiểm. Trả None nếu không phải ảnh base64 hợp lệ."""
    s = image.strip()
    mime = "image/jpeg"
    if s.startswith("data:"):
        head, sep, s = s.partition(",")
        mime = head[5:].split(";")[0].lower()
        if not sep or mime not in _IMAGE_MIMES or not head.endswith(";base64"):
            return None
    try:
        raw = base64.b64decode(s, validate=True)
    except (binascii.Error, ValueError):
        return None
    if len(raw) < 16:
        return None
    return f"data:{mime};base64,{s}"


def _classify_fallback(t, reason):
    return {"items": [], "source": "fallback", "latencyMs": round((time.time() - t) * 1000), "error": reason}


def _camel_items(output):
    """Chuỗi JSON {"items":[...snake_case]} của hệ thống -> list món khóa camelCase. Sai dạng thì ném ValueError."""
    d = json.loads(output)
    if not isinstance(d, dict) or not isinstance(d.get("items"), list):
        raise ValueError("bad_shape")
    return [{dst: it[src] for src, dst in _ITEM_KEYS if src in it} for it in d["items"] if isinstance(it, dict)]


@app.post("/classify")
def classify(req: ClassifyReq, request: Request):
    if len(req.image) > MAX_IMAGE_CHARS:
        return JSONResponse({"items": [], "source": "fallback", "error": "image_too_large"}, status_code=413)
    image = _data_url(req.image)
    if image is None:
        return JSONResponse({"items": [], "source": "fallback", "error": "bad_image"}, status_code=422)
    res = _classify(image, req.mode, request)
    body = res if isinstance(res, dict) else None
    _record(body["source"] if body else "busy", request.headers.get("x-device-id"), body.get("latencyMs") if body else None)
    return res


def _classify(image, mode, request: Request):
    t = time.time()
    if ALLOW_FORCE_FALLBACK and request.headers.get("x-force-fallback") == "1":
        return _classify_fallback(t, "forced")
    if not slots.acquire(blocking=False):
        return JSONResponse({"items": [], "source": "busy", "error": "too_many_inflight"}, status_code=503)
    try:
        fut = pool.submit(_run_and_release, system, json.dumps({"image": image, "mode": mode}))
    except Exception as e:
        slots.release()
        return _classify_fallback(t, type(e).__name__)
    try:
        n = normalize(fut.result(timeout=TIMEOUT_S))
        if not n["ok"]:
            return _classify_fallback(t, n["error"])
        try:
            items = _camel_items(n["output"])
        except ValueError:  # hệ thống không trả JSON đúng dạng (ví dụ SYSTEM không phải bộ phân loại)
            return _classify_fallback(t, "bad_output")
        return {"items": items, "source": "ai", "latencyMs": round((time.time() - t) * 1000)}
    except FTimeout:
        fut.cancel()
        return _classify_fallback(t, "timeout")
    except Exception as e:
        return _classify_fallback(t, type(e).__name__)  # chỉ tên lớp lỗi: không lộ key hay nội dung ảnh


from serve.groups import router as _groups_router  # noqa: E402

app.include_router(_groups_router)
