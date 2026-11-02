export const ORCA = {
  length: 5.2,
  speed: 1.3,
  phase: 21,
  radius(s: number) {
    if (s < 0.18) return 0.1 * (0.42 + 0.58 * Math.sqrt(Math.max(0, s) / 0.18));
    if (s < 0.87) return 0.1 * (1 - Math.pow((s - 0.18) / 0.69, 1.5) * 0.88);
    return 0.012;
  },
  top: (_s: number, r: number) => r * 0.95,
  bottom: (_s: number, r: number) => r,
  width: (_s: number, r: number) => r * 0.9,
  albedo(s: number, ct: number, st: number) {
    const side = Math.abs(ct);
    if (((s - 0.17) / 0.05) ** 2 + ((st - 0.32) / 0.18) ** 2 < 1 && side > 0.3) return 0.95;
    if (st < -0.5 && s < 0.58) return 0.95;
    if (s < 0.1 && st < -0.15) return 0.95;
    if (((s - 0.6) / 0.075) ** 2 + ((st + 0.4) / 0.32) ** 2 < 1) return 0.95;
    if (s > 0.43 && s < 0.58 && st > 0.82) return 0.5;
    return 0.05;
  },
  fluke: { span: 0.14, albedo: 0.05 },
  pectoral: { at: 0.2, len: 0.12, chord: 0.07, albedo: 0.05 },
  dorsal: { from: 0.37, to: 0.52, height: 0.18, albedo: 0.05 },
};
