import layout from "./campus-layout.json" with { type: "json" };

export { layout };
export type Point = readonly [number, number] | readonly number[];
export const FACULTY_MAIN = "274489894";
export const FACULTY_LABS = "327428698";
export const campusBounds = {
  minX: Math.min(...layout.boundary.map((p) => p[0])) - 25,
  maxX: Math.max(...layout.boundary.map((p) => p[0])) + 25,
  minZ: Math.min(...layout.boundary.map((p) => p[1])) - 25,
  maxZ: Math.max(...layout.boundary.map((p) => p[1])) + 25,
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

export function footprintPose(id: string, width: number, depth: number) {
  const p = layout.buildings.find((b) => b.id === id)!.points.slice(0, 4);
  if (p[1][0] < p[0][0]) p.push(...p.splice(0, 2));
  const x = p.reduce((s, q) => s + q[0], 0) / 4;
  const z = p.reduce((s, q) => s + q[1], 0) / 4;
  return {
    x, z,
    angle: Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]),
    scaleX: Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) / width,
    scaleZ: Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]) / depth,
  };
}

export const facultyPose = footprintPose(FACULTY_MAIN, 64, 13);

export function facultyToWorld(position: readonly number[]): [number, number, number] {
  const p = facultyPose, x = position[0] * p.scaleX, z = (position[2] + 5.2) * p.scaleZ;
  return [p.x + x * Math.cos(p.angle) - z * Math.sin(p.angle), position[1],
    p.z + x * Math.sin(p.angle) + z * Math.cos(p.angle)];
}

export function mapPercent(position: readonly number[]) {
  return {
    left: ((position[0] - campusBounds.minX) / (campusBounds.maxX - campusBounds.minX)) * 100,
    top: ((position[2] - campusBounds.minZ) / (campusBounds.maxZ - campusBounds.minZ)) * 100,
  };
}
