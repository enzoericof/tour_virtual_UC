import * as T from "three";
import { makeMaterials, random } from "./materials";
import { places } from "../data/places";
export type Ramp = {
  x: number;
  z: number;
  width: number;
  length: number;
  bottom: number;
  height: number;
};
export type Campus = {
  group: T.Group;
  colliders: T.Group;
  ramps: Ramp[];
  markers: T.Mesh[];
};
export function createCampus(): Campus {
  const group = new T.Group(),
    colliders = new T.Group(),
    ramps: Ramp[] = [],
    markers: T.Mesh[] = [];
  const m = makeMaterials();
  const boxGeo = new T.BoxGeometry(1, 1, 1),
    cylGeo = new T.CylinderGeometry(1, 1, 1, 10);
  const mappedGeometries = new Map<string, T.BoxGeometry>();
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: T.Material,
    solid = false,
  ) {
    let geometry = boxGeo;
    if ((mat as T.MeshStandardMaterial).map) {
      const key = `${w},${h},${d},${mat.uuid}`;
      geometry = mappedGeometries.get(key)!;
      if (!geometry) {
        geometry = boxGeo.clone();
        const uv = geometry.attributes.uv;
        const tileW = mat === m.brick ? 2 : 4,
          tileH = mat === m.brick ? 1.28 : 4;
        for (let i = 0; i < uv.count; i++) {
          const face = Math.floor(i / 4);
          uv.setXY(
            i,
            (uv.getX(i) * (face < 2 ? d : w)) / tileW,
            (uv.getY(i) * (face === 2 || face === 3 ? d : h)) / tileH,
          );
        }
        mappedGeometries.set(key, geometry);
      }
    }
    const o = new T.Mesh(geometry, mat);
    o.scale.set(w, h, d);
    o.position.set(x, y, z);
    o.castShadow = h > 0.2;
    o.receiveShadow = true;
    group.add(o);
    if (solid) {
      const c = new T.Mesh(boxGeo);
      c.scale.copy(o.scale);
      c.position.copy(o.position);
      colliders.add(c);
    }
    return o;
  }
  function pole(
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat = m.metal,
  ) {
    const o = new T.Mesh(cylGeo, mat);
    o.scale.set(r, h, r);
    o.position.set(x, y, z);
    o.castShadow = true;
    group.add(o);
    return o;
  }
  function beam(a: T.Vector3, b: T.Vector3, r: number, mat = m.metal) {
    const o = pole(r, a.distanceTo(b), 0, 0, 0, mat);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return o;
  }
  function label(text: string, x: number, y: number, z: number, width = 3) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1d3c4c";
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#f5f0dc";
    g.font = "500 40px Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 66, 480);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    const o = new T.Mesh(
      new T.PlaneGeometry(width, width / 4),
      new T.MeshBasicMaterial({ map: t }),
    );
    o.position.set(x, y, z);
    group.add(o);
  }
  function rail(x: number, z: number, y: number, length: number) {
    for (let i = 0; i <= length; i += 2.5) pole(0.045, 1.1, x + i, y + 0.55, z);
    for (let h = 0.2; h < 1.2; h += 0.3)
      box(length, 0.055, 0.055, x + length / 2, y + h, z, m.metal);
    box(length, 1.1, 0.08, x + length / 2, y + 0.55, z, m.metal, false); // last surface made invisible below
    group.children[group.children.length - 1].visible = false;
    const barrier = new T.Mesh(boxGeo);
    barrier.scale.set(length, 1.1, 0.12);
    barrier.position.set(x + length / 2, y + 0.55, z);
    colliders.add(barrier);
  }
  function bench(x: number, z: number, y = 0, rotate = 0) {
    const b = new T.Group();
    const before = group.children.length;
    for (let i = 0; i < 5; i++) {
      box(1.8, 0.055, 0.09, x, y + 0.48, z + (i - 2) * 0.105, m.wood);
      box(1.8, 0.09, 0.05, x, y + 0.72 + i * 0.105, z - 0.3, m.wood);
    }
    for (let dx of [-0.7, 0.7]) {
      pole(0.035, 0.5, x + dx, y + 0.25, z - 0.2);
      pole(0.035, 0.5, x + dx, y + 0.25, z + 0.2);
    }
    const parts = group.children.slice(before);
    parts.forEach((o) => {
      o.position.x -= x;
      o.position.z -= z;
      b.add(o);
    });
    b.position.set(x, 0, z);
    b.rotation.y = rotate;
    group.add(b);
  }
  box(180, 0.3, 170, 0, -0.28, 15, m.grass, true);
  box(83, 0.1, 3.4, 5, -0.04, 3, m.stone, true);
  box(3, 0.1, 60, 28, -0.03, 25, m.stone, true);
  box(68, 0.1, 3.5, -3, -0.03, 23, m.stone, true);
  box(58, 0.1, 21, 0, -0.03, 51, m.asphalt, true);
  for (let i = 0; i < 17; i++) {
    box(0.09, 0.015, 5, -26 + i * 3.1, 0.035, 48, m.white);
    box(0.09, 0.015, 5, -26 + i * 3.1, 0.035, 56, m.white);
  }
  // Main block: four levels and open galleries overlooking the courtyard.
  for (let level = 0; level < 4; level++) {
    const y = level * 3.5;
    box(64, 0.22, 13, 0, y - 0.13, -5.2, m.concrete, true);
    box(64, 0.035, 3, 0, y + 0.005, -0.15, m.tile);
    box(64, 3.25, 0.25, 0, y + 1.65, -11.5, m.brick, true);
    box(0.25, 3.25, 11, -32, y + 1.65, -5.9, m.brick, true);
    box(0.25, 3.25, 11, 32, y + 1.65, -5.9, m.brick, true);
    for (let x = -28; x < 32; x += 8) {
      // Door openings remain traversable; classroom dividers stop at gallery.
      box(5.9, 2.9, 0.22, x - 1, y + 1.5, -2, m.brick, true);
      box(0.8, 2.9, 0.22, x + 3.45, y + 1.5, -2, m.brick, true);
      box(1.4, 0.6, 0.22, x + 2.6, y + 2.95, -2, m.brick, true);
      box(0.16, 3.25, 9.3, x - 4, y + 1.65, -6.75, m.concrete, true);
      box(1.05, 2.45, 0.08, x + 3.2, y + 1.25, -2.55, m.metal).rotation.y =
        Math.PI / 2;
      box(4.2, 1.3, 0.07, x - 1, y + 1.9, -11.32, m.glass);
      box(0.25, 3.45, 0.3, x - 4, y + 1.7, 1.15, m.concrete, true);
      box(8, 0.32, 0.35, x, y + 3.23, 1.15, m.concrete);
      label(
        level === 0
          ? "LAB " + (Math.round((x + 28) / 8) + 1)
          : `${level}0${Math.round((x + 28) / 8) + 1}`,
        x + 2.5,
        y + 2.9,
        -1.86,
        1.15,
      );
      if (level < 3)
        for (let dx of [-1.6, 0.8])
          for (let dz of [-5, -7.2, -9.4]) {
            box(1.3, 0.07, 0.65, x + dx, y + 0.75, dz, m.wood);
            for (let a of [-0.5, 0.5])
              pole(0.025, 0.72, x + dx + a, y + 0.36, dz);
            box(0.45, 0.07, 0.45, x + dx, y + 0.43, dz + 0.8, m.metal);
          }
      if (level > 0) bench(x - 1, 0.4, y);
    }
    if (level > 0) {
      const stairX = 22 - (level - 1) * 5;
      rail(-32, 1.25, y, stairX - 1.2 + 32);
      rail(stairX + 1.2, 1.25, y, 32 - stairX - 1.2);
    }
  }
  box(66, 0.18, 14, 0, 14, -5.2, m.roof);
  for (let x = -32; x <= 32; x += 4) {
    beam(new T.Vector3(x, 13.9, -12), new T.Vector3(x, 14.8, -5), 0.045);
    beam(new T.Vector3(x, 14.8, -5), new T.Vector3(x, 13.9, 2), 0.045);
  }
  // Stair flights have matching smooth collision ramps, without changing visual steps.
  for (let level = 0; level < 3; level++) {
    const y = level * 3.5,
      x = 22 - level * 5;
    for (let s = 0; s < 20; s++)
      box(
        2,
        0.175,
        0.35,
        x,
        y + 0.0875 + s * 0.175,
        8.0 - s * 0.35,
        m.concrete,
      );
    const ramp = { x, z: 4.675, width: 2, length: 7, bottom: y, height: 3.5 };
    ramps.push(ramp);
    const geom = new T.BufferGeometry();
    const z0 = 8.175,
      z1 = 1.175;
    geom.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          x - 1,
          y,
          z0,
          x + 1,
          y,
          z0,
          x + 1,
          y + 3.5,
          z1,
          x - 1,
          y,
          z0,
          x + 1,
          y + 3.5,
          z1,
          x - 1,
          y + 3.5,
          z1,
        ],
        3,
      ),
    );
    geom.computeVertexNormals();
    colliders.add(
      new T.Mesh(geom, new T.MeshBasicMaterial({ side: T.DoubleSide })),
    );
    for (let dx of [-1, 1]) {
      beam(
        new T.Vector3(x + dx, y + 1, 8.1),
        new T.Vector3(x + dx, y + 4.5, 1.2),
        0.045,
      );
      for (let s = 0; s <= 4; s++)
        pole(0.035, 1, x + dx, y + s * 0.875 + 0.5, 8.1 - s * 1.725);
    }
    box(4, 0.2, 2.5, x, y - 0.1, 9, m.concrete, true);
    if (level > 0) {
      box(33 - x, 0.2, 2.5, (x + 29) / 2, y - 0.1, 9, m.concrete, true);
      box(2, 0.2, 9, 30, y - 0.1, 5, m.concrete, true);
    }
  }
  // Bloque G: corresponde al Bloque 2 de las referencias, confirmado por Horacio.
  for (let l = 0; l < 3; l++) {
    const y = l * 3.5;
    box(58, 0.2, 11, -3, y - 0.12, 29, m.concrete, true);
    box(58, 3, 0.22, -3, y + 1.5, 33, m.brick, true);
    for (let x = -28; x < 26; x += 7) {
      box(4.8, 3, 0.2, x, y + 1.5, 26, m.brick, true);
      box(0.3, 3.5, 0.3, x - 3, y + 1.7, 23.5, m.concrete, true);
      box(2, 1.5, 0.1, x, y + 1.8, 25.85, m.glass);
    }
    if (l > 0) rail(-32, 23.5, y, 58);
  }
  box(61, 0.2, 12, -3, 10.6, 29, m.roof);
  label("BLOQUE G", 20, 2.7, 23.3, 4);
  function pavilion(x: number, z: number, w: number, d: number, name: string) {
    box(w, 0.2, d, x, -0.1, z, m.stone, true);
    box(w, 3.5, 0.2, x, 1.75, z - d / 2, m.brick, true);
    for (const dx of [-w / 2, w / 2])
      box(0.2, 3.5, d, x + dx, 1.75, z, m.brick, true);
    box(w, 0.25, d, x, 3.6, z, m.concrete);
    box(w * 0.34, 2.8, 0.08, x - w * 0.3, 1.4, z + d / 2, m.glass, true);
    box(w * 0.34, 2.8, 0.08, x + w * 0.3, 1.4, z + d / 2, m.glass, true);
    label(name, x, 3.1, z + d / 2 + 0.12, Math.min(w - 1, 5));
  }
  pavilion(41, -14, 13, 8, "BEDELÍA");
  pavilion(27, -17, 10, 8, "SALA MANFRED");
  pavilion(42, 15, 10, 10, "CANTINA · CyT");
  for (let z = -10; z < 23; z += 5)
    for (let x of [27, 32]) pole(0.13, 3.4, x, 1.7, z, m.concrete);
  box(7, 0.15, 35, 29.5, 3.5, 6, m.roof);
  box(8, 0.08, 35, 29.5, -0.02, 6, m.stone, true);
  for (let x of [33, 45])
    for (let z of [27, 34]) {
      box(2, 0.12, 1, x, 0.78, z, m.metal);
      bench(x, z + 1.1, 0, Math.PI);
      bench(x, z - 1.1);
    }
  for (let x = -25; x <= 20; x += 9) bench(x, 3.7);
  // Instanced foliage shares geometry/materials; tree positions avoid primary paths.
  const leafGeo = new T.IcosahedronGeometry(1, 2);
  const trees = [
    [-29, 12],
    [-18, 14],
    [-5, 10],
    [9, 16],
    [20, 16],
    [37, 30],
    [45, 34],
    [33, 40],
    [-36, 18],
    [-39, -4],
    [-22, 42],
    [18, 43],
    [-16, -22],
    [0, -22],
    [19, -24],
    [-40, 39],
    [45, -24],
    [51, 2],
    [48, 47],
  ];
  const foliage = m.leaves.map(
    (mat) => new T.InstancedMesh(leafGeo, mat, trees.length * 16),
  );
  let counts = [0, 0, 0, 0];
  const dummy = new T.Object3D();
  trees.forEach(([x, z], ti) => {
    const h = 5 + random() * 3;
    pole(0.28, h, x, h / 2, z, m.bark);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + random();
      beam(
        new T.Vector3(x, h * 0.55, z),
        new T.Vector3(x + Math.cos(a) * 2, h + 1, z + Math.sin(a) * 2),
        0.12,
        m.bark,
      );
    }
    for (let k = 0; k < 14; k++) {
      const a = random() * Math.PI * 2,
        r = random() * 4;
      dummy.position.set(
        x + Math.cos(a) * r,
        h + random() * 2,
        z + Math.sin(a) * r,
      );
      dummy.scale.set(
        1.7 + random() * 1.4,
        1.2 + random() * 1.1,
        1.7 + random() * 1.4,
      );
      dummy.rotation.set(random(), random(), random());
      dummy.updateMatrix();
      const idx = (ti + k) % 4;
      foliage[idx].setMatrixAt(counts[idx]++, dummy.matrix);
    }
  });
  foliage.forEach((o, i) => {
    o.count = counts[i];
    o.castShadow = true;
    o.receiveShadow = true;
    group.add(o);
  });
  for (let x = -30; x < 20; x += 0.7) {
    const leaf = new T.Mesh(
      new T.ConeGeometry(0.12, 0.8 + random() * 0.5, 4),
      m.leaves[2],
    );
    leaf.position.set(x, 0.45, 2.4);
    leaf.rotation.z = (random() - 0.5) * 0.3;
    group.add(leaf);
  }
  for (let x of [-22, -8, 8, 25]) {
    pole(0.06, 4.5, x, 2.25, 19);
    box(1.1, 0.1, 0.4, x, 4.5, 19, m.metal);
  }
  for (const p of places) {
    if (p.id === "aula-p3" || p.id === "pasillo-p3") continue;
    const mark = new T.Mesh(
      new T.CylinderGeometry(0.32, 0.32, 0.08, 24),
      new T.MeshBasicMaterial({
        color: p.status === "pending" ? 0xc9ab79 : 0xd6b66b,
      }),
    );
    mark.position.set(p.position[0], p.position[1] + 0.12, p.position[2]);
    mark.userData.placeId = p.id;
    group.add(mark);
    markers.push(mark);
  }
  group.updateMatrixWorld(true);
  colliders.updateMatrixWorld(true);
  return { group, colliders, ramps, markers };
}
