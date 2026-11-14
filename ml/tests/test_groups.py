"""Nhóm bằng mã + bảng xếp hạng (serve/groups.py), lưu RAM."""
import importlib
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def c(monkeypatch):
    from fastapi.testclient import TestClient
    monkeypatch.chdir(ROOT)
    monkeypatch.setenv("SYSTEM", "examples.toy_system:run")
    sys.modules.pop("serve.app_llm", None)
    m = importlib.import_module("serve.app_llm")
    importlib.import_module("serve.groups").reset()
    yield TestClient(m.app)
    sys.modules["serve.groups"].reset()
    sys.modules.pop("serve.app_llm", None)


def _score(c, code, device, xp, items=1):
    return c.post("/groups/score", json={"code": code, "deviceId": device, "xpDelta": xp, "items": items})


def test_two_devices_same_code_accumulate(c):
    assert _score(c, "lop-12a", "may-1", 30).json()["xp"] == 30
    r = _score(c, " LOP-12A ", "may-2", 50).json()
    assert r == {"code": "LOP-12A", "xp": 80, "members": 2, "rank": 1, "top": [{"code": "LOP-12A", "xp": 80}]}
    _score(c, "Lop-12a", "may-1", 5)
    g = c.get("/groups/lop-12a").json()
    assert (g["code"], g["xp"], g["members"]) == ("LOP-12A", 85, 2)


def test_xp_delta_is_capped_and_never_negative(c):
    assert _score(c, "ABC", "m", 99999).json()["xp"] == 200
    assert _score(c, "ABC", "m", -500).json()["xp"] == 200


def test_rank_and_top(c):
    _score(c, "NHOM-A", "m1", 50)
    _score(c, "NHOM-B", "m2", 120)
    _score(c, "NHOM-C", "m3", 10)
    g = c.get("/groups/NHOM-A").json()
    assert g["rank"] == 2 and g["top"] == [{"code": "NHOM-B", "xp": 120}, {"code": "NHOM-A", "xp": 50}, {"code": "NHOM-C", "xp": 10}]
    assert set(g) == {"code", "xp", "members", "rank", "top"}


@pytest.mark.parametrize("code", ["ab", "a" * 21, "có dấu", "a_b_c", "abc!", "   "])
def test_bad_code_rejected(c, code):
    assert _score(c, code, "m", 10).status_code == 422


def test_get_validation_and_missing(c):
    assert c.get("/groups/ab").status_code == 422
    assert c.get("/groups/CHUA-CO").status_code == 404
    assert c.post("/groups/score", json={"code": "ABC", "xpDelta": 5}).status_code == 422  # thiếu deviceId
    assert c.post("/groups/score", json={"code": "ABC", "deviceId": "m", "xpDelta": "nhiều"}).status_code == 422
