// GRM+ model — port of generate_irt from GRM+_sigma_acq.R

function plogis(x) { return 1 / (1 + Math.exp(-x)); }
function softmax(xs) {
  const mx = Math.max(...xs);
  const ez = xs.map(v => Math.exp(v - mx));
  const s  = ez.reduce((a, b) => a + b, 0);
  return ez.map(v => v / s);
}

function grmPlus(a, b, isReversed, psi, sigma, zeta, Nlikert) {
  const cum = new Array(Nlikert + 1);
  cum[0]       = 1.0;
  cum[Nlikert] = 0.0;
  for (let k = 1; k < Nlikert; k++) {
    cum[k] = plogis(a * (psi - b[k - 1]) / sigma);
  }
  let p = new Array(Nlikert);
  for (let k = 0; k < Nlikert; k++) p[k] = cum[k] - cum[k + 1];
  for (let k = 0; k < Nlikert; k++) if (p[k] < 0 || !isFinite(p[k])) p[k] = 0;
  let s = p.reduce((a, b) => a + b, 0);
  if (!(s > 0) || !isFinite(s)) {
    p = new Array(Nlikert).fill(1 / Nlikert);
  } else {
    p = p.map(v => v / s);
  }
  if (isReversed) p = p.slice().reverse();
  const base = p.slice();

  const kMid = (Nlikert + 1) / 2;
  const xk = [];
  for (let k = 1; k <= Nlikert; k++) xk.push(2 * (k - kMid) / (Nlikert - 1));

  const noiseFloor = 1e-6;
  const V = p.map(v => Math.log(v + noiseFloor));
  const vK = V.map((v, i) => v + xk[i] * zeta);
  const plus = softmax(vK);

  return { base, plus, xk };
}

function expectedScore(probs) {
  return probs.reduce((s, p, k) => s + p * k, 0);
}
function argmax(xs) {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[best]) best = i;
  return best;
}

// Generate item params with distributions matching R-GPTS
// (a ~ 2.5–4.0, b thresholds spanning roughly 0 to 2, ordered).
function generateItemParams(nItems, nLikert) {
  const randn = () => {
    const u = Math.max(1e-9, Math.random()), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const items = [];
  for (let i = 0; i < nItems; i++) {
    // discrimination: like R-GPTS — mean ~3.0, sd ~0.7, clamped to [2.1, 4.5]
    let a = 3.0 + 0.7 * randn();
    a = Math.max(2.1, Math.min(4.5, a));
    a = +a.toFixed(2);

    // thresholds: ordered draws spanning ~0.0 to ~2.0
    // each item has its own difficulty center (-0.1 to 0.9) and moderate spread
    const center = -0.1 + Math.random() * 1.0;
    const spread = 0.55 + Math.random() * 0.25;
    const raw = [];
    for (let k = 0; k < nLikert - 1; k++) {
      // uniform-ish draws, then sort
      raw.push((k - (nLikert - 2) / 2) * spread + 0.15 * randn());
    }
    raw.sort((x, y) => x - y);
    const b = raw.map(v => +((center + v)).toFixed(2));

    items.push({ text: `Item ${i + 1}`, a, b });
  }
  return items;
}

window.grmPlus = grmPlus;
window.expectedScore = expectedScore;
window.argmax = argmax;
window.generateItemParams = generateItemParams;
