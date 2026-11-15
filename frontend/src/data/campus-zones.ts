import { insidePolygon } from "./campus-geometry.ts";
import { facultyAnnexes } from "./faculty-annexes.ts";
import { block1, blockG, cantinaForecourt, facultyBlueprint as plan, FLOOR_HEIGHT,
  fromRect, manfredOutline, towerAnnex, towerOutline, worldPolygon, type Rect } from "./faculty-blueprint.ts";

export const campusName = "Facultad de Ciencias y Tecnología";

type CampusZone = { name: string; footprint: number[][]; minY: number; maxY: number; levels?: number };
const building = (name: string, rect: Rect, levels: number) => ({
  name, levels, footprint: worldPolygon(rect), minY: -0.5, maxY: (levels - 1) * FLOOR_HEIGHT + 1.8,
});

// Las huellas más específicas tienen prioridad sobre plazas y patios.
const zones: CampusZone[] = [
  { name: "Ascensor", footprint: worldPolygon({ ...plan.elevator, angle: 0 }), minY: -0.5, maxY: 12 },
  { name: "Torre de baños", footprint: worldPolygon(towerOutline()), minY: -0.5, maxY: 12, levels: block1.levels },
  { name: "Torre de baños", footprint: worldPolygon(towerAnnex()), minY: -0.5, maxY: 2 },
  building("Bloque 1", plan.main, block1.levels),
  building("Bloque G", plan.block2, blockG.levels),
  ...facultyAnnexes.map(annex => ({ name: annex.name,
    footprint: worldPolygon(annex.outline.map(point => fromRect(annex.rect, point))), minY: -0.5, maxY: 2.5,
  })),
  { name: "Cantina de CyT", footprint: worldPolygon(plan.cantina), minY: 0.4, maxY: 2.7 },
  { name: "Terraza de la cantina", footprint: worldPolygon(cantinaForecourt.outline.map(point => fromRect(plan.cantina, point))), minY: 0.4, maxY: 2.7 },
  { name: "Bedelía", footprint: worldPolygon(plan.bedelia), minY: 0.4, maxY: 2.7 },
  { name: "Sala Manfred", footprint: worldPolygon(manfredOutline()), minY: 0.4, maxY: 2.7 },
  { name: "Plaza techada", footprint: worldPolygon(plan.coveredPlaza), minY: 0.4, maxY: 2.7 },
  { name: "Plaza abierta", footprint: worldPolygon(plan.openPlaza), minY: 0.4, maxY: 2.7 },
  { name: "Pasillos de acceso", footprint: worldPolygon(plan.elevatorLanding), minY: -0.5, maxY: 2 },
  { name: "Pasillos de acceso", footprint: worldPolygon(plan.plazaGallery.outline), minY: -0.5, maxY: 2 },
  // El patio abierto no tiene una huella de edificio. Su límite sigue los senderos entre los bloques.
  { name: "Patio", footprint: worldPolygon([[-27.5, 6], [37.5, 6], [37.6, 16], [34, 23],
    [11.3, 33.5], [-14, 38], [-27.5, 27]]), minY: -0.5, maxY: 1.8 },
];

export function campusZoneAt(x: number, feetY: number, z: number) {
  const point = [x, z];
  const zone = zones.find(({ minY, maxY, footprint }) => feetY >= minY && feetY <= maxY && insidePolygon(point, footprint));
  if (!zone) return { name: "Exteriores", detail: "Campus Santa Librada" };
  const floor = zone.levels ? Math.min(zone.levels - 1, Math.max(0, Math.floor((feetY + 0.15) / FLOOR_HEIGHT))) : null;
  return { name: zone.name, detail: floor === null ? "Campus Santa Librada" : floor === 0 ? "Planta baja" : `Piso ${floor}` };
}
