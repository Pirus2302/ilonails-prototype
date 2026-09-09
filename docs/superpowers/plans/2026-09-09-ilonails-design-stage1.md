# Ilonails, этап 1: план реализации прототипа

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать статический HTML-прототип главной (варианты E и A) и страницы «Вросший ноготь» по спеке `docs/superpowers/specs/2026-09-09-ilonails-design-stage1-design.md` и опубликовать его на GitHub Pages.

**Architecture:** Три HTML-страницы делят одну дизайн-систему из четырёх CSS-файлов и один JS-файл. Мобильная вёрстка базовая, десктоп через `@media (min-width: 768px)` и `(min-width: 1200px)`. Проверки из §10 спеки автоматизированы скриптом на Playwright, он запускается перед каждым коммитом страницы.

**Tech Stack:** HTML5, CSS без препроцессора, ванильный JS, Google Fonts (Cormorant Garamond, Golos Text), Python 3.11 + Playwright + pypdfium2 + Pillow для проверок и подготовки медиа, ffmpeg для видео, gh CLI для публикации.

**Рабочая папка:** `D:/MYDEV/ilonails-prototype`. Все пути ниже относительно неё. Исходники медиа лежат в scratchpad сессии `C:/Users/User/AppData/Local/Temp/claude/D--MYDEV/4d556021-1c81-4ef6-bb9d-4d7639a10d86/scratchpad/` (далее `$SCRATCH`) и в `C:/Users/User/Downloads/IloNailsstranicysayta.pdf`.

---

## Структура файлов

| Файл | Ответственность |
|---|---|
| `index.html` | Главная, первый экран E |
| `index-a.html` | Главная, первый экран A, остальное идентично `index.html` |
| `vrosshiy-nogot.html` | Страница проблемы, шаблон для страниц 2–9 ТЗ |
| `css/tokens.css` | CSS-переменные: цвета, шрифты, размеры, отступы |
| `css/base.css` | Сброс, шрифты, типографика, контейнер, утилиты |
| `css/components.css` | Шапка, меню, кнопки, плитки, строки, карточки, липкая панель, модальное окно, подвал |
| `css/pages.css` | Первые экраны E и A, сетки блоков главной и страницы проблемы |
| `js/site.js` | Бургер-меню, модальное окно видео, reduced motion |
| `img/` | Фото и постеры |
| `video/` | `bubble.mp4`, `loop.mp4`, `full.mp4` |
| `tools/check.py` | Автопроверки §10 спеки |
| `tools/render.py` | Скриншоты 390 и 1440 в `docs/screens/` |
| `tools/extract_pdf_images.py` | Вытаскивает картинки из PDF концепта |
| `.gitignore` | `docs/screens/`, `__pycache__/`, `tools/_tmp/` |

---

### Task 1: Каркас репозитория и скрипт проверок

**Files:**
- Create: `.gitignore`
- Create: `tools/check.py`
- Create: `tools/render.py`
- Create: `README.md`

- [ ] **Step 1: Создать `.gitignore` и `README.md`**

`.gitignore`:
```
docs/screens/
__pycache__/
tools/_tmp/
```

`README.md`:
```markdown
# Ilonails, прототип сайта

Статический HTML-прототип студии подологии Ilonails (Минск). Этап 1: главная и страница «Вросший ноготь».

Спека: docs/superpowers/specs/2026-09-09-ilonails-design-stage1-design.md

## Проверки
python tools/check.py            # чек-лист §10 по всем страницам
python tools/check.py --tokens   # только контраст токенов
python tools/render.py           # скриншоты 390 и 1440 в docs/screens/

## Локальный просмотр
python -m http.server 8080       # затем http://localhost:8080/
```

- [ ] **Step 2: Написать `tools/check.py`**

```python
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
```

- [ ] **Step 3: Написать `tools/render.py`**

```python
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
            pg.goto((ROOT / name).as_uri()); pg.wait_for_timeout(1200)
            pg.screenshot(path=str(OUT / f"{name[:-5]}-{w}.png"), full_page=True)
            print("saved", name, w)
    b.close()
```

- [ ] **Step 4: Убедиться, что проверка падает на пустом проекте**

Run: `python tools/check.py --tokens`
Expected: `FileNotFoundError` на `css/tokens.css`, файла ещё нет. Это ожидаемое падение, задача 3 его закрывает.

- [ ] **Step 5: Commit**

```bash
git add .gitignore README.md tools/check.py tools/render.py
git commit -m "Каркас репозитория и скрипты проверок"
```

---

### Task 2: Медиа: фото, постеры, видео

**Files:**
- Create: `tools/extract_pdf_images.py`
- Create: `img/*.jpg`, `video/bubble.mp4`, `video/loop.mp4`, `video/full.mp4`

- [ ] **Step 1: Скопировать готовые файлы из scratchpad**

```bash
mkdir -p img video tools/_tmp
cp "$SCRATCH/loop.mp4" video/loop.mp4
cp "$SCRATCH/bubble.mp4" video/bubble.mp4
cp "$SCRATCH/poster_bubble.jpg" img/poster-bubble.jpg
cp "$SCRATCH/poster_loop.jpg" img/poster-loop.jpg
cp "$SCRATCH/IMG_8968.png" tools/_tmp/cabinet.png
cp "$SCRATCH/IMG_8972.png" tools/_tmp/reception.png
cp "$SCRATCH/IMG_8977.png" tools/_tmp/manicure.png
cp "$SCRATCH/IMG_8980.png" tools/_tmp/cabinet2.png
```

- [ ] **Step 2: Пережать фото интерьера в JPEG шириной 1600 и 800**

Скрипт `tools/_tmp/resize.py` (временный, в git не попадает):
```python
from PIL import Image
for n in ["cabinet", "reception", "manicure", "cabinet2"]:
    im = Image.open(f"tools/_tmp/{n}.png").convert("RGB")
    for w in (1600, 800):
        r = w / im.width
        im.resize((w, round(im.height * r)), Image.LANCZOS).save(f"img/{n}-{w}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
```
Run: `python tools/_tmp/resize.py && ls -la img/`
Expected: 8 файлов `cabinet-1600.jpg` … `cabinet2-800.jpg`, каждый меньше 400 КБ.

- [ ] **Step 3: Вытащить картинки из PDF концепта**

`tools/extract_pdf_images.py`:
```python
"""Извлекает растровые картинки из PDF концепта в tools/_tmp/pdf/. Запуск: python tools/extract_pdf_images.py <pdf>"""
import sys, pathlib
import pypdfium2 as pdfium

out = pathlib.Path("tools/_tmp/pdf"); out.mkdir(parents=True, exist_ok=True)
pdf = pdfium.PdfDocument(sys.argv[1])
n = 0
for pi in range(len(pdf)):
    page = pdf[pi]
    for obj in page.get_objects(max_depth=4):
        if obj.type == pdfium.raw.FPDF_PAGEOBJ_IMAGE:
            try:
                bm = obj.get_bitmap(render=False).to_pil().convert("RGB")
            except Exception:
                continue
            if bm.width < 200 or bm.height < 200:
                continue
            n += 1
            bm.save(out / f"p{pi+1:02d}-{n:03d}-{bm.width}x{bm.height}.jpg", "JPEG", quality=88)
print("extracted", n)
```
Run: `python tools/extract_pdf_images.py "C:/Users/User/Downloads/IloNailsstranicysayta.pdf"`
Expected: `extracted N`, N ≥ 20.

- [ ] **Step 4: Отобрать и переименовать картинки**

Просмотреть `tools/_tmp/pdf/` (Read по файлам) и скопировать в `img/` под именами:

| Имя в `img/` | Что это | Где в PDF |
|---|---|---|
| `ba-ingrown-1.jpg` … `ba-ingrown-4.jpg` | серия вросший ноготь до/после, 4 кадра | стр. 1 и 3 |
| `ba-heels-1.jpg`, `ba-heels-2.jpg` | пятки до/после | стр. 3, 4 |
| `hands-1.jpg` | маникюр, руки | стр. 1 |
| `ilona.jpg` | Илона в чёрном | стр. 7, 8 |
| `tatiana.jpg` | Татьяна в голубом | стр. 7 |
| `master.jpg` | мастер в маске | стр. 7 |
| `autoclave.jpg` | автоклав | стр. 4, 7 |
| `facade.jpg` | вход в студию | стр. 10 |
| `device.jpg` | аппарат подолога | стр. 2, 3 |
| `map.jpg` | карта из контактов | стр. 10 |

Каждый файл шириной не больше 1200 px, JPEG 80. Если серия вросшего ногтя в PDF собрана одной картинкой 2×2, оставить её как `ba-ingrown-grid.jpg` и использовать целиком.

- [ ] **Step 5: Пережать полный ролик**

```bash
ffmpeg -y -i "$SCRATCH/IMG_7299.mp4" -vf "scale=1080:1920,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 27 -preset slow -c:a aac -b:a 96k -movflags +faststart video/full.mp4
ls -la video/full.mp4
```
Expected: размер ≤ 15 МБ. Если больше, повторить с `-crf 29`.

- [ ] **Step 6: Commit**

```bash
git add img video tools/extract_pdf_images.py
git commit -m "Медиа: фото студии, кадры из концепта, видео Илоны"
```

---

### Task 3: Токены и база

**Files:**
- Create: `css/tokens.css`
- Create: `css/base.css`

- [ ] **Step 1: Написать `css/tokens.css`**

```css
:root {
  --c-bg: #fcfcfb;
  --c-bg-alt: #f5f3ee;
  --c-line: #eceae4;
  --c-ink: #191b1e;
  --c-muted: #5b5a58;
  --c-accent: #1e6fa8;
  --c-accent-ink: #ffffff;

  --f-display: "Cormorant Garamond", Georgia, "Times New Roman", serif;
  --f-body: "Golos Text", "Segoe UI", system-ui, -apple-system, sans-serif;

  --fs-h1: 40px;   --lh-h1: 1.05;
  --fs-h2: 28px;   --lh-h2: 1.1;
  --fs-h3: 22px;   --lh-h3: 1.1;
  --fs-body: 15px; --lh-body: 1.5;
  --fs-small: 13px;
  --fs-eyebrow: 11px;

  --sp-1: 8px; --sp-2: 16px; --sp-3: 24px; --sp-4: 32px; --sp-5: 48px; --sp-6: 64px; --sp-7: 96px;
  --gutter: 20px;
  --container: 1312px;

  --r-pill: 999px;
  --r-card: 18px;
  --shadow-float: 0 12px 32px -16px rgba(25, 27, 30, .35);
  --dur: 200ms;
  --ease: cubic-bezier(.2, .7, .2, 1);
  --sticky-h: 68px;
}
@media (min-width: 768px) {
  :root { --fs-h1: 52px; --fs-h2: 34px; --fs-body: 16px; --gutter: 40px; }
}
@media (min-width: 1200px) {
  :root { --fs-h1: 64px; --fs-h2: 40px; --fs-h3: 24px; --gutter: 64px; --sticky-h: 0px; }
}
```

- [ ] **Step 2: Написать `css/base.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  margin: 0; background: var(--c-bg); color: var(--c-ink);
  font-family: var(--f-body); font-size: var(--fs-body); line-height: var(--lh-body);
  padding-bottom: var(--sticky-h);
}
img, video { max-width: 100%; height: auto; display: block; }
a { color: var(--c-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 3px; }

h1, h2, h3 { font-family: var(--f-display); font-weight: 500; margin: 0; text-wrap: balance; }
h1 { font-size: var(--fs-h1); line-height: var(--lh-h1); }
h2 { font-size: var(--fs-h2); line-height: var(--lh-h2); }
h3 { font-size: var(--fs-h3); line-height: var(--lh-h3); }
p { margin: 0; }
p + p { margin-top: var(--sp-2); }
.prose { max-width: 62ch; }
.muted { color: var(--c-muted); }
.small { font-size: var(--fs-small); }
.eyebrow { font-size: var(--fs-eyebrow); letter-spacing: .1em; text-transform: uppercase; color: var(--c-muted); }
.italic { font-style: italic; }
.tnum { font-variant-numeric: tabular-nums; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.container { width: 100%; max-width: var(--container); margin: 0 auto; padding-inline: var(--gutter); }
.section { padding-block: var(--sp-5); }
.section--alt { background: var(--c-bg-alt); }
.section__head { display: grid; gap: 6px; margin-bottom: var(--sp-3); }
.section__head .hint { color: var(--c-muted); font-size: var(--fs-small); max-width: 60ch; }
@media (min-width: 768px) { .section { padding-block: var(--sp-6); } .section__head { margin-bottom: var(--sp-4); } }
@media (min-width: 1200px) { .section { padding-block: var(--sp-7); } }

.grid { display: grid; gap: var(--sp-2); }
@media (min-width: 768px) { .grid--2 { grid-template-columns: 1fr 1fr; } .grid--3 { grid-template-columns: repeat(3, 1fr); } .grid--4 { grid-template-columns: repeat(4, 1fr); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
```

- [ ] **Step 3: Проверить контраст токенов**

Run: `python tools/check.py --tokens`
Expected: `tokens OK`.

- [ ] **Step 4: Commit**

```bash
git add css/tokens.css css/base.css
git commit -m "Токены и базовая типографика"
```

---

### Task 4: Компоненты

**Files:**
- Create: `css/components.css`

- [ ] **Step 1: Написать `css/components.css`**

```css
/* Кнопки */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 12px 22px;
  border-radius: var(--r-pill); border: 1px solid transparent; font-weight: 500; font-size: 15px; white-space: nowrap;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease); }
.btn:hover { text-decoration: none; }
.btn--dark { background: var(--c-ink); color: #fff; }
.btn--dark:hover { background: #2c2f34; }
.btn--light { background: #fff; color: var(--c-ink); }
.btn--light:hover { background: var(--c-bg-alt); }
.btn--ghost { border-color: var(--c-line); color: var(--c-ink); background: transparent; }
.btn--ghost:hover { border-color: var(--c-ink); }
.btn--sm { min-height: 40px; padding: 8px 16px; font-size: 14px; }
.btn--block { width: 100%; }

/* Шапка */
.header { position: sticky; top: 0; z-index: 20; background: rgba(252, 252, 251, .92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--c-line); }
.header__in { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); min-height: 64px; }
.logo { font-family: var(--f-display); font-style: italic; font-size: 22px; color: var(--c-ink); }
.logo:hover { text-decoration: none; }
.nav { display: none; }
.header__right { display: flex; align-items: center; gap: 14px; }
.header__phone { display: none; color: var(--c-ink); font-size: 15px; }
.burger { width: 44px; height: 44px; display: grid; place-items: center; margin-right: -10px; }
.burger span { display: block; width: 22px; height: 14px; position: relative; }
.burger span::before, .burger span::after, .burger i { content: ""; position: absolute; left: 0; right: 0; height: 1.5px; background: var(--c-ink); }
.burger span::before { top: 0; } .burger i { top: 6px; } .burger span::after { bottom: 0; }
.menu { display: none; position: fixed; inset: 64px 0 0 0; background: var(--c-bg); z-index: 19; padding: var(--sp-3) var(--gutter); }
.menu[data-open="true"] { display: grid; align-content: start; gap: 4px; }
.menu a { display: block; padding: 14px 0; border-bottom: 1px solid var(--c-line); font-family: var(--f-display); font-size: 28px; color: var(--c-ink); }
.menu a:hover { text-decoration: none; }
.menu__contacts { margin-top: var(--sp-3); display: grid; gap: 8px; color: var(--c-muted); }
@media (min-width: 1200px) {
  .header__in { min-height: 76px; }
  .nav { display: flex; gap: 28px; }
  .nav a { color: var(--c-ink); font-size: 15px; padding: 6px 0; border-bottom: 1px solid transparent; }
  .nav a:hover, .nav a[aria-current="page"] { text-decoration: none; border-bottom-color: var(--c-ink); }
  .header__phone { display: inline; }
  .burger, .menu { display: none !important; }
}

/* Строка доказательств */
.proofs { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: var(--fs-small); color: var(--c-muted); margin: 0; padding: 0; list-style: none; }
.proofs li::before { content: ""; display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--c-accent); margin-right: 8px; vertical-align: 2px; }

/* Список проблем: строки на мобильном, плитки на десктопе */
.problems { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--c-line); }
.problems a { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--c-line); color: var(--c-ink); }
.problems a:hover { text-decoration: none; }
.problems .t { font-family: var(--f-display); font-size: 22px; font-weight: 500; line-height: 1.05; display: block; }
.problems .d { font-size: var(--fs-small); color: var(--c-muted); margin-top: 3px; display: block; }
.problems .arr { width: 28px; height: 28px; border: 1px solid var(--c-line); border-radius: 50%; display: grid; place-items: center; font-size: 13px; transition: border-color var(--dur) var(--ease); }
.problems a:hover .arr { border-color: var(--c-ink); }
@media (min-width: 768px) {
  .problems { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--c-line); border: 1px solid var(--c-line); }
  .problems li { background: var(--c-bg); }
  .problems a { grid-template-columns: 1fr; align-content: space-between; min-height: 130px; padding: 18px 16px; border: 0; height: 100%; }
  .problems .arr { justify-self: end; }
}
@media (min-width: 1200px) { .problems { grid-template-columns: repeat(8, 1fr); } .problems .t { font-size: 21px; } }

/* Карточки цен */
.prices { display: grid; gap: 1px; background: var(--c-line); border: 1px solid var(--c-line); }
.price { background: var(--c-bg); padding: 18px 16px; display: grid; gap: 10px; align-content: space-between; }
.price h3 { font-size: 21px; }
.price p { font-size: var(--fs-small); color: var(--c-muted); }
.price__foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; }
.price__sum { font-family: var(--f-display); font-size: 20px; font-variant-numeric: tabular-nums; }
@media (min-width: 768px) { .prices { grid-template-columns: repeat(2, 1fr); } .price { padding: 24px 22px; } }
@media (min-width: 1200px) { .prices { grid-template-columns: repeat(3, 1fr); } }

/* Карточки специалистов */
.people { display: grid; gap: var(--sp-3); }
.person img { aspect-ratio: 4 / 5; object-fit: cover; width: 100%; border-radius: var(--r-card); }
.person h3 { margin-top: 12px; }
.person p { font-size: var(--fs-small); color: var(--c-muted); margin-top: 4px; }
@media (min-width: 768px) { .people { grid-template-columns: repeat(3, 1fr); } }

/* Галерея до/после */
.ba { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ba figure { margin: 0; position: relative; }
.ba img { aspect-ratio: 1; object-fit: cover; width: 100%; border-radius: 10px; }
.ba figcaption { position: absolute; left: 8px; bottom: 8px; background: rgba(25, 27, 30, .78); color: #fff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; }
@media (min-width: 768px) { .ba { grid-template-columns: repeat(4, 1fr); gap: 10px; } }

/* Факты безопасности */
.facts { display: grid; gap: 1px; background: var(--c-line); border: 1px solid var(--c-line); }
.fact { background: var(--c-bg); padding: 18px 16px; }
.fact h3 { font-size: 20px; }
.fact p { font-size: var(--fs-small); color: var(--c-muted); margin-top: 6px; }
@media (min-width: 768px) { .facts { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1200px) { .facts { grid-template-columns: repeat(4, 1fr); } }

/* Шаги приёма */
.steps { display: grid; gap: var(--sp-3); counter-reset: step; list-style: none; margin: 0; padding: 0; }
.steps li { border-top: 1px solid var(--c-ink); padding-top: 12px; counter-increment: step; }
.steps li::before { content: "0" counter(step); font-size: var(--fs-eyebrow); letter-spacing: .1em; color: var(--c-accent); display: block; margin-bottom: 6px; }
.steps h3 { font-size: 20px; }
.steps p { font-size: var(--fs-small); color: var(--c-muted); margin-top: 6px; }
@media (min-width: 768px) { .steps { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1200px) { .steps { grid-template-columns: repeat(4, 1fr); } }

/* Мессенджеры */
.messengers { display: flex; flex-wrap: wrap; gap: 8px; }

/* Блок записи */
.book { background: var(--c-bg-alt); }
.book__in { display: grid; gap: var(--sp-3); }
.book__info { display: grid; gap: 6px; }
@media (min-width: 768px) { .book__in { grid-template-columns: 1fr auto; align-items: center; } }

/* Липкая панель */
.sticky-cta { position: fixed; left: 0; right: 0; bottom: 0; z-index: 18; display: flex; gap: 8px; padding: 10px var(--gutter);
  background: rgba(252, 252, 251, .92); backdrop-filter: blur(10px); border-top: 1px solid var(--c-line); }
.sticky-cta .btn { flex: 1; }
@media (min-width: 1200px) { .sticky-cta { display: none; } }

/* Кружок видео */
.bubble { position: relative; width: 132px; height: 132px; border-radius: 50%; overflow: hidden; background: var(--c-bg-alt);
  box-shadow: 0 0 0 4px var(--c-bg), 0 0 0 5px var(--c-line); padding: 0; }
.bubble video, .bubble img { width: 100%; height: 100%; object-fit: cover; }
.bubble__label { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); background: rgba(25, 27, 30, .78); color: #fff;
  font-size: 11px; letter-spacing: .04em; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
@media (min-width: 1200px) { .bubble { width: 320px; height: 320px; box-shadow: 0 0 0 6px var(--c-bg), 0 0 0 7px var(--c-line); } .bubble__label { font-size: 13px; padding: 7px 14px; bottom: 18px; } }

/* Модальное окно видео */
.modal { position: fixed; inset: 0; z-index: 50; display: none; place-items: center; background: rgba(25, 27, 30, .82); padding: var(--sp-2); }
.modal[data-open="true"] { display: grid; }
.modal__box { width: min(100%, 420px); aspect-ratio: 9 / 16; max-height: 92vh; background: #000; border-radius: var(--r-card); overflow: hidden; position: relative; }
.modal__box video { width: 100%; height: 100%; object-fit: contain; }
.modal__close { position: absolute; top: 10px; right: 10px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255, 255, 255, .9); color: var(--c-ink); font-size: 22px; line-height: 1; }

/* Отзывы */
.reviews { display: grid; gap: 1px; background: var(--c-line); border: 1px solid var(--c-line); }
.review { background: var(--c-bg); padding: 22px 18px; display: grid; gap: 14px; align-content: space-between; min-height: 150px; }
.review blockquote { margin: 0; font-family: var(--f-display); font-style: italic; font-size: 20px; line-height: 1.3; }
.review .src { font-size: 12px; color: var(--c-muted); }
.review--stub blockquote { color: var(--c-muted); font-style: normal; font-family: var(--f-body); font-size: 14px; }
@media (min-width: 768px) { .reviews { grid-template-columns: repeat(3, 1fr); } }

/* Подвал */
.footer { background: var(--c-bg-alt); border-top: 1px solid var(--c-line); padding-block: var(--sp-5) var(--sp-3); font-size: var(--fs-small); color: var(--c-muted); }
.footer__in { display: grid; gap: var(--sp-3); }
.footer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.footer a { color: var(--c-ink); }
.footer__bottom { margin-top: var(--sp-4); padding-top: var(--sp-2); border-top: 1px solid var(--c-line); display: grid; gap: 8px; font-size: 12px; }
@media (min-width: 768px) { .footer__in { grid-template-columns: 2fr 1fr 1fr; } .footer__bottom { grid-template-columns: 1fr auto; } }
```

- [ ] **Step 2: Commit**

```bash
git add css/components.css
git commit -m "Компоненты дизайн-системы"
```

---

### Task 5: Стили страниц и JS

**Files:**
- Create: `css/pages.css`
- Create: `js/site.js`

- [ ] **Step 1: Написать `css/pages.css`**

```css
/* Первый экран E */
.hero-e { padding-block: var(--sp-2) var(--sp-4); display: grid; gap: 14px; }
.hero-e__left { display: grid; gap: 14px; }
.hero-e__row { display: grid; grid-template-columns: 1fr 132px; gap: 14px; align-items: start; }
.hero-e h1 { font-size: 34px; }
.hero-e__who { font-size: var(--fs-small); color: var(--c-muted); }
.hero-e__who b { color: var(--c-ink); font-weight: 600; }
.hero-e__cta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (min-width: 768px) {
  .hero-e h1 { font-size: 44px; }
  .hero-e__row { grid-template-columns: 1fr 200px; gap: var(--sp-4); }
  .bubble { width: 200px; height: 200px; }
  .hero-e__cta { display: flex; }
}
@media (min-width: 1200px) {
  .hero-e { grid-template-columns: 1fr 380px; column-gap: var(--sp-6); align-items: center; padding-block: var(--sp-6) var(--sp-5); }
  .hero-e__row { display: contents; }
  .hero-e h1 { font-size: var(--fs-h1); max-width: 12ch; }
  .hero-e__left { gap: 22px; max-width: 720px; }
  .hero-e__right { grid-row: 1; grid-column: 2; display: grid; gap: 16px; justify-items: center; text-align: center; }
  .bubble { width: 320px; height: 320px; }
}

/* Первый экран A */
.hero-a { position: relative; height: 560px; color: #fff; isolation: isolate; }
.hero-a picture img, .hero-a video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 50%; z-index: -2; }
.hero-a::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(20, 22, 26, .05) 0%, rgba(20, 22, 26, .35) 45%, rgba(20, 22, 26, .78) 100%); }
.hero-a__in { position: absolute; left: 0; right: 0; bottom: 28px; display: grid; gap: 14px; }
.hero-a p { color: rgba(255, 255, 255, .9); max-width: 48ch; }
@media (min-width: 768px) { .hero-a { height: 640px; } }
@media (min-width: 1200px) { .hero-a { height: 720px; } .hero-a__in { bottom: 64px; } .hero-a h1 { max-width: 14ch; } }

/* Блок динамики */
.dynamics { display: grid; gap: var(--sp-3); }
@media (min-width: 1200px) { .dynamics { grid-template-columns: 1fr 2fr; align-items: start; } }

/* Об Илоне */
.about-ilona { display: grid; gap: var(--sp-3); }
.about-ilona img { aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--r-card); }
@media (min-width: 768px) { .about-ilona { grid-template-columns: 1fr 2fr; align-items: center; } }

/* Контакты */
.contacts { display: grid; gap: var(--sp-3); }
.contacts__map img { border-radius: var(--r-card); aspect-ratio: 16 / 10; object-fit: cover; }
@media (min-width: 768px) { .contacts { grid-template-columns: 1fr 1fr; align-items: center; } }

/* Страница проблемы */
.problem-hero { padding-block: var(--sp-3) var(--sp-4); display: grid; gap: 14px; }
.problem-hero__cta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
@media (min-width: 1200px) { .problem-hero { grid-template-columns: 1fr 1fr; align-items: center; column-gap: var(--sp-6); padding-block: var(--sp-6); } .problem-hero img { border-radius: var(--r-card); aspect-ratio: 4 / 3; object-fit: cover; } }
.pain { border-left: 2px solid var(--c-accent); padding: 4px 0 4px 16px; margin-top: var(--sp-3); }
.pending { border: 1px dashed var(--c-line); border-radius: 10px; padding: 14px 16px; font-size: var(--fs-small); color: var(--c-muted); }
.related { display: grid; gap: var(--sp-2); }
.related a { display: block; padding: 16px 18px; border: 1px solid var(--c-line); color: var(--c-ink); font-family: var(--f-display); font-size: 22px; }
.related a:hover { border-color: var(--c-ink); text-decoration: none; }
@media (min-width: 768px) { .related { grid-template-columns: repeat(3, 1fr); } }
.breadcrumbs { font-size: 12px; color: var(--c-muted); padding-top: var(--sp-2); }
.breadcrumbs a { color: var(--c-muted); }
```

- [ ] **Step 2: Написать `js/site.js`**

```js
(function () {
  var burger = document.querySelector(".burger");
  var menu = document.querySelector(".menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.getAttribute("data-open") === "true";
      menu.setAttribute("data-open", open ? "false" : "true");
      burger.setAttribute("aria-expanded", open ? "false" : "true");
      document.body.style.overflow = open ? "" : "hidden";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.setAttribute("data-open", "false");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  var modal = document.querySelector(".modal");
  var modalVideo = modal ? modal.querySelector("video") : null;
  function openModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    if (modalVideo) { modalVideo.currentTime = 0; modalVideo.play().catch(function () {}); }
    var close = modal.querySelector(".modal__close"); if (close) close.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "false");
    document.body.style.overflow = "";
    if (modalVideo) modalVideo.pause();
  }
  document.querySelectorAll("[data-open-video]").forEach(function (b) { b.addEventListener("click", openModal); });
  if (modal) {
    modal.querySelector(".modal__close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("video[data-autoplay]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); return; }
    v.muted = true; v.play().catch(function () {});
  });
})();
```

- [ ] **Step 3: Commit**

```bash
git add css/pages.css js/site.js
git commit -m "Стили страниц и скрипт меню и видео"
```

---

### Task 6: Главная, вариант E: шапка, первый экран, проблемы

**Files:**
- Create: `index.html`

Общий `<head>` для всех трёх страниц:
```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Подология в Минске: вросший ноготь, грибок, мозоли. Студия Ilonails</title>
<meta name="description" content="Подологический центр Ilonails в Центральном районе Минска. Обрабатываем вросшие ногти, грибок, мозоли и трещины. Немецкое оборудование, автоклав, заключение санстанции без замечаний.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Golos+Text:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/pages.css">
</head>
```

- [ ] **Step 1: Шапка и меню**

```html
<body>
<header class="header">
  <div class="container header__in">
    <a class="logo" href="index.html">ilonails.studio</a>
    <nav class="nav" aria-label="Основное меню">
      <a href="#problems">Проблемы</a><a href="#prices">Цены</a><a href="#safety">О центре</a><a href="#team">Специалисты</a><a href="#courses">Курсы</a><a href="#contacts">Контакты</a>
    </nav>
    <div class="header__right">
      <a class="header__phone tnum" href="tel:+375290000000">+375 (29) 000-00-00</a><!-- публичный номер студии уточнить у заказчика -->
      <a class="btn btn--dark btn--sm" href="#book">Записаться</a>
      <button class="burger" aria-label="Открыть меню" aria-expanded="false"><span><i></i></span></button>
    </div>
  </div>
  <div class="menu" data-open="false">
    <a href="#problems">Проблемы</a><a href="#prices">Цены</a><a href="#safety">О центре</a><a href="#team">Специалисты</a><a href="#courses">Курсы</a><a href="#contacts">Контакты</a>
    <div class="menu__contacts"><span>Минск, ул. Максима Танка, 20</span><a href="tel:+375290000000">+375 (29) 000-00-00</a></div>
  </div>
</header>
<main>
```

- [ ] **Step 2: Первый экран E (блок 5.1)**

```html
<section class="container hero-e">
  <div class="hero-e__left">
    <span class="eyebrow">Подологический центр · Минск, Центральный район</span>
    <div class="hero-e__row">
      <h1>Больно ходить и&nbsp;стыдно разуться? Разберёмся, что с&nbsp;ногтем, и&nbsp;обработаем</h1>
      <div class="hero-e__right">
        <button class="bubble" type="button" data-open-video aria-label="Смотреть ролик Илоны со звуком">
          <video data-autoplay autoplay muted loop playsinline poster="img/poster-bubble.jpg" src="video/bubble.mp4"></video>
          <span class="bubble__label">▶ включить звук</span>
        </button>
      </div>
    </div>
    <p class="hero-e__who"><b>Илона Жданович</b>, руководитель центра и подолог. Проведёт по студии за минуту.</p>
    <p class="prose muted">Вросший ноготь, грибок, мозоли, трещины, деформации. Ведём до результата курсом визитов, а не одним приёмом. Точную стоимость назовём по фото до визита.</p>
    <ul class="proofs"><li>Заключение санстанции без замечаний</li><li>Автоклав</li><li>Немецкое оборудование</li><li>Кресла на 5 моторах</li></ul>
    <div class="hero-e__cta"><a class="btn btn--dark" href="#book">Записаться</a><a class="btn btn--ghost" href="#prices">Расчёт по фото</a></div>
  </div>
</section>
```

- [ ] **Step 3: Навигация по проблемам (блок 5.2)**

```html
<section class="section container" id="problems" style="padding-top:0">
  <div class="section__head"><h2>Найдите свою проблему</h2><p class="hint">Каждая ведёт на страницу: как проходит приём, сколько визитов, цены</p></div>
  <ul class="problems">
    <li><a href="vrosshiy-nogot.html"><span><span class="t">Вросший ноготь</span><span class="d">уголок давит, больно в обуви</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Грибок ногтей и стоп</span><span class="d">обработка и сбор материала на анализ</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Мозоли и натоптыши</span><span class="d">в том числе стержневые</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Трещины и сухость стоп</span><span class="d">пятки, огрубевшая кожа</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Деформация и травмы ногтя</span><span class="d">утолщение, гематома, отслоение</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Индивидуальные стельки</span><span class="d">консультация и изготовление</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Гигиенический педикюр</span><span class="d">плановый уход, покрытия</span></span><span class="arr">→</span></a></li>
    <li><a href="#"><span><span class="t">Маникюр</span><span class="d">аппаратный, долговременное покрытие</span></span><span class="arr">→</span></a></li>
  </ul>
</section>
```

- [ ] **Step 4: Временно закрыть `</main>`, добавить подключение JS и проверить**

В конец файла временно: `</main><script src="js/site.js"></script></body></html>`.
Run: `python tools/check.py index.html`
Expected: `OK: все проверки пройдены для index.html`. Если `FAIL … цель меньше 24px`, найти элемент по выводу и поправить размер.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Главная E: шапка, первый экран, навигация по проблемам"
```

---

### Task 7: Главная, вариант E: блоки 5.3–5.6

**Files:**
- Modify: `index.html` (перед `</main>`)

- [ ] **Step 1: Динамика работ (5.3)**

```html
<section class="section section--alt" id="dynamics">
  <div class="container dynamics">
    <div class="section__head" style="margin:0"><h2>Так выглядит динамика одного случая</h2><p class="hint">Один клиент, один ноготь, четыре визита. Фотографии публикуем открыто, без размытия. Даты визитов предоставляет заказчик.</p></div>
    <div class="ba">
      <figure><img src="img/ba-ingrown-1.jpg" alt="Вросший ноготь до первого визита"><figcaption>Визит 1 · дд.мм</figcaption></figure>
      <figure><img src="img/ba-ingrown-2.jpg" alt="Ноготь после установки тампонады"><figcaption>Визит 2 · дд.мм</figcaption></figure>
      <figure><img src="img/ba-ingrown-3.jpg" alt="Ноготь через месяц после начала курса"><figcaption>Визит 3 · дд.мм</figcaption></figure>
      <figure><img src="img/ba-ingrown-4.jpg" alt="Ноготь после завершения курса"><figcaption>Визит 4 · дд.мм</figcaption></figure>
    </div>
  </div>
</section>
```
Если в задаче 2 серия сохранена одной картинкой `ba-ingrown-grid.jpg`, вместо четырёх `figure` поставить одну с alt «Серия из четырёх фотографий: вросший ноготь до и после курса» и подписью «Визиты 1–4, даты предоставляет заказчик».

- [ ] **Step 2: Безопасность (5.4)**

```html
<section class="section container" id="safety">
  <div class="section__head"><h2>Меня здесь не заразят?</h2><p class="hint">Отвечаем документами и оборудованием, а не обещаниями.</p></div>
  <div class="facts">
    <div class="fact"><h3>Заключение санстанции без замечаний</h3><p>Собственный документ центра. <a href="#">Открыть скан</a></p></div>
    <div class="fact"><h3>Автоклав</h3><p>Каждый инструмент проходит дезинфекцию, очистку, стерилизацию в автоклаве, упаковку и хранение до визита.</p></div>
    <div class="fact"><h3>Немецкое оборудование</h3><p>Аппаратная обработка с пылесосом: без пыли и без боли.</p></div>
    <div class="fact"><h3>Кресла на 5 моторах</h3><p>Положение стопы подстраивается под вас, а не вы под кресло.</p></div>
  </div>
  <div class="grid grid--2" style="margin-top:var(--sp-3)">
    <img src="img/autoclave.jpg" alt="Автоклав в стерилизационной студии" style="border-radius:var(--r-card);aspect-ratio:4/3;object-fit:cover">
    <img src="img/cabinet-800.jpg" srcset="img/cabinet-800.jpg 800w, img/cabinet-1600.jpg 1600w" sizes="(min-width:768px) 50vw, 100vw" alt="Подологический кабинет с тремя креслами" style="border-radius:var(--r-card);aspect-ratio:4/3;object-fit:cover">
  </div>
</section>
```

- [ ] **Step 3: Специалисты (5.5)**

```html
<section class="section section--alt" id="team">
  <div class="container">
    <div class="section__head"><h2>Кто будет работать с вами</h2></div>
    <div class="people">
      <div class="person"><img src="img/ilona.jpg" alt="Илона Жданович, руководитель центра и подолог"><h3>Илона</h3><p>Руководитель центра, подолог, инструктор курсов для мастеров.</p><p class="italic">[что больше всего любит в работе, текст от заказчика]</p></div>
      <div class="person"><img src="img/tatiana.jpg" alt="Татьяна, подолог"><h3>Татьяна</h3><p>Подолог. Работает со сложными стопами и корректирующими системами.</p><p class="italic">[что больше всего любит в работе, текст от заказчика]</p></div>
      <div class="person"><img src="img/master.jpg" alt="Мастер студии"><h3>Мастер студии</h3><p>Педикюр и маникюр, долговременное покрытие.</p><p class="italic">[имя и текст от заказчика]</p></div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Цены и расчёт по фото (5.6)**

```html
<section class="section container" id="prices">
  <div class="section__head"><h2>Сколько это будет стоить</h2><p class="hint">У большинства позиций цена «от»: объём работы виден только на стопе. Пришлите фото в мессенджер, назовём точную стоимость до визита.</p></div>
  <div class="prices"><!-- цены из концепта, сверить с YCLIENTS -->
    <div class="price"><h3>Обработка вросшего ногтя, 1 угол</h3><p>Аккуратно обрабатываем уголок ногтя и защищаем кожу вокруг.</p><div class="price__foot"><span class="price__sum">от 25 BYN</span><a class="btn btn--ghost btn--sm" href="vrosshiy-nogot.html">Подробнее</a></div></div>
    <div class="price"><h3>Обработка ногтей с грибком</h3><p>Снимаем инфекционную нагрузку перед врачебными назначениями.</p><div class="price__foot"><span class="price__sum">от 40 BYN</span><a class="btn btn--ghost btn--sm" href="#">Подробнее</a></div></div>
    <div class="price"><h3>Обработка стержневой мозоли</h3><p>Убираем стержень аппаратом, разгружаем зону.</p><div class="price__foot"><span class="price__sum">от 30 BYN</span><a class="btn btn--ghost btn--sm" href="#">Подробнее</a></div></div>
    <div class="price"><h3>Обработка трещин и только стоп</h3><p>Огрубевшая кожа, сухость, трещины на пятках.</p><div class="price__foot"><span class="price__sum">от 50 BYN</span><a class="btn btn--ghost btn--sm" href="#">Подробнее</a></div></div>
    <div class="price"><h3>Педикюр гигиенический, полная обработка</h3><p>Стопы и ногти целиком, базовая процедура регулярного ухода.</p><div class="price__foot"><span class="price__sum">65 BYN</span><a class="btn btn--ghost btn--sm" href="#">Подробнее</a></div></div>
    <div class="price"><h3>Индивидуальные стельки</h3><p>Консультация 50 BYN, изготовление по стопе.</p><div class="price__foot"><span class="price__sum">180 BYN</span><a class="btn btn--ghost btn--sm" href="#">Подробнее</a></div></div>
  </div>
  <div style="margin-top:var(--sp-3);display:grid;gap:12px">
    <p class="prose muted small">Фото нужно, чтобы увидеть объём работы: сколько ногтей, есть ли воспаление, нужна ли корректирующая система. Отвечаем в рабочие часы, переписка остаётся в мессенджере.</p>
    <div class="messengers">
      <a class="btn btn--ghost btn--sm" href="https://t.me/ilonails_studio?text=Здравствуйте!%20Хочу%20узнать%20стоимость,%20прикрепляю%20фото">Telegram</a>
      <a class="btn btn--ghost btn--sm" href="viber://chat?number=%2B375290000000">Viber</a>
      <a class="btn btn--ghost btn--sm" href="https://wa.me/375290000000?text=Здравствуйте!%20Хочу%20узнать%20стоимость,%20прикрепляю%20фото">WhatsApp</a>
      <a class="btn btn--ghost btn--sm" href="#">Полный прайс, 46 позиций →</a>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Проверка и commit**

Run: `python tools/check.py index.html`
Expected: `OK`.

```bash
git add index.html
git commit -m "Главная E: динамика, безопасность, специалисты, цены"
```

---

### Task 8: Главная, вариант E: блоки 5.7–5.10, подвал, модальное окно

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Об Илоне (5.7)**

```html
<section class="section section--alt" id="ilona">
  <div class="container about-ilona">
    <img src="img/ilona.jpg" alt="Илона Жданович в студии">
    <div>
      <span class="eyebrow">Кто за этим стоит</span>
      <h2 style="margin-top:8px">Десять лет назад у меня был маленький стол на съёмной квартире и большое желание помогать людям</h2>
      <p class="prose muted" style="margin-top:16px">Сегодня Ilonails — подологический центр в центре Минска, команда специалистов и оборудование, в которое вложено больше, чем в собственное жильё. Мы не обещаем невозможного. Зато честно говорим, что можем сделать, сколько это стоит и как ухаживать за стопами дома.</p>
      <a class="btn btn--ghost" href="#" style="margin-top:20px">Об Илоне и курсах →</a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Отзывы (5.8)**

```html
<section class="section container" id="reviews">
  <div class="section__head"><h2>Что говорят те, кто уже был</h2><p class="hint">Отзывы подтягиваются с Яндекс.Карт и из YCLIENTS. Ничего не редактируем и не придумываем.</p></div>
  <div class="reviews">
    <div class="review"><blockquote>«Прекрасный мастер и идеальный маникюр. Спасибо огромное!»</blockquote><span class="src">Яндекс.Карты · клиентка студии</span></div>
    <div class="review review--stub"><blockquote>Отзыв подгрузится автоматически после подключения Яндекс.Карт</blockquote><span class="src">Яндекс.Карты</span></div>
    <div class="review review--stub"><blockquote>Отзыв подгрузится автоматически после подключения YCLIENTS</blockquote><span class="src">YCLIENTS</span></div>
  </div>
</section>
```

- [ ] **Step 3: Курсы (5.9)**

```html
<section class="section section--alt" id="courses">
  <div class="container book__in">
    <div class="book__info"><span class="eyebrow">Обучение</span><h2>Курс «Педикюр с элементами подологии»</h2><p class="muted prose">Практика в студии на реальных клиентах, малые группы до четырёх человек. Разрешение на обучение получено одними из первых в городе.</p></div>
    <a class="btn btn--ghost" href="#">О курсе →</a>
  </div>
</section>
```

- [ ] **Step 4: Контакты и запись (5.10)**

```html
<section class="section container" id="contacts">
  <div class="contacts">
    <div>
      <div class="section__head"><h2>Как добраться и записаться</h2></div>
      <div class="book__info">
        <p><b>Минск, ул. Максима Танка, 20</b><br>Центральный район · метро Фрунзенская</p>
        <p class="muted">Ежедневно до 20:00 <!-- часы уточнить у заказчика --></p>
        <p class="muted">Напишите нам: <a href="https://t.me/ilonails_studio">Telegram</a> · <a href="viber://chat?number=%2B375290000000">Viber</a> · <a href="https://wa.me/375290000000">WhatsApp</a></p>
        <p><a class="tnum" href="tel:+375290000000">+375 (29) 000-00-00</a> · <a href="https://instagram.com/ilonails_studio">@ilonails_studio</a></p>
      </div>
      <div id="book" style="margin-top:var(--sp-3);display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn--dark" href="#">Записаться онлайн</a><span class="muted small" style="align-self:center">откроется виджет YCLIENTS</span></div>
    </div>
    <div class="contacts__map"><img src="img/map.jpg" alt="Карта: улица Максима Танка, 20, Минск"></div>
  </div>
</section>
</main>
```

- [ ] **Step 5: Подвал, липкая панель, модальное окно, скрипт**

```html
<footer class="footer">
  <div class="container footer__in">
    <div><a class="logo" href="index.html">ilonails.studio</a><p style="margin-top:8px">Подологический центр, педикюр и маникюр<br>Минск, ул. Максима Танка, 20</p></div>
    <ul><li><a href="#problems">Проблемы</a></li><li><a href="#prices">Цены</a></li><li><a href="#safety">О центре</a></li><li><a href="#team">Специалисты</a></li><li><a href="#courses">Курсы</a></li><li><a href="#contacts">Контакты</a></li></ul>
    <ul><li><a href="tel:+375290000000">+375 (29) 000-00-00</a></li><li><a href="https://instagram.com/ilonails_studio">@ilonails_studio</a></li><li><a href="#book">Запись онлайн</a></li></ul>
  </div>
  <div class="container footer__bottom"><span>ИП Жданович И. · УНП 000000000 · Минск, ул. Максима Танка, 20</span><a href="#">Политика обработки персональных данных</a></div>
</footer>
<div class="sticky-cta"><a class="btn btn--dark" href="#book">Записаться</a><a class="btn btn--ghost" href="#prices">Расчёт по фото</a></div>
<div class="modal" data-open="false" role="dialog" aria-modal="true" aria-label="Ролик Илоны о студии">
  <div class="modal__box"><video src="video/full.mp4" controls playsinline preload="none"></video><button class="modal__close" aria-label="Закрыть">×</button></div>
</div>
<script src="js/site.js"></script>
</body>
</html>
```

- [ ] **Step 6: Проверка, скриншоты, commit**

Run: `python tools/check.py index.html && python tools/render.py index.html`
Expected: `OK`, два PNG в `docs/screens/`. Открыть `docs/screens/index-390.png` и `index-1440.png` через Read, сверить с макетом E из артефакта: кружок справа от заголовка, плитки в один ряд на 1440, липкая панель только на 390.

```bash
git add index.html
git commit -m "Главная E: Илона, отзывы, курсы, контакты, подвал, видео"
```

---

### Task 9: Главная, вариант A

**Files:**
- Create: `index-a.html`

- [ ] **Step 1: Скопировать `index.html` и заменить первый экран**

```bash
cp index.html index-a.html
```
В `index-a.html` заменить весь `<section class="container hero-e">…</section>` на:

```html
<section class="hero-a">
  <picture>
    <source srcset="img/cabinet-1600.jpg" media="(min-width: 768px)">
    <img src="img/cabinet-800.jpg" alt="Подологический кабинет студии Ilonails" fetchpriority="high">
  </picture>
  <div class="container hero-a__in">
    <h1>Подология в&nbsp;Минске: обрабатываем вросшие ногти, грибок, мозоли</h1>
    <p>Студия Ilonails, Центральный район, ул. Максима Танка, 20. Немецкое оборудование, автоклав, заключение санстанции без замечаний.</p>
    <div><a class="btn btn--light" href="#book">Записаться</a></div>
  </div>
</section>
```
Заголовок `<title>` оставить тот же. В шапке `href="index.html"` у логотипа заменить на `index-a.html`.

- [ ] **Step 2: Добавить переключатель вариантов в подвал обеих страниц**

В `footer__bottom` обеих страниц после ссылки на политику добавить: `<a href="index-a.html">Вариант A</a>` в `index.html` и `<a href="index.html">Вариант E</a>` в `index-a.html`.

- [ ] **Step 3: Проверка и commit**

Run: `python tools/check.py index.html index-a.html && python tools/render.py index-a.html`
Expected: `OK`.

```bash
git add index.html index-a.html
git commit -m "Главная A: первый экран с фото кабинета"
```

---

### Task 10: Страница «Вросший ноготь»

**Files:**
- Create: `vrosshiy-nogot.html`

`<head>` как в задаче 6, но:
```html
<title>Вросший ноготь: обработка, тампонада, титановая нить. Подолог в Минске, Ilonails</title>
<meta name="description" content="Обрабатываем вросший ноготь без боли: тампонада, титановая нить, скоба ЗТО, тейпирование. Как проходит приём, сколько визитов, цены. Студия Ilonails, Минск.">
```
Шапка и меню как в `index.html`, ссылки меню ведут на `index.html#problems` и т.д., у пункта «Проблемы» `aria-current="page"`.

- [ ] **Step 1: Блоки 1–3: H1, что это, как проходит приём**

```html
<main>
<div class="container breadcrumbs"><a href="index.html">Главная</a> → <a href="index.html#problems">Проблемы</a> → Вросший ноготь</div>
<section class="container problem-hero">
  <div style="display:grid;gap:14px">
    <h1>Вросший ноготь</h1>
    <p class="prose muted">Уголок ногтя врезается в кожу валика. Больно в обуви, при ходьбе, иногда появляется покраснение и воспаление. Обрабатываем аппаратом, без боли, и подбираем систему, чтобы ноготь рос правильно.</p>
    <div class="problem-hero__cta"><a class="btn btn--dark" href="#book">Записаться</a><a class="btn btn--ghost" href="#prices">Расчёт по фото</a></div>
  </div>
  <img src="img/ba-ingrown-1.jpg" alt="Вросший ноготь до обработки">
</section>

<section class="section section--alt">
  <div class="container">
    <div class="section__head"><h2>Что это и отчего возникает</h2></div>
    <p class="prose">Ноготь врастает, когда его край начинает давить на кожу сбоку. Чаще всего причина в тесной обуви, слишком коротком или закруглённом подстригании, травме или наследственной форме ногтя. Кожа отвечает воспалением, и с каждым днём наступать на палец всё больнее.</p>
    <p class="prose">Сам по себе вросший ноготь не проходит. Чем раньше начать, тем меньше визитов понадобится и тем проще обойтись без корректирующих систем.</p>
  </div>
</section>

<section class="section container">
  <div class="section__head"><h2>Как проходит приём</h2><p class="hint">От входа до выхода около часа. Первый визит длиннее: смотрим, объясняем, обрабатываем.</p></div>
  <ol class="steps">
    <li><h3>Смотрим стопу</h3><p>Оцениваем ноготь, валик, есть ли воспаление. Задаём вопросы про обувь и привычки.</p></li>
    <li><h3>Называем цену</h3><p>До начала работы говорим, что будем делать и сколько это стоит. Без сюрпризов после.</p></li>
    <li><h3>Обрабатываем</h3><p>Освобождаем уголок ногтя аппаратом, убираем давление на кожу. При необходимости ставим тампонаду или корректирующую систему.</p></li>
    <li><h3>Даём рекомендации</h3><p>Как ухаживать дома, какую обувь носить и когда прийти снова.</p></li>
  </ol>
  <div class="pain"><p><b>Будет ли больно?</b> Работаем аппаратом, а не режущим инструментом, поэтому обработка проходит без боли. При сильном воспалении возможен дискомфорт в первые минуты, предупреждаем заранее.</p></div>
</section>
```

- [ ] **Step 2: Блоки 4–5: сроки и до/после**

```html
<section class="section section--alt">
  <div class="container">
    <div class="section__head"><h2>Сколько визитов и когда виден результат</h2></div>
    <div class="grid grid--3">
      <div><span class="eyebrow">Число визитов</span><p class="pending" style="margin-top:8px">Данные предоставляет заказчик (вопрос 12.7 ТЗ)</p></div>
      <div><span class="eyebrow">Интервал между визитами</span><p class="pending" style="margin-top:8px">Данные предоставляет заказчик</p></div>
      <div><span class="eyebrow">Когда заметно глазами</span><p class="pending" style="margin-top:8px">Данные предоставляет заказчик</p></div>
    </div>
  </div>
</section>

<section class="section container">
  <div class="section__head"><h2>До и после</h2><p class="hint">Один случай, фотографии публикуем открыто.</p></div>
  <div class="ba">
    <figure><img src="img/ba-ingrown-1.jpg" alt="Вросший ноготь до первого визита"><figcaption>До</figcaption></figure>
    <figure><img src="img/ba-ingrown-2.jpg" alt="Ноготь после установки тампонады"><figcaption>После 1 визита</figcaption></figure>
    <figure><img src="img/ba-ingrown-3.jpg" alt="Ноготь в середине курса"><figcaption>В процессе</figcaption></figure>
    <figure><img src="img/ba-ingrown-4.jpg" alt="Ноготь после завершения курса"><figcaption>После курса</figcaption></figure>
  </div>
</section>
```

- [ ] **Step 3: Блок 6: цены**

```html
<section class="section section--alt" id="prices">
  <div class="container">
    <div class="section__head"><h2>Цены</h2><p class="hint">Цена «от» зависит от того, сколько углов затронуто и есть ли воспаление. Пришлите фото, назовём точную стоимость до визита.</p></div>
    <div class="prices"><!-- цены из концепта, сверить с YCLIENTS -->
      <div class="price"><h3>Обработка вросшего ногтя, 1 угол</h3><p>Аккуратно обрабатываем уголок ногтя и защищаем кожу вокруг, чтобы ходить было комфортно. Рассказываем, как ухаживать дома.</p><div class="price__foot"><span class="price__sum">25 BYN</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
      <div class="price"><h3>Тампонада, 1 угол</h3><p>Устанавливаем тампонаду в область ногтевого валика, чтобы уменьшить давление ногтя на ткани. Снижает дискомфорт, защищает кожу и помогает ногтю расти правильно.</p><div class="price__foot"><span class="price__sum">20 BYN</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
      <div class="price"><h3>Жидкая тампонада, 1 угол</h3><p>Защищает и разгружает проблемный участок валика. Держится дольше обычной тампонады и не мешает в обуви.</p><div class="price__foot"><span class="price__sum">30 BYN</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
      <div class="price"><h3>Тейпирование боковых валиков</h3><p>Специальный тейп отводит кожу от ногтя и снижает давление боковых валиков на пластину. Простая процедура на один визит.</p><div class="price__foot"><span class="price__sum">15 BYN</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
      <div class="price"><h3>Корректирующая система «Титановая нить»</h3><p>Бережно меняет форму ногтя и снижает давление на боковые валики. Носится незаметно, помогает ногтю расти правильно и предотвращает врастание.</p><div class="price__foot"><span class="price__sum">60 BYN</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
      <div class="price"><h3>Корректирующая скоба ЗТО</h3><p>Выравнивает форму вросшего или деформированного ногтя, снижает давление на валики и помогает правильному росту пластины.</p><div class="price__foot"><span class="price__sum">65 BYN</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
      <div class="price"><h3>Перевязка при вросшем ногте</h3><p>Обрабатываем и перевязываем проблемную зону, чтобы защитить ткани и создать условия для заживления. Даём рекомендации по уходу.</p><div class="price__foot"><span class="price__sum">цена уточняется</span><a class="btn btn--ghost btn--sm" href="#book">Записаться</a></div></div>
    </div>
    <div class="messengers" style="margin-top:var(--sp-3)">
      <a class="btn btn--ghost btn--sm" href="https://t.me/ilonails_studio?text=Здравствуйте!%20Вросший%20ноготь,%20прикрепляю%20фото">Telegram</a>
      <a class="btn btn--ghost btn--sm" href="viber://chat?number=%2B375290000000">Viber</a>
      <a class="btn btn--ghost btn--sm" href="https://wa.me/375290000000?text=Здравствуйте!%20Вросший%20ноготь,%20прикрепляю%20фото">WhatsApp</a>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Блоки 7–9: кто выполняет, запись, смежные проблемы, подвал**

```html
<section class="section container" id="team">
  <div class="section__head"><h2>Кто выполняет</h2></div>
  <div class="people">
    <div class="person"><img src="img/ilona.jpg" alt="Илона Жданович, подолог"><h3>Илона</h3><p>Руководитель центра, подолог. Корректирующие системы, сложные случаи.</p></div>
    <div class="person"><img src="img/tatiana.jpg" alt="Татьяна, подолог"><h3>Татьяна</h3><p>Подолог. Тампонады, титановая нить, скобы.</p></div>
  </div>
</section>

<section class="section book" id="book">
  <div class="container book__in">
    <div class="book__info"><h2>Записаться в студию</h2><p>Минск, ул. Максима Танка, 20 · ежедневно до 20:00</p><p class="muted">Напишите нам: <a href="https://t.me/ilonails_studio">Telegram</a> · <a href="viber://chat?number=%2B375290000000">Viber</a> · <a href="https://wa.me/375290000000">WhatsApp</a></p></div>
    <div style="display:grid;gap:8px;justify-items:start"><a class="btn btn--dark" href="#">Записаться онлайн</a><a class="tnum" href="tel:+375290000000">+375 (29) 000-00-00</a></div>
  </div>
</section>

<section class="section container">
  <div class="section__head"><h2>Смежные проблемы</h2></div>
  <div class="related"><a href="#">Деформация и травмы ногтя →</a><a href="#">Грибок ногтей и стоп →</a><a href="#">Гигиенический педикюр →</a></div>
</section>
</main>
```
Подвал и липкая панель как в `index.html`, ссылки подвала ведут на `index.html#…`, липкая панель: `href="#book"` и `href="#prices"`. Модальное окно на этой странице не нужно, скрипт подключить.

- [ ] **Step 5: Проверка, скриншоты, commit**

Run: `python tools/check.py && python tools/render.py`
Expected: `OK: все проверки пройдены для index.html, index-a.html, vrosshiy-nogot.html`. Посмотреть `docs/screens/vrosshiy-nogot-390.png` и `-1440.png`: девять блоков в порядке §5.2, липкая панель не закрывает блок «Смежные проблемы».

```bash
git add vrosshiy-nogot.html
git commit -m "Страница «Вросший ноготь», шаблон страницы проблемы"
```

---

### Task 11: Ручной прогон §10 и правки

**Files:**
- Modify: любые из `index.html`, `index-a.html`, `vrosshiy-nogot.html`, `css/*.css`

- [ ] **Step 1: Прогнать пункты, которые скрипт не покрывает**

Открыть каждую страницу в браузере панели (`preview_start` с сервером `python -m http.server 8080`) на 390 и 1440:
- Меню открывается и закрывается бургером, ссылки закрывают меню
- Кружок играет без звука, клик открывает модальное окно, Escape и крестик закрывают, видео ставится на паузу
- При эмуляции `prefers-reduced-motion` кружок показывает постер и не играет
- Липкая панель на 390 не закрывает последний блок при прокрутке до конца
- На 1440 плитки проблем в один ряд, восемь штук, без переноса
- Заголовки не переносятся по одному слову в последней строке (если да, поправить `max-width` у h1/h2 в `pages.css`)

Каждый найденный дефект чинится сразу и называется в сообщении коммита.

- [ ] **Step 2: Lighthouse на главной**

Run (при запущенном сервере): `npx lighthouse http://localhost:8080/index.html --preset=perf --form-factor=mobile --throttling-method=simulate --output=json --output-path=tools/_tmp/lh.json --quiet`
Затем: `python -c "import json;d=json.load(open('tools/_tmp/lh.json'));print('LCP', d['audits']['largest-contentful-paint']['displayValue'])"`
Expected: `LCP` ≤ 2,5 с. Если больше: проверить, что кружок грузит `poster` до видео, и что `full.mp4` имеет `preload="none"`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Правки по ручному прогону чек-листа §10"
```

---

### Task 12: Публикация на GitHub Pages

**Files:**
- Modify: `README.md` (ссылка на прототип)

- [ ] **Step 1: Создать репозиторий и запушить**

```bash
gh repo create Pirus2302/ilonails-prototype --public --source=. --remote=origin --push
```
Expected: репозиторий создан, ветка `main` запушена.

- [ ] **Step 2: Включить Pages**

```bash
gh api -X POST repos/Pirus2302/ilonails-prototype/pages -f "source[branch]=main" -f "source[path]=/"
```
Expected: JSON с `"html_url": "https://pirus2302.github.io/ilonails-prototype/"`. Через 1–2 минуты `curl -sI https://pirus2302.github.io/ilonails-prototype/ | head -1` отвечает `HTTP/2 200`.

- [ ] **Step 3: Проверить опубликованную версию**

Открыть `https://pirus2302.github.io/ilonails-prototype/`, `/index-a.html`, `/vrosshiy-nogot.html` в браузере панели, убедиться, что шрифты, фото и видео загружаются: в `read_network_requests` нет ответов 404.

- [ ] **Step 4: Дописать README и закоммитить**

В `README.md` после первого абзаца: `Прототип: https://pirus2302.github.io/ilonails-prototype/ (варианты главной: / и /index-a.html)`.

```bash
git add README.md
git commit -m "Ссылка на опубликованный прототип"
git push
```

---

## Самопроверка плана

**Покрытие спеки.** §3 структура: задачи 1, 3–5. §4 главная 10 блоков: задачи 6–8 (5.1–5.2 в задаче 6, 5.3–5.6 в задаче 7, 5.7–5.10 в задаче 8). Запасной A: задача 9. §5 страница проблемы 9 блоков: задача 10. §6 дизайн-система: задачи 3–4. §7 видео: задачи 2, 5, 6, 8. §8 словарь: регулярка в `check.py`. §9 источники контента: задача 2 и тексты в задачах 6–10. §10 проверки: `check.py`, задача 11. §11 публикация: задача 12.

**Открытые данные спеки, помеченные в коде явно:** часы работы, публичный телефон, цены (комментарий «сверить с YCLIENTS»), сроки процедур (блок `.pending`), тексты «что люблю в работе», цена перевязки, скан санстанции. Это места, где данные предоставляет заказчик по §07 ТЗ, а не пробелы плана.

**Согласованность имён.** Классы `.hero-e`, `.hero-a`, `.bubble`, `.problems`, `.prices`, `.price`, `.people`, `.person`, `.ba`, `.facts`, `.fact`, `.steps`, `.book`, `.sticky-cta`, `.modal`, `.reviews`, `.review`, `.footer`, `.related`, `.pending`, `.pain`, `.breadcrumbs` определены в задачах 4–5 и используются в задачах 6–10 под теми же именами. Атрибуты `data-open-video`, `data-autoplay`, `data-open` совпадают между HTML и `site.js`. Файлы изображений из задачи 2 совпадают с `src` в задачах 6–10.
