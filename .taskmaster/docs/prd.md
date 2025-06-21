## Кратко

Собираем одностраничный web-инструмент (SPA) на React, который открывает исходный **PDF P\&ID**, автоматически наносит синие рамки вокруг найденных line-numbers (координаты берём из `*.pdf_processed.json`), выводит список номеров справа и даёт интерактив: клик по строке → рамка краснеет; двойной клик открывает модальное окно для коррекции/удаления и немедленно пишет изменения в PostgreSQL. Базируемся на open-source-стеке `pdf.js + react-pdf-viewer + highlight plugin + fabric.js` для оверлеев — он уже умеет отрисовывать PDF в Canvas/DOM и поддерживает аннотации без vendor lock-in.

---

## Цель этапа

Создать MVP-визуализатор, который:

1. Загружает любое `test_pid.pdf` из каталога `data/`.
2. Читает `*.pdf_processed.json` и `extracted_piping_lines.txt`, строит карту `lineNumber → {page, bbox}`.
3. Рендерит PDF, рисует синие прямоугольники.
4. Отображает список line-numbers.
5. Реактивно подсвечивает выбранный элемент и позволяет править текст.
6. Сохраняет изменения в БД и (опционально) экспортирует новый слой аннотаций в `pdf-lib`-пачку для офлайн-отправки инженерам.

---

## Функциональные требования

### 1. Загрузка и парсинг

| #   | Требование                                | Подробности                                                                                                                                                 |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Автоматическая загрузка файлов из `/data` | Сервис-watcher на Node.js следит за директорией; новые пары `*.pdf` + `*.json` кладёт в таблицу `documents`.                                                |
| 1.2 | Разбор JSON                               | Back-end (FastAPI) читает `Document.pages[*].blocks[*].boundingPoly` и строит нормализованные bbox (pixels → percents) для масштабонезависимого рендеринга. |

### 2. Визуализация

| 2.1 | PDF-рендер | `@react-pdf-viewer/core` на базе `pdf.js` — быстрый, TypeScript-friendly, MIT-лицензия. |
| 2.2 | Синие рамки | Слой `fabric.Canvas` поверх текстового слоя PDF; прямоугольники создаются из bbox и фиксируются как неизменяемые объекты "guide". |
| 2.3 | Синхронизация списка | Храним `id` рамки в атрибуте React-компонента; при ховере / клике двусторонняя подсветка. |
| 2.4 | Выбор/исправление | Модалка (`shadcn/ui` Dialog) с формой ввода; валидация RegEx: `^\d+"-[A-Z]{2}-[A-Z]\d-\d{2,}`. |

### 3. База данных

```sql
CREATE TABLE documents (
  id            serial primary key,
  file_name     text,
  pages         int,
  imported_at   timestamptz default now()
);

CREATE TABLE line_numbers (
  id            serial primary key,
  document_id   int references documents,
  page          int,
  text          text,
  bbox          jsonb,          -- {x0,y0,x1,y1} в 0-1
  status        text default 'auto', -- auto | reviewed | deleted
  updated_at    timestamptz default now()
);
```

PDF-файлы храним на диске, а метаданные — в PostgreSQL (быстрее бэкапы, меньше RAM overhead vs `bytea`).

### 4. API

* `GET /doc/:id`  – метаданные + список bbox.
* `PATCH /line/:id` – обновить текст/статус.
* WebSocket для live-push, чтобы несколько инженеров работали параллельно.

### 5. Нефункциональные

* **Latency**: ≤ 200 ms от клика до обновления UI (frontend state, затем дебаунс-PATCH).
* **Browsers**: Chrome 114+, Edge 124+, Firefox 126.
* **Security**: CORS off by default, JWT auth, PDF-рендер в iframe sandbox "allow-scripts" (см. CVE-историю pdf.js exploits).
* **I18N**: UI на русском, шрифты от Inter.

---

## UX / UI

* Левый flex-pane — PDF-viewer; правый — sticky-list с поиском и фильтром (по loop-ID, статусу).
* Цвета: auto — синий `#1E90FF`; active — красный `#FF3B30`.
* Горячие клавиши: **↑/↓** циклический выбор; **Delete** — пометить как `deleted`.
* "Save All" — всплывающий toast, но данные пишутся сразу (optimistic UI).

---

## Технологический стек

| Задача                        | Библиотека                                                                     | Причина                                        |
| ----------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Рендер PDF                    | `pdf.js` (via `react-pdf-viewer`)                                              | battle-tested, MIT, поддерживает страницы > A0 |
| Аннотации                     | `react-pdf-highlighter` для text-layer + `fabric.js` для bbox overlays         |                                                |
| Рисование/экспорт             | `pdf-lib` — добавляет прямоугольники в оригинальный PDF (для offline)          |                                                |
| Десктоп-обёртка (опционально) | Electron + React — пример редактора PDF подтверждён сообществом                |                                                |
| OCR-fallback на будущее       | `easyocr` — > Тesseract точность на инженерных схемах по отзывам ML-сообщества |                                                |
| Back-end                      | FastAPI + SQLAlchemy; Gunicorn-uvicorn workers.                                |                                                |
| DB                            | PostgreSQL 15.4.                                                               |                                                |

---

## Метрики готовности

| KPI                                        | Цель                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Покрытие авто-раскраски                    | ≥ 95 % line-numbers выделены верно без ручной правки (по 3 образцам). |
| Среднее время загрузки 1 страницы PDF (A1) | ≤ 1,5 с на ноутбуке i7/16 GB.                                         |
| Среднее время изменения & сохранения       | ≤ 0,2 с.                                                              |

---

## Расширения следующего спринта

* Поддержка draw-path вдоль всей трубы (алгоритм BFS по векторным сегментам).
* Версия для сканов: интеграция `easyocr` + angle-augmented OCR pipeline (0°, 90°, 180°, 270°) из предыдущего ТЗ.
* Масштабирование на десктоп (Electron) и микро-Сервис аннотаций, чтобы внешние системы (SAP, Maximo) вытягивали bounding-box через REST.

---

## Ресурсы

1. React-компонент для PDF-аннотаций
2. pdf.js API и выделения текста/координат
3. Fabric.js overlay best-practice
4. React PDF Viewer и highlight plugin docs
5. pdf-lib drawRectangle API
6. PostgreSQL хранение файлов и обсуждение схемы
7. Electron + React пример редактора PDF 