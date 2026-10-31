#!/usr/bin/env python3
"""Assemble index.html (GitHub Pages) from src/. Run from anywhere: python3 tools/build.py

  --preview PATH   also write a body-only copy for publishing as a claude.ai artifact preview
                   (the artifact host adds its own <!doctype>/<head>/<body> skeleton).

index.html carries a "Last updated <date, time> CT" stamp taken at build time, so always rebuild
immediately before committing a release; the preview copy is labelled as a preview instead."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

def strip_export(js: str) -> str:
    return "\n".join(l for l in js.splitlines() if not l.startswith("if (typeof module !== 'undefined')")) + "\n"

from datetime import datetime
from zoneinfo import ZoneInfo

now = datetime.now(ZoneInfo("America/Chicago"))
stamp = f"Last updated {now:%b} {now.day}, {now.year}, {now:%I:%M %p}".replace(" 0", " ") + " CT"

shell = (SRC / "shell.html").read_text()
page = (shell
        .replace("/*PSY*/", strip_export((SRC / "psychro.js").read_text()))
        .replace("/*DUCT*/", strip_export((SRC / "duct.js").read_text()))
        .replace("/*PIPE*/", strip_export((SRC / "pipe.js").read_text()))
        .replace("/*APP*/", (SRC / "app.js").read_text()))
release = page.replace("/*UPDATED*/", stamp)

split = release.index('<div class="wrap">')
head, body = release[:split].strip(), release[split:]
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
print(f"wrote index.html ({len(doc):,} bytes) · {stamp}")

if "--preview" in sys.argv:
    out = Path(sys.argv[sys.argv.index("--preview") + 1])
    out.write_text(page.replace("/*UPDATED*/", f"Preview, not live yet · built {stamp[len('Last updated '):]}"))
    print(f"wrote preview {out} ({len(page):,} bytes)")
