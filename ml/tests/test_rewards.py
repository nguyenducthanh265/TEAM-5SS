"""Luật điểm và chuỗi do server tính. Dùng đồng hồ giả: không phụ thuộc giờ máy chạy test."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from serve import rewards as rw

VN = rw.VN_TZ


def vn(month, day, hour=12, year=2026):
    return datetime(year, month, day, hour, tzinfo=VN)


def play(dev, when, observed, claimed=None, tag="a"):
    """Một ngày chơi: server thấy `observed` món (mỗi món một ảnh khác nhau), app xác nhận `claimed` món."""
    for i in range(observed):
        rw.observe(dev, 1, f"{tag}-{when.isoformat()}-{i}", when)
    return rw.claim(dev, observed if claimed is None else claimed, when)


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)  # file này kiểm nhánh RAM; nhánh Postgres ở test_rewards_pg.py
    rw.reset()
    yield
    rw.reset()


def test_constants_match_the_agreed_rules():
    assert rw.XP_PER_ITEM == 2
    assert rw.MAX_ITEMS_PER_DAY == 15
    assert rw.MIN_ITEMS_FOR_STREAK == 5
    assert rw.STREAK_BONUS == (20, 20, 30, 40, 40, 50, 70)
    assert rw.MAX_RESTORES_PER_MONTH == 3


def test_new_device_starts_at_zero():
    s = rw.status("dev", vn(11, 14))
    assert (s["xp"], s["streak"], s["dayIndex"], s["todayItems"]) == (0, 0, 0, 0)
    assert s["restoresLeft"] == 3 and s["nextBonus"] == 20 and not s["qualifiedToday"]


def test_each_item_is_2_xp_and_under_5_items_gives_no_streak():
    s = play("dev", vn(11, 14), observed=4)
    assert s["gainedItems"] == 4 and s["gainedItemXp"] == 8 and s["gainedBonus"] == 0
    assert s["xp"] == 8 and s["streak"] == 0 and not s["qualifiedToday"]


def test_five_items_qualify_the_day_and_pay_day_one_bonus():
    s = play("dev", vn(11, 14), observed=5)
    assert s["gainedItemXp"] == 10 and s["gainedBonus"] == 20 and s["gained"] == 30
    assert s["xp"] == 30 and s["streak"] == 1 and s["dayIndex"] == 1 and s["qualifiedToday"]
    assert s["nextBonus"] == 20


def test_streak_bonus_is_paid_once_per_day():
    play("dev", vn(11, 14), observed=5)
    s = play("dev", vn(11, 14), observed=3, tag="b")
    assert s["gainedBonus"] == 0 and s["gainedItemXp"] == 6 and s["xp"] == 30 + 6 and s["streak"] == 1


def test_daily_cap_is_15_items_so_max_30_item_xp():
    s = play("dev", vn(11, 14), observed=40)
    assert s["todayItems"] == 15 and s["gainedItemXp"] == 30
    again = play("dev", vn(11, 14), observed=40, tag="b")
    assert again["gainedItems"] == 0 and again["gainedItemXp"] == 0 and again["xp"] == s["xp"]


def test_client_cannot_claim_more_than_the_server_saw():
    for i in range(7):
        rw.observe("dev", 1, f"img-{i}", vn(11, 14))
    s = rw.claim("dev", 100, vn(11, 14))
    assert s["gainedItems"] == 7


def test_claim_without_any_observation_pays_nothing():
    s = rw.claim("dev", 15, vn(11, 14))
    assert s["gained"] == 0 and s["xp"] == 0 and s["streak"] == 0


def test_same_image_resent_is_counted_once():
    for _ in range(10):
        rw.observe("dev", 1, "cung-mot-anh", vn(11, 14))
    assert rw.claim("dev", 10, vn(11, 14))["gainedItems"] == 1


def test_unknown_items_are_not_counted_by_observe_with_zero_valid():
    rw.observe("dev", 0, "anh", vn(11, 14))
    assert rw.claim("dev", 5, vn(11, 14))["gainedItems"] == 0


def test_seven_day_cycle_then_back_to_day_one():
    bonuses = []
    for d in range(14, 22):  # 8 ngày liên tiếp
        s = play("dev", vn(11, d), observed=5)
        bonuses.append((s["gainedBonus"], s["dayIndex"]))
    assert [b for b, _ in bonuses] == [20, 20, 30, 40, 40, 50, 70, 20]
    assert [i for _, i in bonuses] == [1, 2, 3, 4, 5, 6, 7, 1]
    assert s["streak"] == 8


def test_missing_one_day_restores_the_streak_and_uses_a_restore():
    play("dev", vn(11, 14), observed=5)
    play("dev", vn(11, 15), observed=5)
    before = rw.status("dev", vn(11, 17))  # đã bỏ lỡ ngày 16
    assert before["restorable"] and before["streak"] == 2 and before["restoresLeft"] == 3
    s = play("dev", vn(11, 17), observed=5)
    assert s["restored"] and s["streak"] == 3 and s["gainedBonus"] == 30 and s["restoresLeft"] == 2


def test_at_most_three_restores_per_month():
    day = 1
    play("dev", vn(11, day), observed=5)
    for _ in range(3):  # ba lần bỏ lỡ 1 ngày, đều được khôi phục
        day += 2
        s = play("dev", vn(11, day), observed=5)
        assert s["restored"]
    assert s["restoresLeft"] == 0 and s["streak"] == 4
    day += 2
    assert rw.status("dev", vn(11, day))["restorable"] is False
    s = play("dev", vn(11, day), observed=5)
    assert s["restored"] is False and s["streak"] == 1 and s["gainedBonus"] == 20


def test_restores_refill_in_a_new_month():
    play("dev", vn(10, 28), observed=5)
    for d in (30,):
        play("dev", vn(10, d), observed=5)  # khôi phục lần 1 của tháng 10
    s = rw.status("dev", vn(11, 1))
    assert s["restoresLeft"] == 3


def test_missing_two_days_or_more_resets_to_day_one_and_cannot_be_restored():
    play("dev", vn(11, 14), observed=5)
    play("dev", vn(11, 15), observed=5)
    s = rw.status("dev", vn(11, 18))  # bỏ lỡ 16 và 17
    assert s["restorable"] is False and s["streak"] == 0
    s = play("dev", vn(11, 18), observed=5)
    assert s["streak"] == 1 and s["restored"] is False and s["restoresLeft"] == 3


def test_broken_streak_is_shown_as_zero_until_next_qualifying_day():
    play("dev", vn(11, 1), observed=5)
    assert rw.status("dev", vn(11, 9))["streak"] == 0


def test_day_boundary_is_vietnam_time_not_utc():
    # 18:00 UTC ngày 14 = 01:00 ngày 15 giờ Việt Nam
    t = datetime(2026, 11, 14, 18, 0, tzinfo=timezone.utc)
    assert rw.status("dev", t)["today"] == "2026-11-15"
    late = datetime(2026, 11, 14, 16, 59, tzinfo=timezone.utc)  # 23:59 giờ Việt Nam ngày 14
    assert rw.status("dev", late)["today"] == "2026-11-14"


def test_changing_the_phone_clock_cannot_skip_days():
    """App không gửi ngày: hai lần claim cách nhau vài giây vẫn cùng một ngày, nên không thể nhảy chuỗi."""
    t = vn(11, 14, 9)
    play("dev", t, observed=5)
    s = play("dev", t + timedelta(seconds=5), observed=5, tag="b")
    assert s["streak"] == 1 and s["gainedBonus"] == 0


def test_devices_are_independent():
    play("a", vn(11, 14), observed=5)
    assert rw.status("b", vn(11, 14))["xp"] == 0


def test_daily_counters_reset_on_a_new_day():
    play("dev", vn(11, 14), observed=15)
    s = rw.status("dev", vn(11, 15))
    assert s["todayItems"] == 0 and s["qualifiedToday"] is False


def test_http_endpoints(monkeypatch):
    app = FastAPI()
    app.include_router(rw.router)
    c = TestClient(app)
    monkeypatch.setattr(rw, "_now", lambda: vn(11, 14))
    for i in range(6):
        rw.observe("dev-http", 1, f"i{i}")
    r = c.post("/progress/claim", json={"deviceId": "dev-http", "items": 6})
    assert r.status_code == 200
    j = r.json()
    assert j["xp"] == 12 + 20 and j["streak"] == 1 and j["gainedBonus"] == 20
    g = c.get("/progress", params={"d": "dev-http"})
    assert g.status_code == 200 and g.json()["xp"] == 32
    assert c.post("/progress/claim", json={"deviceId": "", "items": 1}).status_code == 422
    assert c.post("/progress/claim", json={"deviceId": "x", "items": -1}).status_code == 422
    assert c.get("/progress").status_code == 422


def test_too_many_devices_is_refused(monkeypatch):
    monkeypatch.setattr(rw, "MAX_DEVICES", 2)
    assert rw.status("a", vn(11, 14)) is not None
    assert rw.status("b", vn(11, 14)) is not None
    assert rw.status("c", vn(11, 14)) is None


# ---- điểm nhóm chỉ được cộng trong phạm vi điểm thật của máy ----
def test_group_credit_cannot_exceed_real_xp():
    assert rw.credit_group("dev", 200, vn(11, 14)) == 0  # chưa kiếm điểm nào: không cộng được gì
    play("dev", vn(11, 14), observed=5)  # 30 điểm thật
    assert rw.credit_group("dev", 200, vn(11, 14)) == 30
    assert rw.credit_group("dev", 200, vn(11, 14)) == 0  # đã chuyển hết, gọi lại không có thêm
    play("dev", vn(11, 15), observed=5)  # +30 điểm thật
    assert rw.credit_group("dev", 10, vn(11, 15)) == 10
    assert rw.credit_group("dev", 200, vn(11, 15)) == 20


def test_group_credit_ignores_negative_requests_and_other_devices():
    play("a", vn(11, 14), observed=5)
    assert rw.credit_group("a", -50, vn(11, 14)) == 0
    assert rw.credit_group("b", 50, vn(11, 14)) == 0


def test_groups_endpoint_uses_the_real_xp_cap(monkeypatch):
    from serve import groups as gr

    gr.reset()
    app = FastAPI()
    app.include_router(gr.router)
    c = TestClient(app)
    monkeypatch.setattr(rw, "_now", lambda: vn(11, 14))

    def post(dev, xp):
        return c.post("/groups/score", json={"code": "KTX-B2", "deviceId": dev, "xpDelta": xp, "items": 1}).json()

    assert post("ke-gian-lan", 200)["xp"] == 0  # tự bịa 200 điểm: nhóm vẫn 0
    for i in range(5):
        rw.observe("that", 1, f"i{i}")
    rw.claim("that", 5)  # 30 điểm thật
    assert post("that", 200)["xp"] == 30
    assert post("that", 200)["xp"] == 30  # gọi lặp không tăng thêm
    gr.reset()
