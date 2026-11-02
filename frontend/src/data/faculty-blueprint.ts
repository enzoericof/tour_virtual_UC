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
/** Aulas de un nivel, en x del bloque: extremos, tabiques interiores y centro de cada puerta. */
export type Rooms = { from: number; to: number; walls: number[]; doors: number[] };

export const FLOOR_HEIGHT = 3.5;
/** Plataforma de la plaza techada, el cuadrado, Bedelía, la cantina y la Sala Manfred, 1,40 m sobre la
 * planta baja del Bloque 1: el equipo la bajó un 20 % desde la media altura (1,75 m) el 01/11/2026. */
export const PLAZA_LEVEL = 1.4;
/** Recorrido de cada escalinata de la plataforma: ocho escalones de 17,5 × 30 cm. */
export const STEPS_RUN = 2.4;
/** Bloque 1 (techo gris): 75 × 12 m, planta baja y tres pisos, galería al sur. Los módulos de
 * 5 m redondean los 5,14 m entre pilastras medidos en el escaneo del tercer piso. Columnas del
 * borde de la galería cada 2,5 m, enteras hasta la cubierta (aclaración del 01/11/2026). */
export const block1 = { length: 75, depth: 12, levels: 4, bay: 5, gallery: 2.5, column: 2.5 } as const;
/** Bloque G («Bloque 2»): 65 × 12 m, planta baja y dos pisos, galería hacia el Bloque 1. */
export const blockG = { length: 65, depth: 12, levels: 3, bay: 5, gallery: 2.5 } as const;
/** Aulas por piso en ambos bloques, de anchos desiguales (aclaración del equipo, 01/11/2026). */
export const ROOMS_PER_FLOOR = 6;
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
/** Punto del segmento ab con ordenada z. */
const pointAtZ = (a: Vec2, b: Vec2, z: number): Vec2 => [a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]), z];
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
/** Aulas de un nivel entre `from` y `to`: anchos desiguales y una puerta por aula en un lugar distinto
 * en cada piso. Variación fija (no aleatoria) según `seed`; sin relevamiento, solo reproduce que las
 * aulas no son regulares. Las puertas esquivan las pilastras de los módulos de `bay` metros y quedan
 * al menos a 0,6 m de las del piso de abajo (`below`). */
export function classrooms(length: number, bay: number, from: number, to: number, seed: number, below: number[] = []): Rooms {
  const weights = Array.from({ length: ROOMS_PER_FLOOR }, (_, i) => 1 + 0.3 * Math.sin(seed * 1.7 + i * 2.39));
  const total = weights.reduce((s, w) => s + w, 0);
  const bounds = weights.reduce((xs, w) => [...xs, xs[xs.length - 1] + ((to - from) * w) / total], [from]);
  const pilasters = Array.from({ length: Math.round(length / bay) - 1 }, (_, k) => -length / 2 + (k + 1) * bay);
  const free = (x: number) => pilasters.every((p) => Math.abs(x - p) > 0.8) && below.every((d) => Math.abs(x - d) > 0.6);
  const doors = bounds.slice(0, -1).map((x0, i) => {
    const x1 = bounds[i + 1], preferred = x0 + 1 + (0.5 + 0.35 * Math.sin(seed * 2.3 + i * 1.37 + 1)) * (x1 - x0 - 2);
    // El primer lugar libre alrededor del preferido, a pasos de 0,2 m, sin acercarse a los tabiques.
    for (let k = 0; k < 40; k++) for (const x of [preferred + k * 0.2, preferred - k * 0.2])
      if (x > x0 + 1 && x < x1 - 1 && free(x)) return x;
    return preferred;
  });
  return { from, to, walls: bounds.slice(1, -1), doors };
}

// Bloque G: su esquina NO está a 47 m de la esquina SO del Bloque 1 y su esquina NE a 11 m
// de la cara sur (las dos distancias medidas por el equipo).
const gDrop = 11 + blockG.length * Math.sin(-gridAngle);
const gNorthWest: Vec2 = [-half.x + Math.sqrt(47 ** 2 - gDrop ** 2), half.z + gDrop];
const gRect = rectFromCorner(gNorthWest, [blockG.length, blockG.depth], gridAngle);
const [, gNorthEast, gSouthEast, gSouthWest] = rectCorners(gRect);

// Cabecera este del Bloque 1 (fotos IMG_5694 e IMG_5706; aclaraciones del 01/11/2026). Planta baja y
// primer piso terminan antes que los pisos 2 y 3, que la cubren. La escalera de la plaza al primer
// piso (2,8 m) sube hacia el sur bajo ese voladizo, por delante de la puerta del ascensor y dejando
// 0,65 m para las columnas de la cabecera; debajo queda la bodega. Al oeste, una línea de columnas
// donde terminan las aulas del primer piso y, entre ella y las aulas de planta baja, la rampa: baja
// hacia el sur, en sentido contrario a la escalera, desde la explanada frente a Manfred (2 m al norte
// del bloque, para que la pendiente no pase del 12 %) hasta la galería de planta baja.
const eastStair = { x: half.x - 0.65 - 1.4, width: 2.8, top: half.z - block1.gallery, run: 3.5 };
const stairWest = eastStair.x - eastStair.width / 2, stairEast = eastStair.x + eastStair.width / 2;
const stairFoot = eastStair.top - eastStair.run;
const recessColumns = stairWest - 0.3;
const ramp = { west: recessColumns - 0.25 - 1.6, east: recessColumns - 0.25, top: -half.z - 2 };
/** Extremo este de las aulas en cada nivel: planta baja y primer piso retraídos. */
const roomsEnd = [ramp.west - 0.15, recessColumns, half.x, half.x];

// Plaza techada (15 × 10 m): alineada con Bedelía y la cantina, no con el Bloque 1. Hasta el 01/11/2026
// sus lados oeste pasaban por las esquinas este del Bloque 1; el equipo aclaró que está más alejada:
// se corre 6,5 m al este con Bedelía, el cuadrado, la cantina y Electrónica, y su esquina oeste queda
// 1,4 m fuera de la cabecera. Entre ambas, la escalera, la rampa y los escalones de la galería.
const plazaShift = 6.5;
const reach = block1.depth * -Math.sin(gridAngle);
const plazaWest: Vec2 = [half.x - reach * X[0] + plazaShift, -half.z - reach * X[1]];
const plazaNorth = add(plazaWest, [X, 10]);
const coveredPlaza = rectFromCorner(plazaWest, [10, 15], gridAngle);
const [, , , plazaSouth] = rectCorners(coveredPlaza);
/** Cuadrado descubierto entre la plaza techada (oeste), Bedelía (norte) y la cantina (este). */
const square = { corner: plazaNorth, size: [22, 15] as Vec2 };
const cantinaFront = add(plazaNorth, [X, square.size[0]]);
// Fachada larga (18 m) hacia el cuadrado: el eje local x corre a lo largo de esa fachada y
// el frente local (+z) mira al oeste, al cuadrado.
// Retiro visual de 5 m solicitado por Horacio (02/11/2026); sin medida de campo.
const cantina = rectFromCorner(add(cantinaFront, [Z, 3], [X, 12]), [18, 12], gridAngle + Math.PI / 2);
/** Explanada de cantina: contorno quebrado de la foto IMG_5720, en su marco local.
 * Frente hacia +z; el tramo diagonal recorta el jardín como un hexágono invertido. */
export const cantinaForecourt = {
  outline: [[-10, 6], [10, 6], [10, 12], [5, 12], [-4, 16], [-10, 16]] as Vec2[],
  edge: [[-10, 16], [-4, 16], [5, 12], [10, 12]] as Vec2[],
  tree: [0, 21] as Vec2,
  // Borde del cuadrado hacia el jardín; termina antes del pilar de la plaza (z ≈ 28,35).
  sideSteps: { x: 3, from: 12.9, to: 27.4 },
};
// Unión pavimentada continua entre la plaza techada y la cantina. El recorte del
// jardín queda al costado; no debe cortar el recorrido principal (corrección de Horacio).
const openPlaza = [plazaNorth, cantinaFront, add(cantinaFront, [Z, square.size[1]]),
  add(plazaNorth, [Z, square.size[1]])];
const bedeliaCorner = add(plazaNorth, [X, -1], [Z, -10]);
const bedelia = rectFromCorner(bedeliaCorner, [20, 10], gridAngle);
const bedeliaWest = (z: number) => pointAtZ(bedeliaCorner, add(bedeliaCorner, [Z, 10]), z);
// Sala Manfred (12 × 9 m): escenario y pizarrón al norte y el frente curvo al sur hacia la rampa.
// Por foto in situ (zona_techada_y_manfred.HEIC) y coordenadas medidas en el campus, la sala se desplaza
// hacia la izquierda (oeste) para abrir el pasillo en (42.45, -12.92), dar lugar a la puerta de entrada
// al edificio en (44.64, -11.13) y orientar su entrada y marquesina hacia la plaza techada en (46.58, -5.52).
const manfredSize: Vec2 = [12, 9], manfredBulge = 1.5;
const manfredEast = bedeliaCorner[0] - 3.4, manfredFront = ramp.top - 2.5;
const manfredWest = manfredEast - manfredSize[0], manfredBack = manfredFront - manfredSize[1];
const corridor: Vec2[] = [[manfredEast, bedeliaCorner[1]], bedeliaCorner, bedeliaWest(manfredFront - manfredBulge),
  [manfredEast, manfredFront - manfredBulge]];
const corridorTop: Vec2 = [(manfredEast + bedeliaCorner[0]) / 2, bedeliaCorner[1]];
const corridorFoot = add(corridorTop, [[0, -1], STEPS_RUN]);
const squareSteps = fromRect(cantina, [-11, 22]);
const galleryStepsTop = half.x + STEPS_RUN;

export const facultyBlueprint = {
  main: { center: [0, 0], size: [block1.length, block1.depth], angle: 0 } as Rect,
  block2: gRect,
  coveredPlaza,
  openPlaza,
  bedelia,
  cantina,
  electronics: { center: [88 + plazaShift + 5 * X[0], -1 + 5 * X[1]], size: [26, 10], angle: gridAngle } as Rect,
  /** Sala Manfred: auditorio de 12 × 9 m con frente hacia la rampa y entrada/marquesina orientada a la plaza techada. */
  manfred: { center: [manfredEast - manfredSize[0] / 2, manfredFront - manfredSize[1] / 2] as Vec2, size: manfredSize, angle: 0, bulge: manfredBulge },
  /** Entrada y marquesina de Sala Manfred orientada hacia la plaza techada (foto zona_techada_y_manfred.HEIC). */
  manfredCanopy: [46.58, 2.88, -5.52] as const,
  /** Puerta de entrada al edificio en la galería oeste de Bedelía (foto zona_techada_y_manfred.HEIC). */
  buildingDoor: [44.64, 1.63, -11.13] as const,
  /** Pasillo cubierto entre Manfred y Bedelía hacia el norte. */
  corridor,
  /** Plataforma a PLAZA_LEVEL. El primer contorno reúne la Sala Manfred, su pasillo, la explanada
   * hasta la cara norte del Bloque 1 (cortada por la rampa), el rellano al pie de la escalera dentro
   * de la cabecera y la franja hasta la plaza techada; los demás son la plaza, el cuadrado (con el
   * rincón entre Bedelía y la cantina), Bedelía y la cantina. */
  platform: [
    [[manfredWest, manfredFront], [manfredEast, manfredFront], [manfredEast, bedeliaCorner[1]], bedeliaCorner,
      add(bedeliaCorner, [Z, 10]), plazaNorth, plazaWest, pointAtZ(plazaWest, plazaSouth, half.z),
      [galleryStepsTop, half.z], [galleryStepsTop, eastStair.top], [stairEast, eastStair.top], [stairEast, stairFoot],
      [ramp.east, stairFoot], [ramp.east, ramp.top], [ramp.west, ramp.top], [ramp.west, -half.z], [manfredWest, -half.z]],
    rectCorners(coveredPlaza),
    openPlaza,
    rectCorners(bedelia),
    rectCorners(cantina),
    cantinaForecourt.outline.map((p) => fromRect(cantina, p)),
  ] as Vec2[][],
  platformSteps: [
    // Prolongación de la galería de planta baja del Bloque 1 hasta la plataforma, junto al ascensor
    // (foto IMG_5706): ocupa todo el ancho de la galería.
    { top: [galleryStepsTop, half.z - block1.gallery / 2], width: block1.gallery, angle: Math.PI },
    // Hacia el área común 1, al sur del cuadrado.
    { top: squareSteps, width: 8, angle: gridAngle + Math.PI / 2 },
    // Salida norte del pasillo entre la Sala Manfred y Bedelía.
    { top: corridorTop, width: 2, angle: -Math.PI / 2 },
  ] as Steps[],
  /** Escalera de la plataforma al primer piso, dentro de la cabecera este y bajo los pisos 2 y 3
   * (foto IMG_5694): de 2,8 m, sube hacia el sur hasta la galería del primer piso (`top`, z de su
   * borde interior) frente a la puerta del ascensor. Debajo, la bodega. */
  eastStair,
  /** Cabecera este: extremo de las aulas por nivel (`roomsEnd`), la rampa (de `ramp.top`, al norte del
   * bloque, a la galería de planta baja) y las columnas que sostienen los pisos 2 y 3 donde planta baja
   * y primer piso se retraen. */
  eastEnd: {
    roomsEnd, ramp,
    columns: [-half.z + 0.25, -1.25, eastStair.top - 0.25].flatMap((z) => [[recessColumns, z], [half.x - 0.25, z]] as Vec2[]),
  },
  /** Seis aulas por piso en cada bloque, cada piso con otra distribución y otras puertas. */
  rooms: {
    main: roomsEnd.reduce<Rooms[]>((floors, end, level) =>
      [...floors, classrooms(block1.length, block1.bay, -half.x, end, level + 1, floors[level - 1]?.doors)], []),
    block2: Array.from({ length: blockG.levels }).reduce<Rooms[]>((floors, _, level) =>
      [...floors, classrooms(blockG.length, blockG.bay, -blockG.length / 2, blockG.length / 2, level + 7, floors[level - 1]?.doors)], []),
  },
  /** Torre de baños en el extremo oeste: núcleo de 2 m de ancho que sale de la galería hacia el sur
   * y dos semicírculos de 4 m de radio a sus costados (10 m de punta a punta). `center`: eje del
   * núcleo y centro de los semicírculos, 2 m al sur del acceso. Entrando desde la galería, a la
   * derecha (oeste, `menSide`) hombres y a la izquierda mujeres, en todos los pisos. En planta baja
   * un anexo cuadrado sobresale 2 m al sur de la torre. */
  tower: { center: [-half.x + 5, half.z + 2 + 4] as Vec2, radius: 4, core: 2, menSide: -1, annex: { size: 8, beyond: 2 } },
  /** Escalera tipo Pompidou fuera de la galería: arranca a 18 m de la esquina SE (el 01/11/2026 el
   * equipo la corrió 2 m al este y la ensanchó a 2,4 m) y sube un piso por tramo hacia la torre. Tramo
   * y descanso suman 10 m, cuatro intervalos de columna: cada descanso se une a la galería entre dos
   * columnas en los tres pisos. */
  stair: { start: half.x - 18, z: half.z + 0.1 + 1.2, width: 2.4, run: 6.5, landing: 3.5, flights: 3 },
  /** Ascensor de 2,5 × 2,5 m con el centro a 3,5 m de la misma esquina (el 01/11/2026 se corrió 1,5 m
   * al este y se agrandó), del lado de la galería y separado 0,1 m de ella para dejar las columnas.
   * Su puerta mira al norte, a la galería, en los cuatro niveles; en el primer piso, a la llegada de la
   * escalera de la plaza (IMG_5694). Caja de hormigón con tres murales (este, sur y oeste) hasta `mural`
   * metros, en la mitad superior entre el primer y el segundo piso. */
  elevator: { center: [half.x - 3.5, half.z + 0.1 + 1.25] as Vec2, size: [2.5, 2.5] as Vec2, mural: 6.5 },
  courtyard: [[-half.x, half.z + 0.2], [half.x, half.z + 0.2], add(gNorthEast, [Z, -0.4]),
    add(gNorthWest, [Z, -0.4])] as Vec2[],
  // Al sur de la plaza techada, que ya no lo invade al correrse al este.
  common1: [[44, 12.2], [56.5, 6], [62, 30], [49, 33.5]] as Vec2[],
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
    // Del pie de la escalinata norte del pasillo de Manfred hacia el oeste, por detrás de la sala.
    [corridorFoot, [manfredEast - 1.5, manfredBack - 2], [manfredWest - 2, manfredBack - 2], [12, -12], [0, -22]],
    // Subida a la plataforma por la escalinata del cuadrado, cruce de la plaza y pasillo de Manfred.
    [[41, 11], [47, 11.5], add(squareSteps, [Z, STEPS_RUN]), squareSteps, add(plazaNorth, [X, -2], [Z, 0.5]),
      corridorTop, corridorFoot],
  ] as Vec2[][],
  /** Árbol 1: mango frondoso en el patio este (foto árbol_1.HEIC, posición 1 en cómo_debe_ser.png). */
  tree1: [21.5, 15] as Vec2,
  /** Árbol 2: árbol autóctono alto en el patio oeste (foto árbol_2.HEIC, posición 2 en cómo_debe_ser.png). */
  tree2: [-20, 22] as Vec2,
  trees: [[2, 19], [50, 22], [20, 62]] as Vec2[],
  picnic: [[-14, 15], [-8, 13.5], [-2, 13], [24, 13.5], [52.5, 13], [54, 26]] as Vec2[],
  /** Canteros con banco del cuadrado. */
  planters: [[46.1 + plazaShift, -7.35], [54.4 + plazaShift, -10.9]] as Vec2[],
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
  // Rellano junto a la cabecera este: la bodega bajo la escalera, el ascensor y la galería de planta
  // baja, como en la foto IMG_5706.
  acceso: [half.x + 2.7, onPlatform, 1.8],
  laboratorio: [-7.5, 0.1, -2.2],
  "pasillo-p3": [3, 10.5, 4.75],
  "aula-p3": [0, 10.5, -1.5],
  "cantina-cyt": at(fromRect(cantina, [-2.5, 21]), onPlatform),
  bedelia: at(add(bedeliaFacade, [Z, 1]), onPlatform),
  // Boca del pasillo entre Manfred y Bedelía, como en las fotos IMG_5685 e IMG_5686.
  "sala-manfred": [manfredEast + 1.7, onPlatform, manfredFront + 0.5],
  patio: [-2, 0.1, 20],
  jardin: [52, 0.1, 18],
  plaza: [42.5 + plazaShift, onPlatform, 1.5],
  "plaza-abierta": at(fromRect(cantina, [-11, 20]), onPlatform),
  "piso-1": [13, 3.5, 4.75],
  "piso-2": [13, 7, 4.75],
  // Acceso de la torre desde la galería, entre las puertas de ambos baños.
  banos: [towerX, 0.15, half.z + 1],
  "bloque-g": at(add(gGallery, [Z, -3]), 0.1),
  estacionamiento: [23.2, 0.1, 54],
};

/** Hacia dónde mira el visitante al llegar (si falta, se usa una dirección por defecto). */
export const facultyVisitTargets: Record<string, [number, number, number]> = {
  acceso: [half.x - 3.5, 1.4, half.z + 0.5],
  laboratorio: [-20, 1.2, -2.2],
  "aula-p3": [0, 11.2, -6],
  "cantina-cyt": at(cantinaFacade, PLAZA_LEVEL + 1.8),
  "plaza-abierta": at(cantinaFacade, PLAZA_LEVEL + 1.8),
  bedelia: at(bedeliaFacade, PLAZA_LEVEL + 1.6),
  "sala-manfred": at(add(corridorTop, [[0, 1], 1]), PLAZA_LEVEL + 1.5),
  plaza: [53 + plazaShift, PLAZA_LEVEL + 1.6, -9],
  patio: [-30, 5, 10],
  jardin: [47, 2.5, 6],
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
