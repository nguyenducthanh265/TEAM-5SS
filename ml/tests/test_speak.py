"""Test GET /speak bằng hàm TTS giả: không gọi mạng, không cần OPENAI_API_KEY."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from serve import speak as sp

FAKE_MP3 = b"ID3\x04fake-mp3-bytes"


@pytest.fixture()
def env(monkeypatch):
    calls = []

    def fake(text):
        calls.append(text)
        return FAKE_MP3

    monkeypatch.setattr(sp, "_synthesize", fake)
    sp.reset()
    app = FastAPI()
    app.include_router(sp.router)
    yield TestClient(app), calls
    sp.reset()


def test_returns_mp3_for_valid_text(env):
    client, calls = env
    r = client.get("/speak", params={"t": "Chai nhựa. Nhóm tái chế.", "d": "dev-1"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/mpeg"
    assert r.content == FAKE_MP3
    assert calls == ["Chai nhựa. Nhóm tái chế."]


@pytest.mark.parametrize("text", ["", "   ", "\n\t"])
def test_empty_text_rejected(env, text):
    client, calls = env
    r = client.get("/speak", params={"t": text, "d": "dev-1"})
    assert r.status_code == 422
    assert r.json() == {"error": "bad_text"}
    assert calls == []


def test_too_long_text_rejected(env):
    client, calls = env
    r = client.get("/speak", params={"t": "a" * (sp.MAX_CHARS + 1), "d": "dev-1"})
    assert r.status_code == 422
    assert calls == []


def test_text_at_limit_is_accepted(env):
    client, _ = env
    assert client.get("/speak", params={"t": "a" * sp.MAX_CHARS, "d": "dev-1"}).status_code == 200


def test_control_chars_removed_and_whitespace_collapsed(env):
    client, calls = env
    client.get("/speak", params={"t": "Pin\x00  AA\x07\n đã   hết", "d": "dev-1"})
    assert calls == ["Pin AA đã hết"]


def test_same_text_is_cached_and_costs_one_call(env):
    client, calls = env
    for _ in range(3):
        assert client.get("/speak", params={"t": "Lon nước ngọt", "d": "dev-1"}).content == FAKE_MP3
    assert len(calls) == 1


def test_cached_hit_does_not_use_rate_limit(env, monkeypatch):
    client, _ = env
    monkeypatch.setattr(sp, "PER_DEVICE_PER_MIN", 1)
    assert client.get("/speak", params={"t": "Vỏ chuối", "d": "dev-1"}).status_code == 200
    assert client.get("/speak", params={"t": "Vỏ chuối", "d": "dev-1"}).status_code == 200


def test_rate_limit_per_device(env, monkeypatch):
    client, _ = env
    monkeypatch.setattr(sp, "PER_DEVICE_PER_MIN", 2)
    codes = [client.get("/speak", params={"t": f"món số {i}", "d": "dev-1"}).status_code for i in range(3)]
    assert codes == [200, 200, 429]
    # máy khác không bị ảnh hưởng
    assert client.get("/speak", params={"t": "món khác", "d": "dev-2"}).status_code == 200


def test_synthesis_error_returns_class_name_only(env, monkeypatch):
    client, _ = env

    def boom(text):
        raise RuntimeError("sk-proj-SECRET leaked in message")

    monkeypatch.setattr(sp, "_synthesize", boom)
    r = client.get("/speak", params={"t": "Chai nhựa", "d": "dev-1"})
    assert r.status_code == 502
    assert r.json() == {"error": "RuntimeError"}
    assert "SECRET" not in r.text


def test_failed_call_is_not_cached(env, monkeypatch):
    client, calls = env
    state = {"fail": True}

    def flaky(text):
        calls.append(text)
        if state["fail"]:
            raise RuntimeError("x")
        return FAKE_MP3

    monkeypatch.setattr(sp, "_synthesize", flaky)
    assert client.get("/speak", params={"t": "Hộp sữa giấy", "d": "dev-1"}).status_code == 502
    state["fail"] = False
    assert client.get("/speak", params={"t": "Hộp sữa giấy", "d": "dev-1"}).status_code == 200
    assert len(calls) == 2


def test_busy_when_no_slot_free(env, monkeypatch):
    client, calls = env

    class Full:
        def acquire(self, blocking=True):
            return False

        def release(self):
            raise AssertionError("không được release khi chưa acquire")

    monkeypatch.setattr(sp, "_slots", Full())
    r = client.get("/speak", params={"t": "Chai nhựa", "d": "dev-1"})
    assert r.status_code == 503
    assert r.json() == {"error": "busy"}
    assert calls == []


def test_cache_is_bounded(env, monkeypatch):
    client, _ = env
    monkeypatch.setattr(sp, "CACHE_MAX", 3)
    monkeypatch.setattr(sp, "PER_DEVICE_PER_MIN", 100)
    for i in range(10):
        client.get("/speak", params={"t": f"câu {i}", "d": "dev-1"})
    assert len(sp._cache) == 3
