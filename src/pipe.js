// ---- Water pipe friction engine (IP units internally) ----
// Basis: Carrier System Design Manual Part 3 (Piping Design) method: Darcy–Weisbach friction, Schedule 40/80
// steel for closed and open systems, Type K/L/M copper; plus PVC/CPVC. Q gpm, d inches (inside), V fps,
// friction rate ft of water per 100 ft (equals m per 100 m), roughness eps in ft.
const Pipe = (() => {
  // Inside diameters, inches. Steel: ASME B36.10 published IDs. PVC: ASTM D1785. CPVC: ASTM F441.
  // Copper: ASTM B88 (OD − 2 × nominal wall). Rows: [nominal size, DN, ID].
  const S40 = [['1/2', 15, 0.622], ['3/4', 20, 0.824], ['1', 25, 1.049], ['1-1/4', 32, 1.38], ['1-1/2', 40, 1.61], ['2', 50, 2.067], ['2-1/2', 65, 2.469], ['3', 80, 3.068], ['4', 100, 4.026], ['5', 125, 5.047], ['6', 150, 6.065], ['8', 200, 7.981], ['10', 250, 10.02], ['12', 300, 11.938], ['14', 350, 13.124], ['16', 400, 15.0], ['18', 450, 16.876], ['20', 500, 18.812], ['24', 600, 22.624]];
  const S80 = [['1/2', 15, 0.546], ['3/4', 20, 0.742], ['1', 25, 0.957], ['1-1/4', 32, 1.278], ['1-1/2', 40, 1.5], ['2', 50, 1.939], ['2-1/2', 65, 2.323], ['3', 80, 2.9], ['4', 100, 3.826], ['5', 125, 4.813], ['6', 150, 5.761], ['8', 200, 7.625], ['10', 250, 9.562], ['12', 300, 11.374], ['14', 350, 12.5], ['16', 400, 14.312], ['18', 450, 16.124], ['20', 500, 17.938], ['24', 600, 21.562]];
  const PVC40 = [['1/2', 15, 0.622], ['3/4', 20, 0.824], ['1', 25, 1.049], ['1-1/4', 32, 1.38], ['1-1/2', 40, 1.61], ['2', 50, 2.067], ['2-1/2', 65, 2.469], ['3', 80, 3.068], ['4', 100, 4.026], ['5', 125, 5.047], ['6', 150, 6.065], ['8', 200, 7.981], ['10', 250, 10.02], ['12', 300, 11.938], ['14', 350, 13.126], ['16', 400, 15.0], ['18', 450, 16.876], ['20', 500, 18.814], ['24', 600, 22.626]];
  const PVC80 = [['1/2', 15, 0.546], ['3/4', 20, 0.742], ['1', 25, 0.957], ['1-1/4', 32, 1.278], ['1-1/2', 40, 1.5], ['2', 50, 1.939], ['2-1/2', 65, 2.323], ['3', 80, 2.9], ['4', 100, 3.826], ['5', 125, 4.813], ['6', 150, 5.761], ['8', 200, 7.625], ['10', 250, 9.564], ['12', 300, 11.376], ['14', 350, 12.5], ['16', 400, 14.314], ['18', 450, 16.126], ['20', 500, 17.938], ['24', 600, 21.564]];
  const CPVC40 = [['1/2', 15, 0.622], ['3/4', 20, 0.824], ['1', 25, 1.049], ['1-1/4', 32, 1.38], ['1-1/2', 40, 1.61], ['2', 50, 2.067], ['2-1/2', 65, 2.469], ['3', 80, 3.068], ['4', 100, 4.026], ['5', 125, 5.047], ['6', 150, 6.065], ['8', 200, 7.981], ['10', 250, 10.02], ['12', 300, 11.938], ['14', 350, 13.126], ['16', 400, 15.0]];
  const CPVC80 = [['1/2', 15, 0.546], ['3/4', 20, 0.742], ['1', 25, 0.957], ['1-1/4', 32, 1.278], ['1-1/2', 40, 1.5], ['2', 50, 1.939], ['2-1/2', 65, 2.323], ['3', 80, 2.9], ['4', 100, 3.826], ['5', 125, 4.813], ['6', 150, 5.761], ['8', 200, 7.625], ['10', 250, 9.564], ['12', 300, 11.376], ['14', 350, 12.5], ['16', 400, 14.314]];
  const CUK = [['1/2', null, 0.527], ['3/4', null, 0.745], ['1', null, 0.995], ['1-1/4', null, 1.245], ['1-1/2', null, 1.481], ['2', null, 1.959], ['2-1/2', null, 2.435], ['3', null, 2.907], ['4', null, 3.857], ['5', null, 4.805], ['6', null, 5.741], ['8', null, 7.583]];
  const CUL = [['1/2', null, 0.545], ['3/4', null, 0.785], ['1', null, 1.025], ['1-1/4', null, 1.265], ['1-1/2', null, 1.505], ['2', null, 1.985], ['2-1/2', null, 2.465], ['3', null, 2.945], ['4', null, 3.905], ['5', null, 4.875], ['6', null, 5.845], ['8', null, 7.725]];
  const CUM = [['1/2', null, 0.569], ['3/4', null, 0.811], ['1', null, 1.055], ['1-1/4', null, 1.291], ['1-1/2', null, 1.527], ['2', null, 2.009], ['2-1/2', null, 2.495], ['3', null, 2.981], ['4', null, 3.935], ['5', null, 4.907], ['6', null, 5.881], ['8', null, 7.785]];
  // Absolute roughness, ft. New commercial steel 0.00015 (ASHRAE/Moody). Open systems: 0.001 ft, an aging and
  // fouling allowance (≈1.4–1.5× new-steel friction) standing in for Carrier Chart 4. Drawn copper, PVC, CPVC 0.000005.
  const EPS = { steelNew: 0.00015, steelOpen: 0.001, smooth: 0.000005 };
  const MATERIALS = {
    s40c: { name: 'Steel Sch 40, closed system', sizes: S40, eps: EPS.steelNew, chart: 'Carrier Chart 3' },
    s40o: { name: 'Steel Sch 40, open system', sizes: S40, eps: EPS.steelOpen, chart: 'Carrier Chart 4' },
    s80c: { name: 'Steel Sch 80, closed system', sizes: S80, eps: EPS.steelNew },
    s80o: { name: 'Steel Sch 80, open system', sizes: S80, eps: EPS.steelOpen },
    cuK: { name: 'Copper Type K', sizes: CUK, eps: EPS.smooth, chart: 'Carrier Chart 5' },
    cuL: { name: 'Copper Type L', sizes: CUL, eps: EPS.smooth, chart: 'Carrier Chart 5' },
    cuM: { name: 'Copper Type M', sizes: CUM, eps: EPS.smooth, chart: 'Carrier Chart 5' },
    pvc40: { name: 'PVC Sch 40', sizes: PVC40, eps: EPS.smooth },
    pvc80: { name: 'PVC Sch 80', sizes: PVC80, eps: EPS.smooth },
    cpvc40: { name: 'CPVC Sch 40', sizes: CPVC40, eps: EPS.smooth },
    cpvc80: { name: 'CPVC Sch 80', sizes: CPVC80, eps: EPS.smooth },
  };
  // Water at 1 atm, IAPWS-95 (CoolProp): [°F, density lb/ft³, dynamic viscosity lb/(ft·s) × 1e6]
  const WATER = [[33, 62.4203, 1181.0537], [35, 62.4237, 1137.1999], [40, 62.4263, 1038.2936], [45, 62.4213, 952.4898], [50, 62.4094, 877.5241], [55, 62.391, 811.6047], [60, 62.3666, 753.2991], [65, 62.3366, 701.4506], [70, 62.3013, 655.117], [75, 62.2611, 613.5244], [80, 62.2161, 576.0322], [85, 62.1668, 542.1063], [90, 62.1131, 511.2985], [95, 62.0555, 483.2301], [100, 61.9939, 457.5794], [105, 61.9287, 434.0714], [110, 61.8599, 412.4701], [115, 61.7877, 392.5715], [120, 61.7121, 374.1989], [125, 61.6334, 357.1983], [130, 61.5515, 341.435], [135, 61.4667, 326.7907], [140, 61.3789, 313.1611], [145, 61.2883, 300.4541], [150, 61.1949, 288.5879], [155, 61.0988, 277.4896], [160, 61.0, 267.0942], [165, 60.8987, 257.3434], [170, 60.7948, 248.185], [175, 60.6885, 239.572], [180, 60.5797, 231.4619], [185, 60.4684, 223.8164], [190, 60.3549, 216.6006], [195, 60.2389, 209.783], [200, 60.1207, 203.3348], [205, 60.0002, 197.2298], [210, 59.8775, 191.4442]];
  function water(tF) {
    const t = Math.min(Math.max(tF, WATER[0][0]), WATER[WATER.length - 1][0]);
    let i = 0; while (i < WATER.length - 2 && WATER[i + 1][0] < t) i++;
    const [t0, r0, m0] = WATER[i], [t1, r1, m1] = WATER[i + 1], k = (t - t0) / (t1 - t0);
    // viscosity interpolated in log space (it varies nearly exponentially with temperature)
    return { rho: r0 + k * (r1 - r0), mu: Math.exp(Math.log(m0) + k * (Math.log(m1) - Math.log(m0))) * 1e-6 };
  }
  const vel = (Q, d) => Q * 0.13368055 / 60 / (Math.PI * d * d / 4 / 144);      // fps
  function friction(Re, rr) {
    if (Re < 2300) return 64 / Re;
    let f = 0.25 / Math.log10(rr / 3.7 + 5.74 / Re ** 0.9) ** 2;
    for (let i = 0; i < 50; i++) {
      const fn = 1 / (-2 * Math.log10(rr / 3.7 + 2.51 / (Re * Math.sqrt(f)))) ** 2;
      if (Math.abs(fn - f) < 1e-12) return fn;
      f = fn;
    }
    return f;
  }
  // Hydraulics of flow Q through inside diameter d
  function flow(Q, d, eps, w) {
    const V = vel(Q, d), D = d / 12, Re = w.rho * V * D / w.mu, f = friction(Re, eps / D);
    return { Q, d, V, Re, f, fr: f * (100 / D) * V * V / (2 * 32.174), hv: V * V / (2 * 32.174) };
  }
  function bisectLog(fn, lo, hi) { for (let i = 0; i < 100; i++) { const m = Math.sqrt(lo * hi); if (fn(m) > 0) hi = m; else lo = m; } return Math.sqrt(lo * hi); }
  const dForFr = (Q, fr, eps, w) => bisectLog(d => fr - flow(Q, d, eps, w).fr, 0.05, 200);
  const qForFr = (d, fr, eps, w) => bisectLog(Q => flow(Q, d, eps, w).fr - fr, 1e-4, 1e7);
  const dForV = (Q, V) => Math.sqrt(Q * 0.13368055 / 60 / V / Math.PI * 4 * 144);
  // Any two of Q, size (inside diameter), V, friction rate
  function solve({ pins, Q, d, V, fr, eps, w }) {
    const has = k => pins.includes(k);
    let q, dd;
    if (has('Q') && has('S')) { q = Q; dd = d; }
    else if (has('Q') && has('V')) { q = Q; dd = dForV(Q, V); }
    else if (has('Q') && has('fr')) { q = Q; dd = dForFr(Q, fr, eps, w); }
    else if (has('S') && has('V')) { dd = d; q = V * Math.PI * d * d / 4 / 144 * 60 / 0.13368055; }
    else if (has('S') && has('fr')) { dd = d; q = qForFr(d, fr, eps, w); }
    else {
      // velocity + friction: friction falls with size at fixed velocity, except for a jump up at the
      // laminar/turbulent transition, where two sizes can share the same V and friction. Scan down from
      // the largest size so the turbulent answer (the one that matters for design) is found first.
      const qOf = x => V * Math.PI * x * x / 4 / 144 * 60 / 0.13368055, g = x => fr - flow(qOf(x), x, eps, w).fr;
      let hi = 200, ghi = g(hi), lo = null;
      for (let i = 399; i >= 0; i--) { const x = 0.05 * Math.pow(4000, i / 400), gx = g(x); if (gx <= 0 && ghi > 0) { lo = x; break; } hi = x; ghi = gx; }
      if (lo == null) lo = 0.05;
      dd = bisectLog(g, lo, hi); q = qOf(dd);
    }
    return flow(q, dd, eps, w);
  }
  const meets = (r, lim) => (!(lim.fr > 0) || r.fr <= lim.fr * (1 + 1e-9)) && (!(lim.V > 0) || r.V <= lim.V * (1 + 1e-9));
  // Every standard size at flow Q, with the smallest one that meets the limits
  function table(sizes, Q, lim, eps, w) {
    const rows = sizes.map(([nps, dn, d]) => ({ nps, dn, d, ...flow(Q, d, eps, w) }));
    const pick = rows.find(r => meets(r, lim)) || null;
    return { rows, pick };
  }
  // Fittings: equivalent length = (L/D) × inside diameter, L/D from Crane TP-410
  const FITTINGS = [
    { k: 'ell90', name: '90° elbow, standard', LD: 30 },
    { k: 'ell90lr', name: '90° elbow, long radius', LD: 20 },
    { k: 'ell45', name: '45° elbow', LD: 16 },
    { k: 'teeRun', name: 'Tee, flow through run', LD: 20 },
    { k: 'teeBr', name: 'Tee, flow through branch', LD: 60 },
    { k: 'gate', name: 'Gate valve, open', LD: 8 },
    { k: 'ball', name: 'Ball valve, full port', LD: 3 },
    { k: 'bfly', name: 'Butterfly valve', LD: d => d <= 8.5 ? 45 : d <= 14.5 ? 35 : 25 },
    { k: 'globe', name: 'Globe valve, open', LD: 340 },
    { k: 'angle', name: 'Angle valve, open', LD: 150 },
    { k: 'check', name: 'Swing check valve', LD: 100 },
    { k: 'liftchk', name: 'Lift check valve', LD: 600 },
    { k: 'plug', name: 'Plug valve, straightway', LD: 18 },
  ];
  function equivLength(items, d) {
    let L = 0;
    for (const it of items) {
      const F = FITTINGS.find(f => f.k === it.k); if (!F || !(it.n > 0)) continue;
      const LD = typeof F.LD === 'function' ? F.LD(d) : F.LD;
      L += it.n * LD * d / 12;
    }
    return L;
  }
  // Carrier Table 13: recommended velocity by service, fps
  const SERVICES = [
    { k: 'discharge', name: 'Pump discharge', min: 8, max: 12 },
    { k: 'suction', name: 'Pump suction', min: 4, max: 7 },
    { k: 'drain', name: 'Drain line', min: 4, max: 7 },
    { k: 'header', name: 'Header', min: 4, max: 15 },
    { k: 'riser', name: 'Riser', min: 3, max: 10 },
    { k: 'general', name: 'General service', min: 5, max: 10 },
    { k: 'city', name: 'City water', min: 3, max: 7 },
  ];
  // Carrier Table 14: maximum velocity to limit erosion, by normal operating hours per year (fps)
  const EROSION = [[1500, 15], [2000, 14], [3000, 13], [4000, 12], [6000, 10], [8000, 8]];
  return { MATERIALS, EPS, WATER, water, vel, flow, solve, table, meets, FITTINGS, equivLength, SERVICES, EROSION, dForFr, qForFr };
})();
if (typeof module !== 'undefined') module.exports = Pipe;
