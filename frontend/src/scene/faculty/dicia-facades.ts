import * as T from "three";
import { diciaFacades as detail, diciaStructure as spec } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";

type Opening = { x: number; width: number; sill: number; height: number };

/** Fachadas fotografiadas, con vanos reales y hojas cerradas con colisión. */
export function addDiciaFacades(builder: FacultyBuilder, height: number,
  brick: T.MeshStandardMaterial, trim: T.MeshStandardMaterial,
  passageTile: T.MeshStandardMaterial, passageLevel: (x: number) => number) {
  const { box, frame, beam, pole, v3, m, layers } = builder;
  const n = spec.nave, thickness = spec.wallThickness;
  const metal = new T.MeshStandardMaterial({ color: "#444b50", roughness: 0.76, metalness: 0.2 });
  const darkFrame = new T.MeshStandardMaterial({ color: "#303a3b", roughness: 0.65 });
  const chrome = new T.MeshStandardMaterial({ color: "#b9c1bf", metalness: 0.8, roughness: 0.3 });
  const glass = m.glass.clone(); glass.color.set("#536765"); glass.opacity = 0.56;
  const lamp = new T.MeshStandardMaterial({ color: "#eee9d8", emissive: "#e5d8ad", emissiveIntensity: 0.18, roughness: 0.45 });

  // Cada paño usa su propio marco, con el exterior hacia -z.
  function wall(minX: number, maxX: number, openings: Opening[]) {
    const edges = [minX, maxX, ...openings.flatMap(o => [o.x - o.width / 2, o.x + o.width / 2])].sort((a, b) => a - b);
    for (let i = 1; i < edges.length; i++) {
      const a = edges[i - 1], b = edges[i], x = (a + b) / 2, w = b - a;
      const opening = openings.find(o => x > o.x - o.width / 2 && x < o.x + o.width / 2);
      if (!opening) box(w, height, thickness, x, height / 2, 0, brick, true);
      else {
        if (opening.sill > 0) box(w, opening.sill, thickness, x, opening.sill / 2, 0, brick, true);
        const top = opening.sill + opening.height;
        box(w, height - top, thickness, x, (height + top) / 2, 0, brick, true);
      }
    }
  }
  function surround(o: Opening, width: number, depth: number, material: T.Material) {
    const y = o.sill + o.height / 2;
    for (const side of [-1, 1]) box(width, o.height + width, depth, o.x + side * o.width / 2, y, -0.06, material);
    for (const at of [o.sill, o.sill + o.height]) box(o.width + width, width, depth, o.x, at, -0.06, material);
  }
  function handle(x: number, y: number, z: number, material: T.Material) {
    for (const dy of [-0.18, 0.18]) beam(v3(x, y + dy, z + 0.06), v3(x, y + dy, z), 0.012, material);
    beam(v3(x, y - 0.2, z), v3(x, y + 0.2, z), 0.017, material);
  }

  // Cabecera opuesta al quiebre de la L: portón, marquesina y lámpara hacia +x.
  const width = n.maxZ - n.minZ;
  frame({ center: [n.maxX, (n.minZ + n.maxZ) / 2], size: [width, thickness], angle: Math.PI / 2 }, () => {
    const gate = { ...detail.gate, x: 0 };
    wall(-width / 2, width / 2, [gate]);
    surround(gate, 0.075, 0.16, metal);
    const leafWidth = gate.width / 2 - 0.025, cy = gate.sill + gate.height / 2;
    for (const side of [-1, 1]) {
      const cx = side * gate.width / 4;
      box(leafWidth, gate.height - 0.03, 0.065, cx, cy, -0.015, metal, true);
      const count = Math.ceil(leafWidth / 0.15);
      for (let i = 0; i <= count; i++) box(0.025, gate.height - 0.07, 0.035,
        cx - leafWidth / 2 + i * leafWidth / count, cy, -0.065, trim);
      box(leafWidth, 0.055, 0.035, cx, 1.13, -0.08, trim);
      handle(side * 0.09, 1.2, -0.16, darkFrame);
      for (const y of [0.45, 2.25]) box(0.055, 0.15, 0.06, side * (gate.width / 2 - 0.045), y, -0.10, metal);
    }
    box(0.045, gate.height, 0.06, 0, cy, -0.065, darkFrame);
    box(gate.width + 0.55, 0.09, gate.canopyDepth, 0, gate.sill + gate.height + 0.25,
      -gate.canopyDepth / 2 - 0.10, trim, true);
    for (const x of [-1.3, 1.3]) beam(v3(x, 2.70, -0.11), v3(x, 2.89, -0.57), 0.025, metal);
    // Lámpara mural sobre el lado izquierdo del portón.
    const lx = -2.05, ly = 3.55;
    box(0.12, 0.23, 0.04, lx, ly - 0.14, -0.12, metal);
    beam(v3(lx, ly - 0.15, -0.14), v3(lx, ly + 0.02, -0.5), 0.023, metal);
    pole(0.17, 0.045, lx, ly, -0.5, trim);
    pole(0.105, 0.15, lx, ly - 0.095, -0.5, lamp);
  });

  frame({ center: [0, n.minZ], size: [n.maxX - n.minX, thickness], angle: 0 }, () => {
    const windows = detail.windows.map(w => ({ ...w, sill: w.sill + passageLevel(w.x) - 0.05 }));
    const doors = detail.doors.map(door => ({ ...door, sill: Math.max(
      ...[-0.5, 0, 0.5].map(side => passageLevel(door.x + side * door.width))) + 0.003 }));
    wall(n.minX, n.maxX, [...windows, ...doors]);
    for (const w of windows) {
      surround(w, 0.065, 0.14, darkFrame);
      box(w.width - 0.08, w.height - 0.08, 0.035, w.x, w.sill + w.height / 2, -0.035, glass, true);
      box(0.04, w.height, 0.09, w.x, w.sill + w.height / 2, -0.065, darkFrame);
      box(w.width + 0.14, 0.045, 0.24, w.x, w.sill - 0.03, -0.04, trim);
    }
    for (const door of doors) {
      surround(door, 0.035, 0.10, darkFrame);
      const leafWidth = door.width / 2 - 0.012;
      for (const side of [-1, 1]) {
        box(leafWidth, door.height - 0.035, 0.028, door.x + side * door.width / 4,
          door.sill + door.height / 2, -0.025, glass, true);
        handle(door.x + side * 0.11, door.sill + 1.13, -0.13, chrome);
        handle(door.x + side * 0.11, door.sill + 1.13, 0.12, chrome);
        for (const y of [door.sill + 0.08, door.sill + door.height - 0.08])
          box(0.13, 0.065, 0.055, door.x + side * (door.width / 2 - 0.085), y, -0.04, chrome);
      }
      box(door.width, 0.015, 0.24, door.x, door.sill - 0.0075, 0, trim, true);
      // Rellano de baldosas hasta el pasillo, cubriendo la antigua franja de césped.
      // Su borde exterior sigue la pendiente; el umbral y el apoyo interior son horizontales.
      const vertices: number[] = [], indices: number[] = [], uv: number[] = [];
      const [tw, td] = passageTile.userData.tile as number[];
      const count = Math.ceil((door.width + 0.22) / 0.2);
      for (let i = 0; i <= count; i++) {
        const x = door.x - door.width / 2 - 0.11 + (door.width + 0.22) * i / count;
        for (const [z, y] of [[-0.65, passageLevel(x) + 0.003], [-0.1, door.sill], [0.65, door.sill]]) {
          vertices.push(x, y, z); uv.push(x / tw, z / td);
        }
      }
      for (let i = 0; i < count; i++) for (let row = 0; row < 2; row++) {
        const a = i * 3 + row, b = a + 3;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      const landing = new T.Mesh(geometry, passageTile); landing.receiveShadow = true; layers.visual.add(landing);
      layers.solid.add(new T.Mesh(geometry));
      // Volumen de apoyo dentro del edificio; no introduce un escalón sobre el pasillo.
      box(door.width + 0.22, door.sill + 0.05, 0.75, door.x,
        (door.sill - 0.05) / 2, 0.275, m.concrete, true);
    }
    // Bajantes adosadas a los pilares, sin ocupar el centro de circulación.
    for (const x of detail.downpipes) {
      box(0.09, height - 0.32, 0.09, x, height / 2, -0.16, trim);
      box(0.09, 0.22, 0.09, x, 0.14, -0.17, trim, false, { pitch: -0.2 });
      box(0.09, 0.23, 0.09, x, height - 0.12, -0.17, trim, false, { pitch: 0.2 });
      for (const y of [0.55, 1.9, 3.25]) box(0.13, 0.03, 0.10, x, y, -0.16, metal);
    }
  });
}
