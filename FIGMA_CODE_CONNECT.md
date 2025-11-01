# Figma Code Connect Setup

Этот проект настроен для работы с Figma Code Connect, который связывает компоненты дизайна в Figma с кодом компонентов.

## Настройка

### 1. Установка зависимостей

Зависимости уже установлены:
```bash
npm install
```

### 2. Настройка токена Figma

Создайте файл `.env` в корне проекта:

```bash
FIGMA_ACCESS_TOKEN=your-figma-token-here
```

Или используйте переменную окружения:
```bash
export FIGMA_ACCESS_TOKEN=your-figma-token-here
```

**Важно:** Токен должен иметь следующие scopes:
- File Read
- Code Connect Write

### 3. Генерация связей компонентов

Автоматическая генерация Code Connect файлов:

```bash
npm run figma:generate
```

Этот скрипт читает `component-links.json` из проекта `figma-compare` и создаёт `.figma.tsx` файлы для всех компонентов, которые найдены в Figma.

**Автоматически генерируются связи для:**
- Button
- Card
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Tabs
- Tooltip

Файлы создаются в `components/ui/*.figma.tsx` рядом с соответствующими компонентами.

## Использование

### Публикация связей в Figma

```bash
npm run figma:publish
```

Эта команда найдет все файлы `*.figma.tsx` в проекте и опубликует их связи в Figma.

### Просмотр связей (без публикации)

```bash
npm run figma:parse
```

Эта команда выведет все найденные связи в формате JSON.

### Создание новой связи

#### Автоматически (рекомендуется)

1. Обновите список компонентов в Figma (если нужно)
2. Запустите скрипт получения ссылок в проекте `figma-compare`:
   ```bash
   cd ../figma-compare
   node get-component-links.js
   ```
3. Запустите генерацию:
   ```bash
   cd ../app
   npm run figma:generate
   ```

#### Вручную

Для создания связи с новым компонентом вручную:

```bash
FIGMA_ACCESS_TOKEN=your-token npx @figma/code-connect connect create "https://www.figma.com/design/NCOipUvDUDA81v5lvGrFrg?node-id=XXX-YYY"
```

После создания файла обновите его:
1. Исправьте импорты на правильные пути (`@/components/ui/...`)
2. Настройте `props` для соответствия Figma свойствам
3. Обновите `example` функцию для правильного отображения в Figma

## Структура файлов Code Connect

Файлы Code Connect имеют расширение `.figma.tsx` и находятся рядом с компонентами:

```
components/ui/
  ├── dialog.tsx
  ├── dialog.figma.tsx  ← Code Connect файл
  ├── tabs.tsx
  ├── tabs.figma.tsx    ← Code Connect файл
  └── ...
```

## Дополнительная информация

- [Документация Figma Code Connect](https://www.figma.com/developers/api/code-connect)
- [Репозиторий Code Connect](https://github.com/figma/code-connect)

