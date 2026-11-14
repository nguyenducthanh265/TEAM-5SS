"""POST /classify trong serve/app_llm.py: khóa camelCase, fallback, 413/422, 503 khi quá tải, /stats. Không gọi mạng."""
import base64
import importlib
import json
import sys
import threading
import time
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
IMG = base64.b64encode(b"\xff\xd8\xff\xe0" + b"0" * 64).decode()  # không phải ảnh thật; server chỉ kiểm base64
ITEM = {"name": "Chai nhựa", "group_id": "recyclable", "confidence": 0.9, "reason": "Bao bì nhựa", "tip": "Bóp dẹp",
        "hazardous": False, "sellable": True, "misplaced": False}


@pytest.fixture
def api(monkeypatch):
    from fastapi.testclient import TestClient

    def make(**env):
        monkeypatch.chdir(ROOT)
        monkeypatch.delenv("RULES_PATH", raising=False)
        monkeypatch.setenv("SYSTEM", "examples.waste_classifier:run")
        monkeypatch.setenv("OPENAI_MODEL", "model-gia-cho-test")
        for k, v in env.items():
            monkeypatch.setenv(k, v)
        for name in ("serve.app_llm", "examples.waste_classifier"):
            sys.modules.pop(name, None)
        m = importlib.import_module("serve.app_llm")
        return m, TestClient(m.app)

    yield make
    for name in ("serve.app_llm", "examples.waste_classifier"):
        sys.modules.pop(name, None)


def _with_fake_model(m, text):
    """Giữ nguyên hàm run thật (prompt + hậu kiểm), chỉ thay client OpenAI bằng bản giả."""
    wc = sys.modules["examples.waste_classifier"]
    seen = {}

    def create(**kwargs):
        seen.update(kwargs)
        return SimpleNamespace(output_text=text, output=[], status="completed", usage=None)

    fake = SimpleNamespace(responses=SimpleNamespace(create=create))

    def system(x, timeout=None):
        seen["timeout"] = timeout
        return wc.run(x, timeout=timeout, client=fake)

    m.system = system
    return seen


def test_classify_returns_camel_case_and_counts_stats(api):
    m, c = api(TIMEOUT_S="9")
    seen = _with_fake_model(m, json.dumps({"items": [ITEM, {**ITEM, "name": "Lạ", "group_id": "nhom_la"}]}))
    r = c.post("/classify", json={"image": IMG, "mode": "bag"}, headers={"X-Device-Id": "may-A"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "source", "latencyMs"} and body["source"] == "ai" and isinstance(body["latencyMs"], int)
    assert set(body["items"][0]) == {"name", "groupId", "confidence", "reason", "tip", "hazardous", "sellable", "misplaced"}
    assert [i["groupId"] for i in body["items"]] == ["recyclable", "unknown"]
    assert seen["timeout"] == 9.0
    assert seen["input"][0]["content"][1]["image_url"] == "data:image/jpeg;base64," + IMG
    s = c.get("/stats").json()
    assert (s["ai_requests"], s["devices_ai"]) == (1, 1)


def test_classify_accepts_data_url_and_defaults_to_item(api):
    m, c = api()
    seen = _with_fake_model(m, json.dumps({"items": [ITEM, {**ITEM, "name": "Món hai"}]}))
    body = c.post("/classify", json={"image": "data:image/jpeg;base64," + IMG}).json()
    assert body["source"] == "ai" and len(body["items"]) == 1
    assert seen["input"][0]["content"][1]["image_url"] == "data:image/jpeg;base64," + IMG


def test_classify_empty_items_is_ai(api):
    m, c = api()
    _with_fake_model(m, '{"items": []}')
    assert c.post("/classify", json={"image": IMG, "mode": "item"}).json()["items"] == []


def test_classify_broken_model_json_and_errors_become_fallback(api, capsys):
    m, c = api()
    _with_fake_model(m, "{hong")
    body = c.post("/classify", json={"image": IMG, "mode": "item"}).json()
    assert body["items"] == [] and body["source"] == "fallback" and body["error"] == "BadModelOutput"
    assert isinstance(body["latencyMs"], int)
    m.system = lambda x: (_ for _ in ()).throw(RuntimeError("API down"))
    body = c.post("/classify", json={"image": IMG, "mode": "item"}).json()
    assert body["source"] == "fallback" and body["error"] == "RuntimeError"
    m.system = lambda x: "không phải JSON"
    assert c.post("/classify", json={"image": IMG}).json()["error"] == "bad_output"
    s = c.get("/stats").json()
    assert (s["ai_requests"], s["fallback"]) == (0, 3)
    assert IMG not in capsys.readouterr().out  # không log nội dung ảnh


def test_classify_validates_input(api):
    m, c = api(MAX_IMAGE_CHARS="200")
    _with_fake_model(m, '{"items": []}')
    assert c.post("/classify", json={"image": IMG, "mode": "ca-xe"}).status_code == 422
    assert c.post("/classify", json={"mode": "item"}).status_code == 422
    assert c.post("/classify", json={"image": "không phải base64 !!!"}).status_code == 422
    assert c.post("/classify", json={"image": "data:text/html;base64," + IMG}).status_code == 422
    r = c.post("/classify", json={"image": "A" * 204})
    assert r.status_code == 413 and r.json()["error"] == "image_too_large"
    assert c.get("/stats").json()["fallback"] == 0  # request sai không tính vào số liệu


def test_classify_force_fallback_header(api):
    m, c = api(ALLOW_FORCE_FALLBACK="1")
    _with_fake_model(m, json.dumps({"items": [ITEM]}))
    body = c.post("/classify", json={"image": IMG}, headers={"X-Force-Fallback": "1"}).json()
    assert body == {"items": [], "source": "fallback", "latencyMs": body["latencyMs"], "error": "forced"}
    assert c.post("/classify", json={"image": IMG}).json()["source"] == "ai"


def test_classify_timeout_then_busy_503(api):
    m, c = api(MAX_INFLIGHT="1", TIMEOUT_S="0.3")
    gate = threading.Event()
    m.system = lambda x: (gate.wait(5), '{"items": []}')[1]
    body = c.post("/classify", json={"image": IMG}).json()
    assert body["source"] == "fallback" and body["error"] == "timeout" and body["items"] == []
    r = c.post("/classify", json={"image": IMG})
    assert r.status_code == 503 and r.json()["source"] == "busy" and r.json()["items"] == []
    gate.set()
    for _ in range(50):
        if m.slots._value == 1:
            break
        time.sleep(0.05)
    assert c.post("/classify", json={"image": IMG}).json()["source"] == "ai"
    assert c.get("/stats").json()["busy"] == 1


def test_predict_health_still_work_with_classifier_system(api):
    m, c = api()
    assert c.get("/health").json()["system"] == "examples.waste_classifier:run"
    _with_fake_model(m, json.dumps({"items": [ITEM]}))
    r = c.post("/predict", json={"input": "chai nhựa"}).json()
    assert r["source"] == "ai" and json.loads(r["output"])["items"][0]["group_id"] == "recyclable"
