"""Kiểm tra file luật (ví dụ rules/qd87.json) và mã nguồn app trước khi build/pitch.
  python scripts/check_rules.py rules/qd87.json
  python scripts/check_rules.py rules/qd87.json --groups 3 --scan-src app/src --forbid "hữu cơ" "vô cơ" "4 thùng"
Lỗi (thoát mã 1) khi: JSON hỏng; còn ô "TODO"; số nhóm khác --groups; nhóm thiếu id/name hoặc trùng id;
mã nguồn còn từ bị cấm (từ của hệ phân loại cũ). Dòng cuối luôn là RESULT: PASS hoặc RESULT: FAIL ...
Chỉ kiểm hình thức. Nội dung đúng văn bản luật hay không thì người phải đối chiếu."""
import argparse, json, os, sys

SRC_EXT = (".ts", ".tsx", ".js", ".jsx", ".json", ".py", ".md")
SKIP_DIRS = {"node_modules", ".git", ".expo", "dist", "build", "android", "ios", "__pycache__", ".venv", "venv"}


def find_todos(node, path="$"):
    """Trả về danh sách đường dẫn JSON có chuỗi chứa 'TODO'."""
    out = []
    if isinstance(node, dict):
        for k, v in node.items():
            out += find_todos(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            out += find_todos(v, f"{path}[{i}]")
    elif isinstance(node, str) and "TODO" in node.upper():
        out.append(path)
    return out


def check_rules(data, groups_expected=3, groups_key="groups"):
    problems = []
    todos = find_todos(data)
    if todos:
        problems.append(f"còn {len(todos)} ô TODO: " + ", ".join(todos[:8]) + (" ..." if len(todos) > 8 else ""))
    groups = data.get(groups_key) if isinstance(data, dict) else None
    if not isinstance(groups, list):
        problems.append(f"thiếu danh sách '{groups_key}'")
        return problems
    if len(groups) != groups_expected:
        problems.append(f"có {len(groups)} nhóm, cần đúng {groups_expected}")
    ids = []
    for i, g in enumerate(groups):
        if not isinstance(g, dict) or not str(g.get("id", "")).strip() or not str(g.get("name", "")).strip():
            problems.append(f"nhóm thứ {i + 1} thiếu id hoặc name")
        else:
            ids.append(g["id"])
    if len(set(ids)) != len(ids):
        problems.append("id nhóm bị trùng")
    return problems


def scan_src(root, words, skip_file=None):
    """Tìm từ bị cấm trong mã nguồn (không phân biệt hoa thường). Trả về ['file:dòng: từ']."""
    hits, low = [], [w.lower() for w in words]
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            fp = os.path.join(dp, fn)
            if not fn.endswith(SRC_EXT) or (skip_file and os.path.abspath(fp) == os.path.abspath(skip_file)):
                continue
            try:
                lines = open(fp, encoding="utf-8").read().splitlines()
            except (UnicodeDecodeError, OSError):
                continue
            for n, line in enumerate(lines, 1):
                ll = line.lower()
                for w in low:
                    if w in ll:
                        hits.append(f"{os.path.relpath(fp, root)}:{n}: {w}")
    return hits


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("rules")
    ap.add_argument("--groups", type=int, default=3)
    ap.add_argument("--groups-key", default="groups")
    ap.add_argument("--scan-src", help="thư mục mã nguồn app cần quét từ bị cấm")
    ap.add_argument("--forbid", nargs="*", default=["hữu cơ", "vô cơ", "4 thùng"])
    a = ap.parse_args(argv)
    try:
        data = json.load(open(a.rules, encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"RESULT: FAIL không đọc được {a.rules}: {e}")
        return 1
    problems = check_rules(data, a.groups, a.groups_key)
    if a.scan_src:
        hits = scan_src(a.scan_src, a.forbid, skip_file=a.rules)
        if hits:
            problems.append(f"mã nguồn còn {len(hits)} chỗ dùng từ của hệ cũ: " + "; ".join(hits[:8]) + (" ..." if len(hits) > 8 else ""))
    for p in problems:
        print("-", p)
    print("RESULT: PASS" if not problems else f"RESULT: FAIL {len(problems)} lỗi")
    return 0 if not problems else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
