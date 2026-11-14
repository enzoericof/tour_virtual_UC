import sourceLayout from "./campus-layout.json" with { type: "json" };

export { sourceLayout };
export type Point = readonly [number, number] | readonly number[];
export const FACULTY_MAIN = "274489894";
export const FACULTY_LABS = "327428698";
const sectorBuildings = sourceLayout.buildings.filter((b) => [FACULTY_MAIN, FACULTY_LABS].includes(b.id));

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
  const p = sectorBuildings.find((b) => b.id === id)!.points.slice(0, 4);
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

/** Plano de CyT (metros, centro de la huella OSM del Bloque 1) → mundo. Solo gira y traslada: las medidas del
 * plano se conservan; no se estira hacia la huella OSM. */
export function facultyToWorld(position: readonly number[]): [number, number, number] {
  const p = facultyPose, x = position[0], z = position[2];
  return [p.x + x * Math.cos(p.angle) - z * Math.sin(p.angle), position[1],
    p.z + x * Math.sin(p.angle) + z * Math.cos(p.angle)];
}

// Contorno de presentación en metros del plano de CyT.
const perimeterCorners = [[-45, -12], [-36, -24], [-14, -32], [14, -53], [51, -75],
  [94, -91], [113, -74], [134, -44], [144, -15], [145, 12], [128, 35], [94, 47],
  [69, 57], [46, 73], [20, 83], [-19, 75], [-35, 54], [-46, 23]].map(([x,z]) => [x > 90 ? x + 15 : x, z < -53 ? z - 10 : z]);
const perimeter = perimeterCorners.flatMap(([x, z], i) => {
  const [px, pz] = perimeterCorners.at(i - 1)!;
  const [nx, nz] = perimeterCorners[(i + 1) % perimeterCorners.length];
  const a = [x + (px - x) * 0.23, z + (pz - z) * 0.23];
  const b = [x + (nx - x) * 0.23, z + (nz - z) * 0.23];
  return Array.from({ length: 5 }, (_, step) => {
    const t = step / 4, s = 1 - t;
    const [worldX, , worldZ] = facultyToWorld([
      s * s * a[0] + 2 * s * t * x + t * t * b[0], 0,
      s * s * a[1] + 2 * s * t * z + t * t * b[1],
    ]);
    return [worldX, worldZ];
  });
});

export const layout = { boundary: [...perimeter, perimeter[0]], buildings: sectorBuildings };
const perimeterX = perimeter.map(([x]) => x), perimeterZ = perimeter.map(([, z]) => z);
export const campusBounds = {
  minX: Math.min(...perimeterX) - 12,
  maxX: Math.max(...perimeterX) + 12,
  minZ: Math.min(...perimeterZ) - 12,
  maxZ: Math.max(...perimeterZ) + 12,
};

export function mapPercent(position: readonly number[]) {
  return {
    left: ((position[0] - campusBounds.minX) / (campusBounds.maxX - campusBounds.minX)) * 100,
    top: ((position[2] - campusBounds.minZ) / (campusBounds.maxZ - campusBounds.minZ)) * 100,
  };
}
