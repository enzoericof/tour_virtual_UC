import { facultyBlueprint as plan, fromRect, rectCorners, gridAngle, type Vec2, type Rect } from "./faculty-blueprint.ts";

/** Plano general aportado el 02/11/2026. Distancias estimadas, no relevamiento.
 * Origen en la cantina actual; u hacia la derecha y v hacia abajo en el plano.
 * No modifica ni reescala los dos bloques existentes. */
export function annexPoint(u: number, v: number): Vec2 {
  const a = gridAngle + Math.PI;
  return [plan.annexAnchor[0] + u * Math.cos(a) - v * Math.sin(a),
    plan.annexAnchor[1] + u * Math.sin(a) + v * Math.cos(a)];
}
export type Annex = {
  id: string; name: string; rect: Rect; height: number; outline: Vec2[];
  entrance: Vec2; front: Vec2; mapCenter: Vec2;
};
function annex(id: string, name: string, u: number, v: number, w: number, d: number, height = 3.7,
  outline: Vec2[] = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]): Annex {
  const rect = { center: annexPoint(u, v), size: [w, d] as Vec2, angle: gridAngle + Math.PI };
  return { id, name, rect, height, outline, mapCenter: [u, v],
    entrance: annexPoint(u, v + d / 2 + 2.5), front: annexPoint(u, v + d / 2) };
}
const officeShiftV = 7.9;
function office(id: string, name: string, v: number, w: number, d: number): Annex {
  v += officeShiftV;
  const u = officeCenterU;
  const b = annex(id, name, u, v, d, w);
  b.rect.angle -= Math.PI / 2;
  b.entrance = annexPoint(u + w / 2 + 2.5, v);
  b.front = annexPoint(u + w / 2, v);
  return b;
}
// Frente de Kampus Print al fondo del pasillo, orientado hacia la plaza.
const annexAngle = gridAngle + Math.PI;
function annexCoordinates([x, z]: Vec2): Vec2 {
  const dx = x - plan.annexAnchor[0], dz = z - plan.annexAnchor[1];
  return [dx * Math.cos(annexAngle) + dz * Math.sin(annexAngle),
    -dx * Math.sin(annexAngle) + dz * Math.cos(annexAngle)];
}
const [printU, printV] = annexCoordinates(plan.plazaPassage.target);
const kampusPrint = annex("kampus-print", "Kampus Print", printU, printV, 19.2, 8, 4.2);
kampusPrint.rect.angle = gridAngle;
kampusPrint.front = annexPoint(printU, printV - 4);
kampusPrint.entrance = fromRect(kampusPrint.rect, [-2.5, 4.8]);
const walk = plan.bedeliaWalk;
const [walkU, walkV] = annexCoordinates(fromRect(walk, [walk.size[0] / 2, 0]));
// Las paredes tienen 20 cm de espesor: quedan 12 cm entre su cara y el pavimento.
const wallOffset = walk.size[1] / 2 + 0.22;
// Retiro longitudinal para ensanchar el paso junto a la escalera de la cantina.
const maquetasSetback = 2.8;
// Se conserva el marco de referencia para no desplazar la nave ni sus fachadas.
// La huella efectiva excluye el ala posterior retirada por indicación del usuario.
const dicia = annex("cta-dicia", "CTA–DICIA", walkU + 6 - 34 / 2, walkV + wallOffset + 16 / 2, 34, 16, 4.8,
  [[-7,-8],[17,-8],[17,3],[-7,3]]);
/** Primera etapa de las fotos del 19/11, 16:45: volumen y mampostería.
 * Ala posterior retirada el 20/11; cotas estimadas, no medidas de campo. */
export const diciaStructure = {
  nave: { minX: -7, maxX: 17, minZ: -8, maxZ: 3, rise: 0.55 },
  wallThickness: 0.2, bandY: 2.85, corridorBandY: 3.65, bandHeight: 0.26,
  pillarWidth: 0.25, corridorPillars: [-6.9, -2.15, 2.6, 7.35, 12.1, 16.9],
};
/** Aberturas interpretadas de las cinco fotos del 19/11, 16:45.
 * Coordenadas del lateral en el marco de DICIA. Distribución estimada. */
export const diciaFacades = {
  gate: { width: 3.1, height: 2.65, sill: 0.05, canopyDepth: 0.65 },
  windows: [
    { x: -4.525, width: 1.9, sill: 1.05, height: 1.4 },
    { x: 4.975, width: 1.9, sill: 1.05, height: 1.4 },
    { x: 9.725, width: 1.7, sill: 1.05, height: 1.4 },
  ],
  doors: [
    { x: 0.225, width: 1.9, sill: 0.05, height: 2.55 },
    { x: 14.475, width: 1.9, sill: 0.05, height: 2.55 },
  ],
  downpipes: [-2.15, 7.35, 16.9],
};
/** Muro posterior según la foto del 19/11 a las 16:45: posiciones y medidas
 * estimadas, sin completar las aberturas ocultas por la vegetación. */
export const diciaRearFacade = {
  // Pilastras de piso a techo; ancho y saliente estimados de la foto.
  pilasters: { centers: [-7, 0.25, 5.75, 11.45, 17], width: 0.28, projection: 0.22 },
  windows: [
    { x: 14.4, width: 2.6, sill: 0.95, height: 1.4 },
    { x: 14.4, width: 2.2, sill: 3.25, height: 1.2 },
    { x: 8.5, width: 1.65, sill: 0.95, height: 1.4 },
    { x: 3, width: 1.65, sill: 0.95, height: 1.4 },
    { x: -2.5, width: 1.65, sill: 0.95, height: 1.4 },
  ],
  airConditioners: {
    centers: [8.5, 3, -2.5], y: 3.05,
    width: 1.05, height: 0.85, depth: 0.42,
  },
};
/** Cabecera junto al pasillo, foto del 19/11 a las 16:45 (2).
 * Marco de fachada: x a lo largo del muro, z negativo hacia el exterior.
 * Dimensiones estimadas; el cartel no reproduce texto ilegible de la foto. */
export const diciaEntranceFacade = {
  door: { x: 0, width: 1.8, height: 2.5, frostedY: 0.95, frostedHeight: 0.3 },
  plaque: { x: 1.45, y: 2.15, width: 0.48, height: 0.55 },
  benches: { centers: [-2.5, 3.9], width: 1.8, z: -0.65 },
  pots: [-4.4, -1.25, 2.5],
  pavingDepth: 2.2,
};
// La llegada queda frente a una puerta lateral, sobre el pasillo conservado.
dicia.front = fromRect(dicia.rect, [diciaFacades.doors[0].x, diciaStructure.nave.minZ]);
dicia.entrance = fromRect(dicia.rect, [diciaFacades.doors[0].x, diciaStructure.nave.minZ - 0.65]);
// El techo termina en la esquina de la fachada junto al pasillo.
const corridorWall = dicia.outline.filter(([, z]) => z === -dicia.rect.size[1] / 2);
const cornerU = dicia.mapCenter[0] + Math.min(...corridorWall.map(([x]) => x));
export const diciaWalkExtension = walkU - cornerU;
export const coveredWalkPostInset = 0.05;
// Cara exterior del muro posterior alineada con el eje del último poste.
// El frente hacia cantina conserva su posición; el muro tiene 20 cm de espesor.
const maquetasRearU = cornerU + coveredWalkPostInset + 0.1;
const maquetasDepth = walkU - maquetasSetback - maquetasRearU;
// Longitud total del frente hacia la cantina, medida por el equipo en centímetros.
const maquetasLength = 1417 / 100;
// Foto posterior del 18/11: el cuerpo bajo termina antes y deja un rincón abierto.
// Retiro de profundidad estimado, pendiente de medición.
export const maquetasVolumes = { lowRearInset: 4, highFrontLength: 9.5, lowHeight: 3.55 };
/** Lateral de Civil paralelo al pasillo, foto del 20/11 a las 14:52.
 * Distancias en metros desde la esquina del frente con portones.
 * Dos conjuntos visibles y una ventana al fondo solicitada por el usuario;
 * cotas estimadas. */
export const laboratoryCorridorFacade = {
  windows: [
    { fromFront: 2.3, width: 1.35, sill: 1.3, height: 1.35 },
    { fromFront: 6.5, width: 1.35, sill: 1.3, height: 1.35 },
    { fromFront: 10.3, width: 1.35, sill: 1.3, height: 1.35 },
  ],
  airConditioners: [{ fromFront: 2.3, y: 3.4 }, { fromFront: 6.5, y: 3.4 }],
  pilasters: { fromFront: [0.14, 4.5, 8.7], width: 0.28, projection: 0.08 },
};
/** Muro de Civil hacia la galería de oficinas, foto del 20/11 a las 15:13.
 * Marco local de fachada: x positivo hacia el rincón del cuerpo bajo.
 * Cotas aproximadas interpretadas de la foto, pendientes de medición. */
export const laboratoryOfficeFacade = {
  window: { x: 1.0, width: 1.8, sill: 1.15, height: 1.3, louvered: true },
  airConditioners: [{ x: 3.5, y: 4.15 }, { x: -1.7, y: 3.85 }, { x: 2.7, y: 2.55 }],
  windowUnit: { x: 0.6, y: 2.15, width: 0.95, height: 0.6, depth: 0.48 },
  canopy: { x: 1.0, width: 2.5, y: 2.85, depth: 0.65 },
  pilasters: { centers: [-4.61, -0.65, 4.61], width: 0.28, projection: 0.12 },
};
/** Detalles de las fotos del 19/11. Metros estimados en cada fachada, desde su centro.
 * Se conserva el identificador histórico lab-maquetas para los laboratorios de Civil. */
export const laboratoryDetails = {
  bandY: 2.75, bandHeight: 0.28, eaveProjection: 0.32,
  lowRearWindow: { x: 0, width: 1.5, sill: 1.15, height: 1.2 },
  lowSideWindows: [
    { x: -3.3, width: 1.6, sill: 1.15, height: 1.35 },
    { x: 0, width: 1.45, sill: 1.15, height: 1.35 },
    { x: 3.25, width: 1.55, sill: 1.15, height: 1.35 },
  ],
  highCornerWindows: [
    { x: 0.9, width: 1.15, sill: 3.4, height: 1.0 },
    { x: -1.0, width: 0.78, sill: 1.08, height: 1.18, louvered: true },
  ],
  airConditioners: [{ x: 1.3, y: 2.1 }, { x: 2.4, y: 3.05 }],
  bench: { x: 2.4, width: 3.25, depth: 0.65, height: 0.82 },
};
const rearX = -maquetasDepth / 2, frontX = maquetasDepth / 2;
const minZ = -maquetasLength / 2, maxZ = maquetasLength / 2;
const splitZ = maxZ - maquetasVolumes.highFrontLength;
/** Dos piezas distintas según las fotos del 19/11. Dimensiones estimadas en metros.
 * Centros en el marco del laboratorio; el depósito no representa el edificio cilíndrico. */
export const laboratoryOutbuildings = {
  corner: {
    center: [rearX + maquetasVolumes.lowRearInset - 1.25, splitZ - 0.73] as Vec2,
    size: [2.15, 1.15] as Vec2, height: 1.75, angle: 0,
  },
  depot: {
    center: [frontX - 1.5, minZ - 4.9] as Vec2,
    size: [3, 2.6] as Vec2, height: 3.05, angle: Math.PI / 2,
    ventY: 2.22, ventSpacing: 1.55, ventRadius: 0.245,
  },
};
/** Detalles de suelo de las fotos del 19/11; posiciones y medidas estimadas.
 * Cotas distintas: patio frente a los portones a 0,90 m y sendero lateral a 0,05 m. */
export const laboratoryGroundDetails = {
  drains: [
    { center: [frontX + 0.8, (minZ + splitZ) / 2] as Vec2, size: [0.38, 1.05] as Vec2, level: 0.905 },
    { center: [frontX + 1.65, minZ - 1.4] as Vec2, size: [0.55, 0.65] as Vec2, level: 0.905 },
  ],
  covers: [
    { center: [frontX + 1.7, minZ + 0.35] as Vec2, size: [0.62, 0.62] as Vec2, level: 0.905 },
    { center: [1.4, minZ - 1.45] as Vec2, size: [0.58, 0.68] as Vec2, level: 0.05 },
  ],
  apron: {
    center: [rearX + 0.85, splitZ - 1.12] as Vec2,
    size: [1.5, 2] as Vec2, height: 0.12, bevel: 0.18,
  },
};
const maquetas = annex("lab-maquetas", "Laboratorio de Maquetas",
  maquetasRearU + maquetasDepth / 2, walkV - wallOffset - maquetasLength / 2, maquetasDepth, maquetasLength, 4.85,
  [[rearX + maquetasVolumes.lowRearInset, minZ], [frontX, minZ], [frontX, maxZ],
    [rearX, maxZ], [rearX, splitZ], [rearX + maquetasVolumes.lowRearInset, splitZ]]);
maquetas.entrance = annexPoint(maquetas.mapCenter[0], walkV);
// El caminero de 2 m rodea Maquetas y continúa hacia las oficinas.
const bypassU = maquetas.mapCenter[0] - maquetas.rect.size[0] / 2 - 1.12;
const bypassV = maquetas.mapCenter[1] - maquetas.rect.size[1] / 2 - 1.45;
// Oficinas junto a Civil, dejando únicamente la galería peatonal de 2,5 m.
const officePassageWidth = 2.5;
const officeCenterU = maquetasRearU - officePassageWidth - 9.2 / 2;
const officeWalkU = maquetasRearU - officePassageWidth / 2;
const dg = office("dg", "DG", 3.4, 9.2, 8.6);
dg.entrance = annexPoint(bypassU, dg.mapCenter[1]);
export const annexWalkEnd = annexPoint(bypassU, walkV);
// Retiro de la cabecera para alinear el paso con el hueco entre los pilares
// frontal e intermedio de la entrada existente; el extremo trasero queda fijo.
export const ledOfficeFrontCut = .685;
export const facultyAnnexes: Annex[] = [
  maquetas,
  kampusPrint,
  dicia,
  annex("dei-led", "DEI–LED", ...annexCoordinates(plan.electronics.center), 28.8, 12, 7.2),
  office("led", "LED", -24.8+ledOfficeFrontCut/2, 9.2, 11.6-ledOfficeFrontCut),
  office("da-cap", "DA / CAP", -14.5, 9.2, 9),
  office("das", "DAS", -5.6, 9.2, 8.6),
  dg,
];

// Unión interior solicitada por el equipo: parte de la puerta de LED y llega
// a la pared lateral de DEI–LED. Las cotas se derivan de los pabellones existentes.
const led = facultyAnnexes.find((building) => building.id === "led")!;
const dei = facultyAnnexes.find((building) => building.id === "dei-led")!;
/** Prolongación baja a la derecha de la fachada: estimada según la foto del acceso. */
export const deiEntranceWing = {
  minX: led.mapCenter[0]-dei.mapCenter[0]+led.rect.size[1]/2+.10, maxX: -14.4, frontZ: -4.4, backZ: 1.3,
  frontWallMinX: -23.4,
  height: 3.7, recess: 4.65, porchDepth: 4.0,
  glazingWidth: 3.4, pillarSize: .28,
  sideWindows: { offset: 2.55, width: .82, sill: .25, height: 2.35 },
  approachWidth: 2.15, sidePlatformHeight: .20,
  canopy: { width: 4.15, startZ: -10.0, endZ: -4.42, eave: 3.02, ridge: 4.02 },
  passageX: -18.2, passageWidth: 2.3,
};
/** Entrada retraída en el nuevo cuerpo bajo, fuera del paño alto de lamas. */
export const deiSideDoor = { center: [-18.2, deiEntranceWing.frontZ + deiEntranceWing.recess] as Vec2, width: 2.3, height: 2.65 };
export const deiSidePassage = {
  pillarX: deiSideDoor.center[0]-deiEntranceWing.glazingWidth/2-deiEntranceWing.pillarSize/2,
  pillarZ: [deiEntranceWing.frontZ,(deiEntranceWing.frontZ+deiSideDoor.center[1])/2] as Vec2,
  centerZ: (3*deiEntranceWing.frontZ+deiSideDoor.center[1])/4,
  width: (deiSideDoor.center[1]-deiEntranceWing.frontZ)/2-deiEntranceWing.pillarSize,
};
dei.outline = [[-14.4,-6],[14.4,-6],[14.4,6],[-14.4,6],[-14.4,1.3],
  [deiEntranceWing.minX,1.3],[deiEntranceWing.minX,deiEntranceWing.frontZ],[-14.4,deiEntranceWing.frontZ]];
/** Lateral fotografiado del LED. Distribución estimada de las fotos del 18/11. */
export const deiRightFacade = {
  windows: [
    { x: 11.7, width: 1.45 }, { x: 8.6, width: 1.5 }, { x: 5.4, width: 1.55 },
    { x: -2.7, width: 1.65 }, { x: -6.0, width: 1.55 }, { x: -8.5, width: 1.4 },
    { x: -13.35, width: 1.05 },
  ],
  sill: 0.95, windowHeight: 1.35,
  serviceDoor: { x: 1.6, width: 1.25, height: 2.65 },
  screen: { bottom: 3.75, top: 5.65, offset: 0.50, pitch: 0.115 },
  airConditioners: [
    { x: 10.4, y: 3.35 }, { x: 10.4, y: 2.65 },
    { x: 4.1, y: 3.35 }, { x: 4.1, y: 2.65 },
    { x: -0.5, y: 3.35 }, { x: -7.3, y: 3.35 }, { x: -7.3, y: 2.65 },
    { x: -11.8, y: 3.35 },
  ],
};
dei.front = fromRect(dei.rect, deiSideDoor.center);
dei.entrance = fromRect(dei.rect, [deiSideDoor.center[0], deiEntranceWing.frontZ - 1.5]);
const linkStartU = led.mapCenter[0] + led.rect.size[1] / 2;
const linkEndU = dei.mapCenter[0] - dei.rect.size[0] / 2;
const linkCenterU = (linkStartU + linkEndU) / 2;
const linkV = led.mapCenter[1];
export const annexEnclosedLink = {
  rect: {
    center: annexPoint(linkCenterU, linkV),
    size: [linkEndU - linkStartU, 3.4] as Vec2,
    angle: annexAngle,
  },
  height: led.height,
  wallThickness: 0.2,
  clearWidth: 3,
  openingHeight: 3.1,
  // El acceso lateral da a la galería de oficinas.
  sideDoorX: officeWalkU - linkCenterU,
  sideDoorWidth: 2.1,
  portals: [
    { annexId: led.id, center: [0, led.rect.size[1] / 2] as Vec2 },
    { annexId: dei.id, center: [-dei.rect.size[0] / 2, linkV - dei.mapCenter[1]] as Vec2 },
  ],
};
/** Recepción retranqueada detrás del blindex; proporciones estimadas de la foto del usuario. */
export const deiReception = {
  minX: deiSideDoor.center[0]-3.2, maxX: -14.4,
  frontZ: linkV-dei.mapCenter[1]+annexEnclosedLink.rect.size[1]/2-.10,
  backZ: linkV-dei.mapCenter[1]+annexEnclosedLink.rect.size[1]/2+2.5,
  height: 3.15, counterHeight: 1.02,
  doorX: -16.5, doorWidth: 1.0, doorHeight: 2.32,
};
/** Pasillo exterior marcado en rojo: salida lateral, frente corto y costado del bloque de tejas. */
export const deiPerimeterWalk = (() => {
  const offices=facultyAnnexes.filter(b=>["led","da-cap","das","dg"].includes(b.id));
  const width=deiSidePassage.width;
  const eastX=led.mapCenter[0]-dei.mapCenter[0]+led.rect.size[1]/2+.10;
  const wallX=led.mapCenter[0]-dei.mapCenter[0]-led.rect.size[1]/2-.10;
  const wallFrontZ=led.mapCenter[1]-dei.mapCenter[1]-led.rect.size[0]/2-.10;
  const endZ=Math.max(...offices.map(b=>b.mapCenter[1]-dei.mapCenter[1]+b.rect.size[0]/2))+.25;
  const outerX=wallX-width,frontZ=wallFrontZ-width/2;
  const portal={x:deiEntranceWing.minX,z:deiSidePassage.centerZ,width,height:3.0};
  const orange:Vec2=[wallX-width/2,frontZ];
  return {width,eastX,wallX,wallFrontZ,endZ,outerX,frontZ,portal,
    orange:fromRect(dei.rect,orange),localOrange:orange,
    outline:[
      [portal.x,wallFrontZ-.025],
      [wallX-.025,wallFrontZ-.025],[wallX-.025,endZ],[outerX,endZ],
      [outerX,wallFrontZ-width],[portal.x,wallFrontZ-width],
    ] as Vec2[],
    route:[
      [portal.x+.08,portal.z],orange,[orange[0],endZ-.25],
    ].map(p=>fromRect(dei.rect,p as Vec2)),
  };
})();
// Sendero desde la galería azul, junto a la fachada exterior del DEI–LED.
const coveredWalkU = annexCoordinates(plan.coveredWalk[0])[0];
const outerWalkV = dei.mapCenter[1] - dei.rect.size[1] / 2 - 2.0;
export const deiGardenPath: Vec2[] = [
  [coveredWalkU, outerWalkV + 9.75],
  [21, outerWalkV + 5.35],
  [11, outerWalkV + 5.55],
  [6.0, outerWalkV + 4.8],
  [5.5, outerWalkV + 0.6],
  [1.2, outerWalkV - 0.2],
  [-6, outerWalkV - 0.1],
  [-18, outerWalkV - 0.25],
  [dei.mapCenter[0] + deiEntranceWing.minX - .1, outerWalkV - 0.55],
].map(([u, v]) => annexPoint(u, v));
/** Caminero y árboles señalados por Horacio en rojo y azul (19/11), medidas estimadas. */
const exteriorRoadZ = (x: number) => {
  const a=annexCoordinates(deiGardenPath[deiGardenPath.length-2]),b=annexCoordinates(deiGardenPath[deiGardenPath.length-1]);
  const t=(x+dei.mapCenter[0]-a[0])/(b[0]-a[0]);
  return a[1]+(b[1]-a[1])*t-dei.mapCenter[1];
};
const exteriorFork: Vec2 = [-30,-31];
const exteriorArrival: Vec2 = [-18.2,exteriorRoadZ(-18.2)];
const entranceDirection=(point:Vec2):Vec2=>{
  const x=point[0]-exteriorFork[0],z=point[1]-exteriorFork[1],length=Math.hypot(x,z);
  return [x/length,z/length];
};
const leftArm=entranceDirection(exteriorArrival),rightArm=entranceDirection(deiPerimeterWalk.localOrange);
const incomingLength=Math.hypot(exteriorArrival[0]-exteriorFork[0],exteriorArrival[1]-exteriorFork[1])*.20;
const bisectorLength=Math.hypot(leftArm[0]+rightArm[0],leftArm[1]+rightArm[1]);
const exteriorStart: Vec2 = [exteriorFork[0]-(leftArm[0]+rightArm[0])*incomingLength/bisectorLength,
  exteriorFork[1]-(leftArm[1]+rightArm[1])*incomingLength/bisectorLength];
const parkingOutside:Vec2=[-rightArm[1],rightArm[0]];
const parkingFront=(along:number,depth=0):Vec2=>[
  exteriorFork[0]+rightArm[0]*along+parkingOutside[0]*(2.15+depth),
  exteriorFork[1]+rightArm[1]*along+parkingOutside[1]*(2.15+depth),
];
const bollards:Vec2[]=[];
for(let i=0;i<=48;i++)bollards.push(parkingFront(1+i*26.8/48));
for(let bay=0;bay<=8;bay++)for(let j=1;j<=10;j++)bollards.push(parkingFront(1+bay*3.35,j*6.2/10));
export const deiForecourt = {
  width: 1.6, canopyWidth: 2.25, eave: 2.85, ridge: .46,
  main: [exteriorArrival,exteriorFork,exteriorStart].map(p=>fromRect(dei.rect,p)),
  branch: [exteriorFork,deiPerimeterWalk.localOrange]
    .map(([x,z])=>fromRect(dei.rect,[x,z])),
  fork: fromRect(dei.rect,exteriorFork),
  trees: [[16.5,-16.5],[3,-19],[-8.5,-21],[-42,-30]].map(([x,z])=>fromRect(dei.rect,[x,z])),
  medianTree: fromRect(dei.rect,[-27.3,-15.5]),
  medianCrown: { spread: 1.5, density: 1.35, flatten: .90 },
  pickupScale: 1.0,
  parking: ["#c7d2d4","#242e32","#eeece5","#24618c","#ce5b28","#8c999e","#e7e9e8","#26343b"].map((color,index)=>({
    center:fromRect(dei.rect,parkingFront(2.675+index*3.35,3.1)),
    angle:dei.rect.angle+Math.atan2(-rightArm[0],rightArm[1]),color,
  })),
  parkingBollards: bollards.map(p=>fromRect(dei.rect,p)),
};
/** Corte compartido entre el borde del caminero y el embaldosado de entrada. */
export const deiEntrancePaving = {
  minX: deiEntranceWing.minX, maxX: deiEntranceWing.maxX, frontHeight: .15, rearHeight: .075,
  frontZ(x: number) {
    const a = annexCoordinates(deiGardenPath[deiGardenPath.length-2]);
    const b = annexCoordinates(deiGardenPath[deiGardenPath.length-1]);
    const ax=a[0]-dei.mapCenter[0], az=a[1]-dei.mapCenter[1];
    const bx=b[0]-dei.mapCenter[0], bz=b[1]-dei.mapCenter[1];
    return az+(bz-az)*(x-ax)/(bx-ax)+.65;
  },
};
/** Seto limitado a la L marcada por Horacio junto al empalme del jardín. */
export const gardenWalkHedge: Vec2[] = (() => {
  const [a, b] = plan.coveredWalk, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
  const origin = deiGardenPath[0], branch = deiGardenPath[1];
  const along = (origin[0] - a[0]) * dx + (origin[1] - a[1]) * dz;
  const side = Math.sign((branch[0] - origin[0]) * -dz + (branch[1] - origin[1]) * dx);
  return [[along - 4.4, 1.85], [along - 1.5, 1.85], [along - 1.3, 3.0]]
    .map(([d, offset]): Vec2 => [a[0] + dx * d - dz * side * offset, a[1] + dz * d + dx * side * offset]);
})();
/** Se conserva la circulación de oficinas; retirado el circuito blanco de DICIA y Kampus Print. */
const officeIds = new Set(["led", "da-cap", "das"]);
export const annexPaths: Vec2[][] = [
  [[officeWalkU,linkV+annexEnclosedLink.rect.size[1]/2],[officeWalkU,-18 + officeShiftV],[officeWalkU,-9 + officeShiftV],[officeWalkU,bypassV],[bypassU,bypassV]].map(([u,v])=>annexPoint(u,v)),
  [annexPoint(officeCenterU + 9.2 / 2 + 0.3, dg.mapCenter[1]), annexPoint(officeWalkU, dg.mapCenter[1]), annexPoint(officeWalkU, bypassV)],
  // Maquetas y DG ya tienen su punto de visita sobre los caminos principales.
  ...facultyAnnexes.filter(b => b !== maquetas && b !== dg && b !== dicia && b !== kampusPrint).map((b): Vec2[] => {
    const [u,v] = b.mapCenter;
    if (b === dei) return [b.entrance, annexPoint(u + deiSideDoor.center[0], outerWalkV - 0.4)];
    if (officeIds.has(b.id)) return [b.entrance, annexPoint(officeWalkU,v)];
    return [b.entrance,annexPoint(officeWalkU,v+b.rect.size[1]/2+2.5)];
  }),
];
export const annexCoveredPaths: Vec2[][] = [
  // Solo continúa la galería exterior del ala de oficinas, desde la puerta del corredor.
  [[officeWalkU,linkV + annexEnclosedLink.rect.size[1] / 2],[officeWalkU,-9 + officeShiftV]].map(([u,v])=>annexPoint(u,v)),
];
export const annexVisitTargets: Record<string, [number, number, number]> = Object.fromEntries(
  facultyAnnexes.map((b)=>[b.id,[b.front[0],1.7,b.front[1]]]),
);

/** Patio detrás de cantina, según fotos del 18/11. Anchos estimados visualmente. */
export const cantinaRearCourtyard = (() => {
  const local = ([x, z]: Vec2): Vec2 => {
    const dx = x - plan.cantina.center[0], dz = z - plan.cantina.center[1];
    const a = plan.cantina.angle;
    return [dx * Math.cos(a) + dz * Math.sin(a), -dx * Math.sin(a) + dz * Math.cos(a)];
  };
  const rearEdge = Math.max(...rectCorners(maquetas.rect).map(p => local(p)[1]));
  const walkEdge = Math.max(...rectCorners(plan.bedeliaWalk).map(p => local(p)[0]));
  const back = -plan.cantina.size[1] / 2;
  const end = plan.cantina.size[0] / 2;
  const plazaEdge = Math.max(...plan.bedeliaLawnEdge.map(p => local(p)[1]));
  // Jardín junto a cantina y paso de 4 m frente a Maquetas. La entrada se
  // ensancha hacia el pasillo techado; el extremo opuesto conserva 2 m de paso.
  const gardenEdge: Vec2[] = [
    [-end + 1.5, back],
    [-end + 1.5, rearEdge + 6],
    [-end + 3.5, rearEdge + 4],
    [end - 2, rearEdge + 4],
    [end - 2, back],
  ];
  const paving: Vec2[] = [
    [walkEdge, rearEdge], [end, rearEdge], [end, back],
    ...[...gardenEdge].reverse(),
    [-end - 0.5, back], [-end - 0.5, plazaEdge], [walkEdge, plazaEdge],
  ];
  return {
    paving: paving.map(p => fromRect(plan.cantina, p)),
    garden: gardenEdge.map(p => fromRect(plan.cantina, p)),
  };
})();
