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
const officeShiftU = -7.75, officeShiftV = 7.9;
function office(id: string, name: string, v: number, w: number, d: number): Annex {
  v += officeShiftV;
  const u = -45.7 + officeShiftU;
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
const kampusPrint = annex("kampus-print", "Kampus Print", printU, printV, 13.4, 8);
kampusPrint.rect.angle = gridAngle;
kampusPrint.front = annexPoint(printU, printV - 4);
kampusPrint.entrance = annexPoint(printU, printV - 4.8);
const walk = plan.bedeliaWalk;
const [walkU, walkV] = annexCoordinates(fromRect(walk, [walk.size[0] / 2, 0]));
// Las paredes tienen 20 cm de espesor: quedan 12 cm entre su cara y el pavimento.
const wallOffset = walk.size[1] / 2 + 0.22;
// Retiro longitudinal para ensanchar el paso junto a la escalera de la cantina.
const maquetasSetback = 2.8;
// Longitud total del frente hacia la cantina, medida por el equipo en centímetros.
const maquetasLength = 1417 / 100;
const maquetas = annex("lab-maquetas", "Laboratorio de Maquetas",
  walkU - maquetasSetback - 18.4 / 2, walkV - wallOffset - maquetasLength / 2, 18.4, maquetasLength, 4.85);
maquetas.entrance = annexPoint(maquetas.mapCenter[0], walkV);
const dicia = annex("cta-dicia", "CTA–DICIA", walkU + 6 - 34 / 2, walkV + wallOffset + 16 / 2, 34, 16, 4.2,
  [[-7,-8],[17,-8],[17,8],[-17,8],[-17,3],[-7,3]]);
// El techo termina donde la fachada junto al pasillo gira hacia el interior de la L.
const corridorWall = dicia.outline.filter(([, z]) => z === -dicia.rect.size[1] / 2);
const cornerU = dicia.mapCenter[0] + Math.min(...corridorWall.map(([x]) => x));
export const diciaWalkExtension = walkU - cornerU;
// El caminero de 2 m rodea Maquetas y continúa hacia las oficinas.
const bypassU = maquetas.mapCenter[0] - maquetas.rect.size[0] / 2 - 1.12;
const bypassV = maquetas.mapCenter[1] - maquetas.rect.size[1] / 2 - 1.45;
const dg = office("dg", "DG", 3.4, 9.2, 8.6);
dg.entrance = annexPoint(bypassU, dg.mapCenter[1]);
export const annexWalkEnd = annexPoint(bypassU, walkV);
export const facultyAnnexes: Annex[] = [
  maquetas,
  kampusPrint,
  dicia,
  annex("dei-led", "DEI–LED", ...annexCoordinates(plan.electronics.center), 28.8, 12, 7.2),
  office("led", "LED", -24.8, 9.2, 11.6),
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
  minX: -22.4, maxX: -14.4, frontZ: -4.4, backZ: 1.3,
  height: 3.7, recess: 4.65, porchDepth: 4.0,
  glazingWidth: 3.4, pillarSize: .28,
  sideWindows: { offset: 2.55, width: .82, sill: .25, height: 2.35 },
  approachWidth: 2.15, sidePlatformHeight: .20,
  canopy: { width: 4.15, startZ: -10.0, endZ: -4.42, eave: 3.02, ridge: 4.02 },
  passageX: -18.2, passageWidth: 2.3,
};
/** Entrada retraída en el nuevo cuerpo bajo, fuera del paño alto de lamas. */
export const deiSideDoor = { center: [-18.2, deiEntranceWing.frontZ + deiEntranceWing.recess] as Vec2, width: 2.3, height: 2.65 };
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
  sideDoorX: -28 + officeShiftU - linkCenterU,
  sideDoorWidth: 2.1,
  portals: [
    { annexId: led.id, center: [0, led.rect.size[1] / 2] as Vec2 },
    { annexId: dei.id, center: [-dei.rect.size[0] / 2, linkV - dei.mapCenter[1]] as Vec2 },
  ],
};
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
  [dei.mapCenter[0] + deiEntranceWing.minX - 1.5, outerWalkV - 0.55],
].map(([u, v]) => annexPoint(u, v));
/** Caminero y árboles señalados por Horacio en rojo y azul (19/11), medidas estimadas. */
const exteriorRoadZ = (x: number) => {
  const a=annexCoordinates(deiGardenPath[deiGardenPath.length-2]),b=annexCoordinates(deiGardenPath[deiGardenPath.length-1]);
  const t=(x+dei.mapCenter[0]-a[0])/(b[0]-a[0]);
  return a[1]+(b[1]-a[1])*t-dei.mapCenter[1];
};
const exteriorFork: Vec2 = [-19,-18.3];
export const deiForecourt = {
  width: 1.6, canopyWidth: 2.25, eave: 2.75, ridge: .44,
  main: [[-15.7,exteriorRoadZ(-15.7)],[-16.3,-12.1],exteriorFork,[-18.9,-25],[-19.5,-33],[-19.8,-44]]
    .map(([x,z])=>fromRect(dei.rect,[x,z])),
  branch: [exteriorFork,[-22.2,-12.6],[-21.4,exteriorRoadZ(-21.4)]]
    .map(([x,z])=>fromRect(dei.rect,[x,z])),
  fork: fromRect(dei.rect,exteriorFork),
  trees: [[16.5,-16.5],[3,-19],[-8.5,-21],[-28,-14.2]].map(([x,z])=>fromRect(dei.rect,[x,z])),
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
/** Circuito exterior: evita atravesar los edificios y llega al sendero existente detrás de Manfred. */
const officeIds = new Set(["led", "da-cap", "das"]);
const officeWalkU = -38 + officeShiftU;
export const annexPaths: Vec2[][] = [
  [[officeWalkU,-36 + officeShiftV],[officeWalkU,-18 + officeShiftV],[officeWalkU,-9 + officeShiftV],[officeWalkU,bypassV],[bypassU,bypassV],[bypassU,23],[-55,23],[-55,48],[-38,48],[30,48],[printU + 8,48],[57.1,48]].map(([u,v])=>annexPoint(u,v)),
  [annexPoint(-45.7 + officeShiftU + 9.2 / 2 + 0.3, dg.mapCenter[1]), annexPoint(officeWalkU, dg.mapCenter[1]), annexPoint(officeWalkU, bypassV)],
  // Maquetas y DG ya tienen su punto de visita sobre los caminos principales.
  ...facultyAnnexes.filter(b => b !== maquetas && b !== dg).map((b): Vec2[] => {
    const [u,v] = b.mapCenter;
    if (b === dei) return [b.entrance, annexPoint(u + deiSideDoor.center[0], outerWalkV - 0.4)];
    if (officeIds.has(b.id)) return [b.entrance, annexPoint(officeWalkU,v)];
    if (b.id === "kampus-print") return [plan.plazaPassage.foot, b.entrance, annexPoint(u + 8, v - 4.8), annexPoint(u + 8, 48)];
    if (b.id === "cta-dicia") return [b.entrance,annexPoint(u,48),annexPoint(-38,48)];
    return [b.entrance,annexPoint(officeWalkU,v+b.rect.size[1]/2+2.5)];
  }),
  [annexPoint(57.1,48), annexPoint(70,48), [0,-22]],
];
export const annexCoveredPaths: Vec2[][] = [
  // Solo continúa la galería exterior del ala de oficinas, desde la puerta del corredor.
  [[officeWalkU,linkV + annexEnclosedLink.rect.size[1] / 2],[officeWalkU,-9 + officeShiftV]].map(([u,v])=>annexPoint(u,v)),
];
export const annexVisitTargets: Record<string, [number, number, number]> = Object.fromEntries(
  facultyAnnexes.map((b)=>[b.id,[b.front[0],1.7,b.front[1]]]),
);

/** Extensión gris en L indicada en la captura del 14/11, alrededor de cantina. */
export const cantinaRearPaving: Vec2[] = (() => {
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
  return ([[walkEdge, rearEdge], [end, rearEdge], [end, back],
    [-end - 0.5, back], [-end - 0.5, plazaEdge], [walkEdge, plazaEdge]] as Vec2[])
    .map(p => fromRect(plan.cantina, p));
})();
