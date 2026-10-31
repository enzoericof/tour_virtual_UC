import { facultyToWorld, insidePolygon } from "./campus-geometry.ts";

/** Registration of the team's annotated aerial image, not guessed room locations.
 * Image: Drive 1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW, 560 × 508 px.
 * Three roof corners of Bloque 1 register image coordinates to its local frame.
 * Dimensions remain approximate until an on-site measurement is available.
 */
export function photoPoint(x: number, z: number, height = 0): [number, number, number] {
  const dx = x - 209, dz = z - 137;
  const a = 257 / 64, b = -3 / 13, c = 20 / 64, d = 56 / 13;
  const determinant = a * d - b * c;
  return [(d * dx - b * dz) / determinant - 32, height,
    (-c * dx + a * dz) / determinant - 11.7];
}

export const facultyBlueprint = {
  main: [[209, 137], [466, 157], [463, 213], [205, 194]],
  block2: [[235, 311], [459, 248], [484, 307], [261, 371]],
  manfred: [[396, 124], [421, 115], [433, 145], [405, 143]],
  bedelia: [[437, 110], [524, 84], [532, 108], [463, 144]],
  // Revised from the user's larger satellite capture (1333 × 827 px).
  // Long facade faces the open plaza, almost across the classroom block's axis.
  cantina: [[599, 114], [634, 190], [602, 205], [568, 128]],
  coveredPlaza: [[460, 158], [482, 149], [512, 211], [487, 226]],
  openPlaza: [[482, 149], [568, 128], [602, 205], [512, 211]],
  electronics: [[633, 190], [726, 148], [742, 183], [650, 229]],
  courtyard: [[242, 204], [414, 227], [256, 278]],
  common1: [[486, 233], [516, 407], [491, 415], [466, 320]],
  parking: [[278, 392], [479, 321], [516, 410], [332, 465]],
  paths: [
    [[217, 198], [462, 216], [479, 205]],
    [[235, 207], [248, 297], [456, 234], [479, 205]],
    [[242, 309], [462, 245], [480, 230], [479, 205]],
    [[479, 205], [491, 260], [501, 313], [512, 407]],
    [[479, 205], [520, 208], [548, 185], [575, 172]],
    [[479, 205], [467, 160], [466, 145], [482, 126]],
    [[480, 230], [493, 307], [480, 375], [432, 420], [332, 465]],
  ],
} as const;

export const facultyVisitPoints: Record<string, [number, number, number]> = {
  acceso: photoPoint(479, 225, 0.2),
  laboratorio: photoPoint(315, 188, 0.1),
  "pasillo-p3": photoPoint(345, 193, 10.5),
  "aula-p3": photoPoint(330, 170, 10.5),
  "cantina-cyt": photoPoint(560, 178, 0.1),
  bedelia: photoPoint(492, 140, 0.2),
  "sala-manfred": photoPoint(417, 148, 0.2),
  patio: photoPoint(330, 245, 0.1),
  jardin: photoPoint(499, 281, 0.1),
  plaza: photoPoint(481, 193, 0.2),
  "plaza-abierta": photoPoint(544, 182, 0.15),
  "piso-1": photoPoint(380, 203, 3.5),
  "piso-2": photoPoint(380, 203, 7),
  banos: photoPoint(237, 185, 0.1),
  "bloque-g": photoPoint(356, 282, 0.1),
  estacionamiento: photoPoint(398, 424, 0.1),
};

export function photoPolygon(points: readonly (readonly number[])[]) {
  return points.map(([x, z]) => {
    const p = facultyToWorld(photoPoint(x, z));
    return [p[0], p[2]];
  });
}

export const facultyVisitTargets: Record<string, [number, number, number]> = {
  "cantina-cyt": photoPoint(601, 160, 1.8),
  "plaza-abierta": photoPoint(592, 166, 1.8),
};

export const facultyZone = photoPolygon([[190, 110], [750, 60], [760, 240], [548, 475], [242, 493], [190, 270]]);
export function inFacultyZone(points: readonly (readonly number[])[]) {
  const center = [points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length];
  return insidePolygon(center, facultyZone);
}
