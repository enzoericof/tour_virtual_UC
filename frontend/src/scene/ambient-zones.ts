import { facultyToWorld } from "../data/campus-geometry.ts";
import {
  FLOOR_HEIGHT,
  block1,
  blockG,
  facultyBlueprint as plan,
  fromRect,
  type Rect,
} from "../data/faculty-blueprint.ts";

/**
 * Zonas del sonido ambiente del recorrido: pajaritos en los jardines, gente en la
 * cantina y la plaza techada, y murmullo de clases detrás de las puertas de las aulas.
 *
 * Cada zona es un punto con un radio de audición y un nivel máximo. Estas cuentas son
 * datos puros, sin Web Audio: `scene/ambient-audio.ts` solo aplica los números, así que
 * el reparto de niveles se puede probar en Node.
 */

export type AmbientKind = "birds" | "chatter" | "murmur" | "crickets";
export type AmbientTheme = "light" | "dark";
export type AmbientLevels = Record<AmbientKind, number>;

export type AmbientZone = {
  kind: AmbientKind;
  center: readonly [number, number, number];
  /** Distancia a la que la fuente deja de oírse. */
  radius: number;
  /** Nivel con el visitante encima de la fuente (0..1). */
  gain: number;
  /** Diferencia de altura máxima: evita escuchar la clase del piso de arriba. */
  vertical: number;
  theme?: AmbientTheme;
};

/** Punto en coordenadas del plano de CyT (metros) pasado al mundo. */
const world = (x: number, z: number, y = 0): [number, number, number] => facultyToWorld([x, y, z]);

const zone = (
  kind: AmbientKind,
  center: readonly [number, number, number],
  radius: number,
  gain: number,
  vertical = Infinity,
  theme?: AmbientTheme,
): AmbientZone => ({ kind, center, radius, gain, vertical, theme });

const rectCenter = (rect: Rect, y = 1.5) => world(rect.center[0], rect.center[1], y);

/** Una fuente por puerta de aula, en cada piso del bloque. */
function classroomZones(rect: Rect, floors: readonly { doors: readonly number[] }[], zWall: number): AmbientZone[] {
  const zones: AmbientZone[] = [];
  for (const [level, floor] of floors.entries())
    for (const door of floor.doors) {
      const [x, z] = fromRect(rect, [door, zWall]);
      // La clase se oye desde la galería, del otro lado de la pared: poca altura y radio corto.
      zones.push(zone("murmur", world(x, z, level * FLOOR_HEIGHT + 1.35), 4.2, 0.55, 2.4));
    }
  return zones;
}

/** Copas de los árboles: los pájaros se oyen desde el jardín que rodean. */
const birdTrees = [
  ...plan.cantinaGarden.trees,
  ...plan.courtyardTrees,
  plan.tree1,
  plan.tree2,
  plan.tree3,
  plan.courtyardCT,
  plan.blockGCourtyard.addedTree,
];

export const ambientZones: readonly AmbientZone[] = [
  // Jardines y arbolado: pájaros de día, grillos de noche.
  ...birdTrees.flatMap(([x, z]): AmbientZone[] => [
    zone("birds", world(x, z, 3), 12, 0.45, Infinity, "light"),
    zone("crickets", world(x, z, 1.5), 15, 0.35, Infinity, "dark"),
  ]),
  // Gente: cantina y su terraza, plaza techada, pasillo de la plaza y mesas del jardín.
  zone("chatter", rectCenter(plan.cantina), 17, 0.85, 3.5),
  zone("chatter", rectCenter(plan.coveredPlaza), 13, 0.7, 3.5),
  zone("chatter", world(plan.plazaPassage.foot[0], plan.plazaPassage.foot[1], 1.5), 11, 0.45, 3.5),
  ...plan.picnic.map(([x, z]) => zone("chatter", world(x, z, 1.5), 7, 0.35, 3.5)),
  // Clases: una fuente por puerta del Bloque 1 y del Bloque G.
  ...classroomZones(plan.main, plan.rooms.main, block1.depth / 2 - block1.gallery),
  ...classroomZones(plan.block2, plan.rooms.block2, -(blockG.depth / 2 - blockG.gallery)),
];

/** Nivel de cada familia de sonidos en un punto; 0 cuando ninguna zona llega. */
export function ambientLevels(
  position: { x: number; y: number; z: number },
  theme: AmbientTheme,
  zones: readonly AmbientZone[] = ambientZones,
): AmbientLevels {
  const levels: AmbientLevels = { birds: 0, chatter: 0, murmur: 0, crickets: 0 };
  for (const zone of zones) {
    if (zone.theme && zone.theme !== theme) continue;
    const dy = position.y - zone.center[1];
    if (Math.abs(dy) >= zone.vertical) continue;
    const distance = Math.hypot(position.x - zone.center[0], dy, position.z - zone.center[2]);
    if (distance >= zone.radius) continue;
    // smoothstep: entra y sale sin saltos al caminar cerca del borde del radio
    const t = 1 - distance / zone.radius;
    const level = zone.gain * t * t * (3 - 2 * t);
    if (level > levels[zone.kind]) levels[zone.kind] = level;
  }
  return levels;
}
