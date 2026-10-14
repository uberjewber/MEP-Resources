// ---- Duct friction engine (IP units internally; ASHRAE Handbook—Fundamentals, Ch. 21) ----
// Q in CFM, V in fpm, D/a/b in inches, friction rate in in. w.g. per 100 ft,
// roughness eps in ft, density rho in lb/ft3, viscosity mu in lb/(ft·s).
const Duct = (() => {
  const INWG = 5.1972;              // lbf/ft2 per in. w.g. (248.84 Pa, water at 60 F)
  const GC = 32.174;
  // Air properties: dry air ideal gas, standard atmosphere pressure, Sutherland viscosity
  function air(tF, elevFt) {
    const p = 14.696 * Math.pow(1 - 6.8754e-6 * elevFt, 5.2559);       // psia
    const T = tF + 459.67;                                               // R
    const rho = p * 144 / (53.352 * T);                                  // lb/ft3
    const TK = T / 1.8;
    const muSI = 1.716e-5 * Math.pow(TK / 273.15, 1.5) * (273.15 + 110.4) / (TK + 110.4); // Pa·s
    return { rho, mu: muSI * 0.6719690, p };
  }
  const STD = { rho: 0.075, mu: 1.2215e-5 };      // standard air, 70 F, sea level

  const areaRound = D => Math.PI * D * D / 4 / 144;                       // ft2
  const deRect = (a, b) => 1.30 * Math.pow(a * b, 0.625) / Math.pow(a + b, 0.25);  // Huebscher
  const pv = (V, rho) => rho * (V / 60) ** 2 / (2 * GC * INWG);          // in. w.g.

  function frictionFactor(Re, relRough) {
    if (Re < 2300) return 64 / Re;
    // Swamee-Jain start, then Colebrook fixed-point
    let f = 0.25 / Math.log10(relRough / 3.7 + 5.74 / Re ** 0.9) ** 2;
    for (let i = 0; i < 50; i++) {
      const fn = 1 / (-2 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)))) ** 2;
      if (Math.abs(fn - f) < 1e-12) { f = fn; break; }
      f = fn;
    }
    return f;
  }
  // Round duct (or equal-friction equivalent) of diameter D carrying Q
  function round(Q, D, eps, air) {
    const A = areaRound(D), V = Q / A;
    const Dft = D / 12;
    const Re = air.rho * (V / 60) * Dft / air.mu;
    const f = frictionFactor(Re, eps / Dft);
    const Pv = pv(V, air.rho);
    return { V, A, Re, f, Pv, fr: f * (100 / Dft) * Pv };
  }
  // Generic section: {shape:'round', D} or {shape:'rect', a, b}
  function section(sec) {
    if (sec.shape === 'round') return { De: sec.D, A: areaRound(sec.D), Dh: sec.D };
    const A = sec.a * sec.b / 144;
    return { De: deRect(sec.a, sec.b), A, Dh: 2 * sec.a * sec.b / (sec.a + sec.b), aspect: Math.max(sec.a, sec.b) / Math.min(sec.a, sec.b) };
  }
  // Check a duct at a flow
  function check(sec, Q, eps, air) {
    const s = section(sec);
    const r = round(Q, s.De, eps, air);      // friction from equal-friction diameter
    const V = Q / s.A;                       // actual velocity from actual area
    return { ...s, V, Pv: pv(V, air.rho), fr: r.fr, Re: r.Re, f: r.f };
  }
  function bisectLog(fn, lo, hi, n = 100) {   // fn increasing, root of fn(x)=0 on log scale
    for (let i = 0; i < n; i++) {
      const mid = Math.sqrt(lo * hi);
      if (fn(mid) > 0) hi = mid; else lo = mid;
    }
    return Math.sqrt(lo * hi);
  }
  // Round diameter giving friction rate fr at flow Q
  const dForFriction = (Q, fr, eps, air) => bisectLog(D => fr - round(Q, D, eps, air).fr, 0.05, 2000);
  const dForVelocity = (Q, V) => Math.sqrt(4 * Q * 144 / (Math.PI * V));
  // Max flow in a section at friction rate fr
  const qForFriction = (sec, fr, eps, air) => bisectLog(Q => check(sec, Q, eps, air).fr - fr, 1e-3, 1e8);
  const qForVelocity = (sec, V) => V * section(sec).A;

  // Capacity with optional limits {fr, V}: governing = smaller flow
  function capacity(sec, lim, eps, air) {
    const out = {};
    if (lim.fr > 0) out.qFr = qForFriction(sec, lim.fr, eps, air);
    if (lim.V > 0) out.qV = qForVelocity(sec, lim.V);
    const cands = [['friction', out.qFr], ['velocity', out.qV]].filter(c => c[1] > 0);
    const g = cands.reduce((a, c) => (c[1] < a[1] ? c : a));
    out.Q = g[1]; out.governs = g[0];
    out.at = check(sec, out.Q, eps, air);
    return out;
  }
  // Required round diameter with optional limits: governing = larger diameter
  function sizeRound(Q, lim, eps, air) {
    const out = {};
    if (lim.fr > 0) out.dFr = dForFriction(Q, lim.fr, eps, air);
    if (lim.V > 0) out.dV = dForVelocity(Q, lim.V);
    const cands = [['friction', out.dFr], ['velocity', out.dV]].filter(c => c[1] > 0);
    const g = cands.reduce((a, c) => (c[1] > a[1] ? c : a));
    out.D = g[1]; out.governs = g[0];
    return out;
  }
  const ok = (sec, Q, lim, eps, air) => {
    const c = check(sec, Q, eps, air);
    return (!(lim.fr > 0) || c.fr <= lim.fr * (1 + 1e-9)) && (!(lim.V > 0) || c.V <= lim.V * (1 + 1e-9));
  };
  // Smallest standard round that satisfies limits
  function pickRound(Q, lim, eps, air, sizes) {
    for (const D of sizes) if (ok({ shape: 'round', D }, Q, lim, eps, air)) return D;
    return null;
  }
  // For each side h (from list), smallest b from list satisfying limits
  function rectTable(Q, lim, eps, air, sides) {
    const rows = [];
    for (const h of sides) {
      const b = sides.find(w => w >= h && ok({ shape: 'rect', a: w, b: h }, Q, lim, eps, air));
      if (b == null) continue;
      if (b / h > 10) continue;     // skip absurd aspect ratios
      rows.push({ h, w: b, ...check({ shape: 'rect', a: b, b: h }, Q, eps, air) });
      if (b === h) break;           // square reached: further rows are mirror images
    }
    return rows;
  }
  // ---- Adaptive solver ----
  // pins: subset of ['Q','S','V','fr']. Valid: any 2, or {V, fr} plus one of Q/S (then V and fr are maximums).
  // shape 'round' -> size param x = D; 'rect' -> x = width, H fixed.
  const secOf = (shape, x, H) => shape === 'round' ? { shape: 'round', D: x } : { shape: 'rect', a: x, b: H };
  function solve(p) {
    const { shape, H, pins, eps, air } = p, has = k => pins.includes(k);
    const A = x => section(secOf(shape, x, H)).A;
    const frAt = (x, Q) => check(secOf(shape, x, H), Q, eps, air).fr;
    let x, Q, gov = null, xF, xV, qF, qV;
    if (has('S')) {
      x = p.x;
      const sec = secOf(shape, x, H);
      if (has('Q')) Q = p.Q;
      else {
        qF = has('fr') ? qForFriction(sec, p.fr, eps, air) : Infinity;
        qV = has('V') ? p.V * A(x) : Infinity;
        Q = Math.min(qF, qV);
        if (has('fr') && has('V')) gov = qF <= qV ? 'friction' : 'velocity';
      }
    } else if (has('Q')) {
      Q = p.Q;
      xF = has('fr') ? bisectLog(x => p.fr - frAt(x, Q), 0.01, 1e5) : 0;
      xV = has('V') ? (shape === 'round' ? Math.sqrt(4 * Q * 144 / (Math.PI * p.V)) : Q / p.V * 144 / H) : 0;
      x = Math.max(xF, xV);
      if (has('fr') && has('V')) gov = xF >= xV ? 'friction' : 'velocity';
    } else {                                   // velocity + friction -> size and flow
      x = bisectLog(x => p.fr - frAt(x, p.V * A(x)), 0.01, 1e5);
      Q = p.V * A(x);
    }
    const sec = secOf(shape, x, H);
    return { x, Q, sec, gov, xF, xV, qF, qV, c: check(sec, Q, eps, air) };
  }
  // smallest standard size param meeting limits (as maximums) at flow Q
  function pickStd(shape, H, Q, lim, eps, air, sizes) {
    for (const x of sizes) if (ok(secOf(shape, x, H), Q, lim, eps, air)) return x;
    return null;
  }
  // Smallest other side for a fixed side h
  const rectFixed = (Q, lim, eps, air, h, sides) => {
    const w = sides.find(w => ok({ shape: 'rect', a: w, b: h }, Q, lim, eps, air));
    return w == null ? null : { h, w, ...check({ shape: 'rect', a: w, b: h }, Q, eps, air) };
  };
  return { solve, pickStd, secOf, rectFixed, air, STD, deRect, pv, frictionFactor, round, section, check, capacity, sizeRound, pickRound, rectTable, dForFriction, qForFriction, areaRound };
})();
if (typeof module !== 'undefined') module.exports = Duct;
