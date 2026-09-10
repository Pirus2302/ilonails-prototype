# Ilonails, прототип сайта

Статический HTML-прототип студии подологии Ilonails (Минск). Этап 1: главная и страница «Вросший ноготь».

Прототип: https://pirus2302.github.io/ilonails-prototype/ (главная: / с переключателями блока проблем `?problems=map|ask|tiles` , блока «до и после» `?dynamics=compare|strip` , блока чистоты `?safety=steps|photos|qa` , блока команды `?team=pick|slider`, «Об Илоне» `?ilona=photo|quote`, курсов `?courses=simple|masters` и контактов `?contacts=map|table|form`; блок отзывов – живой виджет Яндекс Карт (id 3776358101) плюс карточки-примеры из YCLIENTS, старый вариант A: /index-a.html, страница проблемы: /vrosshiy-nogot.html с переключателями первого экрана `?phero=symptoms|answer` , блока «Что это» `?what=cards|scheme|pull` и блока «Как проходит приём» `?how=cases|prep`)

Спека: docs/superpowers/specs/2026-09-09-ilonails-design-stage1-design.md

## Проверки
Нужны Python 3.11, `pip install playwright pillow pypdfium2`, `playwright install chromium`.

python tools/check.py            # чек-лист §10 по всем страницам
python tools/check.py --tokens   # только контраст токенов
python tools/render.py           # скриншоты 390 и 1440 в docs/screens/

## Локальный просмотр
python -m http.server 8080       # затем http://localhost:8080/
