import * as T from "three";
import { diciaEntranceFacade as detail, diciaStructure as spec, type Annex } from "../../data/faculty-annexes";
import { fromRect, type Vec2 } from "../../data/faculty-blueprint";
import { registerSeats } from "../seating";
import type { FacultyBuilder } from "./builder";

/** Cabecera hacia el pasillo, sin la carpa de la referencia. */
export function addDiciaEntranceFacade(builder: FacultyBuilder, annex: Annex,
  brick: T.MeshStandardMaterial, trim: T.MeshStandardMaterial,
  tile: T.MeshStandardMaterial, ground: (point: Vec2) => number) {
  const { box, frame, beam, v3, layers, m } = builder;
  const n = spec.nave, h = annex.height, t = spec.wallThickness;
  const half = (n.maxZ - n.minZ) / 2;
  const facade = { center: [n.minX, (n.minZ + n.maxZ) / 2] as Vec2,
    size: [half * 2, t] as Vec2, angle: -Math.PI / 2 };
  const level = (x: number, z: number) => ground(fromRect(annex.rect, fromRect(facade, [x, z])));
  const metal = new T.MeshStandardMaterial({ color: "#303b3b", roughness: 0.65 });
  const chrome = new T.MeshStandardMaterial({ color: "#b9c1bf", metalness: 0.8, roughness: 0.3 });
  const blue = new T.MeshStandardMaterial({ color: "#30486c", roughness: 0.75 });
  const wood = new T.MeshStandardMaterial({ color: "#79523c", roughness: 0.85 });
  const cream = new T.MeshStandardMaterial({ color: "#c6c9bc", roughness: 0.75 });
  const glass = m.glass.clone(); glass.color.set("#485a55"); glass.opacity = 0.6;
  frame(facade, () => {
    const door = detail.door, sill = level(door.x, -0.15) + 0.015;
    const left = door.x - door.width / 2, right = door.x + door.width / 2;
    for (const [a, b] of [[-half, left], [right, half]])
      box(b - a, h, t, (a + b) / 2, h / 2, 0, brick, true);
    box(door.width, sill, t, door.x, sill / 2, 0, brick, true);
    box(door.width, h - sill - door.height, t, door.x, (h + sill + door.height) / 2, 0, brick, true);
    const bandBottom = spec.bandY - spec.bandHeight / 2;
    const bandSpans = sill + door.height > bandBottom ? [[-half, left], [right, half]] : [[-half, half]];
    for (const [a, b] of bandSpans)
      box(b - a, spec.bandHeight, 0.03, (a + b) / 2, spec.bandY, -0.115, trim);
    for (const x of [left, right]) box(0.055, door.height, 0.14, x, sill + door.height / 2, -0.025, metal);
    for (const y of [sill, sill + door.height]) box(door.width, 0.055, 0.14, door.x, y, -0.025, metal);
    for (const side of [-1, 1]) {
      const x = door.x + side * door.width / 4;
      box(door.width / 2 - 0.04, door.height - 0.055, 0.035, x, sill + door.height / 2, 0, glass, true);
      box(door.width / 2 - 0.04, door.frostedHeight, 0.045, x, sill + door.frostedY, 0, cream);
      const handleX = door.x + side * 0.12;
      for (const face of [-1, 1]) {
        const z = face * 0.13;
        beam(v3(handleX, sill + 0.82, z), v3(handleX, sill + 1.35, z), 0.018, chrome);
        for (const y of [0.86, 1.31]) beam(v3(handleX, sill + y, z), v3(handleX, sill + y, 0), 0.012, chrome);
      }
    }
    box(0.035, door.height, 0.09, door.x, sill + door.height / 2, -0.035, metal);
    const plaque = detail.plaque;
    box(plaque.width + 0.045, plaque.height + 0.045, 0.035, plaque.x, sill + plaque.y, -0.12, metal);
    box(plaque.width, plaque.height, 0.015, plaque.x, sill + plaque.y, -0.145, cream);

    // Baldosas continuas hasta el borde del pasillo; siguen la cota del terreno.
    const paving = new T.PlaneGeometry(1, 1, 32, 6);
    const pos = paving.attributes.position, uv = paving.attributes.uv;
    const [tw, td] = tile.userData.tile as number[];
    for (let i = 0; i < pos.count; i++) {
      const x = -half + uv.getX(i) * (half * 2 + 0.22);
      const z = -t / 2 - uv.getY(i) * (detail.pavingDepth - t / 2);
      pos.setXYZ(i, x, level(x, z), z); uv.setXY(i, x / tw, z / td);
    }
    paving.computeVertexNormals();
    const mesh = new T.Mesh(paving, tile); mesh.receiveShadow = true; layers.visual.add(mesh);
    layers.solid.add(new T.Mesh(paving));
    box(door.width, 0.035, 0.3, door.x, sill - 0.0175, -0.03, tile, true);

    for (const x of detail.benches.centers) {
      const width = detail.benches.width, z = detail.benches.z, y = level(x, z);
      frame({ center: [x, z], size: [width, 0.6], angle: Math.PI }, () => {
        registerSeats(layers.visual, width);
        for (let i = 0; i < 5; i++) box(width, 0.045, 0.075, 0, 0.46, -0.19 + i * 0.095, wood, true);
        for (let i = 0; i < 3; i++) box(width, 0.12, 0.05, 0, 0.64 + i * 0.16, -0.27, wood, true);
        for (const side of [-1, 1]) {
          const sx = side * (width / 2 - 0.08);
          for (const sz of [-0.19, 0.19]) box(0.055, 0.46, 0.055, sx, 0.23, sz, blue, true);
          box(0.055, 0.65, 0.055, sx, 0.69, -0.27, blue, true);
          box(0.055, 0.055, 0.55, sx, 0.42, 0, blue);
        }
        box(width, 0.065, 0.06, 0, 1.02, -0.27, blue);
      }, y);
    }
    const potGeometry = new T.CylinderGeometry(0.23, 0.16, 0.35, 12);
    const potMaterial = new T.MeshStandardMaterial({ color: "#8c6347", roughness: 0.95 });
    const leafMaterial = new T.MeshStandardMaterial({ color: "#486445", roughness: 0.9, side: T.DoubleSide });
    const leafGeometry = new T.BufferGeometry();
    leafGeometry.setAttribute("position", new T.Float32BufferAttribute([-0.045,0,0, 0.045,0,0, 0,0.62,0.26], 3));
    leafGeometry.computeVertexNormals();
    for (const x of detail.pots) {
      const z = -0.38, y = level(x, z);
      const pot = new T.Mesh(potGeometry, potMaterial);
      pot.position.set(x, y + 0.175, z); layers.visual.add(pot);
      const body = new T.Mesh(potGeometry); body.position.copy(pot.position); layers.solid.add(body);
      for (let i = 0; i < 9; i++) {
        const leaf = new T.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(x, y + 0.33, z); leaf.rotation.y = i * Math.PI * 2 / 9;
        leaf.scale.setScalar(0.75 + (i % 3) * 0.15); layers.visual.add(leaf);
      }
    }
  });
}
