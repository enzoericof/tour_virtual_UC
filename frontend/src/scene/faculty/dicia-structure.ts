import * as T from "three";
import { diciaStructure as spec, type Annex } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";
import { addDiciaFacades } from "./dicia-facades";
import { facultyBlueprint as plan, fromRect, PLAZA_LEVEL, type Vec2 } from "../../data/faculty-blueprint";

/** Volumen de CTA–DICIA con cabecera y lateral fotografiados. */
export function addDiciaStructure(builder: FacultyBuilder, annex: Annex,
  brick: T.MeshStandardMaterial, roof: T.MeshStandardMaterial,
  passageTile: T.MeshStandardMaterial, annexPavingHeight: (point: Vec2) => number) {
  const { box, slopedWall } = builder;
  const trim = new T.MeshStandardMaterial({ color: "#536268", roughness: 0.78 });
  const n = spec.nave, wing = spec.rearWing, h = annex.height, t = spec.wallThickness;
  const half = (n.maxZ - n.minZ) / 2, ridgeZ = (n.minZ + n.maxZ) / 2;
  const cx = (n.minX + n.maxX) / 2, run = n.maxX - n.minX;
  // Mismo nivel que las baldosas: tramo original a 0,912 m y prolongación sobre el terreno.
  const walk = plan.bedeliaWalk;
  const passageLevel = (x: number) => {
    const p = fromRect(annex.rect, [x, n.minZ]);
    const along = (p[0] - walk.center[0]) * Math.cos(walk.angle)
      + (p[1] - walk.center[1]) * Math.sin(walk.angle);
    if (along <= walk.size[0] / 2) return PLAZA_LEVEL + 0.012;
    return annexPavingHeight(fromRect(walk, [along, -walk.size[1] / 2]));
  };
  // Muros perimetrales macizos; se conserva el acceso existente hacia la llegada.
  for (let i = 0; i < annex.outline.length; i++) {
    const a = annex.outline[i], b = annex.outline[(i + 1) % annex.outline.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    const angle = Math.atan2(dz, dx), options = { rotation: -angle };
    const height = a[1] >= wing.minZ && b[1] >= wing.minZ ? wing.height : h;
    const photographed = a[1] === n.minZ && b[1] === n.minZ;
    if (photographed) {
      // El lateral se construye abajo, descontando sus puertas y ventanas.
    } else if (a[1] === wing.maxZ && b[1] === wing.maxZ) {
      const entrance = spec.existingEntrance;
      const left = entrance.x - entrance.width / 2, right = entrance.x + entrance.width / 2;
      for (const [start, end] of [[wing.minX, left], [right, wing.maxX]])
        box(end - start, height, t, (start + end) / 2, height / 2, z, brick, true);
      box(entrance.width, height - entrance.height, t, entrance.x,
        (height + entrance.height) / 2, z, brick, true);
    } else if (a[0] === n.maxX && b[0] === n.maxX) {
      // La cabecera alta se construye en addDiciaFacades con el vano del portón.
      box(t, wing.height, wing.maxZ - wing.minZ, x, wing.height / 2,
        (wing.minZ + wing.maxZ) / 2, brick, true);
    } else box(length, height, t, x, height / 2, z, brick, true, options);
    // Banda sobrepuesta siguiendo el exterior de la huella, sin cambiar su escala.
    const bandY = a[1] === n.minZ && b[1] === n.minZ ? spec.corridorBandY : spec.bandY;
    box(length, spec.bandHeight, 0.03, x + dz / length * 0.115, bandY,
      z - dx / length * 0.115, trim, false, options);
  }
  addDiciaFacades(builder, h, brick, trim, passageTile, passageLevel);
  // Techo de la nave y frontones en sus dos cabeceras.
  for (const x of [n.minX, n.maxX]) {
    slopedWall(x, n.minZ, ridgeZ, h, h + n.rise, h, brick);
    slopedWall(x, ridgeZ, n.maxZ, h + n.rise, h, h, brick);
    for (const side of [-1, 1]) box(0.035, 0.15, Math.hypot(half, n.rise),
      x + (x === n.minX ? -0.117 : 0.117), h + n.rise / 2 - 0.12,
      ridgeZ + side * half / 2, trim, false, { pitch: side * Math.atan2(n.rise, half) });
  }
  for (const side of [-1, 1]) box(run - t, 0.10, Math.hypot(half, n.rise), cx,
    h + n.rise / 2, ridgeZ + side * half / 2, roof, true,
    { pitch: side * Math.atan2(n.rise, half) });
  // Cierre entre la nave alta y el ala posterior cuya forma no está relevada.
  box(run, h - wing.height, t, cx, (h + wing.height) / 2, wing.minZ, brick, true);
  box(wing.maxX - wing.minX, 0.12, wing.maxZ - wing.minZ,
    (wing.minX + wing.maxX) / 2, wing.height + 0.06, (wing.minZ + wing.maxZ) / 2, roof, true);
  // Pilares de ladrillo y franja superior junto al pasillo.
  for (const x of spec.corridorPillars)
    box(spec.pillarWidth, h, 0.28, x, h / 2, n.minZ + 0.015, brick, true);
  for (const x of [n.minX, n.maxX])
    box(0.28, h, spec.pillarWidth, x, h / 2, n.maxZ - 0.1, brick, true);
  box(run, 0.20, 0.035, cx, h - 0.14, n.minZ - 0.12, trim);
}
