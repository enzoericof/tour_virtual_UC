import sourceLayout from "./campus-layout.json" with { type: "json" };

export { sourceLayout };
export type Point = readonly [number, number] | readonly number[];
export const FACULTY_MAIN = "274489894";
export const FACULTY_LABS = "327428698";
// Selected study area: CyT, the two neighbouring pitches and nearby parking.
// This is a presentation crop, not a surveyed property boundary.
export const sectorBounds = { minX: -140, maxX: 115, minZ: -205, maxZ: 95 };

export function clipSegment(a: Point, b: Point, bounds = sectorBounds): number[][] | null {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  let start = 0, end = 1;
  const limits = [[-dx, a[0] - bounds.minX], [dx, bounds.maxX - a[0]],
    [-dz, a[1] - bounds.minZ], [dz, bounds.maxZ - a[1]]];
  for (const [p, q] of limits) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) start = Math.max(start, t); else end = Math.min(end, t);
    if (start > end) return null;
  }
  return [[a[0] + dx * start, a[1] + dz * start], [a[0] + dx * end, a[1] + dz * end]];
}

function clipRoad(points: number[][]) {
  const parts: number[][][] = [];
  let current: number[][] = [];
  for (let i = 1; i < points.length; i++) {
    const segment = clipSegment(points[i - 1], points[i]);
    if (!segment) { current = []; continue; }
    if (current.length && Math.hypot(current.at(-1)![0] - segment[0][0], current.at(-1)![1] - segment[0][1]) < 0.001) current.push(segment[1]);
    else { current = segment; parts.push(current); }
  }
  return parts;
}

export const layout = {
  ...sourceLayout,
  boundary: [[sectorBounds.minX, sectorBounds.minZ], [sectorBounds.maxX, sectorBounds.minZ],
    [sectorBounds.maxX, sectorBounds.maxZ], [sectorBounds.minX, sectorBounds.maxZ], [sectorBounds.minX, sectorBounds.minZ]],
  buildings: sourceLayout.buildings.filter((b) => [FACULTY_MAIN, FACULTY_LABS].includes(b.id)),
  parking: sourceLayout.parking.filter((p) => ["274489888", "327428697"].includes(p.id)),
  pitches: sourceLayout.pitches.filter((p) => ["793370300", "793370301"].includes(p.id)),
  roads: sourceLayout.roads.filter((r) => ["29428768", "274489910", "594756081", "678429681", "678429682", "678429683", "1383036919"].includes(r.id))
    .flatMap((r) => clipRoad(r.points).map((points, i) => ({ ...r, id: `${r.id}-${i}`, points }))),
};
export const campusBounds = {
  minX: sectorBounds.minX - 12,
  maxX: sectorBounds.maxX + 12,
  minZ: sectorBounds.minZ - 12,
  maxZ: sectorBounds.maxZ + 12,
};
export const campusCenter = [
  (campusBounds.minX + campusBounds.maxX) / 2,
  (campusBounds.minZ + campusBounds.maxZ) / 2,
] as const;

export function insidePolygon(point: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, z] = polygon[i], [px, pz] = polygon[j];
    if ((z > point[1]) !== (pz > point[1]) &&
      point[0] < ((px - x) * (point[1] - z)) / (pz - z) + x) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1,
    ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dz);
}

export function footprintPose(id: string) {
  const p = layout.buildings.find((b) => b.id === id)!.points.slice(0, 4);
  if (p[1][0] < p[0][0]) p.push(...p.splice(0, 2));
  const x = p.reduce((s, q) => s + q[0], 0) / 4;
  const z = p.reduce((s, q) => s + q[1], 0) / 4;
  return {
    x, z,
    angle: Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]),
    length: Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]),
    width: Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]),
  };
}

/** Centro y orientación de la huella OSM del Bloque 1 (75,0 × 13,4 m). */
export const facultyPose = footprintPose(FACULTY_MAIN);

/** Plano de CyT (metros, centro del Bloque 1) → mundo. Solo gira y traslada: las medidas del
 * plano se conservan; no se estira hacia la huella OSM. */
export function facultyToWorld(position: readonly number[]): [number, number, number] {
  const p = facultyPose, x = position[0], z = position[2];
  return [p.x + x * Math.cos(p.angle) - z * Math.sin(p.angle), position[1],
    p.z + x * Math.sin(p.angle) + z * Math.cos(p.angle)];
}

export function mapPercent(position: readonly number[]) {
  return {
    left: ((position[0] - campusBounds.minX) / (campusBounds.maxX - campusBounds.minX)) * 100,
    top: ((position[2] - campusBounds.minZ) / (campusBounds.maxZ - campusBounds.minZ)) * 100,
  };
}
