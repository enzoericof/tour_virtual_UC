import { PLAZA_LEVEL } from "./faculty-blueprint.ts";

// Coordenadas locales de cantina; alturas absolutas sobre el suelo del campus.
const beds = [[-12, 16, 10, 28], [9.5, 15.5, -6, 10]] as const;
const transition = 10;
export const gardenBounds = {
  minX: Math.floor(Math.min(...beds.map((r) => r[0])) - transition - 1),
  maxX: Math.ceil(Math.max(...beds.map((r) => r[1])) + transition + 1),
  minZ: Math.floor(Math.min(...beds.map((r) => r[2])) - transition - 1),
  maxZ: Math.ceil(Math.max(...beds.map((r) => r[3])) + transition + 1),
};
export function gardenHeight(x: number, z: number): number {
  const rise = Math.max(...beds.map(([x0, x1, z0, z1]) => {
    const distance = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
    const t = Math.max(0, 1 - distance / transition);
    return PLAZA_LEVEL * t * t * (3 - 2 * t);
  }));
  // Jardín 45 cm bajo el pavimento; bordes a 8 mm del suelo, sin aristas suspendidas.
  return Math.min(rise, PLAZA_LEVEL - 0.45) + 0.008;
}
