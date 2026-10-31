# MEP Resources

## MEP Toolkit

A single-page HVAC and piping calculator: `index.html`, no build step, no dependencies beyond Google Fonts.

- **Psychrometrics** – enter any two of dry bulb, wet bulb, dew point, RH, humidity ratio, enthalpy or specific volume; the rest are solved and shown on a psychrometric chart at the site pressure.
- **Mixed air** – two airstreams mixed on dry-air mass flow, plus a cooling coil with condensate, total/sensible/latent load, SHR, ADP and bypass factor.
- **Duct sizer** – enter any two of airflow, duct size, velocity and friction rate (Darcy–Weisbach with Colebrook friction), round or rectangular, with standard sizes and a friction chart.
- **Pipe sizer** – water pipe sizing by Carrier's method (Darcy–Weisbach) for Sch 40/80 steel (closed and open), copper K/L/M and PVC/CPVC, with service and erosion velocity limits, fittings and total head.
- **HVAC calculations** – sensible air (1.08 × CFM × ΔT), water (500 × gpm × ΔT) and air changes per hour, each solving for whichever value is left blank.

Methods follow ASHRAE Handbook—Fundamentals. Units (IP/SI) and site elevation are shared across tabs. Inputs are saved in the browser.
