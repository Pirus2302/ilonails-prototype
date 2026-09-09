"""Скриншоты страниц на 390 и 1440 в docs/screens/. Запуск: python tools/render.py [page.html ...]"""
import sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/screens"; OUT.mkdir(parents=True, exist_ok=True)
PAGES = sys.argv[1:] or ["index.html", "index-a.html", "vrosshiy-nogot.html"]

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name in PAGES:
        for w in (390, 1440):
            pg = b.new_page(viewport={"width": w, "height": 900})
            pg.goto((ROOT / name).as_uri()); pg.wait_for_timeout(600)
            pg.evaluate("[...document.images].forEach(i=>i.loading='eager')")
            pg.evaluate("()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=400)window.scrollTo(0,y);window.scrollTo(0,0);}")
            pg.wait_for_function("[...document.images].every(i=>i.complete && i.naturalWidth>0)", timeout=30000)
            pg.wait_for_timeout(600)
            pg.screenshot(path=str(OUT / f"{pathlib.Path(name).stem}-{w}.png"), full_page=True)
            print("saved", name, w)
    b.close()
