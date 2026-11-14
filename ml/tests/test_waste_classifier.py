"""Bộ phân loại rác theo file luật: prompt, hậu kiểm, lỗi khởi động. Dùng client giả, không gọi mạng."""
import importlib
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
RULES_FILE = ROOT.parent / "rules" / "qd87.json"


class FakeClient:
    """Giả client.responses.create của SDK openai: ghi lại tham số, trả output_text cho trước."""

    def __init__(self, text):
        self.text, self.calls = text, []
        self.responses = SimpleNamespace(create=self._create)

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(output_text=self.text, output=[], status="completed", usage=SimpleNamespace(total_tokens=42))


def _load(monkeypatch, rules_path=None):
    monkeypatch.chdir(ROOT)
    if rules_path is None:
        monkeypatch.delenv("RULES_PATH", raising=False)
    else:
        monkeypatch.setenv("RULES_PATH", str(rules_path))
    monkeypatch.setenv("OPENAI_MODEL", "model-gia-cho-test")
    sys.modules.pop("examples.waste_classifier", None)
    return importlib.import_module("examples.waste_classifier")


@pytest.fixture
def wc(monkeypatch):
    yield _load(monkeypatch)
    sys.modules.pop("examples.waste_classifier", None)


def _item(**over):
    base = {"name": "Chai nhựa", "group_id": "recyclable", "confidence": 0.9, "reason": "Bao bì nhựa", "tip": "Bóp dẹp",
            "hazardous": False, "sellable": True, "misplaced": False}
    return {**base, **over}


def _req(mode="item"):
    return json.dumps({"image": "data:image/jpeg;base64,AAAA", "mode": mode})


def test_default_rules_path_points_to_repo_rules(wc):
    assert wc.DEFAULT_RULES_PATH == RULES_FILE and RULES_FILE.is_file()


def test_prompt_is_built_from_rules_file(wc):
    rules = json.loads(RULES_FILE.read_text(encoding="utf-8"))
    for mode in ("item", "bag"):
        p = wc.PROMPTS[mode]
        for g in rules["groups"]:
            assert f'"{g["id"]}"' in p and g["name"] in p
            for ex in g["examples"] + g["exceptions"]:
                assert ex in p
        for ex in rules["hazardous"]["examples"] + rules["bulky"]["examples"]:
            assert ex in p
        for h in rules["hard_items"]:
            assert h["name"] in p and h["why"] in p and h["tip"] in p
        for banned in ("hữu cơ", "vô cơ", "4 thùng"):
            assert banned not in p.lower()
    assert "misplaced" in wc.PROMPTS["bag"] and "tối đa 8" in wc.PROMPTS["bag"]
    assert "đúng 1 món" in wc.PROMPTS["item"]


def test_prompt_follows_a_different_rules_file(monkeypatch, tmp_path):
    """Đổi file luật thì prompt và id hợp lệ đổi theo: không có tên nhóm nào viết cứng trong code."""
    rules = {"city": "X", "source": "Văn bản thử", "groups": [
        {"id": "nhom_a", "name": "Nhóm thử A", "examples": ["vd a"], "exceptions": ["nl a"]},
        {"id": "nhom_b", "name": "Nhóm thử B", "examples": [], "exceptions": []}]}
    f = tmp_path / "r.json"
    f.write_text(json.dumps(rules, ensure_ascii=False), encoding="utf-8")
    m = _load(monkeypatch, f)
    assert m.GROUP_IDS == ["nhom_a", "nhom_b"]
    p = m.PROMPTS["item"]
    assert "Nhóm thử A" in p and "nl a" in p and "recyclable" not in p and "food" not in p
    out = m.postprocess([_item(group_id="recyclable"), _item(name="B", group_id="nhom_b")], "bag", m.GROUP_IDS)
    assert [i["group_id"] for i in out] == ["unknown", "nhom_b"]
    sys.modules.pop("examples.waste_classifier", None)


@pytest.mark.parametrize("content", ['{"groups": [{"id": "a", "name": "TODO điền tên"}]}', "{hong", '{"groups": []}', None])
def test_bad_rules_file_fails_at_import(monkeypatch, tmp_path, content):
    f = tmp_path / "rules.json"
    if content is not None:
        f.write_text(content, encoding="utf-8")
    with pytest.raises(Exception) as e:
        _load(monkeypatch, f)
    assert type(e.value).__name__ == "RulesError"
    sys.modules.pop("examples.waste_classifier", None)


def test_postprocess_unknown_id_and_low_confidence(wc):
    out = wc.postprocess([
        _item(name="A", group_id="nhom_thu_tu"),
        _item(name="B", confidence=0.49),
        _item(name="C", confidence=7),
        _item(name="D", confidence=-3),
        _item(name="E", confidence="cao"),
        _item(name="F", confidence=0.5),
        _item(name="G", group_id=None),
    ], "bag", wc.GROUP_IDS)
    got = {i["name"]: (i["group_id"], i["confidence"]) for i in out}
    assert got == {"A": ("unknown", 0.9), "B": ("unknown", 0.49), "C": ("recyclable", 1.0), "D": ("unknown", 0.0),
                   "E": ("unknown", 0.0), "F": ("recyclable", 0.5), "G": ("unknown", 0.9)}


def test_postprocess_clips_dedupes_and_limits(wc):
    long = _item(name="x" * 100, reason="y" * 300, tip="z" * 300)
    out = wc.postprocess([long], "item", wc.GROUP_IDS)[0]
    assert (len(out["name"]), len(out["reason"]), len(out["tip"])) == (40, 120, 80)
    dup = wc.postprocess([_item(), _item(name=" chai  NHỰA "), _item(name="Lon")], "bag", wc.GROUP_IDS)
    assert [i["name"] for i in dup] == ["Chai nhựa", "Lon"]
    many = [_item(name=f"Món {i}") for i in range(12)]
    assert len(wc.postprocess(many, "bag", wc.GROUP_IDS)) == 8
    assert len(wc.postprocess(many, "item", wc.GROUP_IDS)) == 1
    assert wc.postprocess([_item(name=""), "rác", None, _item(name=5)], "bag", wc.GROUP_IDS) == []
    assert wc.postprocess("không phải list", "bag", wc.GROUP_IDS) == []
    flags = wc.postprocess([_item(hazardous="true", sellable=1)], "item", wc.GROUP_IDS)[0]
    assert flags["hazardous"] is False and flags["sellable"] is False  # chỉ nhận đúng true của JSON


@pytest.mark.parametrize("confidence", [float("inf"), float("-inf"), "Infinity", float("nan")])
def test_non_finite_confidence_cannot_produce_confident_label(wc, confidence):
    item = wc.postprocess([_item(confidence=confidence)], "item", wc.GROUP_IDS)[0]
    assert item["confidence"] == 0.0 and item["group_id"] == "unknown"


def test_run_item_mode_sends_image_and_json_format(wc):
    fake = FakeClient(json.dumps({"items": [_item(misplaced=True), _item(name="Vật phụ")]}))
    r = wc.run(_req("item"), timeout=3, client=fake)
    assert r["source"] == "ai" and r["tokens"] == 42
    items = json.loads(r["output"])["items"]
    assert len(items) == 1 and items[0]["group_id"] == "recyclable" and items[0]["misplaced"] is False
    call = fake.calls[0]
    assert call["model"] == "model-gia-cho-test" and call["instructions"] == wc.PROMPTS["item"]
    assert call["text"] == {"format": {"type": "json_object"}}
    parts = call["input"][0]["content"]
    assert parts[1] == {"type": "input_image", "image_url": "data:image/jpeg;base64,AAAA"}


def test_run_bag_mode_keeps_misplaced_flag(wc):
    fake = FakeClient(json.dumps({"items": [_item(), _item(name="Lon"), _item(name="Vỏ chuối", group_id="food", misplaced=True)]}))
    items = json.loads(wc.run(_req("bag"), client=fake)["output"])["items"]
    assert [i["misplaced"] for i in items] == [False, False, True]
    assert fake.calls[0]["instructions"] == wc.PROMPTS["bag"]


def test_run_empty_items_is_still_ai(wc):
    from mlkit.result import normalize
    r = wc.run(_req(), client=FakeClient('{"items": []}'))
    assert normalize(r)["ok"] and json.loads(r["output"]) == {"items": []}


@pytest.mark.parametrize("text", ["{hong", '["a"]', '{"items": "x"}', '{"khac": 1}'])
def test_run_broken_json_raises(wc, text):
    with pytest.raises(wc.BadModelOutput):
        wc.run(_req(), client=FakeClient(text))


def test_run_no_text_and_missing_model_raise(wc, monkeypatch):
    with pytest.raises(wc.NoTextError):
        wc.run(_req(), client=FakeClient(""))
    monkeypatch.delenv("OPENAI_MODEL")
    with pytest.raises(ValueError):
        wc.run(_req(), client=FakeClient('{"items": []}'))


def test_run_accepts_bare_base64_and_plain_text(wc):
    fake = FakeClient('{"items": []}')
    wc.run(json.dumps({"image": "AAAA", "mode": "bag"}), client=fake)
    assert fake.calls[0]["input"][0]["content"][1]["image_url"] == "data:image/jpeg;base64,AAAA"
    wc.run("vỏ chuối", client=fake)  # /predict của smoke test gửi chữ
    parts = fake.calls[1]["input"][0]["content"]
    assert len(parts) == 1 and "vỏ chuối" in parts[0]["text"]
    with pytest.raises(ValueError):
        wc.run("   ", client=fake)
