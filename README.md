# Party Time — материалы для вёрстки лендинга

Подготовительный пакет: ТЗ, дизайн-система, контент, логотипы, токены.

## Как начать (PowerShell)

```powershell
cd "C:\Users\G13\Desktop\CLAUDE\Party Time web"
claude
```

Первое сообщение в Claude Code:

> Прочитай CLAUDE.md и docs/TZ.md. Выполни шаг 0 и шаг 1: подготовь проект и сверстай два варианта hero и каталога залов (/a и /b). Пушь в репозиторий после каждого блока.

## Структура

```
CLAUDE.md                 — инструкция для Claude Code
docs/TZ.md                — техническое задание
docs/DESIGN_SYSTEM.md     — дизайн-система
content/content.md        — тексты всех секций
content/rooms.json        — 36 залов (Думская + Маяковская)
brand/logo/               — логотипы SVG (обрезаны под веб)
brand/favicon/            — фавиконы
brand/tokens.css          — CSS-переменные
scripts/download-assets.mjs — скачивание фото залов и 3D-иконок
Referens/  Photo/  Logo/  — материалы заказчика
```
