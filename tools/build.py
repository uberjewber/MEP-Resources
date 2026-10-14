#!/usr/bin/env python3
"""Assemble index.html (GitHub Pages) from src/. Run from anywhere: python3 tools/build.py"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

def strip_export(js: str) -> str:
    return "\n".join(l for l in js.splitlines() if not l.startswith("if (typeof module !== 'undefined')")) + "\n"

shell = (SRC / "shell.html").read_text()
page = (shell
        .replace("/*PSY*/", strip_export((SRC / "psychro.js").read_text()))
        .replace("/*DUCT*/", strip_export((SRC / "duct.js").read_text()))
        .replace("/*APP*/", (SRC / "app.js").read_text()))

split = page.index('<div class="wrap">')
head, body = page[:split].strip(), page[split:]
doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Psychrometrics, airstream mixing with a cooling coil, duct sizing and quick HVAC calculations.">
<style>:root{{color-scheme:light}}body{{margin:0;font-size:14px}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{head}
</head>
<body>
{body}
</body>
</html>
"""
(ROOT / "index.html").write_text(doc)
print(f"wrote index.html ({len(doc):,} bytes)")
