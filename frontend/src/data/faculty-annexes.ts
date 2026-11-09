import { facultyBlueprint as plan, gridAngle, type Vec2, type Rect } from "./faculty-blueprint.ts";

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
function office(id: string, name: string, v: number, w: number, d: number): Annex {
  const b = annex(id, name, -35.7, v, d, w);
  b.rect.angle -= Math.PI / 2;
  b.entrance = annexPoint(-35.7 + w / 2 + 2.5, v);
  b.front = annexPoint(-35.7 + w / 2, v);
  return b;
}
// Frente de Kampus Print al fondo del pasillo, orientado hacia la plaza.
const [printX, printZ] = plan.plazaPassage.target;
const dx = printX - plan.annexAnchor[0], dz = printZ - plan.annexAnchor[1];
const annexAngle = gridAngle + Math.PI;
const printU = dx * Math.cos(annexAngle) + dz * Math.sin(annexAngle);
const printV = -dx * Math.sin(annexAngle) + dz * Math.cos(annexAngle);
const kampusPrint = annex("kampus-print", "Kampus Print", printU, printV, 13.4, 8);
kampusPrint.rect.angle = gridAngle;
kampusPrint.front = annexPoint(printU, printV - 4);
kampusPrint.entrance = annexPoint(printU, printV - 4.8);
export const facultyAnnexes: Annex[] = [
  annex("lab-ingenieria", "Laboratorio de Ingeniería", -17.4, 0, 18.4, 10.4, 4.2,
    [[-9.2,-5.2],[0,-5.2],[0,-12.2],[9.2,-12.2],[9.2,5.2],[-9.2,5.2]]),
  annex("lab-maquetas", "Laboratorio de Maquetas", -17.5, 13.8, 18.4, 10.2),
  kampusPrint,
  annex("cta-dicia", "CTA–DICIA", -19.8, 35, 34, 16, 4.2,
    [[-7,-8],[17,-8],[17,8],[-17,8],[-17,3],[-7,3]]),
  annex("dei-led", "DEI–LED", -4.2, -27.8, 28.8, 12, 4.4),
  office("led", "LED", -24.8, 9.2, 11.6),
  office("da-cap", "DA / CAP", -14.5, 9.2, 9),
  office("das", "DAS", -5.6, 9.2, 8.6),
  office("dg", "DG", 3.4, 9.2, 8.6),
];

// Unión interior solicitada por el equipo: parte de la puerta de LED y llega
// a la pared lateral de DEI–LED. Las cotas se derivan de los pabellones existentes.
const led = facultyAnnexes.find((building) => building.id === "led")!;
const dei = facultyAnnexes.find((building) => building.id === "dei-led")!;
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
  sideDoorX: -28 - linkCenterU,
  sideDoorWidth: 2.1,
  portals: [
    { annexId: led.id, center: [0, led.rect.size[1] / 2] as Vec2 },
    { annexId: dei.id, center: [-dei.rect.size[0] / 2, linkV - dei.mapCenter[1]] as Vec2 },
  ],
};
/** Circuito exterior: evita atravesar los edificios y llega al sendero existente detrás de Manfred. */
const officeIds = new Set(["led", "da-cap", "das", "dg"]);
export const annexPaths: Vec2[][] = [
  [[-28,-36],[-28,-18],[-28,-9],[-28,10],[-28,23],[-43,23],[-43,48],[-28,48],[30,48],[printU + 8,48],[57.1,48]].map(([u,v])=>annexPoint(u,v)),
  ...facultyAnnexes.map((b): Vec2[] => {
    const [u,v] = b.mapCenter;
    if (officeIds.has(b.id)) return [b.entrance, annexPoint(-28,v)];
    if (b.id === "kampus-print") return [plan.plazaPassage.foot, b.entrance, annexPoint(u + 8, v - 4.8), annexPoint(u + 8, 48)];
    if (b.id === "cta-dicia") return [b.entrance,annexPoint(u,48),annexPoint(-28,48)];
    return [b.entrance,annexPoint(-28,v+b.rect.size[1]/2+2.5)];
  }),
  [annexPoint(57.1,48), annexPoint(70,48), [0,-22]],
];
export const annexCoveredPaths: Vec2[][] = [
  // Solo continúa la galería exterior del ala de oficinas, desde la puerta del corredor.
  [[-28,linkV + annexEnclosedLink.rect.size[1] / 2],[-28,-9]].map(([u,v])=>annexPoint(u,v)),
];
export const annexVisitTargets: Record<string, [number, number, number]> = Object.fromEntries(
  facultyAnnexes.map((b)=>[b.id,[b.front[0],1.7,b.front[1]]]),
);
