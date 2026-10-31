# MEP Resources

This repo is the home of the **Airside Toolkit**, published with GitHub Pages from `main` / root at
https://uberjewber.github.io/mep-resources/ . Every change to the toolkit gets committed and pushed
to `main` here once Ari approves it; the push redeploys the site.

## Layout
- `index.html` — the built, self-contained page that Pages serves. Generated; don't hand-edit.
- `src/shell.html` — markup and CSS for all tabs, with `/*PSY*/`, `/*DUCT*/`, `/*PIPE*/`, `/*APP*/` placeholders.
- `src/psychro.js` — psychrometric engine (ASHRAE Fundamentals Ch. 1, IP units internally): saturation
  pressure, any-two-property solver, two-stream mixing with fogging, cooling coil (condensate, loads, ADP, BF).
- `src/duct.js` — duct friction engine (Darcy–Weisbach + Colebrook, Huebscher equivalent diameter) and the
  any-two duct solver.
- `src/pipe.js` — water pipe engine (Carrier Part 3 method: Darcy–Weisbach + Colebrook, Sch 40/80 steel closed/open,
  copper K/L/M, PVC/CPVC; IAPWS water properties; Table 13/14 velocity limits; Crane L/D fittings) and solver.
- `src/app.js` — UI, unit conversion (state is always stored in IP), charts, tab routing, browser storage.
- `tools/build.py` — assembles `index.html` from `src/`.
- `tools/check.py` — headless Chromium smoke test of every tab at desktop and phone width.

## Workflow
Ari reviews every change before it goes live. Never push to `main` without his explicit go-ahead.
1. Edit files in `src/`.
2. `python3 tools/build.py --preview <scratch>/airside-preview.html`
3. `python3 tools/check.py <screenshot-dir>` and look at the screenshots for anything visual.
4. Show Ari the mockup: publish the preview file to the "Airside Toolkit" artifact
   (https://claude.ai/artifact/AiXqLSLQynGTn7nQVQC4kR) and summarize what changed.
   Commit locally if useful, but do not push.
5. Only after Ari confirms: run `python3 tools/build.py` again right before committing (it stamps
   "Last updated …" at the top of the page with the build time), then commit `src/` and `index.html`
   together and push to `main`.

## Conventions
- Engines stay pure (numbers in, numbers out, no DOM) so they can be tested in Node.
- Any calculator where the user enters "all but one" or "any two" follows the same pattern: inputs are
  tagged Input, the solved field is dashed and tagged Calculated, typing into it swaps roles.
- IP and SI are both supported everywhere; convert only at input/output.
