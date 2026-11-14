/* D-IRT (GRM+) response model.
 *
 * Direct port of the likelihood in the companion Stan model
 * (GRM+_sigma_acq.stan) and its R simulator (GRM+_sigma_acq.R):
 *
 *   1. GRM layer, with person noise sigma dividing the logit
 *        P(y >= k) = inv_logit( a * (psi - b_{k-1}) / sigma ),  k = 2..K
 *        P(y >= 1) = 1,  P(y >= K+1) = 0
 *      category probabilities are successive differences; negatives are
 *      clamped to 0 and the vector is renormalised.
 *   2. Reverse-keyed items: the category-probability vector is reversed.
 *   3. Choice layer, with acquiescence zeta on the raw response scale
 *        m_k = log(p_k + 1e-6)
 *        x_k = 2 (k - k_mid) / (K - 1),  k_mid = (K + 1) / 2   (x from -1 to +1)
 *        v_k = m_k + x_k * zeta          (zeta is NOT multiplied by item direction)
 *        P(k) = softmax(v)
 *
 * Categories are indexed 0..K-1 in JavaScript (1..K in the paper / Stan).
 */
(function (root) {
  'use strict';

  var NOISE_FLOOR = 1e-6;

  function invLogit(x) {
    if (x >= 0) { var e = Math.exp(-x); return 1 / (1 + e); }
    var f = Math.exp(x); return f / (1 + f);
  }

  function softmax(v) {
    var mx = -Infinity, i;
    for (i = 0; i < v.length; i++) if (v[i] > mx) mx = v[i];
    var out = new Array(v.length), s = 0;
    for (i = 0; i < v.length; i++) { out[i] = Math.exp(v[i] - mx); s += out[i]; }
    for (i = 0; i < v.length; i++) out[i] /= s;
    return out;
  }

  /* x_k for K categories: evenly spaced from -1 (strongly disagree) to +1. */
  function choicePositions(K) {
    var kMid = (K + 1) / 2, x = new Array(K);
    for (var k = 1; k <= K; k++) x[k - 1] = 2 * (k - kMid) / (K - 1);
    return x;
  }

  /* Step 1: GRM category probabilities with person noise sigma. */
  function grmProbs(a, b, psi, sigma) {
    var K = b.length + 1, cum = new Array(K + 1), p = new Array(K), k, s = 0;
    cum[0] = 1; cum[K] = 0;
    for (k = 1; k < K; k++) cum[k] = invLogit(a * (psi - b[k - 1]) / sigma);
    for (k = 0; k < K; k++) {
      p[k] = cum[k] - cum[k + 1];
      if (!(p[k] > 0)) p[k] = 0;            // clamp negatives (and NaN) to 0
      s += p[k];
    }
    for (k = 0; k < K; k++) p[k] = s > 0 && isFinite(s) ? p[k] / s : 1 / K;
    return p;
  }

  /* Full D-IRT pipeline. Returns every intermediate quantity so the UI can
   * show the model step by step. */
  function dirt(item, person) {
    var K = item.b.length + 1;
    var grm = grmProbs(item.a, item.b, person.psi, person.sigma);
    var base = item.reversed ? grm.slice().reverse() : grm;
    var x = choicePositions(K), m = new Array(K), v = new Array(K);
    for (var k = 0; k < K; k++) {
      m[k] = Math.log(base[k] + NOISE_FLOOR);
      v[k] = m[k] + x[k] * person.zeta;
    }
    return { grm: grm, base: base, m: m, x: x, v: v, p: softmax(v) };
  }

  /* Convenience: final category probabilities only. */
  function probs(item, person) { return dirt(item, person).p; }

  /* Expected raw response on the 0..K-1 scale. */
  function expected(p) {
    var e = 0;
    for (var k = 0; k < p.length; k++) e += k * p[k];
    return e;
  }

  /* Inverse-CDF draw of a category from probabilities p and a uniform u. */
  function drawCategory(p, u) {
    var c = 0;
    for (var k = 0; k < p.length - 1; k++) { c += p[k]; if (u < c) return k; }
    return p.length - 1;
  }

  /* Small seeded PRNG (mulberry32) so simulations are reproducible and
   * use common random numbers across slider changes. */
  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normal(rand) {
    var u = Math.max(rand(), 1e-12), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var api = {
    NOISE_FLOOR: NOISE_FLOOR,
    invLogit: invLogit, softmax: softmax, choicePositions: choicePositions,
    grmProbs: grmProbs, dirt: dirt, probs: probs, expected: expected,
    drawCategory: drawCategory, rng: rng, normal: normal
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DIRT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
