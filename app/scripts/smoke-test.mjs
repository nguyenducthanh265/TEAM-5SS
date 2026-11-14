import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const failures = [];
const requireApi = process.argv.includes('--require-api');
const rules = JSON.parse(fs.readFileSync(path.join(appRoot, 'src/assets/qd87.json'), 'utf8'));
const groupIds = new Set(rules.groups.map((group) => group.id));

function validItem(item) {
  return item && typeof item === 'object' &&
    typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 40 &&
    groupIds.has(item.groupId) && typeof item.confidence === 'number' &&
    Number.isFinite(item.confidence) && item.confidence >= 0.5 && item.confidence <= 1 &&
    typeof item.reason === 'string' && item.reason.length <= 120 &&
    (item.tip === undefined || (typeof item.tip === 'string' && item.tip.length <= 80)) &&
    ['hazardous', 'sellable', 'misplaced'].every((key) => item[key] === undefined || typeof item[key] === 'boolean');
}

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`PASS ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    const msg = detail ? `${label}: ${detail}` : label;
    console.log(`FAIL ${msg}`);
    failures.push(msg);
  }
}

// 1. Cấu trúc app: 3 file tab, review.tsx, selftest.tsx, rules.ts, selftest.jpg
const requiredFiles = [
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/scan.tsx',
  'src/app/(tabs)/stats.tsx',
  'src/app/review.tsx',
  'src/app/selftest.tsx',
  'src/lib/rules.ts',
  'assets/selftest.jpg',
];
for (const rel of requiredFiles) {
  check(`file ${rel}`, fs.existsSync(path.join(appRoot, rel)));
}

// 2. app.json: scheme 'ecohanoi' và android.package 'com.fivess.ecohanoi'
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8'));
  const expo = appJson?.expo ?? {};
  check("app.json scheme === 'ecohanoi'", expo.scheme === 'ecohanoi', `got ${JSON.stringify(expo.scheme)}`);
  check(
    "app.json android.package === 'com.fivess.ecohanoi'",
    expo.android?.package === 'com.fivess.ecohanoi',
    `got ${JSON.stringify(expo.android?.package)}`,
  );
} catch (err) {
  check('app.json valid JSON', false, err instanceof Error ? err.message : String(err));
}

// 3. Quét API key / biến key trong src/
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const secretPatterns = [
  { name: 'sk- key', re: /\bsk-[A-Za-z0-9_-]{8,}/ },
  { name: 'EXPO_PUBLIC_*KEY*', re: /\bEXPO_PUBLIC_[A-Z0-9_]*KEY[A-Z0-9_]*/ },
];

const srcDir = path.join(appRoot, 'src');
const secretHits = [];
for (const file of walkFiles(srcDir)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const { name, re } of secretPatterns) {
    if (re.test(text)) {
      secretHits.push(`${path.relative(appRoot, file)} (${name})`);
    }
  }
}
check('no API key in src/', secretHits.length === 0, secretHits.join(', '));
check('rules copy matches source',
  fs.readFileSync(path.join(appRoot, 'src/assets/qd87.json'), 'utf8') ===
  fs.readFileSync(path.join(appRoot, '../rules/qd87.json'), 'utf8'));

// 4. Nếu có SMOKE_API_URL: POST /classify với selftest.jpg và kiểm source === 'ai'
const apiUrl = (process.env.SMOKE_API_URL ?? '').trim().replace(/\/+$/, '');
if (apiUrl) {
  const imgPath = path.join(appRoot, 'assets/selftest.jpg');
  if (!fs.existsSync(imgPath)) {
    check('POST /classify (SMOKE_API_URL)', false, 'missing assets/selftest.jpg');
  } else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const image = fs.readFileSync(imgPath).toString('base64');
      const res = await fetch(`${apiUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': 'smoke-test',
        },
        body: JSON.stringify({ image, mode: 'item' }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        check('POST /classify (SMOKE_API_URL)', false, `HTTP ${res.status}`);
      } else {
        const data = await res.json();
        const ok = data?.source === 'ai' && !data.error && Array.isArray(data?.items) &&
          data.items.length === 1 && data.items.every(validItem);
        check(
          'POST /classify (SMOKE_API_URL)',
          ok,
          `source=${JSON.stringify(data?.source)}, items=${Array.isArray(data?.items) ? data.items.length : 'N/A'}`,
        );
      }
    } catch (err) {
      check('POST /classify (SMOKE_API_URL)', false, err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
    }
  }
} else {
  if (requireApi) check('POST /classify required', false, 'SMOKE_API_URL not set');
  else console.log('SKIP POST /classify (SMOKE_API_URL not set; local checks only)');
}

if (failures.length === 0) {
  console.log(apiUrl ? 'RESULT: PASS source=ai (API only; device QA still required)' : 'RESULT: PASS LOCAL-ONLY (AI NOT VERIFIED)');
  process.exit(0);
} else {
  console.log(`RESULT: FAIL ${failures.join('; ')}`);
  process.exit(1);
}
