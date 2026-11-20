import * as T from "three";
import { diciaRearFacade as detail, diciaStructure as spec } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";

/** Ventanas cerradas y condensadoras en el muro que sustituyó al ala posterior. */
export function addDiciaRearFacade(builder: FacultyBuilder, height: number, brick: T.MeshStandardMaterial) {
  const { box, beam, v3, layers, m } = builder;
  const { minX, maxX, maxZ: z } = spec.nave;
  const thickness = spec.wallThickness;
  const frame = new T.MeshStandardMaterial({ color: "#303a3b", roughness: 0.7 });
  const casing = new T.MeshStandardMaterial({ color: "#c5c0ac", roughness: 0.75 });
  const fan = new T.MeshStandardMaterial({ color: "#34393a", roughness: 0.8 });
  const glass = m.glass.clone();
  glass.color.set("#465451"); glass.opacity = 0.65;

  // Descontar los vanos también del muro de colisión, incluidos los apilados.
  const edges = [...new Set([minX, maxX, ...detail.windows.flatMap(w => [w.x - w.width / 2, w.x + w.width / 2])])].sort((a, b) => a - b);
  for (let i = 1; i < edges.length; i++) {
    const left = edges[i - 1], right = edges[i], x = (left + right) / 2;
    const openings = detail.windows.filter(w => x > w.x - w.width / 2 && x < w.x + w.width / 2).sort((a, b) => a.sill - b.sill);
    let bottom = 0;
    for (const opening of openings) {
      if (opening.sill > bottom) box(right - left, opening.sill - bottom, thickness,
        x, (opening.sill + bottom) / 2, z, brick, true);
      bottom = opening.sill + opening.height;
    }
    if (bottom < height) box(right - left, height - bottom, thickness,
      x, (height + bottom) / 2, z, brick, true);
  }
  // Comparten material y coordenadas de textura con la mampostería del muro.
  const pilasters = detail.pilasters;
  for (const x of pilasters.centers)
    box(pilasters.width, height, thickness + pilasters.projection,
      x, height / 2, z + pilasters.projection / 2, brick, true);

  for (const w of detail.windows) {
    const cy = w.sill + w.height / 2;
    box(w.width, w.height, 0.035, w.x, cy, z, glass, true);
    for (const side of [-1, 1]) box(0.065, w.height + 0.065, 0.16,
      w.x + side * w.width / 2, cy, z + 0.035, frame);
    for (const y of [w.sill, w.sill + w.height])
      box(w.width + 0.065, 0.065, 0.16, w.x, y, z + 0.035, frame);
    box(0.045, w.height, 0.10, w.x, cy, z + 0.065, frame);
    box(w.width + 0.14, 0.045, 0.24, w.x, w.sill - 0.025, z + 0.04, frame);
  }

  const ac = detail.airConditioners;
  const faceZ = z + thickness / 2 + 0.08 + ac.depth;
  const disk = new T.CircleGeometry(0.30, 24);
  const ring = new T.TorusGeometry(0.30, 0.018, 6, 24);
  for (const x of ac.centers) {
    box(ac.width, ac.height, ac.depth, x, ac.y, faceZ - ac.depth / 2, casing, true);
    const fanX = x - 0.13;
    const grille = new T.Mesh(disk, fan);
    grille.position.set(fanX, ac.y, faceZ + 0.006); layers.visual.add(grille);
    for (const scale of [1, 0.78, 0.56, 0.34]) {
      const rim = new T.Mesh(ring, casing);
      rim.scale.setScalar(scale); rim.position.set(fanX, ac.y, faceZ + 0.018);
      layers.visual.add(rim);
    }
    box(0.025, 0.59, 0.025, fanX, ac.y, faceZ + 0.025, casing);
    box(0.59, 0.025, 0.025, fanX, ac.y, faceZ + 0.025, casing);
    for (let i = 0; i < 8; i++) box(0.16, 0.025, 0.02,
      x + 0.36, ac.y - 0.28 + i * 0.08, faceZ + 0.012, fan);
    for (const side of [-1, 1]) {
      const at = x + side * 0.36, base = ac.y - ac.height / 2 - 0.035;
      beam(v3(at, base - 0.3, z + 0.12), v3(at, base, faceZ - 0.04), 0.022, frame);
      box(0.055, 0.055, ac.depth + 0.16, at, base, faceZ - ac.depth / 2, frame);
      box(0.055, 0.4, 0.055, at, base - 0.15, z + 0.13, frame);
    }
  }
}
