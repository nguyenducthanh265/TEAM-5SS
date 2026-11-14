"""Nhóm bằng mã + bảng xếp hạng (serve/groups.py), hỗ trợ RAM và Postgres."""
from concurrent.futures import ThreadPoolExecutor
import importlib
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def c(monkeypatch):
    from fastapi.testclient import TestClient
    monkeypatch.chdir(ROOT)
    monkeypatch.delenv("DATABASE_URL", raising=False)
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


def test_device_id_is_hashed_not_stored_raw(c):
    groups = importlib.import_module("serve.groups")
    _score(c, "HASH-1", "secret-device-id-123", 10)
    stored_members = groups._groups["HASH-1"]["members"]
    assert len(stored_members) == 1
    member_val = next(iter(stored_members))
    assert "secret-device-id-123" not in member_val
    assert len(member_val) == 12


def test_xp_delta_is_capped_and_negative_rejected(c):
    assert _score(c, "ABC", "m", 99999).json()["xp"] == 200
    r_neg = _score(c, "ABC", "m", -500)
    assert r_neg.status_code == 422
    assert c.get("/groups/ABC").json()["xp"] == 200


def test_rank_and_top(c):
    _score(c, "NHOM-A", "m1", 50)
    _score(c, "NHOM-B", "m2", 120)
    _score(c, "NHOM-C", "m3", 10)
    g = c.get("/groups/NHOM-A").json()
    assert g["rank"] == 2 and g["top"] == [
        {"code": "NHOM-B", "xp": 120},
        {"code": "NHOM-A", "xp": 50},
        {"code": "NHOM-C", "xp": 10},
    ]
    assert set(g) == {"code", "xp", "members", "rank", "top"}


@pytest.mark.parametrize("code", ["ab", "a" * 21, "có dấu", "a_b_c", "abc!", "   "])
def test_bad_code_rejected(c, code):
    assert _score(c, code, "m", 10).status_code == 422


def test_get_validation_and_missing(c):
    assert c.get("/groups/ab").status_code == 422
    assert c.get("/groups/CHUA-CO").status_code == 404
    assert c.post("/groups/score", json={"code": "ABC", "xpDelta": 5}).status_code == 422  # thiếu deviceId
    assert c.post("/groups/score", json={"code": "ABC", "deviceId": "m", "xpDelta": "nhiều"}).status_code == 422


def test_concurrent_score_requests_are_thread_safe(c):
    def worker(i: int):
        return _score(c, "TEAM-CONC", f"dev-{i % 5}", 10).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(worker, range(20)))
    assert all(s == 200 for s in statuses)
    g = c.get("/groups/TEAM-CONC").json()
    assert g["xp"] == 200
    assert g["members"] == 5


def test_postgres_backend_selected_when_database_url_set(c, monkeypatch):
    groups = importlib.import_module("serve.groups")
    groups._pg_schema_ready = False

    state = {"groups": {}, "members": set()}

    class FakeCursor:
        def __init__(self):
            self._rows = []

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, sql, params=()):
            q = " ".join(sql.split())
            if q.startswith("CREATE TABLE"):
                return
            if "INSERT INTO ecohanoi_groups" in q:
                code, xp, items = params
                cur = state["groups"].setdefault(code, {"xp": 0, "items": 0})
                cur["xp"] += xp
                cur["items"] += items
            elif "INSERT INTO ecohanoi_group_members" in q:
                state["members"].add(params)
            elif q.startswith("SELECT 1 FROM ecohanoi_groups"):
                self._rows = [(1,)] if params[0] in state["groups"] else []
            elif q.startswith("SELECT COUNT(*) FROM ecohanoi_groups"):
                self._rows = [(len(state["groups"]),)]
            elif q.startswith("SELECT xp FROM ecohanoi_groups"):
                g = state["groups"].get(params[0])
                self._rows = [(g["xp"],)] if g else []
            elif q.startswith("SELECT COUNT(*) FROM ecohanoi_group_members"):
                cnt = sum(1 for code, _ in state["members"] if code == params[0])
                self._rows = [(cnt,)]
            elif q.startswith("SELECT COUNT(*) + 1 FROM ecohanoi_groups"):
                xp, _, code = params
                ahead = sum(1 for k, v in state["groups"].items() if v["xp"] > xp or (v["xp"] == xp and k < code))
                self._rows = [(ahead + 1,)]
            elif q.startswith("SELECT code, xp FROM ecohanoi_groups ORDER BY"):
                ranked = sorted(state["groups"].items(), key=lambda kv: (-kv[1]["xp"], kv[0]))[:params[0]]
                self._rows = [(k, v["xp"]) for k, v in ranked]

        def fetchone(self):
            return self._rows[0] if self._rows else None

        def fetchall(self):
            return list(self._rows)

    class FakeTxn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    class FakeConn:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def cursor(self):
            return FakeCursor()

        def transaction(self):
            return FakeTxn()

        def commit(self):
            pass

    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@localhost/ecohanoi")
    monkeypatch.setattr(groups, "_pg_connect", lambda dsn: FakeConn())

    r1 = _score(c, "pg-01", "raw-dev-1", 40).json()
    assert r1 == {"code": "PG-01", "xp": 40, "members": 1, "rank": 1, "top": [{"code": "PG-01", "xp": 40}]}
    assert all("raw-dev-1" not in m for _, m in state["members"])
    assert c.get("/groups/MISSING").status_code == 404

    monkeypatch.setattr(groups, "MAX_GROUPS", 1)
    assert _score(c, "pg-01", "raw-dev-2", 10).status_code == 200
    r_full = _score(c, "pg-02", "raw-dev-1", 10)
    assert r_full.status_code == 503
    assert r_full.json() == {"error": "too_many_groups"}


def test_max_groups_limit_ram(c, monkeypatch):
    groups = importlib.import_module("serve.groups")
    monkeypatch.setattr(groups, "MAX_GROUPS", 3)
    for i in range(3):
        assert _score(c, f"GRP-{i}", "dev-1", 10).status_code == 200
    # Nhóm đã tồn tại vẫn cộng điểm bình thường
    assert _score(c, "GRP-0", "dev-2", 5).status_code == 200
    # Nhóm thứ MAX_GROUPS + 1 bị chặn 503 too_many_groups
    r = _score(c, "GRP-OVER", "dev-1", 10)
    assert r.status_code == 503
    assert r.json() == {"error": "too_many_groups"}
