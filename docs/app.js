/* D-IRT Explorer — UI, state and hand-drawn SVG charts. No dependencies. */
(function () {
  'use strict';

  var D = window.DIRT;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PSI_MIN = -3.5, PSI_MAX = 3.5;
  var SIGMA_MIN = 0.25, SIGMA_MAX = 6;
  var N_PEOPLE = 500, MAX_ITEMS = 40;
  var REF = { sigma: 1, zeta: 0 };   // the standard GRM

  // ---------------------------------------------------------------- state
  function defaultThresholds(K) {
    if (K === 2) return [0];
    var w = Math.min(2, 0.45 * (K - 1)), out = [];
    for (var k = 0; k < K - 1; k++) out.push(round2(-w + 2 * w * k / (K - 2)));
    return out;
  }
  function defaults() {
    return { psi: 0.5, sigma: 1, zeta: 0, K: 5, a: 1.6, b: defaultThresholds(5), rev: false,
             n: 20, nrev: 6, curve: 'expected', seed: 7 };
  }
  var S = defaults();

  var PRESETS = [
    { id: 'grm',   label: 'Standard GRM', sigma: 1,   zeta: 0 },
    { id: 'cons',  label: 'Consistent',   sigma: 0.5, zeta: 0 },
    { id: 'noisy', label: 'Noisy',        sigma: 2.5, zeta: 0 },
    { id: 'yea',   label: 'Yea-sayer',    sigma: 1,   zeta: 1.5 },
    { id: 'nay',   label: 'Nay-sayer',    sigma: 1,   zeta: -1.5 }
  ];

  // ---------------------------------------------------------------- helpers
  function round2(x) { return Math.round(x * 100) / 100; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function fmt(x, d) {
    var s = x.toFixed(d == null ? 2 : d);
    return (s.charAt(0) === '-' ? '−' + s.slice(1) : s);
  }
  function fmtSigned(x, d) { return (x > 0 ? '+' : '') + fmt(x, d); }
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function s(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function txt(parent, x, y, str, attrs) {
    var a = { x: x, y: y }; for (var k in attrs) a[k] = attrs[k];
    var t = s('text', a, parent); t.textContent = str; return t;
  }
  function lin(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }
  function pathFrom(pts) {
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1);
    return d;
  }
  function corr(x, y) {
    var n = x.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) { var dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
  }
  function mean(a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i]; return t / a.length; }

  // ---------------------------------------------------------------- colours
  var C = {};
  function readColours() {
    var cs = getComputedStyle(document.documentElement);
    ['ink', 'ink-2', 'ink-3', 'rule', 'rule-2', 'surface', 'surface-2', 'accent', 'ref',
     'cat-lo', 'cat-mid', 'cat-hi', 'rev'].forEach(function (k) {
      C[k] = cs.getPropertyValue('--' + k).trim();
    });
  }
  function hexToRgb(hex) {
    var v = parseInt(hex.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  // sRGB <-> OKLab, for perceptually even palette interpolation
  function toLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function fromLin(c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(clamp(c, 0, 1) * 255); }
  function rgbToLab(rgb) {
    var r = toLin(rgb[0]), g = toLin(rgb[1]), b = toLin(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * q,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * q,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * q];
  }
  function labToHex(L) {
    var l = Math.pow(L[0] + 0.3963377774 * L[1] + 0.2158037573 * L[2], 3);
    var m = Math.pow(L[0] - 0.1055613458 * L[1] - 0.0638541728 * L[2], 3);
    var q = Math.pow(L[0] - 0.0894841775 * L[1] - 1.2914855480 * L[2], 3);
    var rgb = [fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q),
               fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q),
               fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * q)];
    return '#' + rgb.map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
  }
  function mix(h1, h2, t) {
    var a = rgbToLab(hexToRgb(h1)), b = rgbToLab(hexToRgb(h2));
    return labToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
  }
  /* Diverging answer palette: disagree (blue) -> neutral -> agree (orange). */
  function catColours(K) {
    var out = [];
    for (var k = 0; k < K; k++) {
      var t = K === 1 ? 0.5 : k / (K - 1);
      // keep the middle category tinted rather than fully neutral
      out.push(t < 0.5 ? mix(C['cat-lo'], C['cat-mid'], Math.pow(t * 2, 1.3) * 0.78)
                       : mix(C['cat-hi'], C['cat-mid'], Math.pow((1 - t) * 2, 1.3) * 0.78));
    }
    return out;
  }

  // ---------------------------------------------------------------- simulation
  var sim = null;
  function buildSimulation(seed) {
    var r = D.rng(seed * 7919 + 13), i, j;
    var items = [];
    for (j = 0; j < MAX_ITEMS; j++) {
      var jit = [];
      for (var k = 0; k < 6; k++) jit.push(D.normal(r));
      items.push({
        a: Math.exp(0.35 + 0.3 * D.normal(r)),
        centre: 0.15 + 0.7 * D.normal(r),
        width: 1.3 + 0.5 * r(),
        jit: jit
      });
    }
    // order in which items become reverse-keyed as the slider increases
    var order = items.map(function (_, idx) { return idx; });
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var revRank = new Array(MAX_ITEMS);
    order.forEach(function (idx, rank) { revRank[idx] = rank; });
    var psi = [], u = [];
    for (i = 0; i < N_PEOPLE; i++) {
      psi.push(D.normal(r));
      var row = [];
      for (j = 0; j < MAX_ITEMS; j++) row.push(r());
      u.push(row);
    }
    return { items: items, revRank: revRank, psi: psi, u: u };
  }
  /* Thresholds for simulated item j at the current K (ordered, spaced). */
  function simItem(j, K, nItems, nrev) {
    var it = sim.items[j], b = [];
    for (var k = 0; k < K - 1; k++) {
      var t = K === 2 ? 0 : -1 + 2 * k / (K - 2);
      b.push(it.centre + it.width * t + 0.12 * it.jit[k]);
    }
    b.sort(function (x, y) { return x - y; });
    // reverse-keyed items: the first `nrev` items in the random order, among those shown
    var rank = 0;
    for (var q = 0; q < nItems; q++) if (sim.revRank[q] < sim.revRank[j]) rank++;
    return { a: it.a, b: b, reversed: rank < nrev };
  }

  // ---------------------------------------------------------------- controls
  var syncers = [];
  function sync() { syncers.forEach(function (f) { f(); }); }

  function setFill(input) {
    var pct = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty('--fill', pct + '%');
  }

  function slider(o) {
    var id = 'sl-' + o.key;
    var out = h('output', { class: 'val', for: id });
    var input = h('input', { type: 'range', id: id, min: o.min, max: o.max, step: o.step });
    if (o.centered) input.classList.add('centered');
    var toS = o.toSlider || function (v) { return v; };
    var fromS = o.fromSlider || function (v) { return v; };
    input.addEventListener('input', function () {
      o.set(fromS(parseFloat(input.value)));
      setFill(input);
      out.textContent = o.fmt(o.get());
      changed();
    });
    input.addEventListener('dblclick', function () { if (o.reset != null) { o.set(o.reset); sync(); changed(); } });
    syncers.push(function () { input.value = toS(o.get()); setFill(input); out.textContent = o.fmt(o.get()); });
    var labelEl = h('label', { class: 'ctl-label', for: id, html: o.label });
    var kids = [h('div', { class: 'ctl-row' }, [labelEl, out]), input];
    if (o.ticks) kids.push(h('div', { class: 'ticks', 'aria-hidden': 'true' }, o.ticks.map(function (t) { return h('span', { text: t }); })));
    if (o.hint) kids.push(h('p', { class: 'hint', html: o.hint }));
    return h('div', { class: 'ctl' }, kids);
  }

  function segmented(container, options, get, set) {
    container.innerHTML = '';
    var buttons = options.map(function (opt) {
      var b = h('button', { type: 'button', role: 'radio', text: opt.label });
      b.addEventListener('click', function () { set(opt.value); sync(); changed(); });
      container.appendChild(b);
      return { el: b, value: opt.value };
    });
    syncers.push(function () {
      buttons.forEach(function (b) { b.el.setAttribute('aria-checked', String(b.value === get())); });
    });
  }

  function buildControls() {
    // presets
    var pre = $('presets');
    PRESETS.forEach(function (p) {
      var b = h('button', { type: 'button', class: 'preset', text: p.label, 'aria-pressed': 'false',
        title: 'σ = ' + p.sigma + ', ζ = ' + p.zeta });
      b.addEventListener('click', function () { S.sigma = p.sigma; S.zeta = p.zeta; sync(); changed(); });
      pre.appendChild(b);
      syncers.push(function () {
        b.setAttribute('aria-pressed', String(Math.abs(S.sigma - p.sigma) < 1e-9 && Math.abs(S.zeta - p.zeta) < 1e-9));
      });
    });

    var ps = $('person-sliders');
    ps.appendChild(slider({
      key: 'psi', min: -3, max: 3, step: 0.05, centered: true, reset: 0,
      label: '<span class="sym">ψ</span><span class="name">trait</span>',
      get: function () { return S.psi; }, set: function (v) { S.psi = round2(v); }, fmt: function (v) { return fmt(v); },
      ticks: ['−3', 'low', '0', 'high', '3'],
      hint: 'Where the person truly stands on what the questionnaire measures.'
    }));
    ps.appendChild(slider({
      key: 'sigma', min: Math.log(SIGMA_MIN), max: Math.log(SIGMA_MAX), step: 0.01, reset: 1,
      label: '<span class="sym">σ</span><span class="name">response noise</span>',
      get: function () { return S.sigma; }, set: function (v) { S.sigma = round2(v); },
      toSlider: Math.log, fromSlider: Math.exp, fmt: function (v) { return fmt(v); },
      ticks: ['0.25', 'sharper', '1', 'noisier', '6'],
      hint: 'How consistently the trait is turned into answers. σ = 1 is the standard GRM; larger σ flattens every item, smaller σ sharpens it.'
    }));
    ps.appendChild(slider({
      key: 'zeta', min: -3, max: 3, step: 0.05, centered: true, reset: 0,
      label: '<span class="sym">ζ</span><span class="name">acquiescence</span>',
      get: function () { return S.zeta; }, set: function (v) { S.zeta = round2(v); }, fmt: function (v) { return fmtSigned(v); },
      ticks: ['−3', 'disagree', '0', 'agree', '3'],
      hint: 'A pull toward agreeing (ζ &gt; 0) or disagreeing (ζ &lt; 0) whatever the item says, applied on the raw answer scale, so it pushes reverse-keyed items the same way.'
    }));

    segmented($('K-seg'), [2, 3, 4, 5, 6, 7].map(function (k) { return { label: String(k), value: k }; }),
      function () { return S.K; },
      function (k) { if (k !== S.K) { S.K = k; S.b = defaultThresholds(k); buildThresholds(); } });

    $('item-sliders').appendChild(slider({
      key: 'a', min: 0.2, max: 4, step: 0.05, reset: 1.6,
      label: '<span class="sym">a</span><span class="name">discrimination</span>',
      get: function () { return S.a; }, set: function (v) { S.a = round2(v); }, fmt: function (v) { return fmt(v); },
      hint: 'How sharply the item separates people with different trait levels.'
    }));

    var rev = $('rev');
    rev.addEventListener('change', function () { S.rev = rev.checked; changed(); });
    syncers.push(function () { rev.checked = S.rev; });

    segmented($('curve-seg'), [{ label: 'Expected answer', value: 'expected' }, { label: 'Each option', value: 'cats' }],
      function () { return S.curve; }, function (v) { S.curve = v; });

    segmented($('n-seg'), [10, 20, 40].map(function (n) { return { label: String(n), value: n }; }),
      function () { return S.n; }, function (n) { S.n = n; S.nrev = Math.min(S.nrev, n); nrevInput.max = n; });

    var nrevCtl = slider({
      key: 'nrev', min: 0, max: S.n, step: 1,
      label: 'Reverse-keyed items',
      get: function () { return S.nrev; }, set: function (v) { S.nrev = Math.round(v); },
      fmt: function (v) { return v + ' of ' + S.n; }
    });
    $('nrev-slot').appendChild(nrevCtl);
    var nrevInput = nrevCtl.querySelector('input');
    syncers.unshift(function () { nrevInput.max = S.n; });

    $('resample').addEventListener('click', function () { S.seed = (S.seed % 9973) + 1; sim = buildSimulation(S.seed); changed(); });
    $('reset').addEventListener('click', function () {
      var keepCurve = S.curve; S = defaults(); S.curve = keepCurve;
      sim = buildSimulation(S.seed); buildThresholds(); sync(); changed();
    });

    buildThresholds();
  }

  var bSyncers = [];
  function buildThresholds() {
    var box = $('b-sliders');
    box.innerHTML = '';
    syncers = syncers.filter(function (f) { return bSyncers.indexOf(f) < 0; });
    bSyncers = [];
    var cols = catColours(S.K);
    S.b.forEach(function (_, k) {
      var id = 'sl-b' + k;
      var input = h('input', { type: 'range', id: id, min: -3, max: 3, step: 0.05, 'aria-label': 'Threshold b' + (k + 1) });
      var out = h('output', { class: 'val', for: id });
      var sw = h('i', { class: 'sw' });
      sw.style.background = cols[k + 1];
      var name = h('label', { class: 'b-name', for: id, html: 'b<sub>' + (k + 1) + '</sub>' });
      name.insertBefore(sw, name.firstChild);
      input.addEventListener('input', function () {
        var v = round2(parseFloat(input.value)), gap = 0.05, j;
        S.b[k] = v;
        for (j = k + 1; j < S.b.length; j++) S.b[j] = round2(clamp(Math.max(S.b[j], S.b[j - 1] + gap), -3, 3));
        for (j = k - 1; j >= 0; j--) S.b[j] = round2(clamp(Math.min(S.b[j], S.b[j + 1] - gap), -3, 3));
        // if pushed against an edge, push back so order always holds
        for (j = S.b.length - 2; j >= 0; j--) if (S.b[j] > S.b[j + 1] - gap) S.b[j] = round2(S.b[j + 1] - gap);
        for (j = 1; j < S.b.length; j++) if (S.b[j] < S.b[j - 1] + gap) S.b[j] = round2(S.b[j - 1] + gap);
        bSyncers.forEach(function (f) { f(); });
        changed();
      });
      var f = function () { input.value = S.b[k]; setFill(input); out.textContent = fmt(S.b[k]); };
      bSyncers.push(f); syncers.push(f);
      box.appendChild(h('div', { class: 'b-row' }, [name, input, out]));
    });
    bSyncers.forEach(function (f) { f(); });
  }

  // ---------------------------------------------------------------- render loop
  var pending = false;
  function changed() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); writeHash(); });
  }

  function render() {
    readColours();
    var item = { a: S.a, b: S.b, reversed: S.rev };
    renderCategories(item);
    renderCurves(item);
    renderQuestionnaire();
    // keep the threshold swatches in step with the theme
    var cols = catColours(S.K);
    document.querySelectorAll('#b-sliders .sw').forEach(function (sw, k) { sw.style.background = cols[k + 1]; });
  }

  function chartSize(id, hDesktop, hPhone) {
    var el = $(id);
    var w = Math.max(260, el.clientWidth);
    var hgt = window.matchMedia('(max-width: 860px)').matches ? hPhone : hDesktop;
    return { el: el, w: w, h: hgt };
  }
  function freshSvg(sz, label) {
    sz.el.innerHTML = '';
    return s('svg', { viewBox: '0 0 ' + sz.w + ' ' + sz.h, width: sz.w, height: sz.h, role: 'img', 'aria-label': label }, sz.el);
  }
  function legendKey(kind, colour, label) {
    var sv = document.createElementNS(SVGNS, 'svg');
    sv.setAttribute('viewBox', '0 0 22 12');
    if (kind === 'line') s('line', { x1: 1, y1: 6, x2: 21, y2: 6, stroke: colour, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, sv);
    if (kind === 'dash') s('line', { x1: 1, y1: 6, x2: 21, y2: 6, stroke: colour, 'stroke-width': 2, 'stroke-dasharray': '4 3' }, sv);
    if (kind === 'bar') s('rect', { x: 4, y: 0, width: 14, height: 12, rx: 2, fill: colour }, sv);
    if (kind === 'ghost') s('rect', { x: 4.5, y: 0.5, width: 13, height: 11, rx: 2, fill: 'none', stroke: colour, 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, sv);
    if (kind === 'dot') s('circle', { cx: 11, cy: 6, r: 4, fill: colour }, sv);
    var span = h('span', { class: 'key' }, [sv, h('span', { html: label })]);
    return span;
  }
  function setLegend(id, keys) {
    var el = $(id); el.innerHTML = '';
    keys.forEach(function (k) { el.appendChild(legendKey(k[0], k[1], k[2])); });
  }
  function yAxis(svg, y, ticks, x0, x1, fmtTick) {
    ticks.forEach(function (t) {
      s('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: C.rule, 'stroke-width': 1 }, svg);
      txt(svg, x0 - 8, y(t) + 4, fmtTick(t), { 'text-anchor': 'end', 'font-size': 11, fill: C['ink-3'] });
    });
  }

  // ---- panel 1: category probabilities
  function renderCategories(item) {
    var K = S.K, cols = catColours(K);
    var person = { psi: S.psi, sigma: S.sigma, zeta: S.zeta };
    var full = D.dirt(item, person);
    var ref = D.probs(item, { psi: S.psi, sigma: REF.sigma, zeta: REF.zeta });
    var p = full.p;

    setLegend('legend-cat', [
      ['bar', C.accent, 'D-IRT, current σ and ζ'],
      ['ghost', C['ink-3'], 'standard GRM (σ = 1, ζ = 0)']
    ]);

    var sz = chartSize('chart-cat', 270, 230);
    var svg = freshSvg(sz, 'Bar chart of the probability of each of ' + K + ' answer options');
    var m = { l: 40, r: 8, t: 22, b: 44 };
    var x0 = m.l, x1 = sz.w - m.r, y = lin(0, 1, sz.h - m.b, m.t);
    yAxis(svg, y, [0, 0.25, 0.5, 0.75, 1], x0, x1, function (t) { return Math.round(t * 100) + '%'; });
    var slot = (x1 - x0) / K, bw = Math.min(64, slot * 0.62);
    for (var k = 0; k < K; k++) {
      var cx = x0 + slot * (k + 0.5);
      var hp = y(0) - y(p[k]);
      s('rect', { x: cx - bw / 2, y: y(p[k]), width: bw, height: Math.max(0, hp), rx: 4, fill: cols[k] }, svg);
      // reference outline
      s('rect', { x: cx - bw / 2 - 3, y: y(ref[k]), width: bw + 6, height: Math.max(0, y(0) - y(ref[k])), rx: 5,
        fill: 'none', stroke: C['ink-2'], 'stroke-width': 1.4, 'stroke-dasharray': '4 3', opacity: 0.75 }, svg);
      txt(svg, cx, Math.min(y(p[k]), y(ref[k])) - 6, Math.round(p[k] * 100) + '%',
        { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: C.ink });
      txt(svg, cx, y(0) + 17, String(k + 1), { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: C['ink-2'] });
    }
    s('line', { x1: x0, x2: x1, y1: y(0), y2: y(0), stroke: C['rule-2'] }, svg);
    txt(svg, x0 + slot * 0.5, y(0) + 34, 'disagree', { 'text-anchor': slot < 70 ? 'start' : 'middle', 'font-size': 11, fill: C['ink-3'] });
    txt(svg, x1 - slot * 0.5, y(0) + 34, 'agree', { 'text-anchor': slot < 70 ? 'end' : 'middle', 'font-size': 11, fill: C['ink-3'] });

    var e = D.expected(p) + 1, eRef = D.expected(ref) + 1;
    $('readout-cat').innerHTML = 'Expected answer <b class="acc">' + fmt(e) + '</b> on the 1–' + K +
      ' scale, versus <b>' + fmt(eRef) + '</b> under the standard GRM' +
      (Math.abs(e - eRef) >= 0.005 ? ' (' + fmtSigned(e - eRef) + ').' : '.');

    renderStepsTable(full, K);
  }

  function renderStepsTable(full, K) {
    var t = $('steps-table');
    var head = '<thead><tr><th>Category <span class="m">k</span></th>';
    for (var k = 0; k < K; k++) head += '<th>' + (k + 1) + '</th>';
    head += '</tr></thead>';
    function row(label, arr, d, cls) {
      var r = '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td>';
      arr.forEach(function (v) { r += '<td>' + fmt(v, d) + '</td>'; });
      return r + '</tr>';
    }
    var zx = full.x.map(function (x) { return x * S.zeta; });
    var body = '<tbody>' +
      row('1 · GRM probability (with σ)', full.grm, 3) +
      (S.rev ? row('2 · reversed for reverse keying', full.base, 3) : '') +
      row('3 · choice value <span class="m">m<sub>k</sub></span>', full.m, 2) +
      row('&emsp;position <span class="m">x<sub>k</sub></span>', full.x, 2) +
      row('&emsp;tilt <span class="m">ζ·x<sub>k</sub></span>', zx, 2) +
      row('&emsp;<span class="m">v<sub>k</sub> = m<sub>k</sub> + ζ·x<sub>k</sub></span>', full.v, 2) +
      row('Final P(<span class="m">k</span>) = softmax(<span class="m">v</span>)', full.p, 3, 'final') +
      '</tbody>';
    t.innerHTML = head + body;
  }

  // ---- panel 2: curves across psi
  function renderCurves(item) {
    var K = S.K, cols = catColours(K), N = 141;
    var grid = [], cur = [], ref = [];
    for (var i = 0; i < N; i++) {
      var psi = PSI_MIN + (PSI_MAX - PSI_MIN) * i / (N - 1);
      grid.push(psi);
      cur.push(D.probs(item, { psi: psi, sigma: S.sigma, zeta: S.zeta }));
      ref.push(D.probs(item, { psi: psi, sigma: REF.sigma, zeta: REF.zeta }));
    }
    var sz = chartSize('chart-curve', 270, 230);
    var m = { l: 40, r: 10, t: 14, b: 40 };
    var x = lin(PSI_MIN, PSI_MAX, m.l, sz.w - m.r);
    var svg;
    var expectedMode = S.curve === 'expected';
    if (expectedMode) {
      svg = freshSvg(sz, 'Expected answer to the item as a function of the trait');
      var y = lin(1, K, sz.h - m.b, m.t);
      var yt = []; for (var k = 1; k <= K; k++) yt.push(k);
      yAxis(svg, y, yt, m.l, sz.w - m.r, String);
      drawThresholdTicks(svg, x, sz.h - m.b, cols);
      s('path', { d: pathFrom(grid.map(function (g, i) { return [x(g), y(D.expected(ref[i]) + 1)]; })),
        fill: 'none', stroke: C['ink-3'], 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
      s('path', { d: pathFrom(grid.map(function (g, i) { return [x(g), y(D.expected(cur[i]) + 1)]; })),
        fill: 'none', stroke: C.accent, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
      var pc = D.probs(item, { psi: S.psi, sigma: S.sigma, zeta: S.zeta });
      marker(svg, x(S.psi), m.t, sz.h - m.b);
      s('circle', { cx: x(S.psi), cy: y(D.expected(pc) + 1), r: 5.5, fill: C.accent, stroke: C.surface, 'stroke-width': 2 }, svg);
      setLegend('legend-curve', [['line', C.accent, 'D-IRT'], ['dash', C['ink-3'], 'standard GRM']]);
      txt(svg, 10, m.t + 2, 'answer', { 'font-size': 11, fill: C['ink-3'], transform: 'rotate(-90 10 ' + (m.t + 2) + ')', 'text-anchor': 'end' });
    } else {
      svg = freshSvg(sz, 'Probability of each answer option as a function of the trait');
      var y2 = lin(0, 1, sz.h - m.b, m.t);
      yAxis(svg, y2, [0, 0.5, 1], m.l, sz.w - m.r, function (t) { return Math.round(t * 100) + '%'; });
      drawThresholdTicks(svg, x, sz.h - m.b, cols);
      for (var c = 0; c < K; c++) {
        s('path', { d: pathFrom(grid.map(function (g, i) { return [x(g), y2(ref[i][c])]; })),
          fill: 'none', stroke: cols[c], 'stroke-width': 1.5, 'stroke-dasharray': '4 3', opacity: 0.55 }, svg);
      }
      for (c = 0; c < K; c++) {
        s('path', { d: pathFrom(grid.map(function (g, i) { return [x(g), y2(cur[i][c])]; })),
          fill: 'none', stroke: cols[c], 'stroke-width': 2.75, 'stroke-linejoin': 'round' }, svg);
      }
      marker(svg, x(S.psi), m.t, sz.h - m.b);
      var keys = [];
      for (c = 0; c < K; c++) keys.push(['line', cols[c], String(c + 1)]);
      keys.push(['dash', C['ink-3'], 'standard GRM']);
      setLegend('legend-curve', keys);
    }
    // x axis
    s('line', { x1: m.l, x2: sz.w - m.r, y1: sz.h - m.b, y2: sz.h - m.b, stroke: C['rule-2'] }, svg);
    for (var t = -3; t <= 3; t++) {
      txt(svg, x(t), sz.h - m.b + 16, fmt(t, 0), { 'text-anchor': 'middle', 'font-size': 11, fill: C['ink-3'] });
    }
    txt(svg, (m.l + sz.w - m.r) / 2, sz.h - 6, 'trait ψ', { 'text-anchor': 'middle', 'font-size': 11.5, fill: C['ink-2'], 'font-style': 'italic' });

    $('readout-curve').innerHTML = S.rev
      ? 'Reverse-keyed: higher trait gives <b>lower</b> answers. Ticks on the axis mark the thresholds <i>b</i>.'
      : 'Ticks on the axis mark the thresholds <i>b</i>; σ stretches the curve around them, ζ lifts or lowers it.';
  }
  function drawThresholdTicks(svg, x, yBase, cols) {
    S.b.forEach(function (b, k) {
      if (b < PSI_MIN || b > PSI_MAX) return;
      s('line', { x1: x(b), x2: x(b), y1: yBase - 6, y2: yBase, stroke: cols[k + 1], 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    });
  }
  function marker(svg, xv, y0, y1) {
    s('line', { x1: xv, x2: xv, y1: y0, y2: y1, stroke: C.accent, 'stroke-width': 1.25, 'stroke-dasharray': '2 3', opacity: 0.8 }, svg);
  }

  // ---- panel 3: questionnaire
  function renderQuestionnaire() {
    var K = S.K, n = S.n, cols = catColours(K);
    $('q-n-text').textContent = n;
    var items = [];
    for (var j = 0; j < n; j++) items.push(simItem(j, K, n, S.nrev));
    var score = function (resp, it) { return it.reversed ? K - 1 - resp : resp; };   // 0..K-1 after re-scoring

    var sumRef = [], sumCur = [];
    for (var i = 0; i < N_PEOPLE; i++) {
      var tr = 0, tc = 0, psi = sim.psi[i];
      for (j = 0; j < n; j++) {
        var it = items[j], u = sim.u[i][j];
        tr += score(D.drawCategory(D.probs(it, { psi: psi, sigma: 1, zeta: 0 }), u), it) + 1;
        tc += score(D.drawCategory(D.probs(it, { psi: psi, sigma: S.sigma, zeta: S.zeta }), u), it) + 1;
      }
      sumRef.push(tr); sumCur.push(tc);
    }
    function expectedSum(psi, sigma, zeta) {
      var e = 0;
      for (var q = 0; q < n; q++) {
        var ex = D.expected(D.probs(items[q], { psi: psi, sigma: sigma, zeta: zeta }));
        e += (items[q].reversed ? K - 1 - ex : ex) + 1;
      }
      return e;
    }

    // stats
    var rRef = corr(sim.psi, sumRef), rCur = corr(sim.psi, sumCur);
    var mRef = mean(sumRef), mCur = mean(sumCur);
    var eRef = expectedSum(S.psi, 1, 0), eCur = expectedSum(S.psi, S.sigma, S.zeta);
    var st = $('stats');
    st.innerHTML = '';
    [
      ['Correlation with true ψ', fmt(rRef), fmt(rCur), 'across the 500 simulated respondents'],
      ['Average sum score', fmt(mRef, 1), fmt(mCur, 1), 'range ' + n + '–' + n * K + '; change ' + fmtSigned(mCur - mRef, 1)],
      ['This person’s expected sum', fmt(eRef, 1), fmt(eCur, 1), 'at ψ = ' + fmt(S.psi) + '; change ' + fmtSigned(eCur - eRef, 1)]
    ].forEach(function (r) {
      st.appendChild(h('div', { class: 'stat' }, [
        h('div', { class: 'k', text: r[0] }),
        h('div', { class: 'v', html: '<span class="from" title="standard GRM">' + r[1] + '</span><span class="arrow">→</span><span class="to" title="D-IRT">' + r[2] + '</span>' }),
        h('div', { class: 'd', text: r[3] })
      ]));
    });

    // scatter
    setLegend('legend-scatter', [['dot', C.ref, 'standard GRM'], ['dot', C.accent, 'D-IRT, current σ and ζ'],
      ['line', C.accent, 'expected sum']]);
    var sz = chartSize('chart-scatter', 340, 280);
    var svg = freshSvg(sz, 'Scatter plot of simulated sum scores against true trait');
    var m = { l: 44, r: 10, t: 12, b: 40 };
    var x = lin(-3.2, 3.2, m.l, sz.w - m.r), y = lin(n, n * K, sz.h - m.b, m.t);
    var step = n * (K - 1) / 4, yt = [];
    for (var q = 0; q <= 4; q++) yt.push(Math.round(n + q * step));
    yAxis(svg, y, yt, m.l, sz.w - m.r, String);
    var jitter = (sz.h - m.b - m.t) / (n * (K - 1)) * 0.35;
    var gRef = s('g', { fill: C.ref, opacity: 0.4 }, svg), gCur = s('g', { fill: C.accent, opacity: 0.55 }, svg);
    for (i = 0; i < N_PEOPLE; i++) {
      var px = x(sim.psi[i]); if (px < m.l || px > sz.w - m.r) continue;
      var jy = (sim.u[i][MAX_ITEMS - 1] - 0.5) * 2 * jitter;
      s('circle', { cx: px.toFixed(1), cy: (y(sumRef[i]) + jy).toFixed(1), r: 2.2 }, gRef);
      s('circle', { cx: px.toFixed(1), cy: (y(sumCur[i]) + jy).toFixed(1), r: 2.4 }, gCur);
    }
    var pr = [], pc = [];
    for (q = 0; q <= 64; q++) {
      var g = -3.2 + 6.4 * q / 64;
      pr.push([x(g), y(expectedSum(g, 1, 0))]);
      pc.push([x(g), y(expectedSum(g, S.sigma, S.zeta))]);
    }
    s('path', { d: pathFrom(pr), fill: 'none', stroke: C['ink-2'], 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    s('path', { d: pathFrom(pc), fill: 'none', stroke: C.accent, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    marker(svg, x(S.psi), m.t, sz.h - m.b);
    s('circle', { cx: x(S.psi), cy: y(eCur), r: 5.5, fill: C.accent, stroke: C.surface, 'stroke-width': 2 }, svg);
    s('line', { x1: m.l, x2: sz.w - m.r, y1: sz.h - m.b, y2: sz.h - m.b, stroke: C['rule-2'] }, svg);
    for (var t = -3; t <= 3; t++) txt(svg, x(t), sz.h - m.b + 16, fmt(t, 0), { 'text-anchor': 'middle', 'font-size': 11, fill: C['ink-3'] });
    txt(svg, (m.l + sz.w - m.r) / 2, sz.h - 6, 'true trait ψ', { 'text-anchor': 'middle', 'font-size': 11.5, fill: C['ink-2'], 'font-style': 'italic' });
    txt(svg, 11, m.t, 'sum score', { 'font-size': 11, fill: C['ink-3'], transform: 'rotate(-90 11 ' + m.t + ')', 'text-anchor': 'end' });

    // item bars for the current person
    $('items-psi').textContent = fmt(S.psi);
    var legend = [];
    for (var c = 0; c < K; c++) legend.push(['bar', cols[c], String(c + 1)]);
    setLegend('legend-items', legend);
    var box = $('items');
    box.innerHTML = '';
    box.appendChild(h('div', { class: 'items-axis', 'aria-hidden': 'true' }, [
      h('span'), h('span', { class: 'ends' }, [h('span', { text: '← disagree' }), h('span', { text: 'agree →' })]), h('span', { text: 'E', style: 'text-align:right' })
    ]));
    var person = { psi: S.psi, sigma: S.sigma, zeta: S.zeta };
    items.forEach(function (it, idx) {
      var p = D.probs(it, person);
      var bar = h('div', { class: 'bar', role: 'img',
        'aria-label': 'Item ' + (idx + 1) + ': ' + p.map(function (v, k) { return (k + 1) + ': ' + Math.round(v * 100) + '%'; }).join(', ') });
      p.forEach(function (v, k) {
        var sp = h('span'); sp.style.width = (v * 100) + '%'; sp.style.background = cols[k];
        sp.title = 'Option ' + (k + 1) + ': ' + Math.round(v * 100) + '%';
        bar.appendChild(sp);
      });
      var lab = h('span', { class: 'lab', text: 'Q' + (idx + 1) });
      if (it.reversed) lab.appendChild(h('span', { class: 'rev-badge', text: 'R', title: 'reverse-keyed' }));
      box.appendChild(h('div', { class: 'item-row' }, [lab, bar, h('span', { class: 'ev', text: fmt(D.expected(p) + 1, 1) })]));
    });
  }

  // ---------------------------------------------------------------- URL state
  var hashTimer = null;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      var q = 'psi=' + S.psi + '&sigma=' + S.sigma + '&zeta=' + S.zeta + '&K=' + S.K + '&a=' + S.a +
        '&b=' + S.b.join(',') + '&rev=' + (S.rev ? 1 : 0) + '&n=' + S.n + '&nrev=' + S.nrev +
        '&seed=' + S.seed + '&view=' + S.curve;
      try { history.replaceState(null, '', '#' + q); } catch (e) {}
    }, 250);
  }
  function readHash() {
    var hsh = location.hash.replace(/^#/, '');
    if (!hsh || hsh.indexOf('=') < 0) return;
    var p = {};
    hsh.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    function num(k, lo, hi) { var v = parseFloat(p[k]); return isFinite(v) ? clamp(v, lo, hi) : null; }
    var v;
    if ((v = num('psi', -3, 3)) != null) S.psi = v;
    if ((v = num('sigma', SIGMA_MIN, SIGMA_MAX)) != null) S.sigma = v;
    if ((v = num('zeta', -3, 3)) != null) S.zeta = v;
    if ((v = num('a', 0.2, 4)) != null) S.a = v;
    if ((v = num('K', 2, 7)) != null) { S.K = Math.round(v); S.b = defaultThresholds(S.K); }
    if (p.b) {
      var b = p.b.split(',').map(parseFloat);
      if (b.length === S.K - 1 && b.every(isFinite)) {
        b = b.map(function (x) { return clamp(x, -3, 3); }).sort(function (x, y) { return x - y; });
        S.b = b;
      }
    }
    if (p.rev != null) S.rev = p.rev === '1';
    if ((v = num('n', 10, 40)) != null && [10, 20, 40].indexOf(Math.round(v)) >= 0) S.n = Math.round(v);
    if ((v = num('nrev', 0, S.n)) != null) S.nrev = Math.round(v);
    if ((v = num('seed', 1, 9973)) != null) S.seed = Math.round(v);
    if (p.view === 'cats' || p.view === 'expected') S.curve = p.view;
  }

  // ---------------------------------------------------------------- chrome: theme, share, drawer
  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function setupChrome() {
    $('theme').addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dirt-theme', next); } catch (e) {}
      render();
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { render(); });

    $('share').addEventListener('click', function () {
      writeHash();
      setTimeout(function () {
        var url = location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { toast('Link to these settings copied'); },
            function () { toast('Copy the address bar to share these settings'); });
        } else toast('Copy the address bar to share these settings');
      }, 300);
    });

    var controls = $('controls'), tog = $('drawer-toggle'), mq = window.matchMedia('(max-width: 860px)');
    function setDrawer(open) {
      controls.classList.toggle('collapsed', !open);
      tog.setAttribute('aria-expanded', String(open));
      tog.querySelector('.drawer-label').textContent = open ? 'Fewer controls' : 'All controls';
      if (!open) controls.scrollTop = 0;
    }
    tog.addEventListener('click', function () { setDrawer(controls.classList.contains('collapsed')); });
    function onMq() { if (mq.matches) setDrawer(false); else { controls.classList.remove('collapsed'); } }
    mq.addEventListener('change', onMq); onMq();

    // keep page padding equal to the collapsed drawer height on phones
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (mq.matches && controls.classList.contains('collapsed'))
          document.documentElement.style.setProperty('--drawer-h', controls.offsetHeight + 'px');
      }).observe(controls);
      var lastW = 0;
      new ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (w !== lastW) { lastW = w; changed(); }
      }).observe(document.querySelector('.panels'));
    } else {
      window.addEventListener('resize', changed);
    }
  }

  // ---------------------------------------------------------------- init
  readHash();
  sim = buildSimulation(S.seed);
  readColours();
  buildControls();
  setupChrome();
  sync();
  render();
})();
