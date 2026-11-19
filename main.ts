// Sunset Strip Cover Studio — entrypoint for the make.fun gta6-cover-art-01 bounty.
//
// The grader runs this as `node /bot/main.ts` (Node 22+, standard library only) in a
// sandbox where /bot is the read-only repository and /output is a writable mount point
// owned by root, while the program itself runs as uid 65534. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output.
//
// What it does, in order:
//   1. Makes sure the output directory exists.
//   2. Clears ONLY the output directory's contents — never the directory itself, which
//      the grader user cannot remove (it is a mount point; deleting it fails EACCES).
//   3. Copies app/ and screenshots/ from this repository into the output directory.
//   4. Writes /output/dossier.json with buildDossier from vendor/makefun-app.ts, so the
//      dossier is byte for byte what the scorer rebuilds from the same files.
//
// Both grader runs must write the same bytes; buildDossier is deterministic, and the
// copies are plain file copies, so they do.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory this file lives in, whether the grader runs it
// as /bot/main.ts or a developer runs it from a local checkout.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// The grader hands us /output; local runs override it with MAKEFUN_OUTPUT_DIR.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Safety net: step 2 below deletes everything inside the output directory, so refuse
// outright if it ever points at the repository itself (a mistyped MAKEFUN_OUTPUT_DIR)
// instead of wiping the entry we are handing in.
if (resolve(outputDir) === resolve(repoRoot)) {
  throw new Error('refusing to clear the repository itself: MAKEFUN_OUTPUT_DIR must not be the repository root');
}

/** The caps the bounty's gate applies (see the kit's RULES.txt). */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

// 1. The output directory may not exist yet on a local run; create it (and any parent)
//    if needed. When it already exists this is a no-op — it never removes anything.
mkdirSync(outputDir, { recursive: true });

// 2. Clear the previous run's leftovers one entry at a time. Removing /output itself
//    is NOT an option: as uid 65534 the grader cannot unlink a root-owned mount point,
//    so a recursive delete of the directory fails with EACCES. Each child, though, is
//    ours to remove, so the directory stays and only its contents go.
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}

// 3. Hand the app and its screenshots in as they are in the repository.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

// 4. The dossier: the same bytes the scorer rebuilds from these files, so the
//    dossier_matches row of the gate passes.
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));

console.log(`Sunset Strip Cover Studio handed in to ${outputDir}`);
