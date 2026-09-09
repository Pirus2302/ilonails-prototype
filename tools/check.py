"""Автопроверки прототипа по §10 спеки.
Запуск: python tools/check.py [--tokens] [page.html ...]"""
import re, sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
TOKENS_ONLY = "--tokens" in sys.argv
PAGES = ARGS or ["index.html", "index-a.html", "vrosshiy-nogot.html"]
FORBIDDEN = re.compile(r"\b(пациент\w*|удаля\w*|удалени\w*|лечени\w*|гост(и|ья|ей|ям|ю|ье)\b)", re.I)

def lum(hexc):
    r, g, b = (int(hexc[i:i+2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def check_tokens(fail):
    css = (ROOT / "css/tokens.css").read_text(encoding="utf-8")
    tok = dict(re.findall(r"--c-([a-z-]+):\s*(#[0-9a-fA-F]{6})", css))
    pairs = [("ink", "bg", 4.5), ("muted", "bg", 4.5), ("accent", "bg", 4.5),
             ("ink", "bg-alt", 4.5), ("muted", "bg-alt", 4.5), ("accent-ink", "ink", 4.5)]
    for fg, bg, need in pairs:
        c = contrast(tok[fg], tok[bg])
        if c < need:
            fail.append(f"tokens: контраст {fg}/{bg} = {c:.2f}, нужно ≥ {need}")

def check_page(pw, page_name, fail):
    url = (ROOT / page_name).as_uri()
    b = pw.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.goto(url); pg.wait_for_timeout(800)
    sw = pg.evaluate("document.documentElement.scrollWidth")
    if sw > 390:
        fail.append(f"{page_name}: горизонтальная прокрутка на 390, scrollWidth={sw}")
    text = pg.evaluate("document.body.innerText")
    for m in FORBIDDEN.finditer(text):
        fail.append(f"{page_name}: запрещённое слово «{m.group(0)}»")
    for src, alt in pg.evaluate("[...document.images].map(i=>[i.getAttribute('src'), i.getAttribute('alt')])"):
        if alt is None or not alt.strip():
            fail.append(f"{page_name}: пустой alt у {src}")
    small = pg.evaluate("""[...document.querySelectorAll('a,button')].filter(e=>{
        const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && (r.width<24||r.height<24)})
        .map(e=>e.outerHTML.slice(0,80))""")
    for s in small:
        fail.append(f"{page_name}: цель меньше 24px: {s}")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(300)
    covered = pg.evaluate("""(()=>{const bar=document.querySelector('.sticky-cta'); const f=document.querySelector('footer');
        if(!bar||!f) return false; const rb=bar.getBoundingClientRect(), rf=f.getBoundingClientRect(); return rf.bottom>rb.top;})()""")
    if covered:
        fail.append(f"{page_name}: липкая панель перекрывает подвал на 390")
    pg2 = b.new_page(viewport={"width": 1440, "height": 900})
    pg2.goto(url); pg2.wait_for_timeout(800)
    long_lines = pg2.evaluate("""[...document.querySelectorAll('p')].filter(p=>{
        const cs=getComputedStyle(p); const chars=p.getBoundingClientRect().width/(parseFloat(cs.fontSize)*0.5);
        return p.innerText.length>80 && chars>80}).map(p=>p.innerText.slice(0,50))""")
    for t in long_lines:
        fail.append(f"{page_name}: строка длиннее 80 знаков на 1440: «{t}…»")
    b.close()

def main():
    fail = []
    check_tokens(fail)
    if TOKENS_ONLY:
        print("\n".join("FAIL " + f for f in fail) if fail else "tokens OK"); sys.exit(1 if fail else 0)
    with sync_playwright() as pw:
        for p in PAGES:
            if (ROOT / p).exists():
                check_page(pw, p, fail)
            else:
                fail.append(f"{p}: файла нет")
    if fail:
        print("\n".join("FAIL " + f for f in fail)); sys.exit(1)
    print("OK: все проверки пройдены для", ", ".join(PAGES))

if __name__ == "__main__":
    main()
