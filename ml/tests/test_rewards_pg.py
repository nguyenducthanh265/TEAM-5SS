"""Nhánh Postgres của serve/rewards.py, kiểm bằng psycopg giả (một bảng trong bộ nhớ): không cần cơ sở dữ liệu thật.

Điều quan trọng nhất cần chứng minh: điểm và chuỗi SỐNG SÓT khi server khởi động lại (xóa sạch RAM), và lỗi cơ sở dữ liệu
không làm hỏng /classify."""
import sys
from contextlib import contextmanager
from datetime import date, datetime
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from serve import rewards as rw

VN = rw.VN_TZ


def vn(month, day, hour=12, year=2026):
    return datetime(year, month, day, hour, tzinfo=VN)


class FakeDB:
    def __init__(self):
        self.rows = {}  # device_hash -> chuỗi JSON (như cột JSONB)
        self.created = 0
        self.statements = []


class _Cur:
    def __init__(self, db):
        self.db, self.row = db, None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=()):
        s = " ".join(sql.split())
        self.db.statements.append(s)
        if s.startswith("CREATE TABLE"):
            self.db.created += 1
        elif s.startswith("SELECT state FROM ecohanoi_rewards"):
            self.row = (self.db.rows[params[0]],) if params[0] in self.db.rows else None
        elif s.startswith("SELECT COUNT(*)"):
            self.row = (len(self.db.rows),)
        elif s.startswith("INSERT INTO ecohanoi_rewards"):
            self.db.rows.setdefault(params[0], params[1])
        elif s.startswith("UPDATE ecohanoi_rewards"):
            self.db.rows[params[1]] = params[0]
        else:
            raise AssertionError(f"câu lệnh lạ: {s}")

    def fetchone(self):
        return self.row


class _Conn:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def cursor(self):
        return _Cur(self.db)

    @contextmanager
    def transaction(self):
        yield

    def commit(self):
        pass


@pytest.fixture()
def pg(monkeypatch):
    db = FakeDB()
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@host/db")
    monkeypatch.setitem(sys.modules, "psycopg", SimpleNamespace(connect=lambda dsn: _Conn(db)))
    rw.reset()
    yield db
    rw.reset()


def play(dev, when, n, tag="a"):
    for i in range(n):
        rw.observe(dev, 1, f"{tag}-{when.isoformat()}-{i}", when)
    return rw.claim(dev, n, when)


def test_database_url_postgres_scheme_is_normalised(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@h/d")
    assert rw._database_url() == "postgresql://u:p@h/d"


def test_state_survives_a_server_restart(pg):
    s = play("dev", vn(11, 14), 5)
    assert s["xp"] == 30 and s["streak"] == 1
    rw.reset()  # mô phỏng server ngủ rồi khởi động lại: RAM sạch, bảng vẫn còn
    assert rw._devices == {}
    after = rw.status("dev", vn(11, 14))
    assert after["xp"] == 30 and after["streak"] == 1 and after["todayItems"] == 5 and after["qualifiedToday"]
    assert rw._devices == {}, "không được lén dùng RAM khi đã có DATABASE_URL"
    assert len(pg.rows) == 1 and pg.created == 2  # bảng được kiểm tạo lại sau khi "khởi động"


def test_same_rules_as_ram_across_days_and_restore(pg):
    bonuses = [play("dev", vn(11, d), 5)["gainedBonus"] for d in (14, 15, 16)]
    assert bonuses == [20, 20, 30]
    s = play("dev", vn(11, 18), 5)  # bỏ lỡ ngày 17
    assert s["restored"] and s["streak"] == 4 and s["gainedBonus"] == 40 and s["restoresLeft"] == 2


def test_only_the_device_hash_is_stored_never_the_raw_id(pg):
    play("thiet-bi-bi-mat", vn(11, 14), 5)
    assert all("thiet-bi-bi-mat" not in k for k in pg.rows)
    assert all("thiet-bi-bi-mat" not in v for v in pg.rows.values())


def test_server_side_dedupe_and_cap_hold_in_postgres(pg):
    for _ in range(5):
        rw.observe("dev", 1, "cung-mot-anh", vn(11, 14))
    assert rw.claim("dev", 15, vn(11, 14))["gainedItems"] == 1
    for i in range(40):
        rw.observe("dev", 1, f"k{i}", vn(11, 14))
    assert rw.claim("dev", 40, vn(11, 14))["todayItems"] == 15


def test_device_limit_in_postgres(pg, monkeypatch):
    monkeypatch.setattr(rw, "MAX_DEVICES", 1)
    assert rw.status("a", vn(11, 14)) is not None
    assert rw.status("b", vn(11, 14)) is None
    assert rw.status("a", vn(11, 14)) is not None  # máy cũ vẫn dùng được


def test_read_modify_write_runs_inside_one_row_lock(pg):
    play("dev", vn(11, 14), 5)
    sel = [s for s in pg.statements if s.startswith("SELECT state")]
    assert sel and all(s.endswith("FOR UPDATE") for s in sel)


def test_decode_encode_round_trip():
    st = rw._new_state()
    st.update(xp=130, streak=3, last_day=date(2026, 11, 14), restores={"2026-11": 2}, day="2026-11-14", observed=7,
              claimed=5, bonus=True, seen={"b", "a"})
    assert rw._decode(rw._encode(st)) == st
    assert rw._decode("{}") == rw._new_state()


def _broken_db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://x")

    def boom(dsn):
        raise RuntimeError("postgresql://user:SECRET@host/db hết kết nối")

    monkeypatch.setitem(sys.modules, "psycopg", SimpleNamespace(connect=boom))
    rw.reset()


def test_observe_never_raises_when_the_database_is_down(monkeypatch, capsys):
    _broken_db(monkeypatch)
    assert rw.observe("dev", 3, "anh", vn(11, 14)) is None  # không ném lỗi: /classify không bị hỏng
    assert "SECRET" not in capsys.readouterr().out


def test_endpoints_answer_503_without_leaking_the_connection_string(monkeypatch, capsys):
    _broken_db(monkeypatch)
    app = FastAPI()
    app.include_router(rw.router)
    c = TestClient(app)
    r1 = c.post("/progress/claim", json={"deviceId": "dev", "items": 5})
    r2 = c.get("/progress", params={"d": "dev"})
    for r in (r1, r2):
        assert r.status_code == 503 and r.json() == {"error": "storage_unavailable"}
        assert "SECRET" not in r.text
    assert "SECRET" not in capsys.readouterr().out
