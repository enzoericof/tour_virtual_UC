import { facultyToWorld, insidePolygon } from "./campus-geometry.ts";

/** Plano métrico de CyT, única geometría de la facultad.
 * Marco local: origen en el centro del Bloque 1, x a lo largo del bloque (hacia la plaza
 * techada), z hacia el área común 2 (sur), y vertical; metros. `facultyToWorld` lo apoya,
 * sin escalar, sobre la huella OSM del Bloque 1. Medidas del equipo (31/10/2026) y fuentes:
 * docs/base-geografica.md.
 */
export type Vec2 = readonly [number, number];
/** Rectángulo girado: centro, tamaño según sus propios ejes y giro respecto del Bloque 1. */
export type Rect = { center: Vec2; size: Vec2; angle: number };

export const FLOOR_HEIGHT = 3.5;
/** Bloque 1 (techo gris): 75 × 12 m, planta baja y tres pisos, galería al sur. Los módulos de
 * 5 m redondean los 5,14 m entre pilastras medidos en el escaneo del tercer piso. */
export const block1 = { length: 75, depth: 12, levels: 4, bay: 5, gallery: 2.5 } as const;
/** Bloque G («Bloque 2»): 65 × 12 m, planta baja y dos pisos, galería hacia el Bloque 1. */
export const blockG = { length: 65, depth: 12, levels: 3, bay: 5, gallery: 2.5 } as const;
/** Giro común del Bloque G, la plaza techada, Bedelía y la cantina respecto del Bloque 1:
 * 29,15°, la diferencia entre las huellas OSM de ambos bloques. */
export const gridAngle = -0.5088;

const axis = (angle: number): Vec2 => [Math.cos(angle), Math.sin(angle)];
const across = (angle: number): Vec2 => [-Math.sin(angle), Math.cos(angle)];
const add = (p: Vec2, ...terms: [Vec2, number][]): Vec2 =>
  terms.reduce<Vec2>((q, [v, k]) => [q[0] + v[0] * k, q[1] + v[1] * k], p);
const X = axis(gridAngle), Z = across(gridAngle);
const half = { x: block1.length / 2, z: block1.depth / 2 };

/** Esquinas en orden: atrás-izquierda, atrás-derecha, frente-derecha, frente-izquierda. */
export function rectCorners(r: Rect): Vec2[] {
  const u = axis(r.angle), v = across(r.angle), [w, d] = r.size;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) =>
    add(r.center, [u, (i * w) / 2], [v, (j * d) / 2]));
}
function rectFromCorner(corner: Vec2, size: Vec2, angle: number): Rect {
  return { center: add(corner, [axis(angle), size[0] / 2], [across(angle), size[1] / 2]), size, angle };
}

// Bloque G: su esquina NO está a 47 m de la esquina SO del Bloque 1 y su esquina NE a 11 m
// de la cara sur (las dos distancias medidas por el equipo).
const gDrop = 11 + blockG.length * Math.sin(-gridAngle);
const gNorthWest: Vec2 = [-half.x + Math.sqrt(47 ** 2 - gDrop ** 2), half.z + gDrop];
const gRect = rectFromCorner(gNorthWest, [blockG.length, blockG.depth], gridAngle);
const [, gNorthEast, gSouthEast, gSouthWest] = rectCorners(gRect);

// Plaza techada (15 × 10 m): alineada con Bedelía y la cantina, no con el Bloque 1. Sus lados
// oeste pasan por las esquinas este del Bloque 1, de modo que queda pegada a toda su cabecera.
const reach = block1.depth * -Math.sin(gridAngle);
const plazaWest: Vec2 = [half.x - reach * X[0], -half.z - reach * X[1]];
const plazaNorth = add(plazaWest, [X, 10]);
/** Cuadrado descubierto entre la plaza techada (oeste), Bedelía (norte) y la cantina (este). */
const square = { corner: plazaNorth, size: [17, 15] as Vec2 };
const cantinaFront = add(plazaNorth, [X, square.size[0]]);

export const facultyBlueprint = {
  main: { center: [0, 0], size: [block1.length, block1.depth], angle: 0 } as Rect,
  block2: gRect,
  coveredPlaza: rectFromCorner(plazaWest, [10, 15], gridAngle),
  openPlaza: [plazaNorth, cantinaFront, add(cantinaFront, [Z, square.size[1]]), add(plazaNorth, [Z, square.size[1]])] as Vec2[],
  bedelia: rectFromCorner(add(plazaNorth, [X, -1], [Z, -10]), [20, 10], gridAngle),
  // Fachada larga (18 m) hacia el cuadrado: el eje local x corre a lo largo de esa fachada y
  // el frente local (+z) mira al oeste, al cuadrado.
  cantina: rectFromCorner(add(cantinaFront, [Z, 3], [X, 12]), [18, 12], gridAngle + Math.PI / 2),
  electronics: { center: [88, -1], size: [26, 10], angle: gridAngle } as Rect,
  manfred: { center: [24, -15], size: [8, 6], angle: gridAngle } as Rect,
  /** Torre de baños: cilindro de 10 m partido en mitades norte y sur por una junta blanca. */
  tower: { center: [-32, 11.25] as Vec2, radius: 5, joint: 0.5 },
  /** Escalera tipo Pompidou fuera de la galería: arranca a 20 m de la esquina SE y sube un piso
   * por tramo hacia la torre; cada tramo termina en un descanso unido a la galería. */
  stair: { start: half.x - 20, z: half.z + 1, width: 1.8, run: 5.51, landing: 3.4, flights: 3 },
  /** Ascensor de 2 × 2 m a 4 m de la misma esquina, del mismo lado, para los cuatro niveles. */
  elevator: { center: [half.x - 5, half.z + 1] as Vec2, size: [2, 2] as Vec2 },
  courtyard: [[-half.x, half.z + 0.2], [half.x, half.z + 0.2], add(gNorthEast, [Z, -0.4]),
    add(gNorthWest, [Z, -0.4])] as Vec2[],
  common1: [[40.5, 10.8], [48.6, 6.2], [60.5, 30], [49, 33.5]] as Vec2[],
  // Cuña de césped entre el Bloque G y el estacionamiento OSM 274489888.
  parking: [add(gSouthWest, [Z, 5]), add(gSouthEast, [Z, 4]), [46.5, 42.5], [9, 78.8]] as Vec2[],
  /** Paso peatonal cubierto del área común 1 hacia el estacionamiento. */
  coveredWalk: [[41, 11], [55, 37]] as Vec2[],
  paths: [
    [[-26.5, 9.4], [5, 9.4], [36.5, 9.4], [41, 11]],
    [[5, 9.4], [11.3, 30.7]],
    [[11.3, 30.7], [37.6, 16], [41, 11]],
    [[41, 11], [55, 37]],
    [[55, 37], [30, 50]],
    [[39.5, -8.6], [30, -9], [12, -12], [0, -22]],
    [[39.5, -8.6], [40.5, 1], [41, 11]],
  ] as Vec2[][],
  trees: [[2, 19], [53, -5.5], [50, 22], [20, 62]] as Vec2[],
  picnic: [[-14, 15], [-8, 13.5], [-2, 13], [52.5, 13], [54, 26]] as Vec2[],
} as const;

export const facultyCorners = { gNorthWest, gNorthEast, gSouthEast, gSouthWest, plazaWest, plazaNorth };

// Centros de las fachadas que miran a las plazas, para ubicar al visitante frente a ellas.
const cantinaFacade = add(cantinaFront, [Z, 12]);
const bedeliaFacade = add(facultyBlueprint.bedelia.center, [Z, facultyBlueprint.bedelia.size[1] / 2]);
const manfredFacade = add(facultyBlueprint.manfred.center, [Z, facultyBlueprint.manfred.size[1] / 2]);
const gGallery = add(gRect.center, [Z, -blockG.depth / 2]);
const at = (p: Vec2, y: number): [number, number, number] => [p[0], y, p[1]];

export const facultyVisitPoints: Record<string, [number, number, number]> = {
  // Plaza techada, en la boca de la galería de planta baja del Bloque 1.
  acceso: [41.5, 0.15, 4.75],
  laboratorio: [-7.5, 0.1, -2.2],
  "pasillo-p3": [3, 10.5, 4.75],
  "aula-p3": [0, 10.5, -1.5],
  "cantina-cyt": at(add(cantinaFacade, [X, -9]), 0.1),
  bedelia: at(add(bedeliaFacade, [Z, 6]), 0.15),
  "sala-manfred": at(add(manfredFacade, [Z, 4.5]), 0.15),
  patio: [-2, 0.1, 20],
  jardin: [52, 0.1, 18],
  plaza: [42.5, 0.15, 1.5],
  "plaza-abierta": [49.5, 0.15, -3.5],
  "piso-1": [13, 3.5, 4.75],
  "piso-2": [13, 7, 4.75],
  banos: [-32, 0.15, 8.5],
  "bloque-g": at(add(gGallery, [Z, -3]), 0.1),
  estacionamiento: [23.2, 0.1, 54],
};

/** Hacia dónde mira el visitante al llegar (si falta, se usa una dirección por defecto). */
export const facultyVisitTargets: Record<string, [number, number, number]> = {
  acceso: [10, 1.6, 4.75],
  laboratorio: [-20, 1.2, -2.2],
  "aula-p3": [0, 11.2, -6],
  "cantina-cyt": at(cantinaFacade, 1.8),
  "plaza-abierta": at(cantinaFacade, 1.8),
  bedelia: at(bedeliaFacade, 1.6),
  "sala-manfred": at(manfredFacade, 1.6),
  plaza: [53, 1.6, -9],
  patio: [-30, 5, 10],
  jardin: [44, 2, 4],
  banos: [-32, 1.6, 14],
  "bloque-g": at(add(gGallery, [X, -14], [Z, 2]), 3),
  "pasillo-p3": [-20, 11.6, 4.75],
  "piso-1": [-10, 5.1, 4.75],
  "piso-2": [-10, 8.6, 4.75],
  estacionamiento: [8, 3, 30],
};

/** Polígono del plano (rectángulo o lista de puntos) en coordenadas del mundo (X, Z). */
export function worldPolygon(shape: Rect | readonly Vec2[]) {
  const points = "center" in shape ? rectCorners(shape) : shape;
  return points.map(([x, z]) => {
    const p = facultyToWorld([x, 0, z]);
    return [p[0], p[2]];
  });
}

export const facultyZone = worldPolygon([[-46, -26], [45, -30], [102, -14], [105, 14], [66, 60],
  [8, 92], [-22, 66], [-46, 12]]);
export function inFacultyZone(points: readonly (readonly number[])[]) {
  const center = [points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length];
  return insidePolygon(center, facultyZone);
}
