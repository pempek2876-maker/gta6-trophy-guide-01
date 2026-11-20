// Leonida Legend — entrypoint: validates the trophy data, copies app/ and
// screenshots/ into MAKEFUN_OUTPUT_DIR, and writes dossier.json there.
// Runs under Node 22 as erasable TypeScript: `node main.ts`.
// No network, no installs, no build step.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR;
if (!OUT) {
  console.error('main.ts: MAKEFUN_OUTPUT_DIR is not set');
  process.exit(1);
}

// --- validate the trophy data ---------------------------------------------
const trophiesPath = join(REPO_ROOT, 'app', 'data', 'trophies.json');
const data = JSON.parse(readFileSync(trophiesPath, 'utf8'));
const trophies = data.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error(`trophies.json: expected 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'none'}`);
}
for (const t of trophies) {
  if (!t.name || !String(t.name).trim()) throw new Error(`trophy #${t.id}: blank name`);
  if (!t.description || !String(t.description).trim()) throw new Error(`trophy #${t.id}: blank description`);
  if (!t.guide || !String(t.guide).trim()) throw new Error(`trophy #${t.id}: blank guide`);
  if (!Array.isArray(t.steps) || t.steps.length < 2 || t.steps.length > 4) {
    throw new Error(`trophy #${t.id}: expected 2-4 steps, found ${Array.isArray(t.steps) ? t.steps.length : 'none'}`);
  }
}
const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
for (const t of trophies) {
  if (!(t.grade in grades)) throw new Error(`trophy #${t.id}: unknown grade ${t.grade}`);
  grades[t.grade]++;
}
const want = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
for (const g of Object.keys(want)) {
  if (grades[g] !== want[g]) throw new Error(`grade mix: ${g} is ${grades[g]}, expected ${want[g]}`);
}
const missable = trophies.filter((t) => t.missable);
if (missable.length !== 1 || missable[0].id !== 28) {
  throw new Error(`missable: expected only #28, found ${missable.map((t) => t.id).join(',')}`);
}
const unconfirmed = trophies.filter((t) => t.verified === 'unconfirmed').map((t) => t.id);
if (unconfirmed.join(',') !== '44,45,47,48,49,50,51') {
  throw new Error(`unconfirmed: expected 44,45,47,48,49,50,51, found ${unconfirmed.join(',')}`);
}

// --- copy app/ and screenshots/ into the output directory ------------------
mkdirSync(OUT, { recursive: true });
for (const dir of ['app', 'screenshots']) {
  const src = join(REPO_ROOT, dir);
  if (!existsSync(src)) throw new Error(`${dir}/: no such directory in the repo`);
  cpSync(src, join(OUT, dir), { recursive: true });
}

// --- build the dossier ------------------------------------------------------
const dossier = buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(OUT, 'dossier.json'), dossier);

// buildDossier returns canonical JSON *bytes* (a Uint8Array), so decode
// before parsing — JSON.parse on the raw bytes would read byte numbers.
const dossierBytes = dossier.length;
const parsed = JSON.parse(new TextDecoder().decode(dossier));
const textBytes = Buffer.byteLength(parsed.text ?? '', 'utf8');
console.log(
  `Leonida Legend: 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze) -> ${OUT} ` +
  `(dossier ${dossierBytes} bytes, text ${textBytes} bytes)`,
);
