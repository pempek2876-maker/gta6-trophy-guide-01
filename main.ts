// Leonida Legend — the gta6-trophy-guide-01 entry (Node 22, standard library only).
// The guide is this directory's app/ folder: plain static files a browser opens at
// app/index.html (no build step), offline — it loads nothing over the network, only its
// own data/*.json. main.ts validates the trophy data, copies app/ and screenshots/ to
// the output directory, and writes /output/dossier.json with the vendored make.fun
// library. Leave vendor/makefun-frontend.ts as it is: the scorer requires dossier.json
// to be byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Validate the trophy data before anything is copied: 55 trophies, non-blank
// name/guide/description each, the official grade mix, and the v2 depth targets
// (every guide >= 100 words, >= 4 steps, difficulty 1-5 and a time estimate).
const dataPath = join(here, 'app', 'data', 'trophies.json');
let data;
try {
  data = JSON.parse(readFileSync(dataPath, 'utf8'));
} catch (err) {
  fail(`cannot read ${dataPath}: ${err.message}`);
}
const trophies = data.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  fail(`expected 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'none'}`);
}
const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
for (const t of trophies) {
  if (!t.name?.trim() || !t.description?.trim() || !t.guide?.trim()) fail(`trophy ${t.id}: blank name, description, or guide`);
  if (!(t.grade in grades)) fail(`trophy ${t.id}: unknown grade ${t.grade}`);
  grades[t.grade]++;
  if (words(t.guide) < 100) fail(`trophy ${t.id} (${t.name}): guide has ${words(t.guide)} words, need >= 100`);
  if (!Array.isArray(t.steps) || t.steps.length < 4) fail(`trophy ${t.id} (${t.name}): ${t.steps?.length ?? 0} steps, need >= 4`);
  if (typeof t.difficulty !== 'number' || t.difficulty < 1 || t.difficulty > 5) fail(`trophy ${t.id} (${t.name}): bad difficulty`);
  if (!t.time?.trim()) fail(`trophy ${t.id} (${t.name}): missing time estimate`);
}
if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
  fail(`grade mix wrong: ${JSON.stringify(grades)}, want 1/2/6/46`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

const totalWords = trophies.reduce((sum, t) => sum + words(t.guide), 0);
const dossierBytes = readFileSync(join(out, 'dossier.json')).length;
const shotCount = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).filter((f) => /\.(jpe?g|png)$/i.test(f)).length
  : 0;
console.log(`Leonida Legend: 55 trophies (${grades.platinum}P/${grades.gold}G/${grades.silver}S/${grades.bronze}B), ${totalWords} guide words, ${shotCount} screenshots, dossier ${dossierBytes} bytes at ${out}/dossier.json`);
