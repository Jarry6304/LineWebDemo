/* 乾淨發布版 build：Select → Transform → Verify（用法見 README「發布乾淨版」段） */
import { readFile, writeFile, copyFile, mkdir, rm, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform, transformSync } from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist', 'public');

// ============================================================
// Allowlist（dist/public 唯一合法內容；新增檔案必須改這裡）
// ============================================================
const HTML_FILES = ['index.html', 'courses.html', 'info.html', '404.html', 'error.html'];
const CSS_FILES = ['assets/css/main.css'];
const JS_FILES = [
  'assets/js/csv.js',
  'assets/js/shared.js',
  'assets/js/home.js',
  'assets/js/courses.js',
  'assets/js/info.js',
];
const SITE_CONFIG = 'assets/js/site-config.js'; // 不複製，由 build 生成
const VERBATIM_FILES = [
  'assets/tiger-beetle-2026.pdf',
  '.github/workflows/deploy.yml',
  '.nojekyll',
  'LICENSE',
];
const VERBATIM_DIRS = ['assets/img'];

const FORBIDDEN_WORDS = [
  'readme', 'dataspec', 'xlsx', 'openpyxl', 'build_site', 'linewebdemo', 'jarry',
  'claude', 'anthropic', 'todo', 'fixme', 'hack', '資安守則', '維護者', '開發者',
];
const BINARY_EXTS = new Set(['.png', '.pdf', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2']);

// charset:'utf8' 必要：esbuild 預設會把非 ASCII（中文、▼）轉成 \uXXXX 轉義
const ESB_COMMON = { charset: 'utf8', legalComments: 'none', target: 'esnext' };

const renderSiteConfig = (id) => `window.SITE_CONFIG = {\n  GOOGLE_SHEETS_ID: "${id}"\n};\n`;

class BuildError extends Error {}

const srcPath = (rel) => path.join(ROOT, ...rel.split('/'));
const distPath = (rel) => path.join(DIST, ...rel.split('/'));

// ============================================================
// Sheet ID：--sheet-id > $LINEWEB_SHEET_ID；先解析再動 dist
// ============================================================
export function resolveSheetId(argv, env) {
  let raw = null;
  const i = argv.indexOf('--sheet-id');
  if (i !== -1 && argv[i + 1] !== undefined) raw = argv[i + 1];
  if (raw === null) {
    const eq = argv.find((a) => a.startsWith('--sheet-id='));
    if (eq !== undefined) raw = eq.slice('--sheet-id='.length);
  }
  if (raw === null && env.LINEWEB_SHEET_ID !== undefined) raw = env.LINEWEB_SHEET_ID;
  if (raw === null || raw.trim() === '') {
    throw new BuildError('ERROR: 缺少 sheet id（用 --sheet-id <ID或試算表網址>，或設環境變數 LINEWEB_SHEET_ID）');
  }
  raw = raw.trim();
  const m = raw.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (m) raw = m[1];
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new BuildError(`ERROR: sheet id 格式不合法（只允許英數、_、-）: ${raw}`);
  }
  return raw;
}

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(abs, base)));
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out.sort();
}

async function expandAllowlist() {
  const globbed = [];
  for (const dir of VERBATIM_DIRS) {
    globbed.push(...(await walk(srcPath(dir))).map((p) => `${dir}/${p}`));
  }
  return [...HTML_FILES, ...CSS_FILES, ...JS_FILES, SITE_CONFIG, ...VERBATIM_FILES, ...globbed].sort();
}

// ============================================================
// Stage 1 — Select：清空 dist，依 allowlist 列舉複製
// ============================================================
export async function stage1Select(sheetId) {
  const missing = [];
  for (const rel of [...HTML_FILES, ...CSS_FILES, ...JS_FILES, SITE_CONFIG, ...VERBATIM_FILES]) {
    try { await access(srcPath(rel)); } catch { missing.push(rel); }
  }
  for (const dir of VERBATIM_DIRS) {
    try { await access(srcPath(dir)); } catch { missing.push(`${dir}/`); }
  }
  if (missing.length > 0) {
    throw new BuildError('ERROR: allowlist 來源檔缺失:\n' + missing.map((p) => `  ${p}`).join('\n'));
  }

  await rm(DIST, { recursive: true, force: true });

  const copyRel = async (rel) => {
    const target = distPath(rel);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(srcPath(rel), target);
  };
  for (const rel of [...HTML_FILES, ...CSS_FILES, ...JS_FILES, ...VERBATIM_FILES]) await copyRel(rel);
  for (const dir of VERBATIM_DIRS) {
    for (const p of await walk(srcPath(dir))) await copyRel(`${dir}/${p}`);
  }

  const cfgTarget = distPath(SITE_CONFIG);
  await mkdir(path.dirname(cfgTarget), { recursive: true });
  await writeFile(cfgTarget, renderSiteConfig(sheetId), 'utf8');
}

// ============================================================
// Stage 2 — Transform：去註解（site-config.js 已生成、不再處理）
// ============================================================
const HTML_OPTS = {
  removeComments: true,
  // inline=true 是 on* 事件屬性：原樣放行（esbuild 會附 ;\n，不適合放屬性值）
  minifyJS: (text, inline) => (inline ? text : transformSync(text, { ...ESB_COMMON, loader: 'js' }).code),
};

export async function stage2Transform() {
  for (const rel of JS_FILES) {
    const out = await transform(await readFile(distPath(rel), 'utf8'), { ...ESB_COMMON, loader: 'js' });
    await writeFile(distPath(rel), out.code, 'utf8');
  }
  for (const rel of CSS_FILES) {
    const out = await transform(await readFile(distPath(rel), 'utf8'), { ...ESB_COMMON, loader: 'css' });
    await writeFile(distPath(rel), out.code, 'utf8');
  }
  for (const rel of HTML_FILES) {
    const out = await minifyHtml(await readFile(distPath(rel), 'utf8'), HTML_OPTS);
    await writeFile(distPath(rel), out, 'utf8');
  }
}

// ============================================================
// Stage 3 — Verify：6 項檢查全跑、收集全部失敗
// ============================================================
const fail = (failures, check, file, line, content) => failures.push({ check, file, line, content });

async function readDist(rel) {
  try { return await readFile(distPath(rel), 'utf8'); } catch { return null; }
}

async function checkFileSet(failures, expected) {
  const actual = await walk(DIST);
  const exp = new Set(expected);
  const act = new Set(actual);
  for (const p of actual) if (!exp.has(p)) fail(failures, 'fileset', p, null, '多出的檔案（不在 allowlist）');
  for (const p of expected) if (!act.has(p)) fail(failures, 'fileset', p, null, '缺少的檔案（allowlist 應有）');
  return actual;
}

const scanJsLines = (failures, file, lines, offset) => {
  lines.forEach((line, i) => {
    if (line.includes('/*') || line.trimStart().startsWith('//')) {
      fail(failures, 'comments', file, offset + i + 1, line);
    }
  });
};

function extractInlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    if (m[2].trim() === '') continue;
    out.push({ body: m[2], startLine: html.slice(0, m.index).split('\n').length });
  }
  return out;
}

async function checkComments(failures) {
  for (const rel of HTML_FILES) {
    const text = await readDist(rel);
    if (text === null) continue; // 缺檔已由 fileset 回報
    text.split('\n').forEach((line, i) => {
      if (line.includes('<!--')) fail(failures, 'comments', rel, i + 1, line);
    });
    for (const s of extractInlineScripts(text)) {
      scanJsLines(failures, rel, s.body.split('\n'), s.startLine - 1);
    }
  }
  for (const rel of [...CSS_FILES, ...JS_FILES, SITE_CONFIG]) {
    const text = await readDist(rel);
    if (text === null) continue;
    scanJsLines(failures, rel, text.split('\n'), 0);
  }
}

async function checkForbiddenWords(failures, actualFiles) {
  for (const rel of actualFiles) {
    if (rel === 'LICENSE') continue;
    if (BINARY_EXTS.has(path.extname(rel).toLowerCase())) continue;
    const text = await readDist(rel);
    if (text === null) continue;
    text.split('\n').forEach((line, i) => {
      const lower = line.toLowerCase();
      for (const w of FORBIDDEN_WORDS) {
        if (lower.includes(w)) fail(failures, 'forbidden', rel, i + 1, `「${w}」 ${line}`);
      }
    });
  }
}

async function checkIdInjection(failures, sheetId) {
  const actual = await readDist(SITE_CONFIG);
  if (actual !== renderSiteConfig(sheetId)) {
    fail(failures, 'idinject', SITE_CONFIG, null, '內容不等於模板帶入 ID 的結果');
  }
}

const minified = async (code, loader) =>
  (await transform(code, { ...ESB_COMMON, loader, minify: true })).code;

async function checkSemanticEquivalence(failures, sheetId) {
  const targets = [
    ...JS_FILES.map((rel) => ({ rel, loader: 'js' })),
    ...CSS_FILES.map((rel) => ({ rel, loader: 'css' })),
  ];
  await Promise.all(targets.map(async ({ rel, loader }) => {
    const dist = await readDist(rel);
    if (dist === null) return;
    const src = await readFile(srcPath(rel), 'utf8');
    const [a, b] = await Promise.all([minified(src, loader), minified(dist, loader)]);
    if (a !== b) fail(failures, 'semantic', rel, null, 'minify 後與 main 版不一致（語意可能被改動）');
  }));

  const anchor = "GOOGLE_SHEETS_ID: ''";
  const src = await readFile(srcPath(SITE_CONFIG), 'utf8');
  const dist = await readDist(SITE_CONFIG);
  if (!src.includes(anchor)) {
    fail(failures, 'semantic', SITE_CONFIG, null, `main 版找不到替換錨點 ${anchor}，無法比對`);
  } else if (dist !== null) {
    const substituted = src.replace(anchor, `GOOGLE_SHEETS_ID: '${sheetId}'`);
    const [a, b] = await Promise.all([minified(substituted, 'js'), minified(dist, 'js')]);
    if (a !== b) fail(failures, 'semantic', SITE_CONFIG, null, 'minify 後與 main 版（帶入 ID）不一致');
  }
}

function checkNoDataFiles(failures, actualFiles) {
  for (const rel of actualFiles) {
    if (rel.split('/').includes('data')) fail(failures, 'nodata', rel, null, 'data/ 不得進 dist');
    const ext = path.extname(rel).toLowerCase();
    if (['.csv', '.xlsx', '.md'].includes(ext)) fail(failures, 'nodata', rel, null, `${ext} 不得進 dist`);
  }
}

export async function stage3Verify(sheetId) {
  const failures = [];
  const expected = await expandAllowlist();
  const actual = await checkFileSet(failures, expected);
  await checkComments(failures);
  await checkForbiddenWords(failures, actual);
  await checkIdInjection(failures, sheetId);
  await checkSemanticEquivalence(failures, sheetId);
  checkNoDataFiles(failures, actual);
  return failures;
}

// ============================================================
// 主流程：exit code 即契約（0 = 全通過；1 = 任一失敗）
// ============================================================
async function main() {
  const sheetId = resolveSheetId(process.argv.slice(2), process.env);
  console.log('[1/3] Select: 依 allowlist 複製 → dist/public/');
  await stage1Select(sheetId);
  console.log('[2/3] Transform: 去註解、生成 site-config.js');
  await stage2Transform();
  console.log('[3/3] Verify: 檔案集合 / 註解殘留 / 禁用字 / ID 注入 / 語意等價 / 資料檔');
  const failures = await stage3Verify(sheetId);
  if (failures.length > 0) {
    for (const f of failures) {
      const line = f.line != null ? ` [${f.line}]` : '';
      const content = f.content ? ` ${String(f.content).trim()}` : '';
      console.error(`FAIL ${f.check}: ${f.file}${line}${content}`);
    }
    console.error(`Verify 失敗（${failures.length} 項）；dist/public 保留供檢視`);
    return 1;
  }
  console.log('OK: build + verify 全數通過，dist/public 就緒');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof BuildError ? err.message : err);
      process.exit(1);
    },
  );
}
