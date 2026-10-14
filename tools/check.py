#!/usr/bin/env python3
"""Smoke test: load index.html in headless Chromium, visit every tab at desktop and phone width,
fail on script errors or horizontal page overflow. Screenshots go to the directory given as argv[1]
(default: a temp dir). Requires: pip install playwright (Chromium preinstalled or `playwright install chromium`)."""
import asyncio, os, sys, tempfile
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp())
OUT.mkdir(parents=True, exist_ok=True)
TABS = ["psych", "mix", "duct", "calcs"]

async def main():
    exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": exe} if os.path.exists(exe) else {}))
        bad = []
        for w, tag in [(1280, "desktop"), (400, "phone")]:
            pg = await b.new_page(viewport={"width": w, "height": 900})
            errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            for t in TABS:
                await pg.goto((ROOT / "index.html").as_uri() + "#" + t)
                await pg.wait_for_timeout(500)
                sw = await pg.evaluate("document.documentElement.scrollWidth")
                if sw > w: bad.append(f"{tag}/{t}: page {sw}px wide")
                await pg.screenshot(path=str(OUT / f"{tag}-{t}.png"), full_page=True)
            bad += [f"{tag}: {e}" for e in errs]
            await pg.close()
        await b.close()
    print("screenshots:", OUT)
    if bad: print("FAIL\n" + "\n".join(bad)); sys.exit(1)
    print("OK: all tabs load, no script errors, no horizontal overflow")

asyncio.run(main())
