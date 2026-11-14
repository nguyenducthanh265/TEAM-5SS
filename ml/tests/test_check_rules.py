import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("check_rules", ROOT / "scripts" / "check_rules.py")
cr = importlib.util.module_from_spec(spec); spec.loader.exec_module(cr)

GOOD = {"groups": [{"id": "a", "name": "A"}, {"id": "b", "name": "B"}, {"id": "c", "name": "C"}], "hazardous": {"note": "ok"}}


def write(tmp_path, data):
    p = tmp_path / "rules.json"; p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8"); return str(p)


def test_pass_on_complete_rules(tmp_path, capsys):
    assert cr.main([write(tmp_path, GOOD)]) == 0
    assert capsys.readouterr().out.strip().endswith("RESULT: PASS")


def test_todo_anywhere_fails_and_names_the_path(tmp_path, capsys):
    bad = json.loads(json.dumps(GOOD)); bad["hazardous"]["note"] = "TODO: xác nhận theo phụ lục QĐ 87"
    assert cr.main([write(tmp_path, bad)]) == 1
    out = capsys.readouterr().out
    assert "$.hazardous.note" in out and "RESULT: FAIL" in out


def test_wrong_group_count_missing_name_and_duplicate_id(tmp_path):
    four = {"groups": GOOD["groups"] + [{"id": "d", "name": "D"}]}
    assert any("cần đúng 3" in p for p in cr.check_rules(four))
    assert any("thiếu id hoặc name" in p for p in cr.check_rules({"groups": [{"id": "a"}, {"id": "b", "name": "B"}, {"id": "c", "name": "C"}]}))
    assert any("trùng" in p for p in cr.check_rules({"groups": [{"id": "a", "name": "A"}] * 3}))
    assert any("thiếu danh sách" in p for p in cr.check_rules({}))


def test_broken_json_fails(tmp_path, capsys):
    p = tmp_path / "x.json"; p.write_text("{", encoding="utf-8")
    assert cr.main([str(p)]) == 1 and "RESULT: FAIL" in capsys.readouterr().out


def test_scan_src_finds_old_taxonomy_but_skips_node_modules_and_rules_file(tmp_path, capsys):
    rules = write(tmp_path, GOOD)
    src = tmp_path / "src"; (src / "node_modules" / "x").mkdir(parents=True)
    (src / "Legend.tsx").write_text("const a = 'Thùng Vàng · Hữu cơ';\n", encoding="utf-8")
    (src / "node_modules" / "x" / "i.js").write_text("// vô cơ\n", encoding="utf-8")
    assert cr.main([rules, "--scan-src", str(src)]) == 1
    out = capsys.readouterr().out
    assert "Legend.tsx:1" in out and "node_modules" not in out
    (src / "Legend.tsx").write_text("const a = 'Chất thải thực phẩm';\n", encoding="utf-8")
    assert cr.main([rules, "--scan-src", str(src)]) == 0
