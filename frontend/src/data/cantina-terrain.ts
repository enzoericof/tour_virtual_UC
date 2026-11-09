import { facultyBlueprint as plan, fromRect, PLAZA_LEVEL, type Vec2 } from "./faculty-blueprint.ts";

// Coordenadas locales de cantina; alturas absolutas sobre el suelo del campus.
const beds = [[-12, 16, 10, 28], [9.5, 15.5, -6, 10]] as const;
const transition = 10;
export function inCantina([x, z]: Vec2): Vec2 {
  const { center, angle } = plan.cantina, dx = x - center[0], dz = z - center[1];
  return [dx * Math.cos(angle) + dz * Math.sin(angle), -dx * Math.sin(angle) + dz * Math.cos(angle)];
}
const walk = plan.bedeliaWalk;
const levelStrips = [
  { a: inCantina(plan.bedeliaLawnEdge[0]), b: inCantina(plan.bedeliaLawnEdge[1]), margin: 1.3 },
  { a: inCantina(fromRect(walk, [-walk.size[0] / 2, 0])), b: inCantina(fromRect(walk, [walk.size[0] / 2, 0])),
    margin: walk.size[1] / 2 + 0.8 },
];
// Fuera del sendero, el césped recupera gradualmente la altura del jardín.
const blend = 7;
const bounds = [...beds, ...levelStrips.map(({ a, b, margin }) => [
  Math.min(a[0], b[0]) - margin, Math.max(a[0], b[0]) + margin,
  Math.min(a[1], b[1]) - margin, Math.max(a[1], b[1]) + margin,
])];
export const gardenBounds = {
  minX: Math.floor(Math.min(...bounds.map((r) => r[0])) - transition - 1),
  maxX: Math.ceil(Math.max(...bounds.map((r) => r[1])) + transition + 1),
  minZ: Math.floor(Math.min(...bounds.map((r) => r[2])) - transition - 1),
  maxZ: Math.ceil(Math.max(...bounds.map((r) => r[3])) + transition + 1),
};
export function gardenHeight(x: number, z: number): number {
  const rise = Math.max(...beds.map(([x0, x1, z0, z1]) => {
    const distance = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
    const t = Math.max(0, 1 - distance / transition);
    return PLAZA_LEVEL * t * t * (3 - 2 * t);
  }));
  // Jardín 45 cm bajo el pavimento; bordes a 8 mm del suelo, sin aristas suspendidas.
  let height = Math.min(rise, PLAZA_LEVEL - 0.45) + 0.008;
  for (const { a, b, margin } of levelStrips) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const distance = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
    const weight = 1 - Math.max(0, Math.min(1, (distance - margin) / blend));
    height = Math.max(height, (PLAZA_LEVEL - 0.01) * weight * weight * (3 - 2 * weight));
  }
  return height;
}
