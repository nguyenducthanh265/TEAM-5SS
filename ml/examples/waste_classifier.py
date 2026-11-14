"""Phân loại rác theo file luật (rules/qd87.json) bằng OpenAI Responses API, nhận ảnh hoặc mô tả chữ.

Hợp đồng mlkit/result.py: thành công trả {"output": '{"items":[...]}', "tokens", "source": "ai"}; lỗi thì ném exception
(server serve/app_llm.py đổi thành source="fallback"). Không bao giờ tự bịa kết quả.

Đầu vào `run(input)`:
  - Chuỗi JSON {"image": "data:image/jpeg;base64,..." | "<base64>", "mode": "item" | "bag"}  (endpoint /classify gửi dạng này)
  - Chuỗi thường: mô tả món bằng chữ (dùng cho smoke test /predict), coi như mode "item".

File luật đọc MỘT lần lúc import (biến RULES_PATH, mặc định <gốc repo>/rules/qd87.json). Thiếu file, JSON hỏng hoặc
còn chữ "TODO" thì import ném lỗi: server không khởi động với luật hỏng. Mọi tên nhóm trong prompt lấy từ file luật.
Model lấy từ biến OPENAI_MODEL. Ảnh chỉ nằm trong bộ nhớ, không ghi đĩa, không in ra log.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

try:  # chạy từ ml/ (uvicorn serve.app_llm:app, pytest)
    from examples.openai_system_template import NoTextError, extract_text
except ImportError:  # chạy như module trong gói khác
    from .openai_system_template import NoTextError, extract_text

UNKNOWN = "unknown"
MIN_CONFIDENCE = 0.5
MAX_ITEMS = {"item": 1, "bag": 8}
MAX_NAME, MAX_REASON, MAX_TIP = 40, 120, 80
DEFAULT_RULES_PATH = Path(__file__).resolve().parents[2] / "rules" / "qd87.json"


class RulesError(RuntimeError):
    """File luật thiếu, hỏng hoặc chưa soạn xong."""


class BadModelOutput(RuntimeError):
    """Model trả về thứ không phải JSON đúng dạng {"items": [...]}."""


def load_rules(path=None):
    """Đọc và kiểm file luật. Ném RulesError nếu không dùng được."""
    p = Path(path or os.environ.get("RULES_PATH") or DEFAULT_RULES_PATH)
    try:
        raw = p.read_text(encoding="utf-8")
    except OSError as e:
        raise RulesError(f"Không đọc được file luật {p}: {e}") from e
    if "TODO" in raw:
        raise RulesError(f"File luật {p} còn chữ TODO: soạn xong rồi mới chạy server.")
    try:
        rules = json.loads(raw)
    except ValueError as e:
        raise RulesError(f"File luật {p} không phải JSON hợp lệ: {e}") from e
    groups = rules.get("groups") if isinstance(rules, dict) else None
    if not isinstance(groups, list) or not groups:
        raise RulesError(f"File luật {p} thiếu danh sách groups.")
    ids = []
    for g in groups:
        if not isinstance(g, dict) or not str(g.get("id") or "").strip() or not str(g.get("name") or "").strip():
            raise RulesError(f"File luật {p}: mỗi nhóm phải có id và name.")
        ids.append(g["id"])
    if len(set(ids)) != len(ids) or UNKNOWN in ids:
        raise RulesError(f"File luật {p}: id nhóm trùng nhau hoặc dùng id dành riêng '{UNKNOWN}'.")
    return rules


def group_ids(rules):
    return [g["id"] for g in rules["groups"]]


def _bullets(values):
    return "\n".join(f"  - {v}" for v in values or [] if isinstance(v, str) and v.strip())


def build_system_prompt(rules, mode="item"):
    """Dựng system prompt hoàn toàn từ file luật. mode quyết định số món được trả."""
    ids = group_ids(rules)
    lines = [
        f"Bạn phân loại rác sinh hoạt tại {rules.get('city', '')} theo đúng văn bản: {rules.get('source', '')}.",
        f"Chỉ được dùng các group_id sau: {', '.join(ids)}. Không tự tạo nhóm khác.",
        "",
        "CÁC NHÓM:",
    ]
    for g in rules["groups"]:
        lines.append(f"- group_id \"{g['id']}\": {g['name']}" + (f" ({g['ref']})" if g.get("ref") else ""))
        if g.get("examples"):
            lines.append(" Ví dụ:\n" + _bullets(g["examples"]))
        if g.get("exceptions"):
            lines.append(" Ngoại lệ:\n" + _bullets(g["exceptions"]))
    hz = rules.get("hazardous") or {}
    if hz:
        lines += ["", "CHẤT THẢI NGUY HẠI (đặt hazardous=true, group_id theo quy định dưới đây):",
                  f" Quy định: {hz.get('regulation', '')}", f" Hướng dẫn: {hz.get('note', '')}",
                  " Ví dụ:\n" + _bullets(hz.get("examples"))]
    bk = rules.get("bulky") or {}
    if bk:
        lines += ["", "CHẤT THẢI CỒNG KỀNH:", f" Quy định: {bk.get('regulation', '')}", f" Hướng dẫn: {bk.get('note', '')}",
                  " Ví dụ:\n" + _bullets(bk.get("examples"))]
    hard = [h for h in rules.get("hard_items") or [] if isinstance(h, dict) and h.get("name")]
    if hard:
        lines += ["", "MÓN DỄ PHÂN LOẠI SAI (làm đúng theo bảng này):"]
        for h in hard:
            flag = ", hazardous=true" if h.get("hazardous") else ""
            lines.append(f"- {h['name']} -> group_id \"{h.get('group_id', '')}\"{flag}. Vì: {h.get('why', '')} Mẹo: {h.get('tip', '')}")
    lines += [
        "",
        "ĐẦU RA: đúng một object JSON, không kèm chữ nào khác, dạng",
        '{"items":[{"name":"...","group_id":"...","confidence":0.0,"reason":"...","tip":"...","hazardous":false,"sellable":false,"misplaced":false}]}',
        f"- name: tên món bằng tiếng Việt, tối đa {MAX_NAME} ký tự.",
        f"- group_id: một trong [{', '.join(ids)}].",
        "- confidence: số từ 0 đến 1, mức chắc chắn của bạn. Không chắc thì cho thấp, đừng đoán bừa.",
        f"- reason: một câu tiếng Việt, tối đa {MAX_REASON} ký tự, nêu căn cứ theo văn bản.",
        f"- tip: mẹo xử lý trước khi bỏ, tối đa {MAX_TIP} ký tự.",
        "- hazardous: true nếu là chất thải nguy hại theo phần trên.",
        "- sellable: true nếu món thường bán được cho người thu mua phế liệu (giấy, nhựa, kim loại sạch).",
    ]
    if mode == "bag":
        lines += [
            f"CHẾ ĐỘ CẢ TÚI: liệt kê các món nhìn rõ trong ảnh, tối đa {MAX_ITEMS['bag']} món, không lặp tên.",
            "- misplaced: true cho món có group_id khác với nhóm của đa số món trong túi; các món còn lại false.",
        ]
    else:
        lines += [
            "CHẾ ĐỘ MỘT MÓN: trả đúng 1 món, là món chiếm phần lớn khung hình. Bỏ qua nền và vật phụ.",
            "- misplaced: luôn false.",
        ]
    lines.append('Ảnh không phải rác, quá mờ, quá tối hoặc không nhận ra món nào: trả {"items": []}.')
    return "\n".join(lines)


def _clip(value, limit):
    s = " ".join(value.split()) if isinstance(value, str) else ""
    return s if len(s) <= limit else s[: limit - 1].rstrip() + "…"


def _confidence(value):
    if isinstance(value, bool):
        return 0.0
    try:
        c = float(value)
    except (TypeError, ValueError):
        return 0.0
    if math.isnan(c):
        return 0.0
    return max(0.0, min(1.0, c))


def postprocess(raw_items, mode, valid_ids):
    """Hậu kiểm thuần (không I/O): không tin model. Trả list món đã làm sạch, khóa snake_case."""
    limit = MAX_ITEMS.get(mode, 1)
    valid = set(valid_ids)
    out, seen = [], set()
    for it in raw_items if isinstance(raw_items, list) else []:
        if not isinstance(it, dict):
            continue
        name = _clip(it.get("name"), MAX_NAME)
        key = name.casefold()
        if not name or key in seen:
            continue
        seen.add(key)
        conf = _confidence(it.get("confidence"))
        gid = it.get("group_id")
        if not isinstance(gid, str) or gid not in valid or conf < MIN_CONFIDENCE:
            gid = UNKNOWN
        out.append({
            "name": name,
            "group_id": gid,
            "confidence": round(conf, 3),
            "reason": _clip(it.get("reason"), MAX_REASON),
            "tip": _clip(it.get("tip"), MAX_TIP),
            "hazardous": it.get("hazardous") is True,
            "sellable": it.get("sellable") is True,
            "misplaced": mode == "bag" and it.get("misplaced") is True,
        })
        if len(out) >= limit:
            break
    return out


def parse_model_json(text):
    """Chuỗi model trả -> list món thô. Sai dạng thì ném BadModelOutput."""
    try:
        d = json.loads(text)
    except (TypeError, ValueError) as e:
        raise BadModelOutput("bad_json") from e
    if not isinstance(d, dict) or not isinstance(d.get("items"), list):
        raise BadModelOutput("bad_shape")
    return d["items"]


def parse_input(text):
    """-> (image_url hoặc None, mô tả chữ, mode)."""
    s = text.strip() if isinstance(text, str) else ""
    if s.startswith("{"):
        try:
            d = json.loads(s)
        except ValueError:
            d = None
        if isinstance(d, dict) and ("image" in d or "mode" in d or "text" in d):
            mode = d.get("mode") if d.get("mode") in MAX_ITEMS else "item"
            image = d.get("image") if isinstance(d.get("image"), str) and d.get("image").strip() else None
            if image and not image.startswith(("data:", "http://", "https://")):
                image = "data:image/jpeg;base64," + image.strip()
            return image, str(d.get("text") or ""), mode
    return None, s, "item"


RULES = load_rules()  # một lần lúc import; lỗi ở đây làm server không khởi động (cố ý)
GROUP_IDS = group_ids(RULES)
PROMPTS = {m: build_system_prompt(RULES, m) for m in MAX_ITEMS}


def run(text, timeout=20.0, model=None, client=None, max_output_tokens=1500):
    model = model or os.environ.get("OPENAI_MODEL")
    if not model:
        raise ValueError("Thiếu model: đặt biến OPENAI_MODEL bằng model bạn đã chạy thử.")
    image, desc, mode = parse_input(text)
    if not image and not desc.strip():
        raise ValueError("Thiếu ảnh hoặc mô tả món.")
    if image:
        content = [{"type": "input_text", "text": "Phân loại rác trong ảnh này. Trả về JSON."},
                   {"type": "input_image", "image_url": image}]
    else:
        content = [{"type": "input_text", "text": f"Không có ảnh. Phân loại món được mô tả bằng chữ: {desc[:500]}. Trả về JSON."}]
    if client is None:
        import openai

        client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=timeout, max_retries=0)  # timeout thật nằm ở đây
    r = client.responses.create(model=model, instructions=PROMPTS[mode], input=[{"role": "user", "content": content}],
                                max_output_tokens=max_output_tokens, text={"format": {"type": "json_object"}})
    out, _status = extract_text(r)
    items = postprocess(parse_model_json(out), mode, GROUP_IDS)
    u = getattr(r, "usage", None)
    tokens = (getattr(u, "total_tokens", 0) or 0) if u else 0
    return {"output": json.dumps({"items": items}, ensure_ascii=False), "tokens": tokens, "source": "ai", "mode": mode}


__all__ = ["run", "load_rules", "build_system_prompt", "postprocess", "parse_model_json", "parse_input",
           "RulesError", "BadModelOutput", "NoTextError"]
