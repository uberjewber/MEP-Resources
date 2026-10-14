// ---- Psychrometric core (IP units internally; ASHRAE Handbook—Fundamentals 2017, Ch. 1) ----
const Psy = (() => {
  const R = 459.67;
  // Saturation pressure over ice (<32 F) / liquid water (>=32 F), psia. Hyland-Wexler, ASHRAE eq. 5-6 (IP).
  function pws(tF) {
    const T = tF + R;
    let ln;
    if (tF < 32) {
      ln = -1.0214165e4 / T - 4.8932428 - 5.3765794e-3 * T + 1.9202377e-7 * T * T
        + 3.5575832e-10 * T ** 3 - 9.0344688e-14 * T ** 4 + 4.1635019 * Math.log(T);
    } else {
      ln = -1.0440397e4 / T - 1.129465e1 - 2.7022355e-2 * T + 1.289036e-5 * T * T
        - 2.4780681e-9 * T ** 3 + 6.5459673 * Math.log(T);
    }
    return Math.exp(ln);
  }
  // Standard atmosphere, ASHRAE eq. 3 (IP): psia from elevation in ft
  const pAlt = ft => 14.696 * Math.pow(1 - 6.8754e-6 * ft, 5.2559);
  const Ws = (t, p) => { const e = pws(t); return 0.621945 * e / (p - e); };
  // Humidity ratio from dry bulb + thermodynamic wet bulb, ASHRAE eq. 33 (water) / 35 (ice)
  function W_dbwb(t, tw, p) {
    const ws = Ws(tw, p);
    if (tw >= 32) return ((1093 - 0.556 * tw) * ws - 0.240 * (t - tw)) / (1093 + 0.444 * t - tw);
    return ((1220 - 0.04 * tw) * ws - 0.240 * (t - tw)) / (1220 + 0.444 * t - 0.48 * tw);
  }
  const h = (t, W) => 0.240 * t + W * (1061 + 0.444 * t);                 // Btu/lb_da
  const v = (t, W, p) => 0.370486 * (t + R) * (1 + 1.607858 * W) / p;    // ft3/lb_da
  const pw = (W, p) => p * W / (0.621945 + W);
  function bisect(f, lo, hi, n = 80) {
    let flo = f(lo);
    for (let i = 0; i < n; i++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
    }
    return (lo + hi) / 2;
  }
  const dew = (W, p) => { const e = pw(W, p); return W <= 0 ? NaN : bisect(t => pws(t) - e, -148, 250); };
  const wb = (t, W, p) => bisect(tw => W_dbwb(t, tw, p) - W, -148, t);
  const rh = (t, W, p) => pw(W, p) / pws(t);
  function state(t, W, p) {
    return { t, W, h: h(t, W), v: v(t, W, p), rh: rh(t, W, p), wb: wb(t, W, p), dp: dew(W, p) };
  }
  // streams: [{q, t, tw}] q in CFM. basis: 'actual' (CFM at stream state) or 'standard' (0.075 lb/ft3 moist air)
  function mix(streams, p, basis) {
    const S = streams.map(s => {
      const W = W_dbwb(s.t, s.tw, p);
      const st = state(s.t, W, p);
      st.m = basis === 'standard' ? s.q * 0.075 / (1 + W) : s.q / st.v;   // lb_da/min
      st.q = s.q;
      return st;
    });
    const m = S.reduce((a, s) => a + s.m, 0);
    const Wm = S.reduce((a, s) => a + s.m * s.W, 0) / m;
    const hm = S.reduce((a, s) => a + s.m * s.h, 0) / m;
    let tm = (hm - 1061 * Wm) / (0.240 + 0.444 * Wm);
    const tLine = tm;
    let fog = null, Wv = Wm;
    if (Wm > Ws(tm, p)) {
      // Supersaturated: mixture fogs. Equilibrium = saturated air + entrained liquid at the same temperature.
      tm = bisect(t => h(t, Ws(t, p)) + (Wm - Ws(t, p)) * (t - 32) - hm, tm - 5, tm + 40);
      Wv = Ws(tm, p);
      fog = { liquid: Wm - Wv };
    }
    const M = state(tm, Wv, p);
    M.h = hm; M.m = m; M.fog = fog; M.Wtotal = Wm; M.tLine = tLine;
    M.qActual = m * M.v;
    M.qStd = m * (1 + Wv) / 0.075;
    const qSum = streams.reduce((a, s) => a + s.q, 0);
    M.tSimple = streams.reduce((a, s) => a + s.q * s.t, 0) / qSum;
    M.qSum = qSum;
    return { streams: S, mix: M };
  }

  // ---- Any-two-inputs solver ----
  // Variables: DB, WB, DP (°F), RH (fraction), W (lb/lb), h (Btu/lb IP, or kJ/kg SI when si=true), v (ft3/lb)
  const hSI = (t, W) => { const c = (t - 32) / 1.8; return 1.006 * c + W * (2501 + 1.86 * c); };
  const DEPENDENT = [['DP', 'W'], ['WB', 'h']];
  function props(t, W, p, si) {
    const st = state(t, W, p);
    const e = pw(W, p), ws = Ws(t, p);
    return { DB: t, WB: st.wb, DP: st.dp, RH: st.rh, W, h: si ? hSI(t, W) : st.h, hIP: st.h, hSI: hSI(t, W), v: st.v,
      pw: e, Ws: ws, mu: W / ws, rho: (1 + W) / st.v };
  }
  function solve(inp, p, si) {
    const keys = Object.keys(inp);
    if (keys.length !== 2) return { error: 'Enter two values.' };
    if (DEPENDENT.some(([a, b]) => keys.includes(a) && keys.includes(b)))
      return { error: keys.includes('DP') ? 'Dew point and humidity ratio describe the same thing. Pick one of them plus another property.' : 'Wet bulb and enthalpy are nearly parallel on the chart, so together they do not fix a state. Pick another pair.' };
    const G = {
      DB: (t, W) => t, WB: (t, W) => wb(t, W, p), DP: (t, W) => dew(W, p), RH: (t, W) => rh(t, W, p),
      W: (t, W) => W, h: (t, W) => si ? hSI(t, W) : h(t, W), v: (t, W) => v(t, W, p),
    };
    // humidity ratio at temperature t implied by one variable (closed form)
    const Wat = (k, x, t) => {
      switch (k) {
        case 'W': return x;
        case 'DP': return Ws(x, p);
        case 'WB': return t >= x ? W_dbwb(t, x, p) : NaN;
        case 'RH': { const e = x * pws(t); return 0.621945 * e / (p - e); }
        case 'h': if (si) { const c = (t - 32) / 1.8; return (x - 1.006 * c) / (2501 + 1.86 * c); } return (x - 0.240 * t) / (1061 + 0.444 * t);
        case 'v': return (x * p / (0.370486 * (t + R)) - 1) / 1.607858;
      }
    };
    const okW = (t, W) => Number.isFinite(W) && W >= -1e-9 && W <= Ws(t, p) * (1 + 1e-6);
    let t, W;
    const [k1, k2] = keys.includes('DB') ? ['DB', keys.find(k => k !== 'DB')] : keys;
    if (k1 === 'DB') {
      t = inp.DB; W = Wat(k2, inp[k2], t);
    } else {
      // scan temperature for the root of the second variable's residual
      const a = ['W', 'DP'].includes(k2) ? k2 : k1, b = a === k1 ? k2 : k1;
      const res = tt => { const w = Wat(a, inp[a], tt); return okW(tt, w) ? G[b](tt, w) - inp[b] : NaN; };
      let prev = null, lo = null, hi = null;
      // start exactly on the saturation boundary when the first variable fixes it, so saturated states are found
      const t0 = a === 'W' ? dew(inp.W, p) : a === 'DP' ? inp.DP : a === 'WB' ? inp.WB : -100;
      if (Number.isFinite(t0)) {
        const r0 = res(t0);
        if (Number.isFinite(r0)) { if (Math.abs(r0) < 1e-7 * (1 + Math.abs(inp[b]))) { lo = hi = t0; } else prev = { t: t0, r: r0 }; }
      }
      for (let tt = Math.ceil(Math.max(-100, Number.isFinite(t0) ? t0 : -100) * 4) / 4; lo == null && tt <= 250; tt += 0.25) {
        const r = res(tt);
        if (!Number.isFinite(r)) { prev = null; continue; }
        if (r === 0) { lo = hi = tt; break; }
        if (prev && Math.sign(r) !== Math.sign(prev.r)) { lo = prev.t; hi = tt; break; }
        prev = { t: tt, r };
      }
      if (lo == null) return { error: 'No air state matches those two values. Check that the combination is below saturation.' };
      if (lo !== hi) {
        let rlo = res(lo);
        for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2, rm = res(mid); if (!Number.isFinite(rm)) break; if (Math.sign(rm) === Math.sign(rlo)) { lo = mid; rlo = rm; } else hi = mid; }
      }
      t = (lo + hi) / 2; W = Wat(a, inp[a], t);
    }
    if (!Number.isFinite(W) || W < -1e-9) return { error: 'That combination is drier than bone-dry air (humidity ratio below zero).' };
    if (W > Ws(t, p) * (1 + 1e-6)) return { error: 'That combination is above saturation (over 100% RH).' };
    W = Math.max(0, W);
    return { t, W, P: props(t, W, p, si) };
  }

  // ---- Cooling coil: entering {t, W (total), h (total), m lb_da/min} → leaving DB/WB ----
  function coil(ent, t2, tw2, p) {
    const t1 = ent.t, W1 = ent.W, h1 = ent.h, m = ent.m;
    const W2 = W_dbwb(t2, tw2, p), h2 = h(t2, W2);
    const dW = W1 - W2, wet = dW > 0;
    const hw = t2 - 32;                                    // condensate enthalpy, leaves near leaving air temp
    const qT = m * ((h1 - h2) - (wet ? dW * hw : 0));      // Btu/min
    const qS = m * (h(t1, W1) - h(t2, W1));                // sensible: cool at constant W
    const qL = qT - qS;
    let adp = null, bf = null;
    if (wet && t2 < t1) {
      const T = s => t1 + s * (t2 - t1), Wl = s => W1 + s * (W2 - W1), f = s => Wl(s) - Ws(T(s), p);
      let lo = 1, hi = null;
      for (let s = 1; s < 200; s += 0.25) { if (T(s) < -100 || Wl(s) < 0) break; if (f(s) >= 0) { hi = s; break; } lo = s; }
      if (hi != null) {
        for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) >= 0) hi = mid; else lo = mid; }
        adp = { t: T(hi), W: Wl(hi) };
        bf = (t2 - adp.t) / (t1 - adp.t);
      }
    }
    return { ...state(t2, W2, p), W2, h2, dW, wet, cond: wet ? m * dW : 0, qT, qS, qL, shr: qT !== 0 ? qS / qT : NaN, adp, bf, m };
  }
  return { coil, pws, pAlt, Ws, W_dbwb, h, hSI, v, pw, dew, wb, rh, state, mix, props, solve, DEPENDENT };
})();
if (typeof module !== 'undefined') module.exports = Psy;
