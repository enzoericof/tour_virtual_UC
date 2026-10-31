import * as T from "three";
import { makeMaterials } from "./materials";
import { facultyBlueprint as plan, photoPoint } from "../data/faculty-blueprint";
import { facultyPlaces } from "../data/places";

/** CyT's connected site, registered to the team's annotated aerial reference. */
export function createFaculty() {
  const group = new T.Group(), colliders = new T.Group(), markers: T.Mesh[] = [];
  const m = makeMaterials();
  const unit = new T.BoxGeometry(1, 1, 1);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  const uvCache = new Map<string, T.BufferGeometry>();
  const paving = new T.MeshStandardMaterial({ color: "#aaa593", roughness: 1 });
  const soil = new T.MeshStandardMaterial({ color: "#b6a082", roughness: 1 });
  const darkFloor = new T.MeshStandardMaterial({ color: "#515853", roughness: 0.9 });
  const fascia = new T.MeshStandardMaterial({ color: "#b7795e", roughness: 0.9 });
  const translucent = new T.MeshStandardMaterial({ color: "#c7cdca", roughness: 0.4, transparent: true, opacity: 0.5 });
  const blueRoof = new T.MeshStandardMaterial({ color: "#536078", metalness: 0.25, roughness: 0.65, side: T.DoubleSide });
  let visual = group, solid = colliders;

  function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material, collision = false) {
    let geometry: T.BufferGeometry = unit;
    if ((mat as T.MeshStandardMaterial).map) {
      const key = `${w}:${h}:${d}:${mat.uuid}`;
      if (!uvCache.has(key)) {
        const geo = unit.clone(), uv = geo.attributes.uv;
        const tileW = mat === m.brick ? 2 : 4, tileH = mat === m.brick ? 1.28 : 4;
        for (let i = 0; i < uv.count; i++) {
          const face = Math.floor(i / 4);
          uv.setXY(i, uv.getX(i) * (face < 2 ? d : w) / tileW,
            uv.getY(i) * (face === 2 || face === 3 ? d : h) / tileH);
        }
        uvCache.set(key, geo);
      }
      geometry = uvCache.get(key)!;
    }
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = h > 0.2; mesh.receiveShadow = true; visual.add(mesh);
    if (collision) {
      const body = new T.Mesh(unit); body.position.copy(mesh.position); body.scale.copy(mesh.scale); solid.add(body);
    }
    return mesh;
  }
  function pole(r: number, h: number, x: number, y: number, z: number, mat = m.metal) {
    const mesh = new T.Mesh(cylinder, mat); mesh.scale.set(r, h, r); mesh.position.set(x, y, z);
    mesh.castShadow = true; visual.add(mesh); return mesh;
  }
  function beam(a: T.Vector3, b: T.Vector3, r = 0.04, mat = m.metal) {
    const mesh = pole(r, a.distanceTo(b), 0, 0, 0, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  function sign(text: string, x: number, y: number, z: number, width = 2, front = 1) {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#294556"; ctx.fillRect(0, 0, 512, 100);
    ctx.fillStyle = "#f6f0e1"; ctx.font = "600 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 52, 480);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(new T.PlaneGeometry(width, width / 5.12), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
    mesh.position.set(x, y, z); mesh.rotation.y = front < 0 ? Math.PI : 0; visual.add(mesh);
  }
  function frame(quad: readonly (readonly number[])[], w: number, d: number, build: () => void) {
    const p = quad.map(([x, z]) => photoPoint(x, z));
    const center = new T.Vector3(p.reduce((s, q) => s + q[0], 0) / 4, 0, p.reduce((s, q) => s + q[2], 0) / 4);
    const x = new T.Vector3((p[1][0] - p[0][0] + p[2][0] - p[3][0]) / (2 * w), 0,
      (p[1][2] - p[0][2] + p[2][2] - p[3][2]) / (2 * w));
    const z = new T.Vector3((p[3][0] - p[0][0] + p[2][0] - p[1][0]) / (2 * d), 0,
      (p[3][2] - p[0][2] + p[2][2] - p[1][2]) / (2 * d));
    const transform = new T.Matrix4().makeBasis(x, new T.Vector3(0, 1, 0), z).setPosition(center);
    const vg = new T.Group(), cg = new T.Group(); vg.applyMatrix4(transform); cg.applyMatrix4(transform);
    const previousVisual = visual, previousSolid = solid; visual.add(vg); solid.add(cg); visual = vg; solid = cg;
    build(); visual = previousVisual; solid = previousSolid;
  }
  function pave(points: readonly (readonly number[])[], mat: T.Material, y = 0.055) {
    const local = points.map(([x, z]) => photoPoint(x, z));
    const shape = new T.Shape(local.map((p) => new T.Vector2(p[0], -p[2])));
    const geo = new T.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geo, mat); mesh.position.y = y; mesh.receiveShadow = true; group.add(mesh);
  }
  function path(points: readonly (readonly number[])[], width = 2.4) {
    for (let i = 1; i < points.length; i++) {
      const a = photoPoint(points[i - 1][0], points[i - 1][1]), b = photoPoint(points[i][0], points[i][1]);
      const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const mesh = box(width, 0.09, length + 0.12, (a[0] + b[0]) / 2, 0.005, (a[2] + b[2]) / 2, paving);
      mesh.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
    }
  }
  function rail(start: number, end: number, y: number, z: number) {
    if (end <= start) return;
    for (let x = start; x <= end; x += 2.2) pole(0.035, 1.08, x, y + 0.54, z);
    for (const h of [0.18, 0.46, 0.75, 1.06]) box(end - start, 0.045, 0.045, (start + end) / 2, y + h, z, m.metal);
    const body = new T.Mesh(unit); body.scale.set(end - start, 1.05, 0.08); body.position.set((start + end) / 2, y + 0.53, z); solid.add(body);
  }
  function bench(x: number, z: number, y = 0, front = 1) {
    for (let i = 0; i < 4; i++) {
      box(1.7, 0.05, 0.09, x, y + 0.46, z + i * 0.11, m.wood);
      box(1.7, 0.09, 0.05, x, y + 0.65 + i * 0.12, z - front * 0.11, m.wood);
    }
    for (const dx of [-0.68, 0.68]) for (const dz of [0, 0.35]) pole(0.028, 0.46, x + dx, y + 0.23, z + dz);
  }
  function stair(a: T.Vector3, b: T.Vector3, width: number) {
    const dx = b.x - a.x, dz = b.z - a.z, run = Math.hypot(dx, dz), rise = b.y - a.y;
    const n = Math.ceil(rise / 0.175), angle = Math.atan2(dx, dz);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const mesh = box(width, rise / n + 0.04, run / n + 0.025, a.x + dx * t, a.y + rise * (i + 0.5) / n, a.z + dz * t, m.concrete);
      mesh.rotation.y = angle;
    }
    const normal = new T.Vector3(-dz / run, 0, dx / run).multiplyScalar(width / 2);
    const p0 = a.clone().add(normal), p1 = a.clone().sub(normal), p2 = b.clone().add(normal), p3 = b.clone().sub(normal);
    const geo = new T.BufferGeometry().setFromPoints([p0, p2, p1, p1, p2, p3]); geo.computeVertexNormals();
    solid.add(new T.Mesh(geo, new T.MeshBasicMaterial({ side: T.DoubleSide })));
    for (const side of [-1, 1]) {
      const sideA = a.clone().addScaledVector(normal, side), sideB = b.clone().addScaledVector(normal, side);
      beam(sideA.clone().add(new T.Vector3(0, 1, 0)), sideB.clone().add(new T.Vector3(0, 1, 0)));
      for (let k = 0; k <= 4; k++) { const p = sideA.clone().lerp(sideB, k / 4); pole(0.03, 1, p.x, p.y + 0.5, p.z); }
    }
  }
  function roof(w: number, d: number, y: number, mat: T.Material) {
    const ridge = 1.0, a = -w / 2 - 0.6, b = w / 2 + 0.6, e = d / 2 + 0.55;
    const points = [a,y,-e,b,y,-e,b,y+ridge,0,a,y,-e,b,y+ridge,0,a,y+ridge,0,
      a,y+ridge,0,b,y+ridge,0,b,y,e,a,y+ridge,0,b,y,e,a,y,e];
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(points, 3)); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; visual.add(mesh);
    const seams: T.Vector3[] = [];
    for (let x = a; x <= b; x += 0.7) seams.push(new T.Vector3(x,y+0.02,-e),new T.Vector3(x,y+ridge+0.02,0),new T.Vector3(x,y+ridge+0.02,0),new T.Vector3(x,y+0.02,e));
    visual.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(seams), new T.LineBasicMaterial({ color: "#606c72", transparent: true, opacity: 0.3 })));
    for (let x = a + 1; x < b; x += 8) {
      beam(new T.Vector3(x,y-0.1,-e), new T.Vector3(x,y+ridge-0.1,0), 0.035);
      beam(new T.Vector3(x,y+ridge-0.1,0), new T.Vector3(x,y-0.1,e), 0.035);
      beam(new T.Vector3(x,y-0.1,-e), new T.Vector3(x,y-0.1,e), 0.035);
    }
  }
  function academicBlock(w: number, d: number, levels: number, front: number, block2 = false) {
    const gallery = 2.6, face = front * (d / 2 - gallery), edge = front * (d / 2 - 0.12), back = -front * d / 2;
    const bays = block2 ? 7 : 8, bay = w / bays;
    for (let level = 0; level < levels; level++) {
      const y = level * 3.5;
      box(w, 0.22, d, 0, y - 0.11, 0, m.concrete, true);
      box(w, 0.035, gallery, 0, y + 0.02, front * (d / 2 - gallery / 2), m.tile);
      box(w, 0.055, 0.12, 0, y + 0.044, face + front * 0.2, darkFloor);
      for (let i = 0; i < bays; i++) {
        const x = -w / 2 + bay * (i + 0.5), doorX = x + bay * 0.31;
        box(bay - 2.05, 2.8, 0.22, x - 1, y + 1.4, face, m.brick, true);
        box(0.75, 2.8, 0.22, x + bay / 2 - 0.37, y + 1.4, face, m.brick, true);
        box(1.3, 0.55, 0.22, doorX, y + 3.02, face, m.concrete, true);
        box(0.18, 3.25, d - gallery, x - bay / 2, y + 1.63, -front * gallery / 2, m.concrete, true);
        // Framed transom and blue-grey door leaf, rather than a solid brick facade.
        box(1.2, 0.65, 0.075, doorX, y + 2.58, face + front * 0.12, m.glass);
        box(1.3, 0.06, 0.1, doorX, y + 2.25, face + front * 0.15, m.metal);
        const door = box(1.02, 2.18, 0.06, doorX + 0.3, y + 1.09, face - front * 0.34, m.metal);
        door.rotation.y = front * Math.PI / 3;
        box(0.35, 0.43, 0.08, doorX + 0.3, y + 1.48, face - front * 0.39, translucent);
        sign(block2 ? "BLOQUE G" : level ? "AULAS" : "LABORATORIOS", doorX, y + 3.0, face + front * 0.15, 1.15, front);
        // Back-wall openings have actual sills, frames, panes and ventilation bars.
        box(bay, 1.05, 0.22, x, y + 0.52, back, m.brick, true);
        box(bay, 0.7, 0.22, x, y + 3.12, back, m.brick, true);
        box(1.2, 1.75, 0.22, x - bay / 2 + 0.6, y + 1.94, back, m.brick, true);
        box(1.2, 1.75, 0.22, x + bay / 2 - 0.6, y + 1.94, back, m.brick, true);
        box(bay - 2.4, 1.65, 0.07, x, y + 1.94, back, m.glass);
        for (let k = -1; k <= 1; k++) box(0.055, 1.7, 0.1, x + k * (bay - 2.4) / 3, y + 1.94, back, m.metal);
        for (const h of [1.12, 2.78]) box(bay - 2.3, 0.055, 0.1, x, y + h, back, m.metal);
        pole(0.14, 3.35, x - bay / 2, y + 1.66, edge, m.concrete);
        box(bay, 0.22, 0.28, x, y + 3.31, edge, m.concrete);
        box(0.11, 0.035, gallery, x - bay / 2, y + 0.045, front * (d / 2 - gallery / 2), darkFloor);
        if (i % 2 === 0) bench(x - 1, face + front * 0.55, y, front);
        box(1.15, 0.04, 0.14, x, y + 3.18, face + front * 1.1, m.white);
        if (!block2 && level === 0 && i < 4) {
          for (const z of [-2, -4]) {
            box(2.5, 0.08, 0.8, x, y + 0.76, z, m.wood);
            for (const dx of [-0.7, 0.7]) {
              box(0.62, 0.4, 0.05, x + dx, y + 1.08, z - 0.1, m.metal);
              box(0.5, 0.04, 0.28, x + dx, y + 0.82, z + 0.1, m.metal);
            }
          }
        }
      }
      for (const x of [-w / 2, w / 2]) box(0.24, 3.28, d - gallery, x, y + 1.64, -front * gallery / 2, m.brick, true);
      if (level) {
        if (block2) { rail(-w / 2 + 2.5, -11.5, y, edge); rail(-8.5, w / 2, y, edge); }
        else rail(-w / 2, w / 2 - 2, y, edge);
      }
    }
    roof(w, d, levels * 3.5, block2 ? blueRoof : m.roof);
    if (block2) {
      for (let level = 0; level < levels - 1; level++) {
        stair(new T.Vector3(-w / 2 + 0.8, level * 3.5, -d / 2 - 1.05), new T.Vector3(-10, (level + 1) * 3.5, -d / 2 - 1.05), 1.55);
        box(3, 0.2, 3.3, -10, (level + 1) * 3.5 - 0.1, -d / 2, m.concrete, true);
      }
    } else {
      for (let level = 0; level < levels - 1; level++) {
        const y = level * 3.5;
        stair(new T.Vector3(w / 2 + 2.3, y, d / 2), new T.Vector3(w / 2 + 2.3, y + 1.75, d / 2 + 6), 1.5);
        box(3.7, 0.2, 1.6, w / 2 + 1.4, y + 1.65, d / 2 + 6.4, m.concrete, true);
        stair(new T.Vector3(w / 2 + 0.4, y + 1.75, d / 2 + 6), new T.Vector3(w / 2 + 0.4, y + 3.5, d / 2), 1.5);
        box(3.8, 0.2, 2, w / 2 + 0.4, y + 3.4, d / 2, m.concrete, true);
      }
      for (const x of [w / 2 - 0.5, w / 2 + 3.25]) for (const z of [d / 2 - 0.5, d / 2 + 7]) {
        pole(0.11, levels * 3.5, x, levels * 1.75, z);
        for (let level = 0; level < levels - 1; level++) beam(new T.Vector3(x,level*3.5,z), new T.Vector3(x,(level+1)*3.5,d/2+3.5),0.035);
      }
      box(4.6, 0.15, 8.2, w / 2 + 1.4, levels * 3.5 + 0.1, d / 2 + 3.2, blueRoof);
      // The painted pillar is a crop of the actual photographed artwork.
      const mural = new T.TextureLoader().load("/assets/photos/IMG_5727.webp");
      mural.colorSpace = T.SRGBColorSpace; mural.offset.set(0.748, 0.279); mural.repeat.set(0.102, 0.497);
      box(1.7, 6.6, 0.6, w / 2 - 0.7, 3.3, d / 2 + 0.25, m.concrete);
      const panel = new T.Mesh(new T.PlaneGeometry(1.65, 6.45), new T.MeshStandardMaterial({ map: mural, roughness: 0.9 }));
      panel.position.set(w / 2 - 0.7, 3.3, d / 2 + 0.56); visual.add(panel);
    }
  }

  // The two blocks share the annotated site's orientation in every camera mode.
  frame(plan.main, 64, 13, () => academicBlock(64, 13, 4, 1));
  frame(plan.block2, 58, 11, () => academicBlock(58, 11, 3, -1, true));
  pave(plan.courtyard, soil, 0.015);
  pave(plan.common1, m.grass, 0.018);
  pave(plan.parking, m.grass, 0.02);
  plan.paths.forEach((p) => path(p));

  function glazedRoom(w: number, d: number, name: string) {
    box(w, 0.16, d, 0, 0, 0, m.stone, true);
    box(w, 3.2, 0.2, 0, 1.68, -d / 2, m.brick, true);
    for (const x of [-w / 2, w / 2]) box(0.2, 3.2, d, x, 1.68, 0, m.brick, true);
    box(w + 0.8, 0.2, d + 0.8, 0, 3.4, 0, m.concrete);
    const bays = Math.ceil(w / 1.2), bay = w / bays;
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + bay * (i + 0.5);
      const entrance = i === Math.floor(bays / 2);
      if (entrance) {
        const door = box(bay - 0.06, 2.12, 0.055, x + bay * 0.32, 1.16, d / 2 - bay * 0.35, m.glass);
        door.rotation.y = Math.PI / 2.5;
        box(bay - 0.06, 0.5, 0.055, x, 2.72, d / 2, translucent);
      } else box(bay - 0.06, 2.75, 0.055, x, 1.47, d / 2, translucent, true);
      box(0.055, 3, 0.08, x - bay / 2, 1.55, d / 2, m.metal);
      for (const y of entrance ? [2.3, 3.0] : [0.15, 1.05, 2.15, 3.0]) box(bay, 0.055, 0.08, x, y, d / 2, m.metal);
    }
    sign(name, 0, 2.65, d / 2 + 0.08, Math.min(w - 1, 4.5));
  }
  frame(plan.manfred, 8, 6, () => glazedRoom(8, 6, "SALA MANFRED STARK"));
  frame(plan.bedelia, 18, 6, () => {
    glazedRoom(18, 6, "BEDELÍA");
    const gold = new T.MeshStandardMaterial({ color: "#b6a361", metalness: 0.7, roughness: 0.3 });
    for (let x = -5; x <= 5; x += 1.5) {
      box(0.7, 0.07, 0.55, x, 0.8, 1, m.metal);
      pole(0.09, 0.3, x, 1, 1, gold); pole(0.22, 0.25, x, 1.27, 1, gold);
    }
  });
  frame(plan.coveredPlaza, 9, 17, () => {
    box(9, 0.2, 17, 0, 0, 0, m.stone, true);
    for (const x of [-4.2, 4.2]) for (let z = -8; z <= 8; z += 4) pole(0.18, 3.7, x, 1.85, z, m.concrete);
    box(1.8, 0.24, 18, -3.6, 3.65, 0, m.concrete);
    box(1.8, 0.24, 18, 3.6, 3.65, 0, m.concrete);
    for (const z of [-7.5, 7.5]) box(9, 0.24, 3, 0, 3.65, z, m.concrete);
    for (let z = -6; z <= 6; z += 4) {
      beam(new T.Vector3(-4.2,3.7,z),new T.Vector3(0,4.4,z),0.06);
      beam(new T.Vector3(0,4.4,z),new T.Vector3(4.2,3.7,z),0.06);
      beam(new T.Vector3(-4.2,3.7,z),new T.Vector3(4.2,3.7,z),0.05);
    }
  });
  frame(plan.cantina, 15, 12, () => {
    box(15, 0.25, 12, 0, 0.32, 0, m.stone, true);
    box(15, 4.1, 0.2, 0, 2.4, -6, m.brick, true);
    box(0.24, 5.6, 12, 7.5, 3.15, 0, m.brick, true);
    box(0.24, 4.1, 12, -7.5, 2.4, 0, m.brick, true);
    box(15.5, 0.2, 12.5, 0, 4.7, 0, m.roof);
    box(15.7, 1.05, 0.12, 0, 4.22, 6.2, fascia);
    box(14, 0.16, 9, 0, 0.36, 10.5, paving, true);
    stair(new T.Vector3(0,0,16),new T.Vector3(0,0.44,14.5),12);
    for (let x = -6; x <= 6; x += 3) {
      if (x === 0) {
        const door = box(1.35, 2.8, 0.06, 0.95, 1.9, 5.4, m.glass);
        door.rotation.y = Math.PI / 2.5;
      } else box(2.8, 2.8, 0.06, x, 1.9, 6, m.glass, true);
      pole(0.04, 3.1, x + 1.45, 2.02, 6.12);
      box(2.9, 0.07, 0.1, x, 3.36, 6.1, m.metal);
      if (Math.abs(x) > 3) bench(x, 7.7, 0.45);
    }
    for (let z = -5; z <= 5; z += 0.55) box(0.09, 4.2, 0.12, 7.7, 2.5, z, m.metal);
    sign("CANTINA · CyT", 0, 4.2, 6.3, 3.8);
  });

  function picnic(px: number, pz: number) {
    const p = photoPoint(px, pz), x = p[0], z = p[2];
    box(2.5, 0.06, 1, x, 0.77, z, m.metal);
    for (const dz of [-0.85, 0.85]) {
      box(2.7, 0.08, 0.42, x, 0.43, z + dz, m.metal);
      for (const dx of [-0.9, 0.9]) pole(0.035, 0.75, x + dx, 0.38, z + dz * 0.5);
    }
  }
  [[302,236],[336,249],[497,261],[502,292],[506,325]].forEach(([x,z]) => picnic(x,z));
  // Only four trees help recognise the courtyards; no generated forest.
  for (const [px,pz] of [[326,245],[500,286],[349,414],[472,383]]) {
    const p = photoPoint(px,pz); pole(0.28,5.5,p[0],2.75,p[2],m.bark);
    const canopy = new T.Mesh(new T.IcosahedronGeometry(1,2),m.leaves[0]);
    canopy.scale.set(3.2,2.0,3.0); canopy.position.set(p[0],5.8,p[2]); canopy.castShadow = true; visual.add(canopy);
  }
  // Covered pedestrian connection beside the grassy parking, as photographed.
  const a = photoPoint(285,404), b = photoPoint(331,459), length = Math.hypot(b[0]-a[0],b[2]-a[2]);
  const passage = new T.Group(); passage.position.set((a[0]+b[0])/2,0,(a[2]+b[2])/2); passage.rotation.y = Math.atan2(b[0]-a[0],b[2]-a[2]);
  group.add(passage); const previous = visual; visual = passage;
  box(2.6,0.15,length,0,2.7,0,blueRoof);
  for (const x of [-1.1,1.1]) for (let z=-length/2;z<=length/2;z+=4) pole(0.05,2.7,x,1.35,z);
  visual = previous;
  for (const place of facultyPlaces) {
    if (place.position[1] > 0.5) continue;
    const marker = new T.Mesh(new T.CylinderGeometry(0.24,0.24,0.04,16),new T.MeshBasicMaterial({color:0xbca36d}));
    marker.position.set(place.position[0],0.13,place.position[2]);marker.userData.placeId=place.id;group.add(marker);markers.push(marker);
  }
  group.updateMatrixWorld(true);colliders.updateMatrixWorld(true);
  return {group,colliders,markers};
}
