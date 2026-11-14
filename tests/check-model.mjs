// Compares docs/model.js against probabilities produced by the reference R
// simulator (see reference_probs.R). Usage:
//   Rscript tests/reference_probs.R <path to GRM+_sigma_acq.R> > ref.jsonl
//   node tests/check-model.mjs ref.jsonl
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const DIRT = createRequire(import.meta.url)('../docs/model.js');
const lines = readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/);
let worst = 0;
for (const line of lines) {
  const r = JSON.parse(line);
  const p = DIRT.probs({ a: r.a, b: r.b, reversed: r.rev }, { psi: r.psi, sigma: r.sigma, zeta: r.zeta });
  r.p.forEach((q, k) => { worst = Math.max(worst, Math.abs(q - p[k])); });
}
console.log(`${lines.length} cases, max |JS - R| = ${worst.toExponential(2)}`);
if (!(worst < 1e-12)) { console.error('MISMATCH'); process.exit(1); }
