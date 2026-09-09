# Ilonails, прототип сайта

Статический HTML-прототип студии подологии Ilonails (Минск). Этап 1: главная и страница «Вросший ноготь».

Спека: docs/superpowers/specs/2026-09-09-ilonails-design-stage1-design.md

## Проверки
python tools/check.py            # чек-лист §10 по всем страницам
python tools/check.py --tokens   # только контраст токенов
python tools/render.py           # скриншоты 390 и 1440 в docs/screens/

## Локальный просмотр
python -m http.server 8080       # затем http://localhost:8080/
