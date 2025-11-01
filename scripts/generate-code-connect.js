// scripts/generate-code-connect.js

// Автогенерация *.figma.tsx на основе реальных компонентов в components/ui/*.tsx

import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Откуда брать ссылки на компоненты
const LINKS_PATH = path.resolve(__dirname, "../..", "figma-compare", "component-links.json");

// Куда писать .figma.tsx
const OUT_DIR = path.resolve(__dirname, "..", "components", "ui");

// Откуда читать компоненты
const COMPONENTS_DIR = path.resolve(__dirname, "..", "components", "ui");

function toKey(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function findComponentUrl(components, targetKey) {
  // Сначала точное совпадение
  for (const c of components) {
    const key = toKey(c.name);
    if (key === targetKey) return c.url;
  }
  // Затем частичное совпадение
  for (const c of components) {
    const key = toKey(c.name);
    if (key.includes(targetKey) || targetKey.includes(key)) return c.url;
  }
  return null;
}

function extractExports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const exports = [];
  
  // Ищем function ComponentName
  const functionMatches = content.matchAll(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g);
  for (const match of functionMatches) {
    exports.push(match[1]);
  }
  
  // Ищем export { ... }
  const exportMatches = content.matchAll(/export\s*{\s*([^}]+)\s*}/g);
  for (const match of exportMatches) {
    const items = match[1].split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
    exports.push(...items);
  }
  
  // Ищем export const ComponentName
  const constMatches = content.matchAll(/export\s+(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g);
  for (const match of constMatches) {
    exports.push(match[1]);
  }
  
  return [...new Set(exports)]; // Убираем дубликаты
}

function getMainComponentName(exports, fileName) {
  // Имя файла без расширения (например, "button" из "button.tsx")
  const baseName = path.basename(fileName, '.tsx').replace(/\.figma$/, '');
  const componentName = baseName.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  
  // Ищем компонент с таким именем в экспортах
  if (exports.includes(componentName)) {
    return componentName;
  }
  
  // Или берём первый экспорт с заглавной буквы
  const capitalized = exports.find(e => /^[A-Z]/.test(e));
  if (capitalized) {
    return capitalized;
  }
  
  return componentName || exports[0] || 'Component';
}

function generateImports(exports, baseName) {
  // Формируем импорты для всех экспортов компонента
  const componentName = getMainComponentName(exports, baseName);
  const allExports = exports.length > 0 ? exports.join(', ') : componentName;
  // Используем относительные пути вместо алиасов для Code Connect
  return `import { ${allExports} } from "./${baseName}"`;
}

function generateExample(exports, componentName, baseName) {
  // Простой пример использования
  const mainComponent = componentName;
  
  // Специальные случаи для сложных компонентов
  if (baseName === 'dialog' && exports.includes('DialogTrigger') && exports.includes('DialogContent')) {
    return `() => (
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )`;
  }
  
  if (baseName === 'tabs' && exports.includes('TabsList') && exports.includes('TabsTrigger')) {
    return `() => (
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )`;
  }
  
  if (baseName === 'tooltip' && exports.includes('TooltipTrigger') && exports.includes('TooltipContent')) {
    return `() => (
      <Tooltip>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent>Tooltip</TooltipContent>
      </Tooltip>
    )`;
  }
  
  if (baseName === 'dropdown-menu' && exports.includes('DropdownMenuTrigger') && exports.includes('DropdownMenuContent')) {
    return `() => (
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )`;
  }
  
  if (baseName === 'card' && exports.includes('CardHeader') && exports.includes('CardContent')) {
    return `() => (
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )`;
  }
  
  // Простой компонент
  return `(p) => <${mainComponent} {...p}>${mainComponent}</${mainComponent}>`;
}

function generateProps(exports, componentName, baseName) {
  // Пока используем пустые props - Figma компоненты могут не иметь этих свойств
  // В будущем можно будет добавить правильные props на основе реальных свойств компонентов в Figma
  return 'props: {},';
}

function makeFile(url, imports, componentName, baseName, exports) {
  const example = generateExample(exports, componentName, baseName);
  const props = generateProps(exports, componentName, baseName);
  
  return `/* Auto-generated by scripts/generate-code-connect.js */

import React from "react"
import figma from "@figma/code-connect"
${imports}

figma.connect(
  ${componentName},
  "${url}",
  {
    ${props}
    example: ${example}
  }
)
`;
}

function writeFileSafe(filepath, content) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, content, "utf8");
}

(function main() {
  if (!fs.existsSync(LINKS_PATH)) {
    console.error(`❌ component-links.json не найден по пути: ${LINKS_PATH}`);
    process.exit(1);
  }

  const links = JSON.parse(fs.readFileSync(LINKS_PATH, "utf8"));
  const figmaComponents = links.components || [];

  // Сканируем компоненты в components/ui/
  const componentFiles = fs.readdirSync(COMPONENTS_DIR)
    .filter(f => f.endsWith('.tsx') && !f.endsWith('.figma.tsx') && !f.startsWith('.'));

  const results = { created: [], skipped: [], missing: [] };

  for (const fileName of componentFiles) {
    const filePath = path.join(COMPONENTS_DIR, fileName);
    const baseName = path.basename(fileName, '.tsx');
    const componentKey = toKey(baseName);

    try {
      const exports = extractExports(filePath);
      if (exports.length === 0) {
        results.skipped.push({ file: fileName, reason: "No exports found" });
        continue;
      }

      const componentName = getMainComponentName(exports, fileName);
      const figmaUrl = findComponentUrl(figmaComponents, componentKey);

      if (!figmaUrl) {
        results.missing.push({ component: baseName, exports });
        continue;
      }

      const imports = generateImports(exports, baseName);
      const outFile = path.join(OUT_DIR, `${baseName}.figma.tsx`);
      const content = makeFile(figmaUrl, imports, componentName, baseName, exports);
      
      writeFileSafe(outFile, content);
      results.created.push({ 
        component: baseName, 
        file: outFile,
        mainExport: componentName,
        figmaUrl 
      });
    } catch (error) {
      results.skipped.push({ file: fileName, reason: error.message });
    }
  }

  // Отчёт
  console.log("\n=== Code Connect generation report ===");
  console.table(results.created.map(x => ({ 
    component: x.component, 
    export: x.mainExport,
    file: path.basename(x.file)
  })));

  if (results.missing.length > 0) {
    console.warn("\n⚠️  Не найдены в Figma:");
    results.missing.forEach(m => {
      console.warn(`   - ${m.component} (exports: ${m.exports.join(', ')})`);
    });
  }

  if (results.skipped.length > 0) {
    console.warn("\nℹ️  Пропущены:");
    results.skipped.forEach(s => {
      console.warn(`   - ${s.file}: ${s.reason}`);
    });
  }

  console.log(`\n✅ Создано ${results.created.length} Code Connect файлов`);
  console.log("Готово. Можно публиковать связи: npm run figma:publish");
})();
