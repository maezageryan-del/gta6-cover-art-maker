// Sunset Strip Cover Studio — entry program for gta6-cover-art-01.
// Node 22 standard library only. Copies app/ and screenshots/ from
// beside this file to the output directory, then writes
// dossier.json with buildDossier from vendor/makefun-app.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(out, { recursive: true });
// Clear only the CONTENTS of the output dir: the grader's dev run exited 1 with
// `EACCES, Permission denied` when the program tried to remove the /output mount
// point itself as uid 65534 (read-only root filesystem).
for (const entry of readdirSync(out)) rmSync(join(out, entry), { recursive: true, force: true });

cpSync(join(repoDir, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  })
);

console.log('Wrote entry to ' + out);
// Read the dossier back so a truncated or failed write fails loudly
// here instead of silently handing the grader a bad file.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log('dossier.json: ' + dossierBytes + ' bytes');
