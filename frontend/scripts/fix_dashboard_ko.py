# -*- coding: utf-8 -*-
"""Restore dashboard/page.tsx Korean text as UTF-8."""
from pathlib import Path

KO = {
    "overview_desc": "\uc804\uccb4 \ud14c\uc774\ube14 \ud604\ud669\uacfc Neon DB \uc5f0\uacb0 \uc0c1\ud0dc\ub97c \ud655\uc778\ud569\ub2c8\ub2e4.",
    "title": "\ud50c\ub7ab\ud3fc \uac1c\uc694",
    "hint": "\ud589\ubc84\uac70 \ubc84\ud2bc\uc73c\ub85c \uc67c\ucabd \uba54\ub274\ub97c \uc5f4\uace0 \uae30\ub2a5\ubcc4 \ud14c\uc774\ube14\uc744 \uc120\ud0dd\ud558\uc138\uc694. \ub2e4\uc2dc \ub204\ub974\uba74 \uc0ac\uc774\ub4dc\ubc14\uac00 \ub2eb\ud600 \ucf58\ud150\uce20 \uacf5\uac04\uc774 \ub113\uc5b4\uc9d1\ub2c8\ub2e4.",
    "tbl_count": "\ud14c\uc774\ube14 \uc218",
    "total_records": "\ucd1d \ub808\ucf54\ub4dc",
    "connected": "\uc5f0\uacb0",
    "loading": "\ubd88\ub7ec\uc624\ub294 \uc911\u2026",
    "record_count": "\ud604\uc7ac \ub808\ucf54\ub4dc \uc218",
    "loading2": "\ub85c\ub529 \uc911\u2026",
    "neon_sync": "\ud14c\uc774\ube14\uacfc \ub3d9\uae30\ud654\ub429\ub2c8\ub2e4.",
    "refresh": "\uc0c8\ub85c\uace0\uce68",
    "sample": "\uc0d8\ud50c",
    "fetch_err": "\uac1c\uc694\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    "net_err": "\ub124\ud2b8\uc6cc\ud06c \uc624\ub958",
    "seed_fail": "\uc0d8\ud50c \ub370\uc774\ud130 \uc0dd\uc131 \uc2e4\ud328",
    "seed_req_fail": "\uc0d8\ud50c \ub370\uc774\ud130 \uc694\uccad \uc2e4\ud328",
    "uvicorn_hint": " \u2014 \ubc31\uc5d4\ub4dc(uvicorn)\uac00 \uc2e4\ud589 \uc911\uc778\uc9c0 \ud655\uc778\ud558\uc138\uc694.",
    "neon_console": "Neon \ucf58\uc194\uc758 ",
}

SECTION = {
    "overview": KO["overview_desc"],
    "users": "\uc774\ub984, \uc774\uba54\uc77c, \uac00\uc785 \uc815\ubcf4 \ub4f1 \uc0ac\uc6a9\uc790 \uacc4\uc815\uc744 \uad00\ub9ac\ud569\ub2c8\ub2e4.",
    "user_settings": "\uc5b8\uc5b4 \uc124\uc815, \uc120\ud638 AI \ubaa8\ub378 \ub4f1 \uc0ac\uc6a9\uc790 \ud658\uacbd \uc124\uc815\uc785\ub2c8\ub2e4.",
    "chat_sessions": "\uc5ec\ub7ec \uba54\uc2dc\uc9c0\ub97c \ubb36\ub294 \ucc44\ud305\ubc29, \uc138\uc158 \ub2e8\uc704 \uc815\ubcf4\uc785\ub2c8\ub2e4.",
    "messages": "role(user/assistant)\uacfc content\ub85c \uad6c\uc131\ub41c \uc2e4\uc81c \ub300\ud654 \ub0b4\uc6a9\uc785\ub2c8\ub2e4.",
    "agent_configs": "\uc5d0\uc774\uc804\ud2b8 \uc774\ub984, \uc2dc\uc2a4\ud15c \ud504\ub86c\ud504\ud2b8, \uc0ac\uc6a9 AI \ubaa8\ub378 \uc124\uc815\uc785\ub2c8\ub2e4.",
    "agent_logs": "\uc5d0\uc774\uc804\ud2b8\uc758 \uc0ac\uace0 \uacfc\uc815, \uc5d0\ub7ec \ub4f1 \ub0b4\ubd80 \uc2e4\ud589 \ub85c\uadf8\uc785\ub2c8\ub2e4.",
    "documents": "RAG\uc6a9\uc73c\ub85c \uc5c5\ub85c\ub4dc\ud55c \ubb38\uc11c\uc758 \uba54\ud0c0\ub370\uc774\ud130\uc785\ub2c8\ub2e4.",
    "tool_definitions": "\ub0a0\uc528 API, DB \uac80\uc0c9 \ub4f1 \uc678\ubd80 \ub3c4\uad6c \uc815\uc758 \uc2a4\ud399\uc785\ub2c8\ub2e4.",
    "tool_usage_history": "\uc5b4\ub5a4 \ub3c4\uad6c\ub97c \uc5b8\uc81c \ud638\ucd9c\ud588\ub294\uc9c0 \uae30\ub85d\ud569\ub2c8\ub2e4.",
    "usage_stats": "\ud1a0\ud070 \uc0ac\uc6a9\ub7c9, API \ud638\ucd9c \ud69f\uc218, \uc608\uc0c1 \ube44\uc6a9(\uacfc\uae08 \uad00\ub9ac)\uc785\ub2c8\ub2e4.",
}

p = Path(__file__).resolve().parents[1] / "app" / "dashboard" / "page.tsx"
text = p.read_text(encoding="utf-8", errors="replace")

# Fix SECTION_DESCRIPTIONS block by regex-free line replacements
import re
for key, val in SECTION.items():
    text = re.sub(
        rf'  {key}: "[^"]*"',
        f'  {key}: "{val}"',
        text,
        count=1,
    )

fixes = [
    ('throw new Error("??? ???? ?????.");', f'throw new Error("{KO["fetch_err"]}");'),
    ('e.message : "???? ??"', f'e.message : "{KO["net_err"]}"'),
    ('alert(data.detail || "?? ??? ?? ??");', f'alert(data.detail || "{KO["seed_fail"]}");'),
    ('alert("?? ??? ?? ??");', f'alert("{KO["seed_req_fail"]}");'),
    ('<span className="hidden sm:inline">????</span>', f'<span className="hidden sm:inline">{KO["refresh"]}</span>'),
    ('<span className="hidden sm:inline">??</span>', f'<span className="hidden sm:inline">{KO["sample"]}</span>', 1),
    ('{error} ? ???(uvicorn)? ?? ??? ?????.', '{error}' + KO["uvicorn_hint"]),
    ('<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">??? ??</h1>', f'<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{KO["title"]}</h1>'),
    ('label="??? ?"', f'label="{KO["tbl_count"]}"'),
    ('label="? ???"', f'label="{KO["total_records"]}"'),
    ('label="??" value="OK"', f'label="{KO["connected"]}" value="OK"'),
    ('<p className="text-sm text-gray-500">???? ??</p>', f'<p className="text-sm text-gray-500">{KO["loading"]}</p>'),
    ('<p className="text-sm text-gray-500 mb-1">?? ??? ?</p>', f'<p className="text-sm text-gray-500 mb-1">{KO["record_count"]}</p>'),
    ('<p className="text-gray-400">?? ??</p>', f'<p className="text-gray-400">{KO["loading2"]}</p>'),
    ('Neon ??? <span', KO["neon_console"] + '<span'),
    (' ???? ??????.', KO["neon_sync"]),
]
for item in fixes:
    if len(item) == 3:
        old, new, _ = item
        text = text.replace(old, new, 1)
    else:
        old, new = item
        text = text.replace(old, new)

# overview paragraph (multiline)
import re as _re
text = _re.sub(
    r'<p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">[\s\S]*?</p>',
    f'<p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">\n          {KO["hint"]}\n        </p>',
    text,
    count=1,
)

text = text.replace("<motion ", "<motion ").replace("</motion>", "</motion>")
text = text.replace("<motion ", "<div ").replace("</motion>", "</div>")

p.write_text(text, encoding="utf-8", newline="\n")
assert "\ud50c\ub7ab\ud3fc" in p.read_text(encoding="utf-8")
print("OK: Korean restored in", p)
