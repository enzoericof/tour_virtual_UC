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
/** Escalinata de la plataforma al suelo: centro del borde de arriba, ancho y dirección de bajada. */
export type Steps = { top: Vec2; width: number; angle: number };

export const FLOOR_HEIGHT = 3.5;
/** Plataforma de la plaza techada, el cuadrado, Bedelía, la cantina y la Sala Manfred: a media
 * altura entre la planta baja y el primer piso del Bloque 1 (aclaración del equipo, 01/11/2026). */
export const PLAZA_LEVEL = FLOOR_HEIGHT / 2;
/** Recorrido de cada escalinata de la plataforma: diez escalones de 17,5 × 30 cm. */
export const STEPS_RUN = 3;
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
/** Punto en coordenadas locales (x, z) de un rectángulo → plano. */
const fromRect = (r: Rect, [x, z]: Vec2): Vec2 => add(r.center, [axis(r.angle), x], [across(r.angle), z]);
/** Punto del segmento ab con abscisa x. */
export function pointAtX(a: Vec2, b: Vec2, x: number): Vec2 {
  return [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
}
/** Planta local de un recinto de w × d cuyo lado +z es un arco de flecha `bulge`: fondo izquierdo,
 * fondo derecho y el arco de derecha a izquierda. */
export function bulgedOutline(w: number, d: number, bulge: number, segments = 12): Vec2[] {
  const radius = (w * w / 4 + bulge * bulge) / (2 * bulge), zc = d / 2 - radius, a = Math.asin(w / 2 / radius);
  const arc = Array.from({ length: segments + 1 }, (_, i): Vec2 => {
    const t = a - (2 * a * i) / segments;
    return [radius * Math.sin(t), zc + radius * Math.cos(t)];
  });
  return [[-w / 2, -d / 2], [w / 2, -d / 2], ...arc];
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
const coveredPlaza = rectFromCorner(plazaWest, [10, 15], gridAngle);
const [, , plazaEast, plazaSouth] = rectCorners(coveredPlaza);
/** Cuadrado descubierto entre la plaza techada (oeste), Bedelía (norte) y la cantina (este). */
const square = { corner: plazaNorth, size: [17, 15] as Vec2 };
const cantinaFront = add(plazaNorth, [X, square.size[0]]);
// Fachada larga (18 m) hacia el cuadrado: el eje local x corre a lo largo de esa fachada y
// el frente local (+z) mira al oeste, al cuadrado.
const cantina = rectFromCorner(add(cantinaFront, [Z, 3], [X, 12]), [18, 12], gridAngle + Math.PI / 2);
const bedeliaCorner = add(plazaNorth, [X, -1], [Z, -10]);
const bedelia = rectFromCorner(bedeliaCorner, [20, 10], gridAngle);
// Sala Manfred a 2 m de Bedelía, con el fondo alineado con el suyo; entre ambas, el pasillo.
const manfredCorner = add(bedeliaCorner, [X, -2 - 8]);
const corridor = rectFromCorner(add(bedeliaCorner, [X, -2]), [2, 10], gridAngle);
// Explanada entre el frente curvo de Manfred y la cara norte del Bloque 1.
const manfredWestOnBlock1 = add(manfredCorner, [Z, (-half.z - manfredCorner[1]) / Z[1]]);
const corridorFoot = add(bedeliaCorner, [X, -1], [Z, -STEPS_RUN]);
const squareSteps = add(plazaNorth, [X, 5], [Z, square.size[1]]);

export const facultyBlueprint = {
  main: { center: [0, 0], size: [block1.length, block1.depth], angle: 0 } as Rect,
  block2: gRect,
  coveredPlaza,
  openPlaza: [plazaNorth, cantinaFront, add(cantinaFront, [Z, square.size[1]]), add(plazaNorth, [Z, square.size[1]])] as Vec2[],
  bedelia,
  cantina,
  electronics: { center: [88, -1], size: [26, 10], angle: gridAngle } as Rect,
  /** Sala Manfred: auditorio de 8 × 6 m cuyo frente (+z local) es un arco de 1,5 m de flecha que
   * apunta a la plaza techada; la fachada vidriada da al pasillo de 2 m que la separa de Bedelía. */
  manfred: { ...rectFromCorner(manfredCorner, [8, 6], gridAngle), bulge: 1.5 },
  corridor,
  /** Plataforma a PLAZA_LEVEL: plaza techada (pegada a la cabecera este del Bloque 1), cuadrado
   * (con el rincón entre Bedelía y la cantina), Bedelía, cantina y Sala Manfred con su pasillo y la
   * explanada hasta la cara norte del Bloque 1. */
  platform: [
    [pointAtX(plazaWest, plazaNorth, half.x), plazaNorth, plazaEast, plazaSouth, pointAtX(plazaWest, plazaSouth, half.x)],
    [plazaNorth, add(plazaNorth, [X, 19]), add(plazaNorth, [X, 19], [Z, 3]), add(cantinaFront, [Z, 3]),
      add(cantinaFront, [Z, square.size[1]]), add(plazaNorth, [Z, square.size[1]])],
    rectCorners(bedelia),
    rectCorners(cantina),
    [manfredCorner, bedeliaCorner, add(bedeliaCorner, [Z, 10]), [half.x, -half.z], manfredWestOnBlock1],
  ] as Vec2[][],
  platformSteps: [
    // Hacia el ascensor y la galería de planta baja del Bloque 1 (foto IMG_5706).
    { top: add(plazaWest, [Z, 12.2]), width: 3, angle: gridAngle + Math.PI },
    // Hacia el área común 1, al sur del cuadrado.
    { top: squareSteps, width: 8, angle: gridAngle + Math.PI / 2 },
    // Salida norte del pasillo entre la Sala Manfred y Bedelía.
    { top: add(bedeliaCorner, [X, -1]), width: 2, angle: gridAngle - Math.PI / 2 },
  ] as Steps[],
  /** Escalera del primer piso a la plaza techada, por fuera de la cabecera este del Bloque 1: sale
   * del extremo de la galería (z de `top` a la cara sur) y baja hacia el norte; la cubre el alero
   * del bloque. */
  eastStair: { x: half.x + 0.85, width: 1.4, top: half.z - block1.gallery, run: 2.8 },
  /** Torre de baños en el extremo oeste: núcleo de 2 m de ancho que sale de la galería hacia el sur
   * y dos semicírculos de 4 m de radio a sus costados (10 m de punta a punta). `center`: eje del
   * núcleo y centro de los semicírculos, 2 m al sur del acceso. Entrando desde la galería, a la
   * derecha (oeste, `menSide`) hombres y a la izquierda mujeres, en todos los pisos. En planta baja
   * un anexo cuadrado sobresale 2 m al sur de la torre. */
  tower: { center: [-half.x + 5, half.z + 2 + 4] as Vec2, radius: 4, core: 2, menSide: -1, annex: { size: 8, beyond: 2 } },
  /** Escalera tipo Pompidou fuera de la galería: arranca a 20 m de la esquina SE y sube un piso
   * por tramo hacia la torre; cada tramo termina en un descanso unido a la galería. */
  stair: { start: half.x - 20, z: half.z + 1, width: 1.8, run: 5.51, landing: 3.4, flights: 3 },
  /** Ascensor de 2 × 2 m a 4 m de la misma esquina, del mismo lado, para los cuatro niveles. Su
   * caja de hormigón lleva tres murales (este, sur y oeste) hasta `mural` metros, en la mitad
   * superior entre el primer y el segundo piso. */
  elevator: { center: [half.x - 5, half.z + 1] as Vec2, size: [2, 2] as Vec2, mural: 6.5 },
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
    // Del pie de la escalinata norte del pasillo de Manfred hacia el oeste.
    [corridorFoot, [12, -12], [0, -22]],
    // Subida a la plataforma por la escalinata del cuadrado, cruce de la plaza y pasillo de Manfred.
    [[41, 11], add(squareSteps, [Z, STEPS_RUN]), squareSteps, add(plazaNorth, [X, -2], [Z, 0.5]), corridorFoot],
  ] as Vec2[][],
  trees: [[2, 19], [53, -5.5], [50, 22], [20, 62]] as Vec2[],
  picnic: [[-14, 15], [-8, 13.5], [-2, 13], [52.5, 13], [54, 26]] as Vec2[],
} as const;

export const facultyCorners = { gNorthWest, gNorthEast, gSouthEast, gSouthWest, plazaWest, plazaNorth };

/** Contorno de la torre de baños: núcleo desde la galería y los dos semicírculos. */
export function towerOutline(segments = 12): Vec2[] {
  const { center: [cx, cz], radius: r, core } = facultyBlueprint.tower, c = core / 2;
  const arc = (side: number) => Array.from({ length: segments + 1 }, (_, i): Vec2 => {
    const a = -Math.PI / 2 + (Math.PI * i) / segments;
    return [cx + side * (c + r * Math.cos(a)), cz + r * Math.sin(a)];
  });
  return [[cx - c, half.z], [cx + c, half.z], ...arc(1), ...arc(-1).reverse()];
}
/** Anexo cuadrado de planta baja de la torre, que sobresale `beyond` metros al sur. */
export function towerAnnex(): Vec2[] {
  const { center: [cx, cz], radius, annex: { size, beyond } } = facultyBlueprint.tower, south = cz + radius + beyond;
  return [[cx - size / 2, south - size], [cx + size / 2, south - size], [cx + size / 2, south], [cx - size / 2, south]];
}
/** Contorno de la Sala Manfred en el plano. */
export function manfredOutline(segments = 12): Vec2[] {
  const { size: [w, d], bulge } = facultyBlueprint.manfred;
  return bulgedOutline(w, d, bulge, segments).map((p) => fromRect(facultyBlueprint.manfred, p));
}

// Centros de las fachadas que miran a las plazas, para ubicar al visitante frente a ellas.
const cantinaFacade = add(cantinaFront, [Z, 12]);
const bedeliaFacade = add(bedelia.center, [Z, bedelia.size[1] / 2]);
const gGallery = add(gRect.center, [Z, -blockG.depth / 2]);
const towerX = facultyBlueprint.tower.center[0];
const at = (p: Vec2, y: number): [number, number, number] => [p[0], y, p[1]];
/** Altura de llegada de los puntos sobre la plataforma. */
const onPlatform = PLAZA_LEVEL + 0.15;

export const facultyVisitPoints: Record<string, [number, number, number]> = {
  // Plaza techada, frente al ascensor de los murales y la galería de planta baja.
  acceso: [41.8, onPlatform, 6],
  laboratorio: [-7.5, 0.1, -2.2],
  "pasillo-p3": [3, 10.5, 4.75],
  "aula-p3": [0, 10.5, -1.5],
  "cantina-cyt": at(add(cantinaFacade, [X, -9]), onPlatform),
  bedelia: at(add(bedeliaFacade, [Z, 6]), onPlatform),
  // Boca del pasillo entre Manfred y Bedelía, como en las fotos IMG_5685 e IMG_5686.
  "sala-manfred": at(fromRect(corridor, [0, 4]), onPlatform),
  patio: [-2, 0.1, 20],
  jardin: [52, 0.1, 18],
  plaza: [42.5, onPlatform, 1.5],
  "plaza-abierta": [49.5, onPlatform, -3.5],
  "piso-1": [13, 3.5, 4.75],
  "piso-2": [13, 7, 4.75],
  // Acceso de la torre desde la galería, entre las puertas de ambos baños.
  banos: [towerX, 0.15, half.z + 1],
  "bloque-g": at(add(gGallery, [Z, -3]), 0.1),
  estacionamiento: [23.2, 0.1, 54],
};

/** Hacia dónde mira el visitante al llegar (si falta, se usa una dirección por defecto). */
export const facultyVisitTargets: Record<string, [number, number, number]> = {
  acceso: [26, 2.4, 6],
  laboratorio: [-20, 1.2, -2.2],
  "aula-p3": [0, 11.2, -6],
  "cantina-cyt": at(cantinaFacade, PLAZA_LEVEL + 1.8),
  "plaza-abierta": at(cantinaFacade, PLAZA_LEVEL + 1.8),
  bedelia: at(bedeliaFacade, PLAZA_LEVEL + 1.6),
  "sala-manfred": at(fromRect(corridor, [-0.6, -3]), PLAZA_LEVEL + 1.5),
  plaza: [53, PLAZA_LEVEL + 1.6, -9],
  patio: [-30, 5, 10],
  jardin: [44, 2, 4],
  banos: [towerX, 1.4, facultyBlueprint.tower.center[1] + 4],
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
