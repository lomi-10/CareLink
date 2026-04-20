/**
 * Extract trailing `const X = StyleSheet.create({...});` into co-located `.styles.ts`.
 * Skips files without StyleSheet.create or without a match.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'app');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.tsx') && !name.includes('.styles')) out.push(p);
  }
  return out;
}

function extractBlocks(text) {
  const re = /const\s+(\w+)\s*=\s*StyleSheet\.create\s*\(\s*\{/g;
  const blocks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const varName = m[1];
    const start = m.index;
    const braceStart = text.indexOf('{', m.index);
    let depth = 0;
    let j = braceStart;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const close = text.indexOf(');', j + 1);
    if (close === -1) throw new Error('No close );');
    const end = close + 2;
    const snippet = text.slice(start, end);
    blocks.push({ varName, start, end, snippet });
  }
  return blocks;
}

function processFile(filePath) {
  if (filePath.includes('debug.tsx')) return;
  let text = fs.readFileSync(filePath, 'utf8');
  if (!text.includes('StyleSheet.create')) return;
  if (text.includes('.styles')) {
    /* likely already modularized */
  }

  const blocks = extractBlocks(text);
  if (blocks.length === 0) return;

  const outPath = filePath.replace(/\.tsx$/, '.styles.ts');
  const base = path.basename(outPath);

  const exported = blocks.map((b) =>
    b.snippet.replace(/^const\s+(\w+)\s*=\s*/, 'export const $1 = ')
  );

  let header = `// ${base}\nimport { StyleSheet } from 'react-native';\n`;
  if (/\btheme\./.test(exported.join('\n'))) {
    header += `\nimport { theme } from '@/constants/theme';\n`;
  }
  header += '\n';
  fs.writeFileSync(outPath, header + exported.join('\n\n') + '\n');

  for (let i = blocks.length - 1; i >= 0; i--) {
    text = text.slice(0, blocks[i].start) + text.slice(blocks[i].end);
  }

  text = text.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/g,
    (full, inner) => {
      if (!inner.includes('StyleSheet')) return full;
      const parts = inner.split(',').map((s) => s.trim()).filter(Boolean);
      const next = parts.filter((p) => p !== 'StyleSheet');
      if (next.length === 0) return full;
      return `import { ${next.join(', ')} } from 'react-native'`;
    }
  );

  const names = blocks.map((b) => b.varName);
  const imp = `import { ${names.join(', ')} } from './${base}';\n`;
  const lines = text.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, imp.trimEnd());
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(filePath, '->', outPath);
}

for (const f of walk(root)) {
  try {
    processFile(f);
  } catch (e) {
    console.error('FAIL', f, e);
  }
}
