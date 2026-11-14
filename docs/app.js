/* D-IRT Explorer — UI, state and hand-drawn SVG charts. No dependencies. */
(function () {
  'use strict';

  var D = window.DIRT;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PSI_MIN = -3.5, PSI_MAX = 3.5;
  var SIGMA_MIN = 0.25, SIGMA_MAX = 6;
  var PHONE = '(max-width: 760px)';

  // ---------------------------------------------------------------- state
  function defaultThresholds(K) {
    if (K === 2) return [0];
    var w = Math.min(2, 0.45 * (K - 1)), out = [];
    for (var k = 0; k < K - 1; k++) out.push(round2(-w + 2 * w * k / (K - 2)));
    return out;
  }
  function defaults() {
    return { psi: 0.5, sigma: 1, zeta: 0, K: 5, a: 1.6, b: defaultThresholds(5), rev: false, curve: 'expected' };
  }
  var S = defaults();

  // ---------------------------------------------------------------- helpers
  function round2(x) { return Math.round(x * 100) / 100; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function fmt(x, d) {
    var s = x.toFixed(d == null ? 2 : d);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
    return (s.charAt(0) === '-' ? '−' + s.slice(1) : s);
  }
  function fmtSigned(x, d) { return (x > 0 ? '+' : '') + fmt(x, d); }
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
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

  // ---------------------------------------------------------------- colours
  var C = {};
  function readColours() {
    var cs = getComputedStyle(document.documentElement);
    ['ink', 'ink-2', 'ink-3', 'rule', 'rule-2', 'surface', 'person', 'item', 'curve',
     'cat-lo', 'cat-mid', 'cat-hi'].forEach(function (k) {
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
      var t = k / (K - 1);
      out.push(t < 0.5 ? mix(C['cat-lo'], C['cat-mid'], Math.pow(t * 2, 1.3) * 0.78)
                       : mix(C['cat-hi'], C['cat-mid'], Math.pow((1 - t) * 2, 1.3) * 0.78));
    }
    return out;
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
    input.addEventListener('dblclick', function () { o.set(o.reset); sync(); changed(); });
    syncers.push(function () { input.value = toS(o.get()); setFill(input); out.textContent = o.fmt(o.get()); });
    var kids = [h('div', { class: 'ctl-row' }, [h('label', { class: 'ctl-label', for: id, html: o.label }), out]), input];
    if (o.ticks) kids.push(h('div', { class: 'ticks', 'aria-hidden': 'true' }, o.ticks.map(function (t) { return h('span', { text: t }); })));
    if (o.hint) kids.push(h('p', { class: 'hint', html: o.hint }));
    return h('div', { class: 'ctl' }, kids);
  }

  function segmented(container, options, get, set) {
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
    var ps = $('person-sliders');
    ps.appendChild(slider({
      key: 'psi', min: -3, max: 3, step: 0.05, centered: true, reset: 0,
      label: '<span class="sym">ψ</span><span class="name">trait</span>',
      get: function () { return S.psi; }, set: function (v) { S.psi = round2(v); }, fmt: function (v) { return fmt(v); },
      ticks: ['low', 'high'],
      hint: 'The person’s true level of the trait.'
    }));
    ps.appendChild(slider({
      key: 'sigma', min: Math.log(SIGMA_MIN), max: Math.log(SIGMA_MAX), step: 0.01, reset: 1,
      label: '<span class="sym">σ</span><span class="name">response noise</span>',
      get: function () { return S.sigma; }, set: function (v) { S.sigma = round2(v); },
      toSlider: Math.log, fromSlider: Math.exp, fmt: function (v) { return fmt(v); },
      ticks: ['consistent', 'noisy'],
      hint: 'How noisy the person’s answers are (1 = standard GRM).'
    }));
    ps.appendChild(slider({
      key: 'zeta', min: -3, max: 3, step: 0.05, centered: true, reset: 0,
      label: '<span class="sym">ζ</span><span class="name">acquiescence</span>',
      get: function () { return S.zeta; }, set: function (v) { S.zeta = round2(v); }, fmt: function (v) { return fmtSigned(v); },
      ticks: ['disagree', 'agree'],
      hint: 'A tendency to agree or disagree, whatever the item says.'
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

    $('reset').addEventListener('click', function () {
      var keepCurve = S.curve; S = defaults(); S.curve = keepCurve;
      buildThresholds(); sync(); changed();
    });

    buildThresholds();
  }

  var bSyncers = [];
  function buildThresholds() {
    var box = $('b-sliders');
    box.innerHTML = '';
    syncers = syncers.filter(function (f) { return bSyncers.indexOf(f) < 0; });
    bSyncers = [];
    S.b.forEach(function (_, k) {
      var id = 'sl-b' + k;
      var input = h('input', { type: 'range', id: id, min: -3, max: 3, step: 0.05, 'aria-label': 'Threshold b' + (k + 1) });
      var out = h('output', { class: 'val', for: id });
      var name = h('label', { class: 'b-name', for: id, html: 'b<sub>' + (k + 1) + '</sub>' });
      input.addEventListener('input', function () {
        var gap = 0.05, j;
        S.b[k] = round2(parseFloat(input.value));
        // keep thresholds ordered: dragging one pushes its neighbours
        for (j = k + 1; j < S.b.length; j++) S.b[j] = round2(clamp(Math.max(S.b[j], S.b[j - 1] + gap), -3, 3));
        for (j = k - 1; j >= 0; j--) S.b[j] = round2(clamp(Math.min(S.b[j], S.b[j + 1] - gap), -3, 3));
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

  function item() { return { a: S.a, b: S.b, reversed: S.rev }; }
  function person() { return { psi: S.psi, sigma: S.sigma, zeta: S.zeta }; }

  function render() {
    readColours();
    renderCategories();
    renderCurves();
  }

  function chartSize(id, hDesktop, hPhone) {
    var el = $(id);
    return { el: el, w: Math.max(260, el.clientWidth), h: window.matchMedia(PHONE).matches ? hPhone : hDesktop };
  }
  function freshSvg(sz, label) {
    sz.el.innerHTML = '';
    return s('svg', { viewBox: '0 0 ' + sz.w + ' ' + sz.h, width: sz.w, height: sz.h, role: 'img', 'aria-label': label }, sz.el);
  }
  function setLegend(id, keys) {
    var el = $(id); el.innerHTML = '';
    keys.forEach(function (k) {
      var sv = document.createElementNS(SVGNS, 'svg');
      sv.setAttribute('viewBox', '0 0 18 12');
      s('line', { x1: 1, y1: 6, x2: 17, y2: 6, stroke: k[0], 'stroke-width': 2.75, 'stroke-linecap': 'round' }, sv);
      el.appendChild(h('span', { class: 'key' }, [sv, h('span', { text: k[1] })]));
    });
  }
  function yAxis(svg, y, ticks, x0, x1, fmtTick) {
    ticks.forEach(function (t) {
      s('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: C.rule, 'stroke-width': 1 }, svg);
      txt(svg, x0 - 8, y(t) + 4, fmtTick(t), { 'text-anchor': 'end', 'font-size': 11, fill: C['ink-3'] });
    });
  }

  // ---- panel 1: category probabilities
  function renderCategories() {
    var K = S.K, cols = catColours(K);
    var full = D.dirt(item(), person()), p = full.p;

    var sz = chartSize('chart-cat', 280, 240);
    var svg = freshSvg(sz, 'Bar chart of the probability of each of ' + K + ' answer options');
    var m = { l: 40, r: 8, t: 22, b: 44 };
    var x0 = m.l, x1 = sz.w - m.r, y = lin(0, 1, sz.h - m.b, m.t);
    yAxis(svg, y, [0, 0.25, 0.5, 0.75, 1], x0, x1, function (t) { return Math.round(t * 100) + '%'; });
    var slot = (x1 - x0) / K, bw = Math.min(64, slot * 0.62);
    for (var k = 0; k < K; k++) {
      var cx = x0 + slot * (k + 0.5);
      s('rect', { x: cx - bw / 2, y: y(p[k]), width: bw, height: Math.max(0, y(0) - y(p[k])), rx: 4, fill: cols[k] }, svg);
      txt(svg, cx, y(p[k]) - 6, Math.round(p[k] * 100) + '%', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: C.ink });
      txt(svg, cx, y(0) + 17, String(k + 1), { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: C['ink-2'] });
    }
    s('line', { x1: x0, x2: x1, y1: y(0), y2: y(0), stroke: C['rule-2'] }, svg);
    txt(svg, x0 + slot * 0.5, y(0) + 34, 'disagree', { 'text-anchor': slot < 70 ? 'start' : 'middle', 'font-size': 11, fill: C['ink-3'] });
    txt(svg, x1 - slot * 0.5, y(0) + 34, 'agree', { 'text-anchor': slot < 70 ? 'end' : 'middle', 'font-size': 11, fill: C['ink-3'] });

    $('readout-cat').innerHTML = 'Expected answer <b>' + fmt(D.expected(p) + 1) + '</b> on the 1–' + K + ' scale.';
    renderStepsTable(full, K);
  }

  function renderStepsTable(full, K) {
    var head = '<thead><tr><th>Answer option <span class="m">k</span></th>';
    for (var k = 0; k < K; k++) head += '<th>' + (k + 1) + '</th>';
    head += '</tr></thead>';
    function row(label, arr, d, cls) {
      var r = '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td>';
      arr.forEach(function (v) { r += '<td>' + fmt(v, d) + '</td>'; });
      return r + '</tr>';
    }
    var zx = full.x.map(function (x) { return x * S.zeta; });
    $('steps-table').innerHTML = head + '<tbody>' +
      row('1 · GRM probability <span class="tag p">ψ σ</span><span class="tag i">a b</span>', full.grm, 3) +
      (S.rev ? row('2 · reversed <span class="tag i">reverse-keyed</span>', full.base, 3) : '') +
      row('3 · choice value <span class="m">m<sub>k</sub></span>', full.m, 2) +
      row('&emsp;position <span class="m">x<sub>k</sub></span>', full.x, 2) +
      row('&emsp;tilt <span class="m">ζ·x<sub>k</sub></span> <span class="tag p">ζ</span>', zx, 2) +
      row('&emsp;<span class="m">v<sub>k</sub> = m<sub>k</sub> + ζ·x<sub>k</sub></span>', full.v, 2) +
      row('P(<span class="m">k</span>) = softmax(<span class="m">v</span>)', full.p, 3, 'final') +
      '</tbody>';
  }

  // ---- panel 2: curves across psi
  function renderCurves() {
    var K = S.K, cols = catColours(K), N = 141, it = item();
    var grid = [], cur = [];
    for (var i = 0; i < N; i++) {
      var psi = PSI_MIN + (PSI_MAX - PSI_MIN) * i / (N - 1);
      grid.push(psi);
      cur.push(D.probs(it, { psi: psi, sigma: S.sigma, zeta: S.zeta }));
    }
    var sz = chartSize('chart-curve', 280, 240);
    var m = { l: 40, r: 10, t: 14, b: 40 };
    var x = lin(PSI_MIN, PSI_MAX, m.l, sz.w - m.r), svg, c;
    if (S.curve === 'expected') {
      svg = freshSvg(sz, 'Expected answer to the item as a function of the trait');
      var y = lin(1, K, sz.h - m.b, m.t), yt = [];
      for (var k = 1; k <= K; k++) yt.push(k);
      yAxis(svg, y, yt, m.l, sz.w - m.r, String);
      thresholdTicks(svg, x, sz.h - m.b);
      s('path', { d: pathFrom(grid.map(function (g, i) { return [x(g), y(D.expected(cur[i]) + 1)]; })),
        fill: 'none', stroke: C.curve, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
      psiMarker(svg, x(S.psi), m.t, sz.h - m.b);
      s('circle', { cx: x(S.psi), cy: y(D.expected(D.probs(it, person())) + 1), r: 5.5, fill: C.person, stroke: C.surface, 'stroke-width': 2 }, svg);
      $('legend-curve').innerHTML = '';
    } else {
      svg = freshSvg(sz, 'Probability of each answer option as a function of the trait');
      var y2 = lin(0, 1, sz.h - m.b, m.t);
      yAxis(svg, y2, [0, 0.5, 1], m.l, sz.w - m.r, function (t) { return Math.round(t * 100) + '%'; });
      thresholdTicks(svg, x, sz.h - m.b);
      for (c = 0; c < K; c++) {
        s('path', { d: pathFrom(grid.map(function (g, i) { return [x(g), y2(cur[i][c])]; })),
          fill: 'none', stroke: cols[c], 'stroke-width': 2.75, 'stroke-linejoin': 'round' }, svg);
      }
      psiMarker(svg, x(S.psi), m.t, sz.h - m.b);
      var keys = [];
      for (c = 0; c < K; c++) keys.push([cols[c], String(c + 1)]);
      setLegend('legend-curve', keys);
    }
    s('line', { x1: m.l, x2: sz.w - m.r, y1: sz.h - m.b, y2: sz.h - m.b, stroke: C['rule-2'] }, svg);
    for (var t = -3; t <= 3; t++) txt(svg, x(t), sz.h - m.b + 16, fmt(t, 0), { 'text-anchor': 'middle', 'font-size': 11, fill: C['ink-3'] });
    txt(svg, (m.l + sz.w - m.r) / 2, sz.h - 6, 'trait ψ', { 'text-anchor': 'middle', 'font-size': 11.5, fill: C['ink-2'], 'font-style': 'italic' });

    $('readout-curve').innerHTML = (S.rev ? 'Reverse-keyed: higher trait gives lower answers. ' : '') +
      'Teal ticks mark the thresholds <i>b</i>; the dotted line is the person’s ψ.';
  }
  function thresholdTicks(svg, x, yBase) {
    S.b.forEach(function (b) {
      if (b < PSI_MIN || b > PSI_MAX) return;
      s('line', { x1: x(b), x2: x(b), y1: yBase - 7, y2: yBase, stroke: C.item, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    });
  }
  function psiMarker(svg, xv, y0, y1) {
    s('line', { x1: xv, x2: xv, y1: y0, y2: y1, stroke: C.person, 'stroke-width': 1.5, 'stroke-dasharray': '2 3' }, svg);
  }

  // ---------------------------------------------------------------- URL state
  var hashTimer = null;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      var q = 'psi=' + S.psi + '&sigma=' + S.sigma + '&zeta=' + S.zeta + '&K=' + S.K + '&a=' + S.a +
        '&b=' + S.b.join(',') + '&rev=' + (S.rev ? 1 : 0) + '&view=' + S.curve;
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
      if (b.length === S.K - 1 && b.every(isFinite)) S.b = b.map(function (x) { return clamp(x, -3, 3); }).sort(function (x, y) { return x - y; });
    }
    if (p.rev != null) S.rev = p.rev === '1';
    if (p.view === 'cats' || p.view === 'expected') S.curve = p.view;
  }

  // ---------------------------------------------------------------- chrome
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
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);

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

    var st = $('steps-toggle'), body = $('steps-body');
    st.addEventListener('click', function () {
      var open = st.getAttribute('aria-expanded') !== 'true';
      st.setAttribute('aria-expanded', String(open));
      st.querySelector('.st-text b').textContent = open ? 'Hide the step-by-step calculation' : 'Show the model step by step';
      body.hidden = !open;
    });

    var ic = document.querySelector('.item-controls'), it = $('item-toggle');
    it.addEventListener('click', function () {
      var open = !ic.classList.contains('open');
      ic.classList.toggle('open', open);
      it.setAttribute('aria-expanded', String(open));
      it.textContent = open ? 'Done' : 'Edit item';
    });

    // on phones the person bar is a fixed bottom drawer: reserve room for it
    var pb = $('person'), mq = window.matchMedia(PHONE);
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        document.documentElement.style.setProperty('--drawer-h', (mq.matches ? pb.offsetHeight : 0) + 'px');
      }).observe(pb);
      var lastW = 0;
      new ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (w !== lastW) { lastW = w; changed(); }
      }).observe(document.querySelector('.plots'));
    } else {
      window.addEventListener('resize', changed);
    }
  }

  // ---------------------------------------------------------------- init
  readHash();
  readColours();
  buildControls();
  setupChrome();
  sync();
  render();
})();
