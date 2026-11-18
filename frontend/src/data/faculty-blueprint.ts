import { facultyToWorld, insidePolygon } from "./campus-geometry.ts";

/** Plano métrico de CyT, única geometría de la facultad.
 * Marco local: origen en el centro de la huella OSM del Bloque 1 (el bloque de 65 m queda corrido 5 m
 * hacia su cabecera este), x a lo largo del bloque (hacia la plaza
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
/** Nivel compartido de la plaza: cinco contrahuellas de 17,4 cm desde el piso rosado (0,03 m).
 * Corrección solicitada el 02/11/2026; sustituye la cota anterior de 1,40 m. */
export const PLAZA_LEVEL = 0.9;
export const ELEVATOR_LANDING_LEVEL = 0.03;
/** Recorrido horizontal de cada escalinata de la plataforma; sus peldaños dividen `PLAZA_LEVEL` en
 * contrahuellas de unos 17,5 cm. */
export const STEPS_RUN = 2.4;
/** Bloque 1 (techo gris): 65 × 12 m (medida del equipo del 02/11/2026; antes 75 m), planta baja y
 * tres pisos, galería al sur. Estructura cada 4,5 m: columnas del borde de la galería, enteras hasta
 * la cubierta, y pilastras de la pared de las aulas en las mismas líneas. Los 14 módulos dejan 1 m
 * en voladizo en cada extremo (`margin`). */
export const block1 = { length: 65, depth: 12, levels: 4, bay: 4.5, margin: 1, gallery: 2.5 } as const;
/** Bloque G («Bloque 2»): 65 × 12 m, planta baja y dos pisos, galería hacia el Bloque 1. */
export const blockG = { length: 65, depth: 12, levels: 3, bay: 5, margin: 0, gallery: 2.5 } as const;
/** Puerta doble de las aulas del Bloque 1 (IMG_5639; medida del equipo del 02/11/2026): dos hojas que
 * suman 1,7 m; la izquierda, fija, con una ventana cuadrada de 45 cm a 1,30 m del suelo, y la derecha
 * de abrir. Alto de hojas estimado en la foto; montante de dos paños de la mitad de alto que el estimado
 * inicial (pedido del usuario del 03/11/2026). */
export const classroomDoor = { width: 1.7, height: 2, frame: 0.06, window: 0.45, windowSill: 1.3, transom: 0.265 } as const;
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
// El origen sigue en el centro de la huella OSM (75 m). Al corregir el largo a 65 m se conservó la
// cabecera este, de la que se midieron el ascensor, las escaleras, la rampa y todo lo que sigue hacia
// la plaza (decisión del 02/11/2026): el bloque queda corrido 5 m al este y el extremo oeste, 10 m.
const east = 37.5, west = east - block1.length, half = { x: block1.length / 2, z: block1.depth / 2 };
/** Centro del Bloque 1 en el plano: sus elementos internos (aulas) van en x de su propio marco. */
const b1x = (east + west) / 2;

/** Líneas de la estructura de un bloque (columnas y pilastras), en x de su marco: cada `bay` metros,
 * desde `margin` metros de un extremo. */
export function structureLines(block: { length: number; bay: number; margin: number }): number[] {
  const count = Math.round((block.length - 2 * block.margin) / block.bay);
  return Array.from({ length: count + 1 }, (_, k) => -block.length / 2 + block.margin + k * block.bay);
}
/** Pilastras de la pared de las aulas: las líneas de la estructura que no caen en los extremos. */
export const pilasters = (block: { length: number; bay: number; margin: number }) =>
  structureLines(block).filter((x) => Math.abs(x) < block.length / 2 - 0.01);
/** Líneas de la estructura del Bloque 1 en x del plano. */
const lines1 = structureLines(block1).map((x) => x + b1x);

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
export const fromRect = (r: Rect, [x, z]: Vec2): Vec2 => add(r.center, [axis(r.angle), x], [across(r.angle), z]);
/** Punto del segmento ab con abscisa x. */
export function pointAtX(a: Vec2, b: Vec2, x: number): Vec2 {
  return [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
}
/** Punto del segmento ab con ordenada z. */
/** Planta local de un recinto de w × d cuyo lado +z es un arco de flecha `bulge`: fondo izquierdo,
 * fondo derecho y el arco de derecha a izquierda. */
export function bulgedOutline(w: number, d: number, bulge: number, segments = 12): Vec2[] {
  // Se conserva la firma para los consumidores; el cerramiento es de paños rectos.
  void segments;
  return [[-w/2-.8,-d/2],[w/2,-d/2],[w/2,d/2-bulge],
    [w/4,d/2+bulge],[-w/4-.8,d/2+bulge],[-w/2-2.1,d/2-bulge-1.3]];

}
/** Aulas de un nivel entre `from` y `to` (x del marco del bloque): anchos desiguales y una puerta por
 * aula en un lugar distinto en cada piso. Variación fija (no aleatoria) según `seed`; sin relevamiento,
 * solo reproduce que las aulas no son regulares. Cada puerta, de `door` metros de vano, esquiva las
 * pilastras (`pilasters`) y los tabiques y queda al menos a 0,6 m de las del piso de abajo (`below`). */
export function classrooms(pilasters: readonly number[], from: number, to: number, seed: number, door: number,
  below: number[] = []): Rooms {
  const weights = Array.from({ length: ROOMS_PER_FLOOR }, (_, i) => 1 + 0.3 * Math.sin(seed * 1.7 + i * 2.39));
  const total = weights.reduce((s, w) => s + w, 0);
  const bounds = weights.reduce((xs, w) => [...xs, xs[xs.length - 1] + ((to - from) * w) / total], [from]);
  const wall = door / 2 + 0.5, reach = door / 2 + 0.3;
  const free = (x: number) => pilasters.every((p) => Math.abs(x - p) > reach) && below.every((d) => Math.abs(x - d) > 0.6);
  const doors = bounds.slice(0, -1).map((x0, i) => {
    const x1 = bounds[i + 1], preferred = x0 + wall + (0.5 + 0.35 * Math.sin(seed * 2.3 + i * 1.37 + 1)) * (x1 - x0 - 2 * wall);
    // El primer lugar libre alrededor del preferido, a pasos de 0,2 m, sin acercarse a los tabiques.
    for (let k = 0; k < 40; k++) for (const x of [preferred + k * 0.2, preferred - k * 0.2])
      if (x > x0 + wall && x < x1 - wall && free(x)) return x;
    return preferred;
  });
  return { from, to, walls: bounds.slice(1, -1), doors };
}

// Bloque G: su esquina NE queda a 11 m de la cara sur del Bloque 1 y a 11,1 m de su esquina SE (medidas
// del equipo). Hasta el 02/11/2026 se ubicaba también a 47 m de la esquina SO del Bloque 1 de 75 m; con
// el largo corregido a 65 m conserva su lugar y esa distancia pasa a unos 44 m.
const gNorthEast: Vec2 = [east + Math.sqrt(11.1 ** 2 - 11 ** 2), half.z + 11];
const gNorthWest = add(gNorthEast, [X, -blockG.length]);
const gRect = rectFromCorner(gNorthWest, [blockG.length, blockG.depth], gridAngle);
const [, , gSouthEast, gSouthWest] = rectCorners(gRect);

// Cabecera este del Bloque 1 (fotos IMG_5694 e IMG_5706; aclaraciones del 01/11/2026). Planta baja y
// primer piso terminan antes que los pisos 2 y 3, que la cubren. La escalera de la plaza al primer
// piso (2,1 m, medida del equipo del 02/11/2026; antes 2,8) sube hacia el sur bajo ese voladizo, por
// delante de la puerta del ascensor y dejando 0,65 m para las columnas de la cabecera; debajo queda la
// bodega. Al oeste, una línea de columnas donde terminan las aulas del primer piso y, entre ella y las
// aulas de planta baja, la rampa: baja hacia el sur, en sentido contrario a la escalera, desde la
// explanada frente a Manfred (2 m al norte del bloque, para que la pendiente no pase del 12 %) hasta
// la galería de planta baja.
const eastStair = { x: east - 0.65 - 1.05, width: 2.1, top: half.z - block1.gallery, run: 3.5 };
const stairWest = eastStair.x - eastStair.width / 2, stairEast = eastStair.x + eastStair.width / 2;
const stairFoot = eastStair.top - eastStair.run;
const recessColumns = stairWest - 0.3;
const ramp = { west: recessColumns - 0.25 - 1.6, east: recessColumns - 0.25, top: -half.z };
/** Extremo este de las aulas en cada nivel (x del plano): planta baja y primer piso retraídos. */
const roomsEnd = [ramp.west - 0.15, recessColumns, east, east];

// Plaza techada (15 × 10 m): alineada con Bedelía y la cantina, no con el Bloque 1. Hasta el 01/11/2026
// sus lados oeste pasaban por las esquinas este del Bloque 1; el equipo aclaró que está más alejada:
// se corre 6,5 m al este con Bedelía, el cuadrado, la cantina y Electrónica, y su esquina oeste queda
// 1,4 m fuera de la cabecera. Entre ambas, la escalera, la rampa y los escalones de la galería.
const plazaShift = 6.5;
const reach = block1.depth * -Math.sin(gridAngle);
const plazaWest: Vec2 = [east - reach * X[0] + plazaShift, -half.z - reach * X[1]];
// Traslación conjunta hasta el borde de la galería administrativa (flecha verde).
const plazaGroupShift = -4.3;
const shiftPlaza = (p: Vec2): Vec2 => add(p, [Z, plazaGroupShift]);
const plazaNorth = shiftPlaza(add(plazaWest, [X, 10]));
// Retiro solicitado: una profundidad de escalera hacia la plaza (+x).
const accessRetreat = STEPS_RUN;
// Ajuste visual hacia el Bloque 1, según la flecha de la referencia del usuario.
const plazaLateralAdjustment = -0.8;
const galleryAnchor: Vec2 = [plazaWest[0] + accessRetreat + plazaLateralAdjustment, plazaWest[1]];
// Cubierta retirada 3 m hacia administración y ensanchada hacia el patio.
const coveredPlaza = rectFromCorner(add(galleryAnchor, [Z, -3 + plazaGroupShift]), [13, 17.3], gridAngle);
/** Cuadrado descubierto entre la plaza techada (oeste), Bedelía (norte) y la cantina (este). */
const square = { corner: plazaNorth, size: [22, 15] as Vec2 };
const cantinaFront = add(plazaNorth, [X, square.size[0]]);
// Borde del pasillo junto al césped, entre el lateral de Bedelía y la cantina.
const bedeliaLawnEnd = add(plazaNorth, [X, 20], [Z, -15]);
// Fachada larga (18 m) hacia el cuadrado: el eje local x corre a lo largo de esa fachada y
// el frente local (+z) mira al oeste, al cuadrado.
// Retiro visual de 5 m solicitado por Horacio (02/11/2026); sin medida de campo.
const cantinaOriginal = rectFromCorner(add(cantinaFront, [Z, 3], [X, 12]), [18, 12], gridAngle + Math.PI / 2);
/** Explanada de cantina: contorno quebrado de la foto IMG_5720, en su marco local.
 * Frente hacia +z; el tramo diagonal recorta el jardín como un hexágono invertido. */
export const cantinaForecourt = {
  outline: [[-10, 6], [10, 6], [10, 12], [5, 12], [-4, 16], [-10, 16]] as Vec2[],
  edge: [[-10, 16], [-4, 16], [5, 12], [10, 12]] as Vec2[],
  tree: [-4, 21] as Vec2,
  // Borde del cuadrado hacia el jardín; termina antes del pilar de la plaza (z ≈ 28,35).
  sideSteps: { x: 3, from: 12.9, to: 27.4 },
};
// Unión pavimentada continua entre la plaza techada y la cantina. El recorte del
// jardín queda al costado; no debe cortar el recorrido principal (corrección de Horacio).
const openPlaza = [plazaNorth, cantinaFront, add(cantinaFront, [Z, square.size[1]]),
  add(plazaNorth, [Z, square.size[1]])];
// Eje continuo del pasillo: la salida norte comparte dirección con la galería de la plaza.
const galleryWest = galleryAnchor;
const passagePoint = (along: number, across: number): Vec2 => add(galleryWest, [Z, along], [X, across]);
const bedeliaCorner = passagePoint(-20, 4.15);
const bedelia = rectFromCorner(bedeliaCorner, [30, 10], gridAngle);
// Alinear la fachada hacia la plaza con la cabecera de Bedelía, sin mover anexos.
const bedeliaEnd = fromRect(bedelia, [bedelia.size[0] / 2, 0]);
const originalFacade = fromRect(cantinaOriginal, [0, cantinaOriginal.size[1] / 2]);
const cantinaShift = (bedeliaEnd[0] - originalFacade[0]) * X[0]
  + (bedeliaEnd[1] - originalFacade[1]) * X[1];
const cantina = {...cantinaOriginal, center: add(cantinaOriginal.center, [X, cantinaShift])};
// El sendero prolonga la galería por su cabecera este (vistas de ida y vuelta del 09/11).
const bedeliaGalleryDepth = 2.7;
const bedeliaWalk = rectFromCorner(fromRect(bedelia, [bedelia.size[0] / 2 + 0.5, bedelia.size[1] / 2]),
  [19.6, bedeliaGalleryDepth], bedelia.angle);
const manfredSize: Vec2 = [12, 9], manfredBulge = 1.5;
// Frente curvo hacia el costado del pasillo (+X), no atravesado delante de su salida.
const manfredRect: Rect = {center: passagePoint(-18, -6.8), size: manfredSize, angle: gridAngle-Math.PI/2};
const mfCorners=rectCorners(manfredRect);
const manfredEast=Math.max(...mfCorners.map(p=>p[0])), manfredWest=Math.min(...mfCorners.map(p=>p[0]));
const manfredFront=Math.max(...mfCorners.map(p=>p[1])), manfredBack=Math.min(...mfCorners.map(p=>p[1]));
const corridor: Vec2[] = [passagePoint(-22,-.25),passagePoint(-22,3.9),passagePoint(0,3.9),passagePoint(0,-.25)];
const corridorTop=passagePoint(-22,1.825);
const corridorFoot=add(corridorTop,[Z,-STEPS_RUN]);
// Borde sur del cuadrado, donde bajan los escalones de la cantina hacia el área común 1 (la escalinata
// recta que había aquí se retiró con la explanada de la cantina, 02/11/2026).
const squareSteps = fromRect(cantina, [-11, 22]);
const stairSideEndZ = 5.2;
// El borde superior queda bajo el alero de la galería, a 0,20 m del límite de la plaza.
const stairSideTop = add(galleryWest, [X, -0.2]);
/** Brazo longitudinal paralelo a la plaza, con retorno hasta el muro de la bodega. */
export function elevatorStairEdge(distance: number): Vec2[] {
  const side = add(stairSideTop, [X, distance - STEPS_RUN]);
  const atZ = (z: number) => add(side, [Z, (z - side[1]) / Z[1]]);
  const returnZ = 3.3 - distance;
  return [atZ(stairSideEndZ), atZ(returnZ), [stairEast, returnZ]];
}
const elevatorUpperEdge = elevatorStairEdge(STEPS_RUN);
const plazaFloor = rectCorners(coveredPlaza);
const plazaStairReturnZ = elevatorUpperEdge[1][1];
const plazaStairJoin = add(plazaFloor[0], [Z, (plazaStairReturnZ - plazaFloor[0][1]) / Z[1]]);
const [landingFront, landingCorner, landingBlockEdge] = elevatorStairEdge(0);
const galleryInnerEdge = half.z - block1.gallery;
const landingCornerToEdge = (half.z - landingFront[1]) / (6.27 - landingFront[1]);
const pinkLandingOuter: Vec2 = [landingFront[0] + (42.73 - landingFront[0]) * landingCornerToEdge, half.z];
const pinkLanding: Vec2[] = [landingBlockEdge, landingCorner, landingFront, pinkLandingOuter,
  [east, half.z], [east, galleryInnerEdge], [stairEast, galleryInnerEdge]];
const stairWidth = (landingFront[1] - landingCorner[1]) / Z[1];
const stairTopMidpoint = add(landingFront, [Z, -stairWidth / 2], [X, STEPS_RUN]);
// Galería longitudinal: mismo eje que el lado largo de la plaza.
const galleryPoint = (along: number, inward: number): Vec2 =>
  [galleryWest[0] + Z[0] * along + X[0] * inward,
   galleryWest[1] + Z[1] * along + X[1] * inward];
// La escalerita y el toldo arrancan en la última pareja conservada de pilares.
const galleryLength = 10;
const galleryOutline = [galleryPoint(0, -0.25), galleryPoint(0, 3.9),
  galleryPoint(galleryLength, 3.9), galleryPoint(galleryLength, -0.25)];

// El caminero arranca al pie de los tres peldaños de la plaza y sigue el eje corto del Bloque G.
// Video del 04/11: salida centrada con el pasillo y los peldaños.
const coveredWalkStart = galleryPoint(galleryLength + 1.8, 2.05);
const coveredWalkEnd = add(coveredWalkStart, [Z, 30]);
const approachJunction = add(coveredWalkStart, [Z, 1.45], [X, -0.68]);
const pinkLandingExit: Vec2 = [pinkLandingOuter[0] - 0.9, half.z];
const courtyardLanding: Vec2 = [39.6, half.z];
const approachBend = add(coveredWalkStart, [Z, -1.55], [X, -5.05]);
const courtyardGalleryEnd: Vec2 = [36.5, 9.4];
const accessGarden = [[-3.35, 4.05], [-3.42, 2.8], [-2.5, 2.55], [-1.65, 2.43],
  [-0.78, 1.8], [-0.85, 2.58], [-1.6, 3.72], [-2.45, 4.05]]
  .map(([along, side]) => add(coveredWalkStart, [Z, along], [X, -side]))
  .map(([x, z]): Vec2 => [x, Math.max(z, 5.36 + Math.max(0, x - 44.35) * 0.66)]);

export const facultyBlueprint = {
  main: { center: [b1x, 0], size: [block1.length, block1.depth], angle: 0 } as Rect,
  block2: gRect,
  /** Escalera exterior junto al árbol de la Plaza de la Amistad. */
  blockGStair: { start: 13, halfRun: 2.8, width: 1.4 },
  coveredPlaza,
  coveredPlazaSeating: [
    { center: [0, -5] as Vec2, blue: true, sideChairs: false },
    { center: [4, -5] as Vec2, blue: true, sideChairs: false },
    { center: [0, 0] as Vec2, blue: false, sideChairs: false },
    { center: [4, 0] as Vec2, blue: true, sideChairs: false },
    { center: [0, 5] as Vec2, blue: false, sideChairs: true },
    { center: [4, 5] as Vec2, blue: false, sideChairs: false },
  ],
  /** Galería baja junto al ascensor, interpretada de IMG_5706/5707/5713.
   * Mantiene la cubierta metálica principal independiente y el paso a las escaleras. */
  plazaGallery: {
    outline: galleryOutline,
    length: galleryLength,
    width: 4.15,
    front: [galleryPoint(0, 0.25), galleryPoint(galleryLength, 0.25)] as Vec2[],

    roof: 4.65,
    metalRoofSetback: 1.1,
    // Cinco pilares repartidos hasta el extremo actual del pasillo.
    columns: [0.5, 5.25, 9.75].map(along => galleryPoint(along, 0.25)),
    offset: accessRetreat,
    garden: accessGarden,
    waterStation: { center: galleryPoint(4, 1.1), size: [0.58, 0.5], angle: gridAngle + Math.PI / 2 } as Rect,
    smallSteps: { center: galleryPoint(galleryLength, 2.05), angle: gridAngle, direction: Z, width: 2.2, run: 1.8, bottom: 0.3, count: 3 },
    // Desde el borde del pasillo y el rellano, el sendero bordea el cantero hasta el toldo.
    approach: {
      start: pinkLandingExit,
      bend: [approachBend, add(approachBend, [Z, 1.28], [X, 0.3]),
        add(approachJunction, [X, -1.65]), approachJunction] as [Vec2, Vec2, Vec2, Vec2],
      courtyardLanding,
    },
  },
  openPlaza,
  plazaPassage: { start: passagePoint(0, 1.825), target: passagePoint(-32, 1.825), foot: corridorFoot },
  bedelia,
  bedeliaWalk,
  bedeliaGalleryDepth,
  bedeliaLawnEdge: [bedeliaLawnEnd, cantinaFront] as const,
  cantina,
  annexAnchor: add(cantinaOriginal.center, [Z, -plazaGroupShift]),
  // La terraza lateral de cantina tiene 5 m y una escalera de 1,2 m.
  // Se dejan otros 3 m de jardín antes del DEI–LED.
  electronics: { center: add(cantinaOriginal.center, [X, 11.95], [Z, 19.9 - plazaGroupShift]), size: [28.8, 12], angle: gridAngle + Math.PI } as Rect,
  /** Sala Manfred: auditorio de 12 × 9 m con frente hacia la rampa y entrada/marquesina orientada a la plaza techada. */
  manfred: { ...manfredRect, bulge: manfredBulge },
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
    [[25, -8.8], [37, -8.8], galleryWest, plazaStairJoin, elevatorUpperEdge[2],
      [stairEast, stairFoot], [ramp.east, stairFoot], [ramp.east, ramp.top],
      [ramp.west, ramp.top], [25, -half.z]],
    corridor,
    // Franja exterior al frente curvo; nunca rellena el interior del auditorio.
    [...bulgedOutline(12, 9, manfredBulge).slice(2).map(p => fromRect(manfredRect, p)),
      passagePoint(-9.9, -.25), passagePoint(-24, -.25)],
    // Desembarco de la rampa y enlace con el extremo sur de Manfred.
    [[25,-8.8], [37,-8.8], passagePoint(-9.9,-.25), fromRect(manfredRect,[-8.1,1.7]),
      fromRect(manfredRect,[-6.8,-4.5])],
    [...plazaFloor, elevatorUpperEdge[0], elevatorUpperEdge[1], plazaStairJoin],
    // Unión lateral del pasillo recto con la plaza girada, sin grieta triangular.
    [plazaNorth, add(plazaNorth, [Z, -15]), bedeliaLawnEnd, cantinaFront],
    // Cierra la cuña que dejó el retiro de la plaza junto al frente de Bedelía.
    [plazaNorth, rectCorners(coveredPlaza)[1], rectCorners(coveredPlaza)[0]],
    openPlaza,
    rectCorners(bedelia),
    rectCorners(cantina),
    cantinaForecourt.outline.map((p) => fromRect(cantina, p)),
  ] as Vec2[][],
  /** Piso rosado continuo al pie de ambos brazos de la escalinata. */
  elevatorLanding: pinkLanding,
  platformSteps: [
    // Prolongación de la galería de planta baja del Bloque 1 hasta la plataforma, junto al ascensor
    // (foto IMG_5706): eje de subida por el brazo longitudinal.
    { top: stairTopMidpoint, width: stairWidth, angle: gridAngle + Math.PI },
    // Salida norte del pasillo entre la Sala Manfred y Bedelía.
    { top: corridorTop, width: 3.4, angle: gridAngle - Math.PI / 2 },
  ] as Steps[],
  /** Escalera de la plataforma al primer piso, de 2,10 m de ancho, frente al ascensor.
   * Corrección de Horacio: conservar eje y ancho originales, prolongando la bajada a lo
   * largo de la pared hacia la derecha en su vista; el desembarco superior queda fijo. */
  eastStair: { ...eastStair, run: 6 },
  /** Cabecera este: extremo de las aulas por nivel (`roomsEnd`), la rampa (de `ramp.top`, al norte del
   * bloque, a la galería de planta baja) y las columnas que sostienen los pisos 2 y 3 donde planta baja
   * y primer piso se retraen. */
  eastEnd: {
    roomsEnd, ramp,
    serviceColumn: [east - 0.25, -half.z + 0.25] as Vec2,
    columns: [-half.z + 0.25, -1.25, eastStair.top - 0.25].flatMap((z) => [[recessColumns, z], [east - 0.25, z]] as Vec2[])
      .filter(([, z]) => z !== -1.25),
  },
  /** Seis aulas por piso en cada bloque, cada piso con otra distribución y otras puertas; en x del
   * marco de cada bloque. Las del Bloque 1 tienen la puerta doble (`classroomDoor`) y las del Bloque G
   * una hoja de 1 m. */
  rooms: {
    main: roomsEnd.reduce<Rooms[]>((floors, end, level) =>
      [...floors, classrooms(pilasters(block1), -half.x, end - b1x, level + 1,
        classroomDoor.width + 2 * classroomDoor.frame, floors[level - 1]?.doors)], []),
    block2: Array.from({ length: blockG.levels }).reduce<Rooms[]>((floors, _, level) =>
      [...floors, classrooms(pilasters(blockG), -blockG.length / 2, blockG.length / 2, level + 7, 1, floors[level - 1]?.doors)], []),
  },
  /** Torre de baños en el extremo oeste: núcleo de 2 m entre dos alas curvas de 4 m de fondo radial.
   * El frente conecta cada baño con la galería. Mirando desde la galería, a la
   * derecha (oeste, `menSide`) hombres y a la izquierda mujeres, en todos los pisos. En planta baja
   * un anexo cuadrado sobresale 2 m al sur de la torre. */
  tower: { center: [west + 5.6, half.z + 2 + 4] as Vec2, radius: 4, radiusX: 4.6, core: 2, menSide: -1,
    entry: { halfWidth: 2.72, doorOffset: 1.36, doorWidth: 1.18, recess: 1.72, angle: Math.PI / 8,
      shoulderStart: 0.88, curveJoin: 0.94 },
    annex: { size: 8, beyond: 2 } },
  /** Escalera tipo Pompidou fuera de la galería: arranca a 18 m de la esquina SE (el 01/11/2026 el
   * equipo la corrió 2 m al este y la ensanchó a 2,4 m) y sube un piso por tramo hacia la torre. Tramo
   * (6 m, veinte peldaños de 30 cm) y descanso (3 m) suman 9 m, dos módulos de 4,5 m: cada descanso se
   * une a la galería entre dos columnas en los tres pisos. */
  stair: { start: east - 18, z: half.z + 0.1 + 1.2, width: 2.4, run: 6, landing: 3, flights: 3 },
  /** Ascensor de 2,5 × 2,5 m entre las dos últimas columnas de la galería, junto a la esquina SE (el
   * 02/11/2026 el equipo confirmó que ocupa ese módulo; su centro queda a 3,25 m de la esquina), del
   * lado de la galería y separado 0,1 m de ella para dejar las columnas. Su puerta mira al norte, a la
   * galería, en los cuatro niveles; en el primer piso, a la llegada de la escalera de la plaza
   * (IMG_5694). Caja revocada con tres murales (este, sur y oeste) hasta `mural` metros, en la mitad
   * superior entre el primer y el segundo piso. */
  elevator: { center: [(lines1[lines1.length - 2] + lines1[lines1.length - 1]) / 2, half.z + 0.1 + 1.25] as Vec2,
    size: [2.5, 2.5] as Vec2, mural: 6.5 },
  /** Paso peatonal cubierto del área común 1. */
  coveredWalk: [coveredWalkStart, coveredWalkEnd] as Vec2[],
  /** Ramal del toldo hacia la galería del Bloque G, sobre el sendero del patio. */
  blockGAwning: {
    // Mismo eje que la galería en todos los pisos; llega a la cabecera del bloque.
    junction: add(gNorthEast, [X, 13.18], [Z, blockG.gallery / 2]),
    end: add(gNorthEast, [Z, blockG.gallery / 2]),
  },
  paths: [
    [[-16, 9.4], [5, 9.4], courtyardGalleryEnd, courtyardLanding, pinkLandingExit],
    [[5, 9.4], [11.3, 30.7]],
    [[11.3, 30.7], [37.6, 16], courtyardGalleryEnd],
    [pinkLandingExit, approachBend, approachJunction, coveredWalkStart, coveredWalkEnd, [55, 37]],
    [[55, 37], [30, 50]],
    // Del pie de la escalinata norte del pasillo de Manfred hacia el oeste, por detrás de la sala.
    [corridorFoot, [manfredEast - 1.5, manfredBack - 2], [manfredWest - 2, manfredBack - 2], [12, -12], [0, -22]],
    // Subida a la plataforma por el borde sur del cuadrado, cruce de la plaza y pasillo de Manfred.
    [coveredWalkStart, squareSteps, add(plazaNorth, [X, -2], [Z, 0.5]),
      corridorTop, corridorFoot],
  ] as Vec2[][],
  /** Árbol 1: mango frondoso en el patio este (foto árbol_1.HEIC, posición 1 en cómo_debe_ser.png). */
  tree1: [21.5, 11] as Vec2,
  /** Árbol 2: árbol autóctono alto en el patio oeste (foto árbol_2.HEIC, posición 2 en cómo_debe_ser.png). */
  tree2: [-20, 22] as Vec2,
  /** Árbol frente a la cantina / pergolado de mesas */
  cantinaTree: fromRect(cantina, [12.5, 29]),
  tree3: [2, 19] as Vec2,
  courtyardCT: [-6, 22] as Vec2,
  courtyardTrees: [[-16, 31], [-2, 34]] as Vec2[],
  /** Patio frente al Bloque G, situado con el mural del ascensor como referencia. */
  blockGCourtyard: {
    addedTree: [30.4, 11] as Vec2,
    planter: { center: [25.3, 21.1], size: [1.7, 1.7], angle: gridAngle } as Rect,
    sign: { center: [41, 14], size: [1.2, 0.1], angle: -Math.PI / 2 - Math.PI / 6 } as Rect,
    terrace: { center: [27.9, 15.9], size: [10.2, 6.6], angle: 0 } as Rect,
    gravel: [[18.4, 9.52], [35.7, 9.52], [36.2, 10.4], [33, 12.6], [22.8, 12.6],
      [21.9, 16.9], [18.7, 16.1]] as Vec2[],
    // Cada centro genera el conjunto original de mesa, dos bancos y dos sillas.
    tables: [[25.45, 15.8], [30.3, 15.8]] as Vec2[],
    lamps: [[26.95, 17.3], [31.8, 17.3]] as Vec2[],
  },
  picnic: [[14, 25.8], [19, 28.5], [14.5, 20], [19, 22]].map(([x, z]) => fromRect(cantina, [x, z])),
  /** Jardín de mesas y parrilla: distribución estimada según la foto del 18/11. */
  cantinaGarden: {
    trees: [[12.5, 29], [11, 21.5], [22, 22]].map(([x, z]) => fromRect(cantina, [x, z])),
    grill: { center: fromRect(cantina, [15, 33]), size: [3.65, 1.45], angle: cantina.angle + 0.72 } as Rect,
  },
  /** Canteros con banco del cuadrado. */
  planters: [[54.4 + plazaShift, -10.9]].map(p => add([p[0], p[1]], [Z, 3.2])),
} as const;

export const facultyCorners = { gNorthWest, gNorthEast, gSouthEast, gSouthWest, plazaWest, plazaNorth };

/** Cada baño ocupa un ala curva y su mitad del núcleo hasta la puerta. */
export function towerRoomOutline(side: number, segments = 48): Vec2[] {
  const { center: [cx, cz], radius: r, radiusX, core, entry } = facultyBlueprint.tower, c = core / 2;
  const start = -entry.curveJoin;
  const arc = Array.from({ length: segments + 1 }, (_, i): Vec2 => {
    // Se incluye explícitamente la punta de cada ala para conservar su ancho en planta.
    const a = i <= segments / 2 ? start * (1 - 2 * i / segments) : Math.PI * (i / segments - 0.5);
    return [cx + side * (c + radiusX * Math.cos(a)), cz + r * Math.sin(a)];
  });
  return [...towerEntryFront(side), [cx + side * entry.halfWidth, half.z + entry.shoulderStart], ...arc, [cx, cz + r]];
}

export function towerEntryFront(side: number): [Vec2, Vec2] {
  const { center: [cx], entry } = facultyBlueprint.tower;
  const recess = half.z + entry.recess;
  return [[cx, recess], [cx + side * entry.halfWidth, recess - entry.halfWidth * Math.tan(entry.angle)]];
}

export function towerEntrance(side: number): Rect {
  const { center: [cx], entry } = facultyBlueprint.tower;
  return { center: [cx + side * entry.doorOffset, half.z + entry.recess - entry.doorOffset * Math.tan(entry.angle)],
    size: [entry.doorWidth, 0.24], angle: -side * entry.angle };
}

/** Contorno de la torre de baños, con un frente que une ambos baños a la galería. */
export function towerOutline(segments = 48): Vec2[] {
  const { center: [cx], entry } = facultyBlueprint.tower;
  return [[cx - entry.halfWidth, half.z], [cx + entry.halfWidth, half.z],
    ...towerRoomOutline(1, segments).slice(2, -1), ...towerRoomOutline(-1, segments).slice(2, -1).reverse()];
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
const cantinaFacade = fromRect(cantina, [0, cantina.size[1] / 2]);
const bedeliaFacade = add(bedelia.center, [Z, bedelia.size[1] / 2]);
const gGallery = add(gRect.center, [Z, -blockG.depth / 2]);
const at = (p: Vec2, y: number): [number, number, number] => [p[0], y, p[1]];
/** Altura de llegada de los puntos sobre la plataforma. */
const onPlatform = PLAZA_LEVEL + 0.15;
/** Centro, en x del plano, del aula `index` (desde el oeste) del nivel `level` del Bloque 1: los puntos
 * interiores siguen al reparto de las aulas sin caer sobre un tabique. */
function roomCenter(level: number, index: number) {
  const { from, walls, to } = facultyBlueprint.rooms.main[level], bounds = [from, ...walls, to];
  return b1x + (bounds[index] + bounds[index + 1]) / 2;
}
const lab = roomCenter(0, 2), classroom = roomCenter(3, 2);

export const facultyVisitPoints: Record<string, [number, number, number]> = {
  // Rellano junto a la cabecera este: la bodega bajo la escalera, el ascensor y la galería de planta
  // baja, como en la foto IMG_5706.
  acceso: at(add(stairTopMidpoint, [X, 0.9]), onPlatform),
  laboratorio: [-7.5, 0.1, -2.2],
  "pasillo-p3": [3, 10.5, 4.75],
  "aula-p3": [classroom, 10.5, -1.5],
  "cantina-cyt": at(fromRect(cantina, [-2.5, 21]), onPlatform),
  bedelia: at(add(bedeliaFacade, [Z, 1]), onPlatform),
  // Boca del pasillo entre Manfred y Bedelía, como en las fotos IMG_5685 e IMG_5686.
  "sala-manfred": at(passagePoint(-14, 1.825), onPlatform),
  "pasillo-plaza": at(passagePoint(0, 1.825), onPlatform),
  patio: [-2, 0.1, 20],
  jardin: [52, 0.1, 18],
  plaza: [42.5 + plazaShift, onPlatform, 1.5],
  "plaza-abierta": at(fromRect(cantina, [-11, 20]), onPlatform),
  "piso-1": [13, 3.5, 4.75],
  "piso-2": [13, 7, 4.75],
  banos: at(fromRect(towerEntrance(-1), [0, -0.68]), 0.15),
  "bloque-g": at(add(gGallery, [Z, -3]), 0.1),
};

/** Hacia dónde mira el visitante al llegar (si falta, se usa una dirección por defecto). */
export const facultyVisitTargets: Record<string, [number, number, number]> = {
  acceso: [facultyBlueprint.elevator.center[0], 1.4, half.z + 0.5],
  laboratorio: [lab - 4, 1.2, -2.2],
  "aula-p3": [classroom, 11.2, -6],
  "cantina-cyt": at(cantinaFacade, PLAZA_LEVEL + 1.8),
  "plaza-abierta": at(cantinaFacade, PLAZA_LEVEL + 1.8),
  bedelia: at(bedeliaFacade, PLAZA_LEVEL + 1.6),
  "sala-manfred": at(fromRect(manfredRect, [-3.7, 5.5]), PLAZA_LEVEL + 1.5),
  "pasillo-plaza": at(passagePoint(-20, 1.825), PLAZA_LEVEL + 1.7),
  plaza: [53 + plazaShift, PLAZA_LEVEL + 1.6, -9],
  patio: [-30, 5, 10],
  jardin: [47, 2.5, 6],
  banos: at(fromRect(towerEntrance(-1), [0, 1.4]), 1.4),
  "bloque-g": at(add(gGallery, [X, -14], [Z, 2]), 3),
  "pasillo-p3": [-20, 11.6, 4.75],
  "piso-1": [-10, 5.1, 4.75],
  "piso-2": [-10, 8.6, 4.75],
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
