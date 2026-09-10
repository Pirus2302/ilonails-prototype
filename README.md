# Ilonails, прототип сайта

Статический HTML-прототип студии подологии Ilonails (Минск). Этап 1: главная и страница «Вросший ноготь».

Прототип: https://pirus2302.github.io/ilonails-prototype/ (главная: / с переключателями блока проблем `?problems=map|ask|tiles` и блока «до и после» `?dynamics=compare|strip`, старый вариант A: /index-a.html, страница проблемы: /vrosshiy-nogot.html)

Спека: docs/superpowers/specs/2026-09-09-ilonails-design-stage1-design.md

## Проверки
Нужны Python 3.11, `pip install playwright pillow pypdfium2`, `playwright install chromium`.

python tools/check.py            # чек-лист §10 по всем страницам
python tools/check.py --tokens   # только контраст токенов
python tools/render.py           # скриншоты 390 и 1440 в docs/screens/

## Локальный просмотр
python -m http.server 8080       # затем http://localhost:8080/
