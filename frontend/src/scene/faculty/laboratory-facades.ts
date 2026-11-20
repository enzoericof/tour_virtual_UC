import * as T from "three";
import { laboratoryDetails as detail, laboratoryCorridorFacade as corridor, laboratoryOfficeFacade as office, maquetasVolumes, type Annex } from "../../data/faculty-annexes";
import type { Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

type Window = { x: number; width: number; sill: number; height: number; louvered?: boolean };

/** Lateral y rincón posterior de Civil. Se construye dentro del marco de Maquetas.
 * Ladrillo existente y herrajes limpios: las fotos guían la forma, no el desgaste. */
export function addLaboratoryFacades(builder: FacultyBuilder, annex: Annex, brick: T.MeshStandardMaterial,
  roof: T.MeshStandardMaterial) {
  const { box, pole, beam, frame, v3, m } = builder;
  const [depth, length] = annex.rect.size;
  const rear = -depth / 2, front = depth / 2, end = length / 2;
  const { lowRearInset, highFrontLength, lowHeight } = maquetasVolumes;
  const split = end - highFrontLength, lowRear = rear + lowRearInset;
  const lowDepth = front - lowRear, lowWidth = length - highFrontLength;
  const trim = new T.MeshStandardMaterial({ color: "#536268", roughness: 0.78 });
  const drainage = new T.MeshStandardMaterial({ color: "#587486", roughness: 0.65, metalness: 0.25 });
  const dark = new T.MeshStandardMaterial({ color: "#172529", roughness: 0.5 });
  const glazing = m.glass.clone(); glazing.color.set("#405b60"); glazing.opacity = 0.68;
  const equipment = new T.MeshStandardMaterial({ color: "#d0cfc0", roughness: 0.8 });
  const pipe = new T.MeshStandardMaterial({ color: "#9e6952", roughness: 0.85 });

  // Todas las fachadas miran hacia -z en su marco propio.
  function facade(center: Vec2, width: number, angle: number, height: number, windows: Window[],
    decorate: () => void, band = true) {
    frame({ center, size: [width, 0.2], angle }, () => {
      const edges = [-width / 2, width / 2, ...windows.flatMap(w => [w.x - w.width / 2, w.x + w.width / 2])]
        .sort((a, b) => a - b);
      for (let i = 1; i < edges.length; i++) {
        const a = edges[i - 1], b = edges[i], x = (a + b) / 2;
        if (b - a < 0.001) continue;
        const hole = windows.find(w => Math.abs(x - w.x) < w.width / 2);
        if (!hole) box(b - a, height, 0.2, x, height / 2, 0, brick, true);
        else {
          box(b - a, hole.sill, 0.2, x, hole.sill / 2, 0, brick, true);
          const top = hole.sill + hole.height;
          box(b - a, height - top, 0.2, x, (height + top) / 2, 0, brick, true);
        }
      }
      for (const w of windows) {
        const y = w.sill + w.height / 2;
        // Fondo oscuro y cristal cerrado: sin convertir la ventana en una entrada.
        box(w.width, w.height, 0.025, w.x, y, 0.06, dark);
        box(w.width - 0.08, w.height - 0.08, 0.035, w.x, y, -0.03, glazing, true);
        for (const side of [-1, 1])
          box(0.055, w.height + 0.07, 0.13, w.x + side * w.width / 2, y, -0.065, trim);
        for (const edge of [w.sill, w.sill + w.height])
          box(w.width + 0.07, 0.055, 0.13, w.x, edge, -0.065, trim);
        box(w.width + 0.12, 0.045, 0.26, w.x, w.sill - 0.035, -0.05, brick);
        if (w.louvered) {
          const count = 5, pitch = (w.height - 0.1) / count;
          for (let i = 0; i < count; i++) {
            const at = w.sill + 0.05 + pitch * (i + 0.5);
            box(w.width - 0.08, pitch * 0.91, 0.025, w.x, at, -0.095, glazing, false, { pitch: -0.38 });
            box(w.width - 0.08, 0.025, 0.055, w.x, at - pitch * 0.45, -0.13, trim);
          }
        } else box(0.035, w.height, 0.11, w.x, y, -0.075, trim);
      }
      if (band) box(width, detail.bandHeight, 0.025, 0, detail.bandY, -0.113, trim);
      decorate();
    });
  }

  function downpipe(x: number, height: number) {
    // Sección rectangular con codos, como las bajantes azul grisáceo fotografiadas.
    box(0.12, height - 0.52, 0.11, x, height / 2 - 0.03, -0.18, drainage);
    box(0.12, 0.32, 0.11, x, height - 0.29, -0.24, drainage, false, { pitch: 0.4 });
    box(0.12, 0.33, 0.11, x, 0.18, -0.24, drainage, false, { pitch: -0.4 });
    for (const y of [0.6, 1.75, height - 0.65]) box(0.17, 0.035, 0.14, x, y, -0.18, trim);
  }
  function eave(width: number, height: number) {
    const overhang = detail.eaveProjection;
    box(width + 0.12, 0.07, overhang + 0.12, 0, height + 0.03, -overhang / 2, roof, true);
    // Canal abierto en U, compartido por los dos extremos del alero.
    box(width + 0.12, 0.035, 0.18, 0, height - 0.06, -overhang, drainage);
    for (const z of [-overhang - 0.09, -overhang + 0.09])
      box(width + 0.12, 0.12, 0.025, 0, height - 0.015, z, drainage);
  }
  function light(x: number, height: number) {
    beam(v3(x, height - 0.35, -0.13), v3(x, height - 0.13, -0.55), 0.022, trim);
    pole(0.15, 0.055, x, height - 0.15, -0.55, trim);
    pole(0.095, 0.16, x, height - 0.24, -0.55, m.white);
    beam(v3(x, 2.48, -0.125), v3(x, height - 0.35, -0.125), 0.012, pipe);
  }
  function airConditioner(x: number, y: number, withPipes = true) {
    box(0.85, 0.59, 0.35, x, y, -0.34, equipment, true);
    const disk = pole(0.21, 0.025, x - 0.10, y, -0.53, dark); disk.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const blade = box(0.16, 0.065, 0.018, x - 0.10 + Math.cos(a) * 0.07,
        y + Math.sin(a) * 0.07, -0.55, trim);
      blade.rotation.z = a + 0.4;
    }
    for (let i = -4; i <= 4; i++) {
      const offset = i * 0.043, halfChord = Math.sqrt(0.2 ** 2 - offset ** 2);
      box(halfChord * 2, 0.009, 0.018, x - 0.10, y + offset, -0.57, equipment);
    }
    for (let i = 0; i < 6; i++) box(0.015, 0.4, 0.02, x + 0.19 + i * 0.027, y, -0.53, trim);
    for (const side of [-1, 1]) {
      box(0.045, 0.045, 0.5, x + side * 0.30, y - 0.34, -0.30, trim);
      box(0.045, 0.27, 0.045, x + side * 0.30, y - 0.23, -0.14, trim);
    }
    if (withPipes) {
      beam(v3(x + 0.45, y, -0.3), v3(x + 0.5, y, -0.14), 0.025, equipment);
      beam(v3(x + 0.5, y, -0.14), v3(x + 0.5, 0.18, -0.14), 0.018, pipe);
    }
  }

  // Muro hacia el pasillo techado: sustituye el paño macizo, sin tocar la cubierta.
  // El giro invierte x: el extremo negativo del marco corresponde al frente.
  facade([0, end - 0.1], depth, Math.PI, annex.height,
    corridor.windows.map(w => ({ x: -depth / 2 + w.fromFront,
      width: w.width, sill: w.sill, height: w.height })), () => {
      const p = corridor.pilasters;
      for (const x of [...p.fromFront.map(offset => -depth / 2 + offset), depth / 2 - p.width / 2])
        box(p.width, annex.height, 0.2 + p.projection, x, annex.height / 2,
          -p.projection / 2, brick, true);
      for (const ac of corridor.airConditioners)
        airConditioner(-depth / 2 + ac.fromFront, ac.y, false);
    }, false);

  // Muro alto hacia la galería de oficinas, antes macizo. Se conserva su posición.
  facade([rear, (split + end) / 2], highFrontLength, -Math.PI / 2, annex.height,
    [office.window], () => {
      const p = office.pilasters;
      for (const x of p.centers)
        box(p.width, annex.height, 0.2 + p.projection, x, annex.height / 2,
          -p.projection / 2, brick, true);
      for (const ac of office.airConditioners) airConditioner(ac.x, ac.y);

      // Marquesina pequeña sobre la ventana; independiente de la cubierta del paso.
      const c = office.canopy;
      box(c.width, 0.1, c.depth, c.x, c.y, -0.1 - c.depth / 2, trim, true);
      box(c.width, 0.08, 0.05, c.x, c.y - 0.06, -0.1 - c.depth, trim);
      for (const side of [-1, 1]) {
        const x = c.x + side * (c.width / 2 - 0.15);
        beam(v3(x, c.y - 0.35, -0.13), v3(x, c.y - 0.05, -c.depth), 0.025, trim);
      }

      // Equipo de ventana: carcasa con rejilla rectangular, distinto de las condensadoras.
      const unit = office.windowUnit, faceZ = -0.12 - unit.depth;
      box(unit.width, unit.height, unit.depth, unit.x, unit.y,
        faceZ + unit.depth / 2, equipment, true);
      box(unit.width * 0.66, unit.height - 0.1, 0.018, unit.x + 0.07, unit.y, faceZ - 0.012, dark);
      for (let i = 0; i < 13; i++) box(unit.width * 0.66, 0.014, 0.025,
        unit.x + 0.07, unit.y - (unit.height - 0.12) / 2 + i * (unit.height - 0.12) / 12,
        faceZ - 0.03, equipment);
      for (const side of [-1, 1]) {
        const x = unit.x + side * (unit.width / 2 - 0.06);
        box(0.045, 0.045, unit.depth + 0.08, x, unit.y - unit.height / 2 - 0.03,
          faceZ + unit.depth / 2, trim);
        beam(v3(x, office.window.sill - 0.25, -0.13),
          v3(x, unit.y - unit.height / 2 - 0.03, faceZ + 0.04), 0.025, trim);
      }
    });

  // Muro retraído del bloque bajo: ventana centrada y esquina con bajante.
  facade([lowRear, (-end + split) / 2], lowWidth, -Math.PI / 2, lowHeight,
    [detail.lowRearWindow], () => {
      for (const side of [-1, 1]) box(0.22, lowHeight, 0.28, side * (lowWidth / 2 - 0.1), lowHeight / 2, 0, trim);
      light(lowWidth / 2 - 0.65, lowHeight);
      beam(v3(-lowWidth / 2 + 0.25, 2.48, -0.14), v3(lowWidth / 2 - 0.3, 2.48, -0.14), 0.013, pipe);
    });

  // Lateral con ventanas, condensadoras y mesada de tres huecos.
  facade([(lowRear + front) / 2, -end + 0.1], lowDepth, 0, lowHeight,
    detail.lowSideWindows, () => {
      for (const x of [-lowDepth / 2 + 0.1, 1.0, lowDepth / 2 - 0.1])
        box(0.18, lowHeight, 0.29, x, lowHeight / 2, 0, trim);
      eave(lowDepth, lowHeight);
      downpipe(-lowDepth / 2 + 0.23, lowHeight);
      for (const ac of detail.airConditioners) airConditioner(ac.x, ac.y);
      const b = detail.bench;
      box(b.width, 0.09, b.depth, b.x, b.height, -b.depth / 2 - 0.12, brick, true);
      for (let i = 0; i <= 3; i++) box(0.10, b.height - 0.045, b.depth - 0.06,
        b.x - b.width / 2 + 0.05 + i * (b.width - 0.1) / 3,
        (b.height - 0.045) / 2, -b.depth / 2 - 0.1, brick, true);
      box(1.1, 0.055, 0.075, -1.6, lowHeight - 0.27, -0.18, equipment);
      beam(v3(-lowDepth / 2 + 0.3, 2.95, -0.15), v3(lowDepth / 2 - 0.3, 2.95, -0.15), 0.013, pipe);
    });

  // Lateral alto expuesto por el retiro: ventana superior y ventana inferior de celosías.
  facade([(rear + lowRear) / 2, split], lowRearInset, 0, annex.height,
    detail.highCornerWindows, () => {
      for (const x of [-lowRearInset / 2 + 0.08, 0.1, lowRearInset / 2 - 0.08])
        box(0.13, annex.height, 0.30, x, annex.height / 2, 0, brick);
      downpipe(lowRearInset / 2 - 0.24, annex.height);
      beam(v3(0.12, 0.15, -0.22), v3(0.12, 3.2, -0.22), 0.026, pipe);
      beam(v3(0.12, 3.2, -0.22), v3(-1.7, 3.2, -0.22), 0.026, pipe);
      beam(v3(-1.45, 0.35, -0.13), v3(-1.45, 0.35, -0.32), 0.023, trim);
      box(0.12, 0.025, 0.035, -1.45, 0.43, -0.25, equipment);
    });
  // El alero de la nave alta continúa sobre el techo bajo sin cambiar la cumbrera.
  frame({ center: [0, split], size: [depth, 0.2], angle: 0 }, () => eave(depth, annex.height));
}
