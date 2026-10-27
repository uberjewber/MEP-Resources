(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'airside-toolkit-v1';
  const clone = o => JSON.parse(JSON.stringify(o));
  const DEF = {
    units: 'IP', elev: 0, tab: 'psych',
    psy: { pins: ['DB', 'WB'], vals: { DB: 75, WB: 62.5 } },
    mix: { basis: 'actual', coil: { t: 55, tw: 54 }, streams: [{ name: 'Outside air', q: 2000, t: 95, tw: 78 }, { name: 'Return air', q: 8000, t: 75, tw: 62.5 }] },
    hvac: {
      sens: { calc: 'Q', order: ['Q', 'cfm', 'dT'], k: 1.08, vals: { Q: 21600, cfm: 1000, dT: 20 } },
      water: { calc: 'Q', order: ['Q', 'gpm', 'dT'], k: 500, vals: { Q: 120000, gpm: 24, dT: 10 } },
      ach: { calc: 'ACH', order: ['ACH', 'V', 'cfm', 'L', 'W', 'H'], mode: 'dims', vals: { ACH: 6, V: 4000, cfm: 400, L: 20, W: 20, H: 10 } },
    },
    duct: { shape: 'round', mat: '0.0003', eps: 0.0003, airMode: 'std', tF: 70, pins: ['Q', 'fr'], Q: 1000, D: 14, W: 20, H: 10, V: 900, fr: 0.08, len: 100 },
  };
  let S = clone(DEF);
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.psy && s.mix && s.duct) S = { ...clone(DEF), ...s, psy: { ...DEF.psy, ...s.psy }, mix: { ...DEF.mix, ...s.mix, coil: { ...DEF.mix.coil, ...(s.mix.coil || {}) } }, duct: { ...DEF.duct, ...s.duct } };
  } catch (e) {}
  S.hvac = S.hvac || clone(DEF.hvac);
  for (const n of ['sens', 'water', 'ach']) {
    const d = clone(DEF.hvac[n]), c = S.hvac[n] || {}, keys = Object.keys(d.vals);
    const h = { ...d, ...c, vals: { ...d.vals, ...(c.vals || {}) } }, ord = Array.isArray(h.order) ? h.order.filter(k => keys.includes(k)) : [];
    h.order = [...keys.filter(k => !ord.includes(k)), ...ord];
    S.hvac[n] = h;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const num = x => (typeof x === 'number' && Number.isFinite(x)) ? x : NaN;

  // ======================= units (state is IP) =======================
  const SI = () => S.units === 'SI';
  const K = {
    q:   { ipf: 1, sif: 0.4719474, ip: 'CFM', si: 'L/s', dip: 0, dsi: 0 },
    d:   { ipf: 1, sif: 25.4, ip: 'in', si: 'mm', dip: 2, dsi: 0 },
    v:   { ipf: 1, sif: 0.00508, ip: 'fpm', si: 'm/s', dip: 0, dsi: 2 },
    p:   { ipf: 1, sif: 248.84, ip: 'in. w.g.', si: 'Pa', dip: 3, dsi: 1 },
    len: { ipf: 1, sif: 0.3048, ip: 'ft', si: 'm', dip: 0, dsi: 1 },
    z:   { ipf: 1, sif: 0.3048, ip: 'ft', si: 'm', dip: 0, dsi: 0 },
    eps: { ipf: 1, sif: 304.8, ip: 'ft', si: 'mm', dip: 5, dsi: 3 },
    fr:  { ipf: 1, sif: 248.84 / 30.48, ip: 'in. w.g./100 ft', si: 'Pa/m', dip: 3, dsi: 2 },
    rho: { ipf: 1, sif: 16.01846, ip: 'lb/ft³', si: 'kg/m³', dip: 4, dsi: 3 },
    a:   { ipf: 1, sif: 0.09290304, ip: 'ft²', si: 'm²', dip: 2, dsi: 3 },
    W:   { ipf: 7000, sif: 1000, ip: 'gr/lb', si: 'g/kg', dip: 1, dsi: 2 },
    Wd:  { ipf: 1, sif: 1, ip: 'lb/lb', si: 'kg/kg', dip: 5, dsi: 5 },
    rh:  { ipf: 100, sif: 100, ip: '%', si: '%', dip: 1, dsi: 1 },
    h:   { ipf: 1, sif: 1, ip: 'Btu/lb', si: 'kJ/kg', dip: 2, dsi: 2 },     // stored in the display system
    vol: { ipf: 1, sif: 0.06242796, ip: 'ft³/lb', si: 'm³/kg', dip: 3, dsi: 4 },
    pr:  { ipf: 1, sif: 6.894757, ip: 'psia', si: 'kPa', dip: 3, dsi: 2 },
    pw:  { ipf: 1, sif: 6.894757, ip: 'psia', si: 'kPa', dip: 4, dsi: 3 },
    m:   { ipf: 60, sif: 0.45359237 / 60, ip: 'lb/h', si: 'kg/s', dip: 0, dsi: 3 },
    btuh: { ipf: 1, sif: 0.29307107, ip: 'Btu/h', si: 'W', dip: 0, dsi: 0 },
    dt:   { ipf: 1, sif: 1 / 1.8, ip: '°F', si: 'K', dip: 1, dsi: 2 },
    wq:   { ipf: 1, sif: 0.0630902, ip: 'gpm', si: 'L/s', dip: 2, dsi: 3 },
    vol3: { ipf: 1, sif: 0.0283168466, ip: 'ft³', si: 'm³', dip: 0, dsi: 2 },
    rl:   { ipf: 1, sif: 0.3048, ip: 'ft', si: 'm', dip: 1, dsi: 2 },
    ach:  { ipf: 1, sif: 1, ip: 'ACH', si: 'ACH', dip: 2, dsi: 2 },
    area: { ipf: 1, sif: 0.09290304, ip: 'ft²', si: 'm²', dip: 0, dsi: 1 },
    mh:  { ipf: 60, sif: 0.45359237 * 60, ip: 'lb/h', si: 'kg/h', dip: 1, dsi: 1 },        // from lb/min
    gph: { ipf: 60 / 8.34, sif: 0.45359237 * 60, ip: 'gph', si: 'L/h', dip: 2, dsi: 1 },  // from lb/min of water
    gpm: { ipf: 1 / 8.34, sif: 0.45359237, ip: 'gpm', si: 'L/min', dip: 3, dsi: 2 },
    ld:  { ipf: 60, sif: 60 * 0.00029307107, ip: 'Btu/h', si: 'kW', dip: 0, dsi: 2 },     // from Btu/min
  };
  const out = (k, x) => k === 't' ? (SI() ? (x - 32) / 1.8 : x) : x * (SI() ? K[k].sif : K[k].ipf);
  const inn = (k, x) => k === 't' ? (SI() ? x * 1.8 + 32 : x) : x / (SI() ? K[k].sif : K[k].ipf);
  const U = k => k === 't' ? (SI() ? '°C' : '°F') : SI() ? K[k].si : K[k].ip;
  const dp = k => k === 't' ? 1 : SI() ? K[k].dsi : K[k].dip;
  const fx = (x, d) => Number.isFinite(x) ? x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  const show = (k, x, d) => fx(out(k, x), d ?? dp(k));
  const val = (k, x, d) => `${show(k, x, d)}<small>${U(k)}</small>`;
  const inVal = (k, x) => Number.isFinite(x) ? String(+out(k, x).toFixed(dp(k))) : '';
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P = () => Psy.pAlt(S.elev);

  // ======================= psychrometric chart =======================
  function psyChart(svg, cfg) {
    const p = P(), si = SI();
    const W0 = 900, H0 = 580, m = { l: 16, r: 74, t: 14, b: 46 };
    const pw = W0 - m.l - m.r, ph = H0 - m.t - m.b;
    let xLo = si ? -10 : 20, xHi = si ? 50 : 120, yHi = si ? 30 : 200;
    for (const q of cfg.points) {
      if (!Number.isFinite(q.t) || !Number.isFinite(q.W)) continue;
      xLo = Math.min(xLo, out('t', q.t) - 6); xHi = Math.max(xHi, out('t', q.t) + 6); yHi = Math.max(yHi, out('W', q.W) * 1.15);
    }
    const xs = si ? 5 : 10, xg = si ? 2.5 : 5, ys = si ? 2 : 20, yg = si ? 1 : 10;
    xLo = Math.floor(xLo / xs) * xs; xHi = Math.ceil(xHi / xs) * xs; yHi = Math.ceil(yHi / ys) * ys;
    const tF = xd => si ? xd * 1.8 + 32 : xd;
    const X = t => m.l + (out('t', t) - xLo) / (xHi - xLo) * pw;
    const Y = W => m.t + ph - out('W', W) / yHi * ph;
    const Wtop = inn('W', yHi), tA = tF(xLo), tB = tF(xHi);
    const P2 = (t, W) => X(t).toFixed(1) + ',' + Y(W).toFixed(1);
    const id = svg.id;
    const inPlot = (x, y) => x >= m.l - 0.5 && x <= m.l + pw + 0.5 && y >= m.t - 0.5 && y <= m.t + ph + 0.5;
    // saturation curve (clipped at top)
    const sat = []; let tTop = null;
    const N = 180;
    for (let i = 0; i <= N; i++) {
      const t = tA + (tB - tA) * i / N, w = Psy.Ws(t, p);
      if (w > Wtop) {
        let lo = i ? tA + (tB - tA) * (i - 1) / N : tA, hi = t;
        for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (Psy.Ws(mid, p) > Wtop) hi = mid; else lo = mid; }
        tTop = lo; sat.push([tTop, Wtop]); break;
      }
      sat.push([t, w]);
    }
    const satD = 'M' + sat.map(([t, w]) => P2(t, w)).join('L');
    const under = `M${P2(tA, 0)}L${satD.slice(1)}${tTop != null ? `L${(m.l + pw).toFixed(1)},${m.t}` : ''}L${P2(tB, 0)}Z`;
    let s = `<defs><clipPath id="${id}-u"><path d="${under}"/></clipPath><clipPath id="${id}-r"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>`;
    s += `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="var(--bg)"/><path d="${under}" fill="var(--surface)"/>`;
    const CU = `clip-path="url(#${id}-u)"`, CR = `clip-path="url(#${id}-r)"`;
    let g = '', lab = '';
    // dry bulb + humidity ratio grid
    for (let x = xLo; x <= xHi + 1e-9; x += xg) {
      const major = Math.abs(x / xs - Math.round(x / xs)) < 1e-9;
      g += `<line x1="${X(tF(x))}" x2="${X(tF(x))}" y1="${m.t}" y2="${m.t + ph}" stroke="var(--grid)" stroke-width="${major ? 1.2 : 0.8}" ${CU}/>`;
      if (major) lab += `<text x="${X(tF(x))}" y="${m.t + ph + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${+x.toFixed(2)}</text>`;
    }
    for (let y = 0; y <= yHi + 1e-9; y += yg) {
      const major = Math.abs(y / ys - Math.round(y / ys)) < 1e-9;
      g += `<line x1="${m.l}" x2="${m.l + pw}" y1="${Y(inn('W', y))}" y2="${Y(inn('W', y))}" stroke="var(--grid)" stroke-width="${major ? 1.2 : 0.8}" ${CU}/>`;
      if (major) lab += `<text x="${m.l + pw + 7}" y="${Y(inn('W', y)) + 4}" font-size="11" fill="var(--muted)">${+y.toFixed(2)}</text>`;
    }
    // specific volume lines
    const vAt = (t, W) => Psy.v(t, W, p);
    const vMin = vAt(tA, 0), vMax = vAt(tB, Math.min(Psy.Ws(tB, p), Wtop));
    const vStepIP = 0.5, vStepSI = 0.02;
    const vStep = si ? vStepSI / K.vol.sif : vStepIP;
    for (let vd = Math.ceil(out('vol', vMin) / (si ? vStepSI : vStepIP)) * (si ? vStepSI : vStepIP); inn('vol', vd) <= vMax; vd += si ? vStepSI : vStepIP) {
      const vv = inn('vol', vd), t0 = vv * p / 0.370486 - 459.67;
      const Wv = t => (vv * p / (0.370486 * (t + 459.67)) - 1) / 1.607858;
      let lo = tA - 80, hi = t0;
      for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (Wv(mid) > Psy.Ws(mid, p)) lo = mid; else hi = mid; }
      let d = '';
      for (let i = 0; i <= 8; i++) { const t = t0 + (hi - t0) * i / 8; d += (i ? 'L' : 'M') + P2(t, Wv(t)); }
      g += `<path d="${d}" fill="none" stroke="var(--c-v)" stroke-width="0.9" ${CU}/>`;
      if (X(t0) > m.l + 20 && X(t0) < m.l + pw - 4) lab += `<text x="${X(t0) - 3}" y="${Y(0) - 5}" text-anchor="end" font-size="9.5" fill="var(--c-v)">${vd.toFixed(si ? 2 : 1)}</text>`;
    }
    // wet bulb lines
    const wbStep = si ? 2.5 : 5;
    for (let wd = Math.ceil(out('t', tA) / wbStep) * wbStep; wd <= out('t', tB) + 1e-9; wd += wbStep) {
      const tw = tF(wd), ws = Psy.Ws(tw, p);
      if (ws > Wtop) break;
      const t0 = tw + (tw >= 32 ? (1093 - 0.556 * tw) : (1220 - 0.04 * tw)) * ws / 0.240;
      let d = '';
      for (let i = 0; i <= 6; i++) { const t = tw + (t0 - tw) * i / 6; d += (i ? 'L' : 'M') + P2(t, Math.max(0, Psy.W_dbwb(t, tw, p))); }
      g += `<path d="${d}" fill="none" stroke="var(--c-wb)" stroke-width="0.8" stroke-dasharray="4 3" ${CU}/>`;
    }
    // enthalpy lines with a scale beyond saturation
    const hFn = (t, W) => si ? Psy.hSI(t, W) : Psy.h(t, W);
    const Wh = (hv, t) => { if (si) { const c = (t - 32) / 1.8; return (hv - 1.006 * c) / (2501 + 1.86 * c); } return (hv - 0.240 * t) / (1061 + 0.444 * t); };
    const hStep = si ? 10 : 5;
    const hLo = hFn(tA, 0), hHi = hFn(tB, Math.min(Wtop, Psy.Ws(tB, p)));
    let hLabelled = 0;
    for (let hv = Math.ceil(hLo / hStep) * hStep; hv <= hHi; hv += hStep) {
      const t0 = si ? (hv / 1.006) * 1.8 + 32 : hv / 0.240;
      let lo = tA - 120, hi = t0;
      for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (Wh(hv, mid) > Psy.Ws(mid, p)) lo = mid; else hi = mid; }
      const ts = hi, Ws_ = Psy.Ws(ts, p);
      let d = '';
      for (let i = 0; i <= 6; i++) { const t = ts + (t0 - ts) * i / 6; d += (i ? 'L' : 'M') + P2(t, Math.max(0, Wh(hv, t))); }
      g += `<path d="${d}" fill="none" stroke="var(--c-h)" stroke-width="0.8" ${CU}/>`;
      const sx = X(ts), sy = Y(Ws_);
      if (inPlot(sx, sy) && sy > m.t + 10 && sx > m.l + 30) {
        const bx = X(t0), by = Y(0), L = Math.hypot(sx - bx, sy - by), ux = (sx - bx) / L, uy = (sy - by) / L;
        const ex = sx + ux * 24, ey = sy + uy * 24;
        if (ex > m.l + 4 && ey > m.t + 4) {
          g += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="var(--c-h)" stroke-width="0.8" opacity=".8"/>`;
          lab += `<text x="${ex + ux * 3}" y="${ey + uy * 3 + 3}" text-anchor="end" font-size="9.5" fill="var(--c-h)">${hv}</text>`;
          hLabelled++;
        }
      }
    }
    // relative humidity curves
    for (const r of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      let d = '';
      for (let i = 0; i <= 90; i++) { const t = tA + (tB - tA) * i / 90, e = r * Psy.pws(t), w = 0.621945 * e / (p - e); d += (i ? 'L' : 'M') + P2(t, w); }
      g += `<path d="${d}" fill="none" stroke="var(--c-rh)" stroke-width="1" ${CR}/>`;
      // label where the curve leaves the top or at the right edge
      let tl = tB; const wR = 0.621945 * r * Psy.pws(tB) / (p - r * Psy.pws(tB));
      if (wR > Wtop) { let lo = tA, hi = tB; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2, e = r * Psy.pws(mid); (0.621945 * e / (p - e) > Wtop ? hi = mid : lo = mid); } tl = lo - (tB - tA) * 0.014; }
      const e = r * Psy.pws(tl), lx = X(tl), ly = Y(0.621945 * e / (p - e));
      if (lx > m.l + 40) lab += `<text x="${lx - 3}" y="${ly + 12}" text-anchor="end" font-size="10" fill="var(--muted)">${Math.round(r * 100)}%</text>`;
    }
    // saturation curve + temperature scale on it
    g += `<path d="${satD}" fill="none" stroke="var(--c-sat)" stroke-width="1.8"/>`;
    for (let x = Math.ceil(xLo / xs) * xs; x <= xHi; x += xs) {
      const t = tF(x), w = Psy.Ws(t, p); if (w > Wtop) break;
      const sx = X(t), sy = Y(w);
      if (sx > m.l + 14) {
        g += `<circle cx="${sx}" cy="${sy}" r="1.8" fill="var(--c-sat)"/>`;
        lab += `<text x="${sx - 5}" y="${sy - 4}" text-anchor="end" font-size="10" fill="var(--c-sat)">${x}</text>`;
      }
    }
    // captions
    lab += `<text x="${m.l + 10}" y="${m.t + 18}" font-size="10.5" fill="var(--c-h)">Enthalpy, ${U('h')} dry air</text>`;
    lab += `<text x="${m.l + 10}" y="${m.t + 33}" font-size="10.5" fill="var(--c-sat)">Saturation (wet bulb / dew point), ${U('t')}</text>`;
    lab += `<text x="${m.l + 10}" y="${m.t + 48}" font-size="10.5" fill="var(--c-v)">Specific volume, ${U('vol')} (along bottom)</text>`;
    lab += `<text x="${m.l + pw / 2}" y="${H0 - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">Dry bulb, ${U('t')}</text>`;
    lab += `<text transform="translate(${W0 - 10},${m.t + ph / 2}) rotate(90)" text-anchor="middle" font-size="12" fill="var(--muted)">Humidity ratio, ${U('W')} dry air</text>`;

    // ---- overlays ----
    let ov = '';
    const placed = [];
    const tag = (x, y, text, anchor, col) => {
      const w = text.length * 6.4 + 8, h = 15;
      let rx = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
      rx = Math.max(2, Math.min(W0 - w - 2, rx));
      let ry = Math.max(2, Math.min(H0 - h - 2, y - 11));
      const hit = (bx, by) => placed.some(b => bx < b.x + b.w + 3 && bx + w + 3 > b.x && by < b.y + b.h + 2 && by + h + 2 > b.y);
      for (let i = 0; i < 12 && hit(rx, ry); i++) ry = ry - 18 >= 2 ? ry - 18 : ry + 18 * (i + 1);
      placed.push({ x: rx, y: ry, w, h });
      return `<rect x="${rx}" y="${ry}" width="${w}" height="${h}" rx="3" fill="var(--surface)" stroke="${col}" stroke-width="1"/><text x="${rx + w / 2}" y="${ry + 11}" text-anchor="middle" font-size="10.5" font-weight="500" fill="${col}">${text}</text>`;
    };
    for (const sg of cfg.segs || []) {
      ov += `<line x1="${X(sg.a.t)}" y1="${Y(sg.a.W)}" x2="${X(sg.b.t)}" y2="${Y(sg.b.W)}" stroke="${sg.col}" stroke-width="1.6" ${sg.dash ? 'stroke-dasharray="6 4"' : ''} ${CR}/>`;
    }
    let tags = '';
    for (const q of cfg.points) {
      if (!Number.isFinite(q.t) || !Number.isFinite(q.W)) continue;
      const col = q.col || 'var(--accent)', px = X(q.t), py = Y(q.W);
      if (q.full) {
        const pr = Psy.props(q.t, q.W, p, si);
        const G = `stroke="${col}" stroke-width="1.3" fill="none" opacity=".85"`;
        // dry bulb
        ov += `<line x1="${px}" y1="${py}" x2="${px}" y2="${Y(0)}" ${G} stroke-dasharray="3 3"/>`;
        tags += tag(px, Y(0) - 8, `DB ${show('t', q.t)}`, 'middle', col);
        // humidity ratio: from dew point on saturation to the right axis
        ov += `<line x1="${X(pr.DP)}" y1="${py}" x2="${m.l + pw}" y2="${py}" ${G} stroke-dasharray="3 3" ${CR}/>`;
        tags += tag(m.l + pw + 3, py + 4, `${show('W', q.W)}`, 'start', col);
        if (X(pr.DP) > m.l + 2) tags += tag(X(pr.DP) - 6, py + 4, `DP ${show('t', pr.DP)}`, 'end', col);
        // relative humidity curve through the point
        if (pr.RH > 0.005) {
          let d = ''; for (let i = 0; i <= 60; i++) { const t = tA + (tB - tA) * i / 60, e = pr.RH * Psy.pws(t); d += (i ? 'L' : 'M') + P2(t, 0.621945 * e / (p - e)); }
          ov += `<path d="${d}" stroke="${col}" stroke-width="1" fill="none" opacity=".35" ${CR}/>`;
        }
        // wet bulb line to saturation
        let d = ''; for (let i = 0; i <= 8; i++) { const t = q.t + (pr.WB - q.t) * i / 8; d += (i ? 'L' : 'M') + P2(t, Math.max(0, Psy.W_dbwb(t, pr.WB, p))); }
        ov += `<path d="${d}" ${G} stroke-dasharray="5 3"/>`;
        const wx = X(pr.WB), wy = Y(Psy.Ws(pr.WB, p));
        if (inPlot(wx, wy)) tags += tag(wx + 6, wy - 8, `WB ${show('t', pr.WB)}`, 'start', col);
        // enthalpy: point → saturation → scale
        const hv = pr.h, t0h = si ? (hv / 1.006) * 1.8 + 32 : hv / 0.240;
        let lo = tA - 120, hi = q.t; for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (Wh(hv, mid) > Psy.Ws(mid, p)) lo = mid; else hi = mid; }
        const sx = X(hi), sy = Y(Psy.Ws(hi, p)), bx = X(t0h), by = Y(0), L = Math.hypot(sx - bx, sy - by), ux = (sx - bx) / L, uy = (sy - by) / L;
        const ex = sx + ux * 30, ey = sy + uy * 30;
        ov += `<path d="M${px},${py}L${sx},${sy}L${ex},${ey}" ${G}/>`;
        if (inPlot(ex, ey)) tags += tag(ex - 2, ey - 2, `h ${show('h', hv)}`, 'end', col);
        // specific volume through the point, down to the bottom
        const t0v = pr.v * p / 0.370486 - 459.67;
        ov += `<line x1="${px}" y1="${py}" x2="${X(t0v)}" y2="${Y(0)}" ${G} stroke-dasharray="1.5 2.5" ${CR}/>`;
        if (X(t0v) < m.l + pw - 30) tags += tag(X(t0v) + 4, Y(0) - 26, `v ${show('vol', pr.v)}`, 'start', col);
      }
      ov += `<circle cx="${px}" cy="${py}" r="${q.full ? 6.5 : 6}" fill="${col}" stroke="var(--surface)" stroke-width="2"/>`;
      if (q.label) ov += `<text x="${px + (q.lx ?? 0)}" y="${py + (q.ly ?? -12)}" text-anchor="middle" font-size="12" font-weight="600" fill="${col}">${q.label}</text>`;
    }
    s += g + `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="var(--line)"/>` + lab + ov + tags;
    svg.innerHTML = s;
    svg._map = { m, pw, ph, xLo, xHi, yHi, tF, p };
    if (!svg._wired) {
      svg._wired = true;
      const toState = e => {
        const M = svg._map; if (!M) return null;
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const ctm = svg.getScreenCTM(); if (!ctm) return null;
        const q = pt.matrixTransform(ctm.inverse());
        if (q.x < M.m.l || q.x > M.m.l + M.pw || q.y < M.m.t || q.y > M.m.t + M.ph) return null;
        const t = M.tF(M.xLo + (q.x - M.m.l) / M.pw * (M.xHi - M.xLo));
        const W = inn('W', (M.m.t + M.ph - q.y) / M.ph * M.yHi);
        if (W < 0 || W > Psy.Ws(t, M.p)) return null;
        return { t, W };
      };
      svg.addEventListener('pointermove', e => {
        const st = toState(e), el = svg._hover; if (!el) return;
        el.textContent = st ? `DB ${show('t', st.t)} ${U('t')} · W ${show('W', st.W)} ${U('W')} · RH ${fx(Psy.rh(st.t, st.W, svg._map.p) * 100, 0)}%` : svg._hoverIdle || '';
      });
      svg.addEventListener('pointerleave', () => { if (svg._hover) svg._hover.textContent = svg._hoverIdle || ''; });
      svg.addEventListener('click', e => { const st = toState(e); if (st && svg._pick) svg._pick(st.t, st.W); });
    }
    svg._pick = cfg.onPick || null;
    svg._hover = cfg.hoverEl || null;
    svg._hoverIdle = cfg.hoverIdle || '';
  }

  // ======================= global settings + tabs =======================
  const tabs = ['psych', 'mix', 'duct', 'calcs'];
  function setTab(t) {
    if (!tabs.includes(t)) t = 'psych';
    S.tab = t; save();
    for (const a of $('tabs').querySelectorAll('a')) a.setAttribute('aria-selected', String(a.dataset.tab === t));
    const nav = $('tabs'), act = nav.querySelector(`a[data-tab="${t}"]`);
    if (act && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, act.offsetLeft - nav.offsetLeft - 16);
    for (const k of tabs) $('tab-' + k).hidden = k !== t;
    render[t]();
  }
  $('tabs').addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    try { history.replaceState(null, '', '#' + a.dataset.tab); } catch (err) {}
    setTab(a.dataset.tab);
  });
  window.addEventListener('hashchange', () => setTab(location.hash.slice(1)));
  function fillGlobal() {
    for (const b of $('g-units').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === S.units));
    $('g-elev').value = inVal('z', num(S.elev));
    document.querySelectorAll('[data-u]').forEach(el => el.textContent = U(el.dataset.u));
  }
  function showPressure() {
    const ok = S.elev > -1500 && S.elev < 30000;
    $('g-elev').classList.toggle('bad', !ok);
    $('g-p').textContent = ok ? `${show('pr', P())} ${U('pr')}` : 'elevation out of range';
    return ok;
  }
  $('g-units').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.v === S.units) return;
    // enthalpy is stored in the display system: carry it across using the last solved state
    if (psyLast) S.psy.vals.h = b.dataset.v === 'SI' ? psyLast.hSI : psyLast.hIP;
    S.units = b.dataset.v; save(); fillGlobal();
    psyFill(true); mixFill(); ductFill(true); hcBuildAll();
    render[S.tab]();
  });
  $('g-elev').addEventListener('input', e => { const x = parseFloat(e.target.value); S.elev = Number.isFinite(x) ? inn('z', x) : NaN; save(); render[S.tab](); });

  // ======================= PSYCHROMETRICS =======================
  const PV = [
    { k: 'DB', name: 'Dry bulb', kind: 't' },
    { k: 'WB', name: 'Wet bulb', kind: 't' },
    { k: 'DP', name: 'Dew point', kind: 't' },
    { k: 'RH', name: 'Relative humidity', kind: 'rh' },
    { k: 'W', name: 'Humidity ratio', kind: 'W' },
    { k: 'h', name: 'Enthalpy', kind: 'h' },
    { k: 'v', name: 'Specific volume', kind: 'vol' },
  ];
  const PN = Object.fromEntries(PV.map(v => [v.k, v.name.toLowerCase()]));
  let psyLast = null;
  $('p-calc').innerHTML = PV.map(v => `
    <div class="var" id="p-v-${v.k}">
      <div class="top"><span class="name">${v.name} <span class="unit" data-u="${v.kind}"></span></span><button type="button" class="pin" data-k="${v.k}"></button></div>
      <input type="number" id="p-${v.k}" data-k="${v.k}" step="any" inputmode="decimal" aria-label="${v.name}">
      <div class="sub" id="p-sub-${v.k}"></div>
    </div>`).join('') + `
    <div class="var info" id="p-site">
      <div class="top"><span class="name">Site pressure <span class="unit" data-u="pr"></span></span></div>
      <div class="big-num" id="p-site-p"></div>
      <div class="sub" id="p-site-z"></div>
    </div>`;
  function psyPromote(k) {
    let pins = S.psy.pins.filter(x => x !== k); pins.push(k);
    for (const [a, b] of Psy.DEPENDENT) { if (k === a) pins = pins.filter(x => x !== b); if (k === b) pins = pins.filter(x => x !== a); }
    while (pins.length > 2) pins.shift();
    S.psy.pins = pins;
  }
  function psyFill(force) {
    for (const v of PV) {
      const el = $('p-' + v.k), pinned = S.psy.pins.includes(v.k);
      if (!pinned || force) el.value = inVal(v.kind, num(S.psy.vals[v.k]));
      el.classList.toggle('calcd', !pinned);
    }
  }
  for (const v of PV) {
    $('p-' + v.k).addEventListener('input', e => {
      const x = parseFloat(e.target.value);
      S.psy.vals[v.k] = Number.isFinite(x) ? inn(v.kind, x) : NaN;
      psyPromote(v.k); save(); renderPsy();
    });
  }
  $('p-calc').addEventListener('click', e => {
    const b = e.target.closest('.pin'); if (!b) return;
    const k = b.dataset.k;
    if (S.psy.pins.includes(k)) S.psy.pins = S.psy.pins.filter(x => x !== k); else psyPromote(k);
    save(); renderPsy();
  });
  $('p-reset').addEventListener('click', () => { S.psy = clone(DEF.psy); psyLast = null; save(); psyFill(true); renderPsy(); });
  const pickPsy = (t, W) => { S.psy.vals.DB = t; S.psy.vals.W = W; S.psy.pins = ['DB', 'W']; save(); psyFill(true); renderPsy(); };

  function renderPsy() {
    const pins = S.psy.pins, V = S.psy.vals, errs = [];
    for (const v of PV) $('p-' + v.k).classList.remove('bad');
    const okP = showPressure(); if (!okP) errs.push('Set a site elevation between −1,500 and 30,000 ft.');
    $('p-site-p').textContent = okP ? show('pr', P()) : '—';
    $('p-site-z').textContent = okP ? `at ${show('z', S.elev)} ${U('z')} elevation` : '';
    for (const k of pins) {
      const x = num(V[k]);
      let bad = !Number.isFinite(x);
      if (k === 'RH' && !(x > 0 && x <= 1)) bad = true;
      if (k === 'W' && !(x >= 0)) bad = true;
      if (k === 'v' && !(x > 0)) bad = true;
      if (['DB', 'WB', 'DP'].includes(k) && !(x > -100 && x < 250)) bad = true;
      if (bad) { $('p-' + k).classList.add('bad'); errs.push(`Enter a valid ${PN[k]}${k === 'RH' ? ' (above 0 and up to 100%)' : ''}.`); }
    }
    if (pins.length < 2) errs.push(pins.length ? `Enter one more property. Currently using ${PN[pins[0]]} only.` : 'Enter two properties.');
    let r = null;
    if (!errs.length) {
      r = Psy.solve(Object.fromEntries(pins.map(k => [k, V[k]])), P(), SI());
      if (r.error) { errs.push(r.error); pins.forEach(k => $('p-' + k).classList.add('bad')); r = null; }
    }
    for (const v of PV) {
      const box = $('p-v-' + v.k), pinned = pins.includes(v.k);
      box.classList.toggle('pinned', pinned);
      const b = box.querySelector('.pin'); b.textContent = pinned ? 'Input' : 'Calculated';
      b.title = pinned ? 'Click to release this value' : 'Click to keep this value as an input';
    }
    $('p-err').hidden = !errs.length; $('p-err').textContent = errs.join(' ');
    if (!r) {
      for (const v of PV) if (!pins.includes(v.k)) { $('p-' + v.k).value = ''; $('p-sub-' + v.k).textContent = ''; }
      $('p-mode').textContent = '';
      $('p-more').innerHTML = '<p class="note">Properties appear once two valid values are entered.</p>';
      psyChart($('p-chart'), { points: [], onPick: pickPsy, hoverEl: $('p-hover'), hoverIdle: 'Click the chart to set dry bulb and humidity ratio.' });
      $('p-chartsub').textContent = okP ? `at ${show('pr', P())} ${U('pr')}` : '';
      return;
    }
    const pr = r.P; psyLast = pr;
    for (const v of PV) if (!pins.includes(v.k)) V[v.k] = pr[v.k];
    save(); psyFill(false);
    $('p-sub-DB').textContent = ''; $('p-sub-WB').textContent = `depression ${fx(out('t', pr.DB) - out('t', pr.WB), 1)}`;
    $('p-sub-DP').textContent = ''; $('p-sub-RH').textContent = `μ ${fx(pr.mu * 100, 1)}%`;
    $('p-sub-W').textContent = `${fx(pr.W, 5)} ${U('Wd')}`;
    $('p-sub-h').textContent = SI() ? `${fx(pr.hIP, 2)} Btu/lb (IP ref.)` : `${fx(pr.hSI, 2)} kJ/kg (SI ref.)`;
    $('p-sub-v').textContent = `ρ ${show('rho', pr.rho)} ${U('rho')}`;
    const solved = PV.filter(v => !pins.includes(v.k)).length;
    $('p-mode').textContent = `Calculating ${solved} properties from ${PN[pins[0]]} and ${PN[pins[1]]}.`;
    $('p-more').innerHTML = `<div class="eyebrow">State point</div>
      <div class="big"><div><div class="v">${show('t', pr.DB)}<small>${U('t')}</small></div></div><div><div class="v" style="color:var(--ink)">${fx(pr.RH * 100, 1)}<small>% RH</small></div></div></div>
      <dl class="props">` +
      row('Wet bulb', val('t', pr.WB)) + row('Dew point', val('t', pr.DP)) +
      row('Humidity ratio', val('W', pr.W)) + row('Enthalpy', val('h', pr.h)) +
      row('Specific volume', val('vol', pr.v)) + row('Moist air density', val('rho', pr.rho)) +
      row('Vapor pressure', val('pw', pr.pw)) + row('Saturation humidity ratio', val('W', pr.Ws)) +
      row('Degree of saturation', fx(pr.mu * 100, 1) + '<small>%</small>') +
      row('Barometric pressure', val('pr', P())) + `</dl>
      ${pr.DB < 32 ? '<p class="note">Below freezing, saturation and wet bulb are taken over ice.</p>' : ''}`;
    $('p-chartsub').textContent = `at ${show('pr', P())} ${U('pr')}`;
    psyChart($('p-chart'), { points: [{ t: pr.DB, W: pr.W, full: true }], onPick: pickPsy, hoverEl: $('p-hover'), hoverIdle: 'Click the chart to set dry bulb and humidity ratio.' });
  }

  // ======================= MIXED AIR =======================
  function buildStream(i) {
    const el = $('m-s' + i), L = 'AB'[i];
    el.innerHTML = `
      <div class="card-head"><span class="tag">${L}</span><input type="text" class="sname" id="m-n${i}" aria-label="Stream ${L} name"></div>
      <div class="inputs3">
        <div class="field"><label for="m-q${i}">Flow <span class="unit" data-u="q"></span></label><input type="number" id="m-q${i}" step="any" min="0" inputmode="decimal"></div>
        <div class="field"><label for="m-t${i}">Dry bulb <span class="unit" data-u="t"></span></label><input type="number" id="m-t${i}" step="any" inputmode="decimal"></div>
        <div class="field"><label for="m-w${i}">Wet bulb <span class="unit" data-u="t"></span></label><input type="number" id="m-w${i}" step="any" inputmode="decimal"></div>
      </div>
      <p class="err" id="m-e${i}" hidden></p>
      <dl class="props" id="m-p${i}"></dl>`;
    $('m-n' + i).addEventListener('input', e => { S.mix.streams[i].name = e.target.value; save(); renderMix(); });
    for (const [k, id, kind] of [['q', 'q', 'q'], ['t', 't', 't'], ['tw', 'w', 't']]) {
      $(`m-${id}${i}`).addEventListener('input', e => { const x = parseFloat(e.target.value); S.mix.streams[i][k] = Number.isFinite(x) ? inn(kind, x) : NaN; save(); renderMix(); });
    }
  }
  [0, 1].forEach(buildStream);
  function mixFill() {
    S.mix.streams.forEach((s, i) => {
      $('m-n' + i).value = s.name;
      $('m-q' + i).value = inVal('q', num(s.q)); $('m-t' + i).value = inVal('t', num(s.t)); $('m-w' + i).value = inVal('t', num(s.tw));
    });
    $('m-ct').value = inVal('t', num(S.mix.coil.t)); $('m-cw').value = inVal('t', num(S.mix.coil.tw));
    for (const b of $('m-basis').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === S.mix.basis));
    document.querySelectorAll('[data-u]').forEach(el => el.textContent = U(el.dataset.u));
  }
  for (const [id, k] of [['m-ct', 't'], ['m-cw', 'tw']]) $(id).addEventListener('input', e => { const x = parseFloat(e.target.value); S.mix.coil[k] = Number.isFinite(x) ? inn('t', x) : NaN; save(); renderMix(); });
  $('m-basis').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.mix.basis = b.dataset.v; save(); mixFill(); renderMix(); });

  // ASHRAE Handbook—Fundamentals 2021 (IP), period 1994–2019. c: 0.4% cooling DB/MCWB °F; e: 0.4% enthalpy Btu/lb / MCDB °F; heat: 99.6% DB °F
  const DESIGN = [
    { name: 'San Antonio Intl', code: 'SAT', wmo: '722530', elev: 789, p: 14.28, c: [99.3, 73.6], e: [42.0, 88.2], heat: 30.0 },
    { name: 'Houston Bush Intl', code: 'IAH', wmo: '722430', elev: 95, p: 14.65, c: [97.6, 76.6], e: [43.7, 88.6], heat: 31.4 },
    { name: 'Austin-Bergstrom', code: 'AUS', wmo: '722540', elev: 480, p: 14.44, c: [100.3, 74.3], e: [42.5, 89.5], heat: 26.6 },
  ];
  const enthState = d => { const t = d.e[1], W = (d.e[0] - 0.240 * t) / (1061 + 0.444 * t); return { t, W, wb: Psy.wb(t, W, d.p) }; };
  function renderDesign() {
    const A = S.mix.streams[0], near = (x, y) => Math.abs(num(x) - y) < 0.05;
    const hd = (k, x, d) => `${show(k, x, d)}<small>${U(k)}</small>`;
    $('m-design').innerHTML = `<thead><tr><th>Location</th><th>Elevation</th>
        <th>Cooling 0.4%<small>DB / MCWB</small></th><th>Enthalpy 0.4%<small>h / MCDB</small></th><th>Heating 99.6%<small>DB</small></th></tr></thead><tbody>` +
      DESIGN.map((d, i) => {
        const es = enthState(d), hv = SI() ? Psy.hSI(es.t, es.W) : d.e[0];
        const onC = near(A.t, d.c[0]) && near(A.tw, d.c[1]), onE = near(A.t, es.t) && near(A.tw, es.wb);
        return `<tr><td><span class="loc">${d.name} (${d.code})</span><span class="wmo">WMO ${d.wmo}</span></td>
          <td>${show('z', d.elev)}<small>${U('z')}</small></td>
          <td><button type="button" class="dc-pick${onC ? ' on' : ''}" data-dc="${i}" data-k="c" title="Set stream A to ${show('t', d.c[0])} DB / ${show('t', d.c[1])} WB">${show('t', d.c[0])} / ${show('t', d.c[1])}<small>${U('t')}</small></button></td>
          <td><button type="button" class="dc-pick${onE ? ' on' : ''}" data-dc="${i}" data-k="e" title="Set stream A to ${show('t', es.t)} DB / ${show('t', es.wb)} WB (WB at station pressure)">${fx(hv, 1)}<small>${U('h')}</small> / ${show('t', d.e[1])}<small>${U('t')}</small></button></td>
          <td>${hd('t', d.heat)}</td></tr>`;
      }).join('') + `</tbody>`;
  }
  $('m-design').addEventListener('click', e => {
    const b = e.target.closest('.dc-pick'); if (!b) return;
    const d = DESIGN[+b.dataset.dc], A = S.mix.streams[0];
    if (b.dataset.k === 'c') { A.t = d.c[0]; A.tw = d.c[1]; }
    else { const es = enthState(d); A.t = es.t; A.tw = +es.wb.toFixed(2); }
    save(); mixFill(); renderMix();
  });

  function renderMix() {
    renderDesign();
    const okP = showPressure(), p = P();
    let ok = okP;
    S.mix.streams.forEach((s, i) => {
      const msgs = [];
      const q = num(s.q), t = num(s.t), tw = num(s.tw);
      const bq = !(q > 0); if (bq) msgs.push('Flow must be greater than zero.');
      const bt = !(t > -100 && t < 250); if (bt) msgs.push('Enter a dry bulb temperature.');
      let bw = !(tw > -100 && tw < 250);
      if (bw) msgs.push('Enter a wet bulb temperature.');
      else if (!bt && tw > t + 1e-9) { bw = true; msgs.push('Wet bulb cannot be higher than dry bulb.'); }
      else if (!bt && okP && Psy.W_dbwb(t, tw, p) < 0) { bw = true; msgs.push('Wet bulb is too low for this dry bulb.'); }
      $('m-q' + i).classList.toggle('bad', bq); $('m-t' + i).classList.toggle('bad', bt); $('m-w' + i).classList.toggle('bad', bw);
      $('m-e' + i).hidden = !msgs.length; $('m-e' + i).textContent = msgs.join(' ');
      if (msgs.length) ok = false;
    });
    const nm = i => esc(S.mix.streams[i].name || 'Stream ' + 'AB'[i]);
    $('m-legend').innerHTML = `<span style="--c:var(--a)"><i class="dot"></i>A · ${nm(0)}</span><span style="--c:var(--b)"><i class="dot"></i>B · ${nm(1)}</span><span style="--c:var(--accent)"><i class="dot"></i>M · Mixed</span><span style="--c:var(--coil)"><i class="dot"></i>C · Coil leaving</span>`;
    $('m-chartsub').textContent = okP ? `at ${show('pr', p)} ${U('pr')}` : '';
    if (!ok) {
      $('m-out').innerHTML = '<p class="note">Fix the highlighted inputs to see the mixed state.</p>';
      [0, 1].forEach(i => $('m-p' + i).innerHTML = '');
      $('m-coilout').innerHTML = '<p class="note">Coil results appear once the mixed state is valid.</p>'; $('m-ce').hidden = true;
      psyChart($('m-chart'), { points: [] }); return;
    }
    const R = Psy.mix(S.mix.streams.map(s => ({ q: s.q, t: s.t, tw: s.tw })), p, S.mix.basis);
    const M = R.mix;
    R.streams.forEach((st, i) => {
      $('m-p' + i).innerHTML = row('Humidity ratio', val('W', st.W)) + row('Relative humidity', fx(st.rh * 100, 1) + '<small>%</small>') +
        row('Dew point', val('t', st.dp)) + row('Enthalpy', val('h', SI() ? Psy.hSI(st.t, st.W) : st.h)) +
        row('Specific volume', val('vol', st.v)) + row('Dry-air mass flow', val('m', st.m)) + row('Share of mass', fx(st.m / M.m * 100, 1) + '<small>%</small>');
    });
    const dT = out('t', M.t) - out('t', M.tSimple);
    const qMix = S.mix.basis === 'actual' ? M.qActual : M.qStd;
    let html = `<div class="big">
        <div><div class="eyebrow">Dry bulb</div><div class="v">${show('t', M.t)}<small>${U('t')}</small></div></div>
        <div><div class="eyebrow">Wet bulb</div><div class="v">${show('t', M.wb)}<small>${U('t')}</small></div></div></div>`;
    if (M.fog) html += `<p class="fog"><strong>Mixture fogs.</strong> The mixing line crosses saturation. Shown is the equilibrium: saturated air plus ${show('W', M.fog.liquid)} ${U('W')} of liquid water (${show('m', M.fog.liquid * M.m)} ${U('m')} condensed).</p>`;
    html += `<dl class="props">` +
      row('Humidity ratio' + (M.fog ? ' (vapor)' : ''), val('W', M.W)) + row('Relative humidity', fx(M.rh * 100, 1) + '<small>%</small>') +
      row('Dew point', val('t', M.dp)) + row('Enthalpy', val('h', SI() ? Psy.hSI(M.t, M.Wtotal) : M.h)) +
      row('Specific volume', val('vol', M.v)) + row('Dry-air mass flow', val('m', M.m)) +
      row(S.mix.basis === 'actual' ? 'Mixed flow (actual)' : 'Mixed flow (standard)', val('q', qMix)) +
      row('Stream A fraction (mass)', fx(R.streams[0].m / M.m * 100, 1) + '<small>%</small>') + `</dl>
      <p class="note">A CFM-weighted average gives ${show('t', M.tSimple, 2)} ${U('t')}, ${fx(Math.abs(dT), 2)} ${U('t').replace('°', '')} ${dT >= 0 ? 'below' : 'above'} the mass/enthalpy result.` +
      (S.mix.basis === 'actual' ? ` Actual volume is not conserved: ${show('q', qMix)} ${U('q')} leaves vs. ${show('q', M.qSum)} ${U('q')} entering.` : '') + `</p>
      <button type="button" class="btn" id="m-toPsy" style="justify-self:start">Open mixed state in Psychrometrics</button>`;
    $('m-out').innerHTML = html;
    $('m-toPsy').onclick = () => { pickPsyFromMix(M.t, M.W); };
    const [a, b] = R.streams;
    const segs = [{ a: { t: a.t, W: a.W }, b: { t: b.t, W: b.W }, col: 'var(--muted)', dash: true }];
    const pts = [{ t: a.t, W: a.W, col: 'var(--a)', label: 'A' }, { t: b.t, W: b.W, col: 'var(--b)', label: 'B' }];
    if (M.fog) { segs.push({ a: { t: M.tLine, W: M.Wtotal }, b: { t: M.t, W: M.W }, col: 'var(--warn)' }); pts.push({ t: M.tLine, W: M.Wtotal, col: 'var(--warn)' }); }
    pts.push({ t: M.t, W: M.W, col: 'var(--accent)', label: 'M', ly: 22, full: true });
    // ---- cooling coil ----
    const cs = S.mix.coil, ct = num(cs.t), cw = num(cs.tw), cerr = [];
    $('m-ct').classList.remove('bad'); $('m-cw').classList.remove('bad');
    if (!(ct > -60 && ct < 200)) { $('m-ct').classList.add('bad'); cerr.push('Enter a leaving dry bulb.'); }
    if (!(cw > -60 && cw < 200)) { $('m-cw').classList.add('bad'); cerr.push('Enter a leaving wet bulb.'); }
    else if (!cerr.length && cw > ct + 1e-9) { $('m-cw').classList.add('bad'); cerr.push('Wet bulb cannot be higher than dry bulb.'); }
    else if (!cerr.length && Psy.W_dbwb(ct, cw, p) < 0) { $('m-cw').classList.add('bad'); cerr.push('Wet bulb is too low for this dry bulb.'); }
    if (!cerr.length && ct >= M.t) { $('m-ct').classList.add('bad'); cerr.push(`Leaving dry bulb must be below the entering ${show('t', M.t)} ${U('t')} for a cooling coil.`); }
    $('m-ce').hidden = !cerr.length; $('m-ce').textContent = cerr.join(' ');
    if (cerr.length) $('m-coilout').innerHTML = '';
    else {
      const C = Psy.coil({ t: M.t, W: M.Wtotal, h: M.h, m: M.m }, ct, cw, p);
      const tons = C.qT * 60 / 12000;
      let ch = `<div class="big">
          <div><div class="eyebrow">Water removed</div><div class="v">${show('mh', C.cond)}<small>${U('mh')}</small></div></div>
          <div><div class="eyebrow">Condensate</div><div class="v">${show('gph', C.cond)}<small>${SI() ? 'L/h' : 'gal/h'}</small></div></div>
          <div><div class="eyebrow">Total load</div><div class="v" style="color:var(--ink)">${fx(tons, 1)}<small>tons</small></div></div></div>`;
      if (!C.wet) ch += `<p class="warnbox">${C.dW < 0 ? 'Leaving air holds more moisture than the entering air, so this is not a dehumidifying process.' : 'No change in humidity ratio: this is sensible cooling only.'} No condensate.</p>`;
      if (C.rh > 0.98) ch += `<p class="note">Leaving air is at ${fx(C.rh * 100, 0)}% RH, essentially saturated.</p>`;
      ch += `<dl class="props">` +
        row('Condensate', `${show('gph', C.cond)}<small>${U('gph')}</small> · ${show('gpm', C.cond)}<small>${U('gpm')}</small>`) +
        row('Humidity ratio change', `${show('W', Math.max(0, C.dW))}<small>${U('W')}</small>`) +
        row('Total cooling', val('ld', C.qT)) +
        row('Total cooling, tons', `${fx(tons, 2)}<small>tons</small>`) +
        row('Sensible', val('ld', C.qS)) + row('Latent', val('ld', C.qL)) +
        row('Sensible heat ratio', fx(C.shr, 2)) +
        row('Leaving RH', fx(C.rh * 100, 1) + '<small>%</small>') + row('Leaving dew point', val('t', C.dp)) +
        row('Leaving humidity ratio', val('W', C.W2)) +
        (C.adp ? row('Apparatus dew point', val('t', C.adp.t)) + row('Bypass factor', fx(C.bf, 3)) : '') + `</dl>` +
        (C.wet && !C.adp ? `<p class="warnbox">Extended, this coil line never reaches the saturation curve, so a single cooling coil can't produce this leaving state. It removes more moisture than the temperature drop allows; check the leaving wet bulb.</p>` : '') + `
        <button type="button" class="btn" id="m-coilPsy" style="justify-self:start">Open leaving air in Psychrometrics</button>`;
      $('m-coilout').innerHTML = ch;
      $('m-coilPsy').onclick = () => pickPsyFromMix(ct, C.W2);
      segs.push({ a: { t: M.t, W: M.W }, b: { t: ct, W: C.W2 }, col: 'var(--coil)' });
      if (C.adp) { segs.push({ a: { t: ct, W: C.W2 }, b: C.adp, col: 'var(--coil)', dash: true }); pts.push({ t: C.adp.t, W: C.adp.W, col: 'var(--coil)', label: 'ADP', lx: -18, ly: -8 }); }
      pts.push({ t: ct, W: C.W2, col: 'var(--coil)', label: 'C', lx: 12, ly: 16 });
    }
    psyChart($('m-chart'), { points: pts, segs });
  }
  function pickPsyFromMix(t, W) {
    S.psy.vals.DB = t; S.psy.vals.W = W; S.psy.pins = ['DB', 'W']; save(); psyFill(true);
    try { history.replaceState(null, '', '#psych'); } catch (e) {}
    setTab('psych');
  }

  // ======================= DUCT SIZER =======================
  const dIn = [...document.querySelectorAll('#tab-duct input[data-key]')];
  const roundIP = []; for (let d = 3; d <= 12; d++) roundIP.push(d); for (let d = 14; d <= 60; d += 2) roundIP.push(d); roundIP.push(66, 72, 78, 84, 90, 96);
  const roundSI = [63, 80, 100, 112, 125, 140, 160, 180, 200, 224, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000].map(x => x / 25.4);
  const rectIP = []; for (let s = 4; s <= 120; s += 2) rectIP.push(s);
  const rectSI = []; for (let s = 100; s <= 3000; s += 50) rectSI.push(s / 25.4);
  const roundSizes = () => SI() ? roundSI : roundIP, rectSizes = () => SI() ? rectSI : rectIP;
  const dimTxt = d => SI() ? fx(d * 25.4, 0) : fx(d, Math.abs(d - Math.round(d)) < 0.005 ? 0 : 1);
  const secName = sec => sec.shape === 'round' ? `${dimTxt(sec.D)} ${U('d')} round` : `${dimTxt(sec.a)} × ${dimTxt(sec.b)} ${U('d')}`;
  const sizeKey = () => S.duct.shape === 'round' ? 'D' : 'W';
  const DN = { Q: 'airflow', S: 'duct size', V: 'velocity', fr: 'friction rate' };
  const validPins = p => {
    if (new Set(p).size !== p.length) return false;
    if (p.length <= 2) return true;
    if (p.length === 3) return p.includes('V') && p.includes('fr') && (p.includes('Q') !== p.includes('S'));
    return false;
  };
  function ductPromote(v) { const d = S.duct; d.pins = d.pins.filter(k => k !== v); d.pins.push(v); while (!validPins(d.pins)) d.pins.shift(); }
  function ductFill(force) {
    const d = S.duct;
    for (const el of dIn) {
      const v = el.dataset.var;
      if (!v) { if (force) el.value = inVal(el.dataset.kind, num(d[el.dataset.key])); continue; }
      const pinned = d.pins.includes(v);
      if (!pinned || force) el.value = inVal(el.dataset.kind, num(d[el.dataset.key]));
      el.classList.toggle('calcd', !pinned);
    }
    if (force) { $('d-eps').value = inVal('eps', num(d.eps)); $('d-t').value = inVal('t', num(d.tF)); }
    $('d-mat').value = d.mat; $('d-epsWrap').hidden = d.mat !== 'custom';
    for (const g of ['shape', 'airMode']) for (const b of $('d-' + g).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === d[g]));
    $('d-tWrap').hidden = d.airMode !== 'custom';
    document.querySelectorAll('.d-round').forEach(el => el.hidden = d.shape !== 'round');
    document.querySelectorAll('.d-rect').forEach(el => el.hidden = d.shape !== 'rect');
    document.querySelectorAll('[data-u]').forEach(el => el.textContent = U(el.dataset.u));
  }
  for (const el of dIn) el.addEventListener('input', () => {
    const x = parseFloat(el.value);
    S.duct[el.dataset.key] = Number.isFinite(x) ? inn(el.dataset.kind, x) : NaN;
    if (el.dataset.var) ductPromote(el.dataset.var);
    save(); renderDuct();
  });
  $('tab-duct').querySelectorAll('.pin').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.var, d = S.duct;
    if (d.pins.includes(v)) d.pins = d.pins.filter(k => k !== v); else ductPromote(v);
    save(); renderDuct();
  }));
  for (const g of ['shape', 'airMode']) $('d-' + g).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || S.duct[g] === b.dataset.v) return;
    S.duct[g] = b.dataset.v; save(); ductFill(true); renderDuct();
  });
  $('d-mat').addEventListener('change', e => { S.duct.mat = e.target.value; if (S.duct.mat !== 'custom') S.duct.eps = +S.duct.mat; save(); ductFill(true); renderDuct(); });
  $('d-eps').addEventListener('input', e => { const x = parseFloat(e.target.value); S.duct.eps = Number.isFinite(x) ? inn('eps', x) : NaN; save(); renderDuct(); });
  $('d-t').addEventListener('input', e => { const x = parseFloat(e.target.value); S.duct.tF = Number.isFinite(x) ? inn('t', x) : NaN; save(); renderDuct(); });
  $('d-reset').addEventListener('click', () => { S.duct = { ...clone(DEF.duct), mat: S.duct.mat, eps: S.duct.eps, airMode: S.duct.airMode, tF: S.duct.tF }; save(); ductFill(true); renderDuct(); });

  let dPlot = null, dLim = {};
  function renderDuct() {
    const d = S.duct, errs = [];
    dIn.forEach(el => el.classList.remove('bad')); $('d-eps').classList.remove('bad'); $('d-t').classList.remove('bad');
    const bad = (id, msg) => { $(id).classList.add('bad'); errs.push(msg); };
    const eps = d.mat === 'custom' ? num(d.eps) : +d.mat;
    if (d.mat === 'custom' && !(eps >= 0 && eps < 0.1)) bad('d-eps', 'Enter a roughness of zero or more.');
    let air;
    if (d.airMode === 'custom') {
      if (!(d.tF > -60 && d.tF < 400)) bad('d-t', 'Air temperature looks out of range.');
      if (!showPressure()) errs.push('Set a site elevation between −1,500 and 30,000 ft.');
      air = Duct.air(num(d.tF), S.elev);
    } else { air = { ...Duct.STD, p: 14.696 }; showPressure(); }
    $('d-air').textContent = Number.isFinite(air.rho) ? `ρ = ${show('rho', air.rho)} ${U('rho')}${d.airMode === 'custom' ? ` at ${show('z', S.elev)} ${U('z')}` : ''}` : '';
    if (d.shape === 'rect' && !(d.H > 0)) bad('d-H', 'Enter the fixed duct height.');
    const Pn = d.pins, has = k => Pn.includes(k);
    if (has('Q') && !(d.Q > 0)) bad('d-Q', 'Enter an airflow greater than zero.');
    if (has('S') && !(d[sizeKey()] > 0)) bad('d-' + sizeKey(), 'Enter a duct size greater than zero.');
    if (has('V') && !(d.V > 0)) bad('d-V', 'Enter a velocity greater than zero.');
    if (has('fr') && !(d.fr > 0)) bad('d-fr', 'Enter a friction rate greater than zero.');
    if (Pn.length < 2) errs.push(`Enter one more value.${Pn.length ? ' Currently using ' + DN[Pn[0]] + ' only.' : ''}`);
    for (const v of ['Q', 'S', 'V', 'fr']) {
      const box = $('d-v-' + v), pinned = has(v), isLim = pinned && Pn.length === 3 && (v === 'V' || v === 'fr');
      box.classList.toggle('pinned', pinned); box.classList.toggle('lim', isLim);
      const b = box.querySelector('.pin'); b.textContent = isLim ? 'Maximum' : pinned ? 'Input' : 'Calculated';
      b.title = pinned ? 'Click to release this value' : 'Click to keep this value as an input';
    }
    $('d-err').hidden = !errs.length; $('d-err').textContent = errs.join(' ');
    dLim = { fr: has('fr') ? d.fr : 0, V: has('V') ? d.V : 0 };
    $('d-chartsub').textContent = `${d.airMode === 'std' ? 'standard air' : 'actual air'}, ε = ${show('eps', eps)} ${U('eps')}`;
    if (errs.length) {
      for (const v of ['Q', 'S', 'V', 'fr']) $('d-sub-' + v).textContent = '';
      ductFill(false); $('d-mode').textContent = '';
      $('d-std').innerHTML = '<p class="note">Results appear once two values are entered.</p>'; $('d-props').innerHTML = '';
      dPlot = null; drawFric(air, eps); return;
    }
    const r = Duct.solve({ shape: d.shape, H: d.H, pins: Pn, eps, air, Q: d.Q, x: d[sizeKey()], V: d.V, fr: d.fr });
    if (!has('Q')) d.Q = r.Q;
    if (!has('S')) d[sizeKey()] = r.x;
    if (!has('V')) d.V = r.c.V;
    if (!has('fr')) d.fr = r.c.fr;
    save(); ductFill(false);
    $('d-sub-Q').textContent = r.gov && !has('Q') ? `limited by ${r.gov}` : '';
    $('d-sub-S').textContent = d.shape === 'rect' ? `${fx(r.c.aspect, 1)}:1 · equiv. ${show('d', r.c.De, SI() ? 0 : 1)} ${U('d')} round` : `area ${show('a', r.c.A)} ${U('a')}`;
    $('d-sub-V').textContent = has('V') && Pn.length === 3 ? `actual ${show('v', r.c.V)}` : `Pv ${show('p', r.c.Pv)} ${U('p')}`;
    $('d-sub-fr').textContent = has('fr') && Pn.length === 3 ? `actual ${show('fr', r.c.fr)}` : '';
    const solved = ['Q', 'S', 'V', 'fr'].filter(k => !has(k)).map(k => DN[k]);
    $('d-mode').innerHTML = Pn.length === 3
      ? `Finding ${solved.join(' and ')} from ${DN[Pn.find(k => k === 'Q' || k === 'S')]}, with velocity and friction as maximums. <strong>${r.gov === 'velocity' ? 'Velocity' : 'Friction'} governs.</strong>`
      : `Calculating ${solved.join(' and ')} from ${DN[Pn[0]]} and ${DN[Pn[1]]}.`;
    const lim = dLim;
    let std = '';
    dPlot = { Q: r.Q, De: r.c.De };
    if (!has('S') && has('Q')) {
      const sizes = d.shape === 'round' ? roundSizes() : rectSizes();
      const xs = Duct.pickStd(d.shape, d.H, r.Q, lim, eps, air, sizes);
      std += `<div class="eyebrow">Standard size for ${show('q', r.Q)} ${U('q')}</div>`;
      if (xs) {
        const c = Duct.check(Duct.secOf(d.shape, xs, d.H), r.Q, eps, air);
        dPlot = { Q: r.Q, De: c.De };
        std += `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap">
          <div class="stdbig">${d.shape === 'round' ? dimTxt(xs) : dimTxt(xs) + '×' + dimTxt(d.H)}<small>${U('d')}${d.shape === 'round' ? ' round' : ''}</small></div>
          <button type="button" class="btn" id="d-useStd">Use this size</button></div>
          <dl class="props">${row('Velocity', val('v', c.V))}${row('Friction rate', val('fr', c.fr))}${row('Velocity pressure', val('p', c.Pv))}</dl>`;
        const i = sizes.indexOf(xs);
        if (i > 0) {
          const c2 = Duct.check(Duct.secOf(d.shape, sizes[i - 1], d.H), r.Q, eps, air);
          const why = [lim.fr > 0 && c2.fr > lim.fr ? `${show('fr', c2.fr)} ${U('fr')}` : '', lim.V > 0 && c2.V > lim.V ? `${show('v', c2.V)} ${U('v')}` : ''].filter(Boolean).join(', ');
          std += `<p class="note">Next size down, ${d.shape === 'round' ? dimTxt(sizes[i - 1]) : dimTxt(sizes[i - 1]) + ' × ' + dimTxt(d.H)} ${U('d')}, runs ${why}.</p>`;
        }
        if (d.shape === 'rect' && c.aspect > 4) std += `<p class="warnbox">${fx(c.aspect, 1)}:1 aspect ratio. Above about 4:1, friction, fitting losses and sheet metal all climb. Try a taller height.</p>`;
        $('d-std').innerHTML = std;
        $('d-useStd').onclick = () => { S.duct[sizeKey()] = xs; S.duct.pins = ['Q', 'S']; save(); ductFill(true); renderDuct(); };
      } else { std += `<p class="warnbox">No standard size up to ${dimTxt(sizes[sizes.length - 1])} ${U('d')} meets the limits${d.shape === 'rect' ? ' at this height' : ''}.</p>`; $('d-std').innerHTML = std; }
    } else {
      std += `<div class="eyebrow">${has('S') ? 'Duct' : 'Solved duct'}</div><div class="stdbig">${d.shape === 'round' ? dimTxt(r.x) : dimTxt(r.x) + ' × ' + dimTxt(d.H)}<small>${U('d')}${d.shape === 'round' ? ' round' : ''}</small></div>`;
      if (!has('S')) std += `<p class="note">Size from velocity and friction alone. Round it to a standard size, then enter airflow to check it.</p>`;
      if (d.shape === 'rect' && r.c.aspect > 4) std += `<p class="warnbox">${fx(r.c.aspect, 1)}:1 aspect ratio. Above about 4:1 the equivalent-diameter method and the duct itself both perform worse.</p>`;
      $('d-std').innerHTML = std;
    }
    const c = r.c;
    let pc = `<div class="eyebrow">At the calculated point</div><dl class="props">` +
      row(`Friction loss over <span class="lenrow"><input type="number" id="d-len" step="any" min="0" inputmode="decimal" aria-label="Run length" value="${inVal('len', num(d.len))}"> ${U('len')}</span>`, `<span id="d-total">${val('p', c.fr * d.len / 100)}</span>`) +
      row('Velocity pressure', val('p', c.Pv)) + row('Area', val('a', c.A)) +
      (d.shape === 'rect' ? row('Equivalent round', val('d', c.De, SI() ? 0 : 2)) + row('Hydraulic diameter', val('d', c.Dh, SI() ? 0 : 2)) + row('Aspect ratio', fx(c.aspect, 2) + ':1') : '') +
      row('Reynolds number', fx(c.Re, 0)) + row('Friction factor', fx(c.f, 4)) + `</dl>`;
    if (!has('S') && has('Q')) {
      const table = Duct.rectTable(r.Q, lim, eps, air, rectSizes());
      if (table.length) pc += `<div><div class="eyebrow" style="margin:6px 0">${d.shape === 'round' ? 'Rectangular equivalents' : 'Other heights'} · select one to use it</div><div class="tablewrap"><table>
        <thead><tr><th>W × H</th><th>Aspect</th><th>Velocity</th><th>Friction</th></tr></thead><tbody>` +
        table.map(t => `<tr class="click${d.shape === 'rect' && Math.abs(t.h - d.H) < 1e-6 ? ' hi' : ''}" data-w="${t.w}" data-h="${t.h}" tabindex="0"><td>${dimTxt(t.w)} × ${dimTxt(t.h)}</td><td class="${t.aspect > 4 ? 'flag' : ''}">${fx(t.aspect, 1)}:1</td><td>${show('v', t.V)}</td><td>${show('fr', t.fr)}</td></tr>`).join('') +
        `</tbody></table></div><p class="note" style="margin-top:6px">${U('v')} · ${U('fr')}. Smallest standard width for each height.</p></div>`;
    }
    $('d-props').innerHTML = pc;
    $('d-len').addEventListener('input', e => { const x = parseFloat(e.target.value); S.duct.len = Number.isFinite(x) ? inn('len', x) : NaN; save(); $('d-total').innerHTML = val('p', c.fr * S.duct.len / 100); });
    $('d-props').querySelectorAll('tr.click').forEach(tr => {
      const use = () => { S.duct.shape = 'rect'; S.duct.W = +tr.dataset.w; S.duct.H = +tr.dataset.h; S.duct.pins = ['Q', 'S']; save(); ductFill(true); renderDuct(); };
      tr.addEventListener('click', use); tr.addEventListener('keydown', e => { if (e.key === 'Enter') use(); });
    });
    drawFric(air, eps);
  }

  function drawFric(air, eps) {
    const svg = $('d-chart'), lim = dLim;
    const W0 = 880, H0 = 520, m = { l: 64, r: 18, t: 14, b: 46 };
    const pw = W0 - m.l - m.r, ph = H0 - m.t - m.b;
    const fr0 = 0.01, fr1 = 10, q0 = 10, q1 = 100000;
    const lx = Math.log10, X = fr => m.l + (lx(fr) - lx(fr0)) / (lx(fr1) - lx(fr0)) * pw, Y = q => m.t + ph - (lx(q) - lx(q0)) / (lx(q1) - lx(q0)) * ph;
    let s = `<defs><clipPath id="d-clip"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>`;
    const tickVals = (lo, hi) => { const r = []; for (let e = Math.floor(lx(lo)) - 1; e <= Math.ceil(lx(hi)) + 1; e++) for (const k of [1, 2, 5]) r.push(k * 10 ** e); return r; };
    for (const t of tickVals(out('fr', fr0), out('fr', fr1))) {
      const ip = inn('fr', t); if (ip < fr0 * 0.999 || ip > fr1 * 1.001) continue;
      const major = Math.abs(lx(t) - Math.round(lx(t))) < 1e-9;
      s += `<line x1="${X(ip)}" x2="${X(ip)}" y1="${m.t}" y2="${m.t + ph}" stroke="var(--grid)" stroke-width="${major ? 1.4 : 1}"/><text x="${X(ip)}" y="${m.t + ph + 16}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${+t.toPrecision(3)}</text>`;
    }
    for (const t of tickVals(out('q', q0), out('q', q1))) {
      const ip = inn('q', t); if (ip < q0 * 0.999 || ip > q1 * 1.001) continue;
      const major = Math.abs(lx(t) - Math.round(lx(t))) < 1e-9;
      s += `<line x1="${m.l}" x2="${m.l + pw}" y1="${Y(ip)}" y2="${Y(ip)}" stroke="var(--grid)" stroke-width="${major ? 1.4 : 1}"/><text x="${m.l - 6}" y="${Y(ip) + 3.5}" text-anchor="end" font-size="10.5" fill="var(--muted)">${t >= 1000 ? (t / 1000) + 'k' : +t.toPrecision(3)}</text>`;
    }
    s += `<text x="${m.l + pw / 2}" y="${H0 - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">Friction rate, ${U('fr')}</text>`;
    s += `<text transform="translate(14,${m.t + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12" fill="var(--muted)">Airflow, ${U('q')}</text>`;
    if (air && Number.isFinite(air.rho) && eps >= 0) {
      const dset = SI() ? [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000].map(x => x / 25.4) : [4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 30, 36, 42, 48, 60];
      let labels = '';
      for (const Dd of dset) {
        let path = '';
        for (let i = 0; i <= 60; i++) { const Q = 10 ** (lx(q0) + (lx(q1) - lx(q0)) * i / 60); path += (i ? 'L' : 'M') + X(Duct.round(Q, Dd, eps, air).fr).toFixed(1) + ',' + Y(Q).toFixed(1); }
        s += `<path d="${path}" fill="none" stroke="var(--sheet)" stroke-width="1" clip-path="url(#d-clip)"/>`;
        const Qlab = Math.min(q1 * 0.8, Duct.qForFriction({ shape: 'round', D: Dd }, fr1 * 0.7, eps, air));
        const frl = Duct.round(Qlab, Dd, eps, air).fr;
        if (frl >= fr0 && Qlab > q0 * 1.5) labels += `<text x="${X(frl) + 3}" y="${Y(Qlab) - 3}" font-size="10" fill="var(--sheet)">${dimTxt(Dd)}${SI() ? '' : '″'}</text>`;
      }
      const vset = SI() ? [1, 2, 3, 4, 5, 7.5, 10, 15, 20].map(v => v / 0.00508) : [200, 400, 600, 800, 1000, 1500, 2000, 3000, 4000];
      const vPath = V => { let path = '', labPt = null; for (let i = 0; i <= 60; i++) { const Dd = 10 ** (lx(1) + (lx(200) - lx(1)) * i / 60), Q = V * Duct.areaRound(Dd), fr = Duct.round(Q, Dd, eps, air).fr; path += (i ? 'L' : 'M') + X(fr).toFixed(1) + ',' + Y(Q).toFixed(1); if (!labPt && Q > q0 * 1.6 && fr < fr1 * 0.8 && fr > fr0) labPt = [X(fr), Y(Q)]; } return [path, labPt]; };
      for (const V of vset) {
        const [path, lab] = vPath(V);
        s += `<path d="${path}" fill="none" stroke="var(--vel)" stroke-width="1" stroke-dasharray="4 3" opacity=".75" clip-path="url(#d-clip)"/>`;
        if (lab) labels += `<text x="${lab[0] - 4}" y="${lab[1] + 3}" text-anchor="end" font-size="10" fill="var(--vel)">${SI() ? +out('v', V).toFixed(1) : V}</text>`;
      }
      if (lim.fr > 0 && lim.fr >= fr0 && lim.fr <= fr1) s += `<line x1="${X(lim.fr)}" x2="${X(lim.fr)}" y1="${m.t}" y2="${m.t + ph}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2 3"/>`;
      if (lim.V > 0) s += `<path d="${vPath(lim.V)[0]}" fill="none" stroke="var(--vel)" stroke-width="2" clip-path="url(#d-clip)"/>`;
      s += labels;
      if (dPlot && dPlot.Q > 0) {
        const fr = Duct.round(dPlot.Q, dPlot.De, eps, air).fr;
        if (fr >= fr0 && fr <= fr1 && dPlot.Q >= q0 && dPlot.Q <= q1) {
          const px = X(fr), py = Y(dPlot.Q);
          s += `<line x1="${m.l}" x2="${px}" y1="${py}" y2="${py}" stroke="var(--accent)" stroke-width="1" opacity=".5"/><line x1="${px}" x2="${px}" y1="${py}" y2="${m.t + ph}" stroke="var(--accent)" stroke-width="1" opacity=".5"/>`;
          s += `<circle cx="${px}" cy="${py}" r="6.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
        }
      }
    }
    s += `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="var(--line)"/>`;
    svg.innerHTML = s;
  }

  // ======================= HVAC CALCULATIONS =======================
  // Each calculator is a product relation  Π xᵢ^eᵢ = C ; any one variable is solved from the rest.
  const HC_N = ['sens', 'water', 'ach'];
  const HV = {
    sens: () => [
      { k: 'Q', name: 'Sensible load', kind: 'btuh', e: 1 },
      { k: 'cfm', name: 'Airflow', kind: 'q', e: -1 },
      { k: 'dT', name: 'Temperature difference', kind: 'dt', e: -1 },
    ],
    water: () => [
      { k: 'Q', name: 'Load', kind: 'btuh', e: 1 },
      { k: 'gpm', name: 'Water flow', kind: 'wq', e: -1 },
      { k: 'dT', name: 'Temperature difference', kind: 'dt', e: -1 },
    ],
    ach: () => S.hvac.ach.mode === 'dims' ? [
      { k: 'ACH', name: 'Air changes per hour', kind: 'ach', e: 1 },
      { k: 'cfm', name: 'Airflow', kind: 'q', e: -1 },
      { k: 'L', name: 'Length', kind: 'rl', e: 1 },
      { k: 'W', name: 'Width', kind: 'rl', e: 1 },
      { k: 'H', name: 'Ceiling height', kind: 'rl', e: 1 },
    ] : [
      { k: 'ACH', name: 'Air changes per hour', kind: 'ach', e: 1 },
      { k: 'cfm', name: 'Airflow', kind: 'q', e: -1 },
      { k: 'V', name: 'Room volume', kind: 'vol3', e: 1 },
    ],
  };
  const HCconst = { sens: () => num(S.hvac.sens.k), water: () => num(S.hvac.water.k), ach: () => 60 };
  const flowKind = { sens: 'q', water: 'wq' };
  const kOut = (n, k) => SI() ? k * K.btuh.sif / (K[flowKind[n]].sif * K.dt.sif) : k;
  const kIn = (n, x) => SI() ? x * K[flowKind[n]].sif * K.dt.sif / K.btuh.sif : x;
  const trim = (x, d) => (+x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
  const kTxt = (n, k) => { if (!Number.isFinite(k)) return '—'; const v = kOut(n, k); return SI() ? trim(v, v >= 100 ? 0 : 3) : trim(v, n === 'water' ? 1 : 3); };
  const siteK = () => 1.08 * P() / 14.696;
  const okElev = () => S.elev > -1500 && S.elev < 30000;

  function hcBuild(n) {
    const st = S.hvac[n], vars = HV[n]();
    if (!vars.some(v => v.k === st.calc)) st.calc = vars[0].k;
    $(`hc-${n}-f`).innerHTML = vars.map(v => `
      <div class="var" id="hc-${n}-v-${v.k}">
        <div class="top"><span class="name">${v.name} <span class="unit">${U(v.kind)}</span></span><button type="button" class="pin" data-k="${v.k}"></button></div>
        <input type="number" id="hc-${n}-${v.k}" step="any" min="0" inputmode="decimal" aria-label="${v.name}">
        <div class="sub" id="hc-${n}-s-${v.k}"></div>
      </div>`).join('');
    for (const v of vars) {
      const el = $(`hc-${n}-${v.k}`);
      el.value = inVal(v.kind, num(st.vals[v.k]));
      el.addEventListener('input', () => {
        const s = S.hvac[n], ks = HV[n]().map(w => w.k), x = parseFloat(el.value);
        s.vals[v.k] = Number.isFinite(x) ? inn(v.kind, x) : NaN;
        if (s.calc === v.k) s.calc = s.order.filter(k => k !== v.k && ks.includes(k))[0];
        s.order = s.order.filter(k => k !== v.k).concat(v.k);
        save(); hcCompute(n);
      });
    }
    $(`hc-${n}-f`).querySelectorAll('.pin').forEach(b => b.addEventListener('click', () => {
      const s = S.hvac[n]; if (s.calc === b.dataset.k) return;
      s.calc = b.dataset.k; save(); hcCompute(n);
    }));
  }
  function hcFillFactor(n) {
    if (n === 'ach') return;
    const k = num(S.hvac[n].k), v = kOut(n, k);
    $(`hc-${n}-k`).value = Number.isFinite(k) ? String(+v.toFixed(v >= 100 ? 1 : 4)) : '';
    $(`hc-${n}-ku`).textContent = SI() ? 'W per L/s·K' : n === 'sens' ? 'Btu/h per CFM·°F' : 'Btu/h per gpm·°F';
  }
  function hcBuildAll() {
    for (const n of HC_N) { hcBuild(n); hcFillFactor(n); }
    for (const b of $('hc-ach-mode').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === S.hvac.ach.mode));
    $('hc-sens-std').textContent = `Standard air · ${kTxt('sens', 1.08)}`;
    $('hc-water-std').textContent = `Water · ${kTxt('water', 500)}`;
  }
  function hcFormula(n) {
    const st = S.hvac[n], fl = SI() ? 'L/s' : n === 'water' ? 'gpm' : 'CFM';
    if (n === 'ach') return `ACH = ${SI() ? '3.6' : '60'} × ${fl} ÷ ${st.mode === 'dims' ? '(L × W × H)' : 'V'}`;
    return `Q = ${kTxt(n, num(st.k))} × ${fl} × ΔT`;
  }
  const loadSub = Q => SI() ? `${fx(Q * K.btuh.sif / 1000, 2)} kW` : '';
  function hcStats(n, Q) {
    const ok = Number.isFinite(Q) && Q > 0;
    const src = ok ? (SI() ? `${show('btuh', Q)} W × 3.412 = ${fx(Q, 0)} Btu/h` : `${fx(Q, 0)} Btu/h`) : 'Btu/h';
    $(`hc-${n}-stats`).innerHTML = `
      <div class="hc-stat"><div class="eyebrow">Load</div><div class="v">${ok ? fx(Q / 1000, 1) : '—'}<small>MBH</small></div><div class="conv">${src} ÷ 1,000</div></div>
      <div class="hc-stat"><div class="eyebrow">Cooling</div><div class="v">${ok ? fx(Q / 12000, 2) : '—'}<small>tons</small></div><div class="conv">${src} ÷ 12,000</div></div>`;
  }

  function hcCompute(n) {
    const st = S.hvac[n], vars = HV[n](), C = HCconst[n](), errs = [];
    const cv = vars.find(v => v.k === st.calc);
    $(`hc-${n}-formula`).textContent = hcFormula(n);
    let prod = 1;
    for (const v of vars) {
      const box = $(`hc-${n}-v-${v.k}`), el = $(`hc-${n}-${v.k}`), isC = v.k === st.calc;
      box.classList.toggle('pinned', !isC);
      const b = box.querySelector('.pin');
      b.textContent = isC ? 'Calculated' : 'Input';
      b.title = isC ? 'Calculated from the other values' : 'Click to calculate this value instead';
      el.classList.toggle('calcd', isC); el.classList.remove('bad');
      $(`hc-${n}-s-${v.k}`).textContent = '';
      if (isC) continue;
      const x = num(st.vals[v.k]);
      if (!(x > 0)) { el.classList.add('bad'); errs.push(`Enter ${/^[aeiou]/i.test(v.name) ? 'an' : 'a'} ${v.name.toLowerCase()} greater than zero.`); }
      else prod *= x ** v.e;
    }
    if (n !== 'ach') $(`hc-${n}-k`).classList.toggle('bad', !(C > 0));
    if (!(C > 0)) errs.push('Enter a factor greater than zero.');
    $(`hc-${n}-err`).hidden = !errs.length; $(`hc-${n}-err`).textContent = errs.join(' ');
    if (errs.length) {
      $(`hc-${n}-${cv.k}`).value = ''; $(`hc-${n}-eq`).textContent = '';
      if (n === 'ach') $('hc-ach-extra').textContent = ''; else hcStats(n, NaN);
      return;
    }
    const x = (C / prod) ** (1 / cv.e);
    st.vals[cv.k] = x;
    $(`hc-${n}-${cv.k}`).value = inVal(cv.kind, x);
    const V = st.vals;
    if (n === 'ach') {
      const vol = st.mode === 'dims' ? V.L * V.W * V.H : V.V;
      if (st.mode === 'dims') V.V = vol;
      $('hc-ach-s-ACH').textContent = `one change every ${fx(60 / V.ACH, 1)} min`;
      const c = SI() ? '3.6' : '60', rhs = st.mode === 'dims'
        ? `(${show('rl', V.L)} × ${show('rl', V.W)} × ${show('rl', V.H)} ${U('rl')})`
        : `${show('vol3', V.V)} ${U('vol3')}`;
      $('hc-ach-eq').textContent = `${show('ach', V.ACH)} ACH = ${c} × ${show('q', V.cfm)} ${U('q')} ÷ ${rhs}`;
      if (st.mode === 'dims') {
        const A = V.L * V.W;
        $('hc-ach-extra').textContent = `Volume ${show('vol3', vol)} ${U('vol3')} · floor area ${show('area', A)} ${U('area')} · ${fx(out('q', V.cfm) / out('area', A), 2)} ${U('q')} per ${U('area')}`;
      } else $('hc-ach-extra').textContent = '';
    } else {
      const fk = flowKind[n], fl = n === 'sens' ? 'cfm' : 'gpm';
      $(`hc-${n}-s-Q`).textContent = loadSub(V.Q);
      hcStats(n, V.Q);
      $(`hc-${n}-eq`).textContent = `${show('btuh', V.Q)} ${U('btuh')} = ${kTxt(n, C)} × ${show(fk, V[fl])} ${U(fk)} × ${show('dt', V.dT)} ${U('dt')}`;
    }
    save();
  }
  function renderHC() {
    const ok = showPressure();
    $('hc-sens-site').textContent = ok ? `Site elevation · ${kTxt('sens', siteK())}` : 'Site elevation';
    $('hc-sens-site').disabled = !ok;
    for (const n of HC_N) hcCompute(n);
  }
  for (const n of ['sens', 'water']) $(`hc-${n}-k`).addEventListener('input', e => {
    const x = parseFloat(e.target.value); S.hvac[n].k = Number.isFinite(x) ? kIn(n, x) : NaN; save(); hcCompute(n);
  });
  const setK = (n, k) => { S.hvac[n].k = k; save(); hcFillFactor(n); hcCompute(n); };
  $('hc-sens-std').addEventListener('click', () => setK('sens', 1.08));
  $('hc-sens-site').addEventListener('click', () => { if (okElev()) setK('sens', siteK()); });
  $('hc-water-std').addEventListener('click', () => setK('water', 500));
  $('hc-ach-mode').addEventListener('click', e => {
    const b = e.target.closest('button'), st = S.hvac.ach;
    if (!b || b.dataset.v === st.mode) return;
    const v = st.vals;
    if (b.dataset.v === 'vol' && v.L > 0 && v.W > 0 && v.H > 0) v.V = v.L * v.W * v.H;
    if (b.dataset.v === 'vol' && ['L', 'W', 'H'].includes(st.calc)) st.calc = 'V';
    if (b.dataset.v === 'dims' && st.calc === 'V') st.calc = 'H';
    st.mode = b.dataset.v; save(); hcBuildAll(); hcCompute('ach');
  });
  $('tab-calcs').addEventListener('click', e => {
    const b = e.target.closest('[data-reset]'); if (!b) return;
    const n = b.dataset.reset; S.hvac[n] = clone(DEF.hvac[n]); save(); hcBuildAll(); renderHC();
  });

  // ======================= boot =======================
  const render = { psych: renderPsy, mix: renderMix, duct: renderDuct, calcs: renderHC };
  fillGlobal(); psyFill(true); mixFill(); ductFill(true); hcBuildAll();
  const h = location.hash.slice(1);
  setTab(tabs.includes(h) ? h : S.tab);
})();
