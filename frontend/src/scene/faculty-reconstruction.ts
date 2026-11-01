import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeMaterials } from "./materials";
import {
  facultyBlueprint as plan, block1, blockG, gridAngle, FLOOR_HEIGHT as H, PLAZA_LEVEL, STEPS_RUN, rectCorners,
  bulgedOutline, pointAtX, type Rect, type Vec2,
} from "../data/faculty-blueprint";
import { insidePolygon } from "../data/campus-geometry";
import { facultyPlaces } from "../data/places";

type BoxOptions = { tile?: readonly number[]; offset?: readonly number[]; rotation?: number };
type Range = readonly [number, number];
type BlockSpec = {
  length: number; depth: number; levels: number; bay: number; gallery: number;
  /** +1: galería hacia +z del marco local; -1: hacia -z. */
  front: 1 | -1;
  topWall: number; roof: T.Material; louvers: boolean;
  label: (level: number) => string;
  /** Tramos (x) de la galería sin baranda ni lamas: descansos, ascensor, accesos. */
  openings: (level: number) => Range[];
  /** Tramos (x) del borde de la galería sin columna (los apoya otro elemento, como la torre). */
  noColumns?: Range[];
  /** Alero adicional de la cubierta en el extremo +x. */
  eaveEast?: number;
  doors: (bay: number) => number[];
};

/** CyT en metros sobre el plano del equipo (faculty-blueprint.ts), con texturas del escaneo. */
export function createFaculty() {
  const group = new T.Group(), colliders = new T.Group(), markers: T.Mesh[] = [];
  const m = makeMaterials();
  const unit = new T.BoxGeometry(1, 1, 1);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 14);
  let visual: T.Object3D = group, solid: T.Object3D = colliders;

  /** Coordenadas de textura en metros reales: las piezas vecinas continúan el mismo dibujo. */
  function planarUV(geo: T.BufferGeometry, tile: readonly number[], size: readonly number[],
    at: readonly number[], offset: readonly number[] = [0, 0]) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * size[0] + at[0], y = p.getY(i) * size[1] + at[1], z = p.getZ(i) * size[2] + at[2];
      const [a, b] = Math.abs(n.getX(i)) > 0.5 ? [z, y] : Math.abs(n.getY(i)) > 0.5 ? [x, z] : [x, y];
      uv.setXY(i, a / tile[0] + offset[0], b / tile[1] + offset[1]);
    }
  }
  function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material,
    collide = false, options: BoxOptions = {}) {
    const tile = options.tile ?? (mat.userData.tile as number[] | undefined);
    let geometry: T.BufferGeometry = unit;
    if (tile) { geometry = unit.clone(); planarUV(geometry, tile, [w, h, d], [x, y, z], options.offset); }
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    if (options.rotation) mesh.rotation.y = options.rotation;
    mesh.castShadow = h > 0.2; mesh.receiveShadow = true; visual.add(mesh);
    if (collide) {
      const body = new T.Mesh(unit);
      body.position.copy(mesh.position); body.scale.copy(mesh.scale); body.rotation.copy(mesh.rotation);
      solid.add(body);
    }
    return mesh;
  }
  function pole(r: number, h: number, x: number, y: number, z: number, mat: T.Material = m.metal, collide = false) {
    const mesh = new T.Mesh(cylinder, mat); mesh.scale.set(r, h, r); mesh.position.set(x, y, z);
    mesh.castShadow = true; visual.add(mesh);
    if (collide) { const body = new T.Mesh(unit); body.scale.set(r * 2, h, r * 2); body.position.set(x, y, z); solid.add(body); }
    return mesh;
  }
  function beam(a: T.Vector3, b: T.Vector3, r = 0.04, mat: T.Material = m.metal) {
    const mesh = pole(r, a.distanceTo(b), 0, 0, 0, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  const v3 = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  function sign(text: string, x: number, y: number, z: number, width = 2, rotation = 0) {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#294556"; ctx.fillRect(0, 0, 512, 100);
    ctx.fillStyle = "#f6f0e1"; ctx.font = "600 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 52, 480);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(new T.PlaneGeometry(width, width / 5.12), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; visual.add(mesh);
  }
  /** Construye dentro del marco de un rectángulo del plano (giro y traslación, sin escala), con el
   * piso a la altura y. */
  function frame(rect: Rect, build: () => void, y = 0) {
    const vg = new T.Group(), cg = new T.Group();
    for (const g of [vg, cg]) { g.position.set(rect.center[0], y, rect.center[1]); g.rotation.y = -rect.angle; }
    const pv = visual, ps = solid; visual.add(vg); solid.add(cg); visual = vg; solid = cg;
    build(); visual = pv; solid = ps;
  }
  /** Prisma de planta `points` entre y e y + h, con la textura en metros sobre sus caras laterales. */
  function prism(points: readonly Vec2[], y: number, h: number, mat: T.Material, collide = true) {
    const geo = new T.ExtrudeGeometry(new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z))), { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); geo.translate(0, y, 0);
    const tile = (mat.userData.tile as number[] | undefined) ?? [1, 1];
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const cap = Math.abs(n.getY(i)) > 0.5;
      uv.setXY(i, (cap ? p.getX(i) : p.getZ(i) * n.getX(i) - p.getX(i) * n.getZ(i)) / tile[0], (cap ? p.getZ(i) : p.getY(i)) / tile[1]);
    }
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; visual.add(mesh);
    if (collide) solid.add(new T.Mesh(geo));
    return mesh;
  }
  function pave(points: readonly Vec2[], mat: T.Material, y: number) {
    const geo = new T.ShapeGeometry(new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z))));
    geo.rotateX(-Math.PI / 2);
    const tile = mat.userData.tile as number[] | undefined;
    if (tile) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) geo.attributes.uv.setXY(i, p.getX(i) / tile[0], p.getZ(i) / tile[1]);
    }
    const mesh = new T.Mesh(geo, mat); mesh.position.y = y; mesh.receiveShadow = true; visual.add(mesh);
    return mesh;
  }
  function path(points: readonly Vec2[], width = 2.4) {
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      const length = Math.hypot(bx - ax, bz - az);
      box(width, 0.09, length + 0.12, (ax + bx) / 2, 0.005, (az + bz) / 2, m.stone, false,
        { rotation: Math.atan2(bx - ax, bz - az) });
    }
  }
  /** Tramos libres de [a, b] descontando aberturas. */
  function spans(a: number, b: number, openings: Range[]) {
    let parts: Range[] = [[a, b]];
    for (const [o0, o1] of openings)
      parts = parts.flatMap(([p0, p1]) => o1 <= p0 || o0 >= p1 ? [[p0, p1] as Range]
        : [[p0, Math.max(p0, o0)] as Range, [Math.min(p1, o1), p1] as Range].filter(([s, e]) => e - s > 0.25));
    return parts;
  }
  /** Baranda de barras horizontales, como la del escaneo, a lo largo de x. */
  function rail(x0: number, x1: number, y: number, z: number) {
    if (x1 - x0 < 0.25) return;
    for (let x = x0; x <= x1 + 0.01; x += Math.max(0.6, (x1 - x0) / Math.ceil((x1 - x0) / 1.25))) pole(0.03, 1.05, x, y + 0.53, z);
    for (const h of [0.14, 0.42, 0.7]) box(x1 - x0, 0.035, 0.035, (x0 + x1) / 2, y + h, z, m.metal);
    box(x1 - x0, 0.05, 0.07, (x0 + x1) / 2, y + 1.03, z, m.metal);
    const body = new T.Mesh(unit); body.scale.set(x1 - x0, 1.1, 0.1); body.position.set((x0 + x1) / 2, y + 0.55, z); solid.add(body);
  }
  /** Baranda a lo largo de z (cabeceras de galería y descansos). */
  function railZ(z0: number, z1: number, y: number, x: number) {
    for (const z of [z0, z1]) pole(0.03, 1.05, x, y + 0.53, z);
    for (const h of [0.14, 0.42, 0.7]) box(0.035, 0.035, z1 - z0, x, y + h, (z0 + z1) / 2, m.metal);
    box(0.07, 0.05, z1 - z0, x, y + 1.03, (z0 + z1) / 2, m.metal);
    const body = new T.Mesh(unit); body.scale.set(0.1, 1.1, z1 - z0); body.position.set(x, y + 0.55, (z0 + z1) / 2); solid.add(body);
  }
  function bench(x: number, z: number, y = 0, facing = 1) {
    for (let i = 0; i < 4; i++) box(1.7, 0.05, 0.09, x, y + 0.46, z + facing * (i * 0.11 - 0.16), m.wood);
    for (let i = 0; i < 3; i++) box(1.7, 0.09, 0.05, x, y + 0.65 + i * 0.12, z - facing * 0.22, m.wood);
    for (const dx of [-0.68, 0.68]) for (const dz of [-0.2, 0.15]) pole(0.028, 0.46, x + dx, y + 0.23, z + facing * dz);
  }
  /** Plano inclinado de colisión (rampa invisible) bajo los escalones. */
  function ramp(a: T.Vector3, b: T.Vector3, width: number) {
    const dx = b.x - a.x, dz = b.z - a.z, run = Math.hypot(dx, dz);
    const n = v3(-dz / run, 0, dx / run).multiplyScalar(width / 2);
    const p = [a.clone().add(n), a.clone().sub(n), b.clone().add(n), b.clone().sub(n)];
    const geo = new T.BufferGeometry().setFromPoints([p[0], p[2], p[1], p[1], p[2], p[3]]); geo.computeVertexNormals();
    solid.add(new T.Mesh(geo));
  }
  /** Tramo recto a lo largo de x: peldaños de 17,5 cm, losa inferior, barandas y colisiones. */
  function flight(xs: number, ys: number, xe: number, ye: number, zc: number, width: number, sides: number[] = [-1, 1]) {
    const run = Math.abs(xe - xs), rise = ye - ys, n = Math.round(rise / 0.175), dir = Math.sign(xe - xs);
    for (let i = 0; i < n; i++) {
      const xa = xs + dir * (i * run) / n, xb = xs + dir * ((i + 1) * run) / n, top = ys + ((i + 0.5) * rise) / n;
      box(Math.abs(xb - xa) + 0.02, 0.2, width, (xa + xb) / 2, top - 0.1, zc, m.stone);
    }
    const slope = Math.atan2(rise, run), length = Math.hypot(run, rise);
    const under = new T.Mesh(unit, m.concrete);
    under.scale.set(length, 0.16, width); under.position.set((xs + xe) / 2, (ys + ye) / 2 - 0.26, zc);
    under.rotation.z = dir * slope; under.castShadow = true; visual.add(under);
    ramp(v3(xs, ys, zc), v3(xe, ye, zc), width);
    for (const side of sides) {
      const z = zc + side * (width / 2 + 0.03);
      beam(v3(xs, ys + 0.95, z), v3(xe, ye + 0.95, z), 0.035);
      beam(v3(xs, ys + 0.5, z), v3(xe, ye + 0.5, z), 0.02);
      for (let k = 0; k <= 4; k++) { const t = k / 4; pole(0.025, 0.95, xs + (xe - xs) * t, ys + rise * t + 0.48, z); }
      // Pared invisible inclinada para no caer por los costados.
      const geo = new T.BufferGeometry().setFromPoints([v3(xs, ys, z), v3(xe, ye, z), v3(xs, ys + 1.1, z),
        v3(xs, ys + 1.1, z), v3(xe, ye, z), v3(xe, ye + 1.1, z)]);
      geo.computeVertexNormals(); solid.add(new T.Mesh(geo));
    }
  }
  /** Escalinata maciza a lo largo de x, del pie (xs, 0) al borde de arriba (xe, rise), sin barandas. */
  function steps(xs: number, xe: number, rise: number, width: number) {
    const run = Math.abs(xe - xs), n = Math.round(rise / 0.175), dir = Math.sign(xe - xs);
    for (let i = 0; i < n; i++) {
      const top = ((i + 0.5) * rise) / n;
      box(run / n + 0.02, top, width, xs + dir * ((i + 0.5) * run) / n, top / 2, 0, m.stone);
    }
    ramp(v3(xs, 0, 0), v3(xe, rise, 0), width);
  }
  /** Bóveda de chapa curva (la «media sombra» de las escaleras) que sigue la pisada `tread(x)`:
   * sube con cada tramo y se aplana en los descansos, con `clear` metros libres hasta el arranque
   * del arco. Devuelve la altura del arranque en cada x. */
  function vault(x0: number, x1: number, tread: (x: number) => number, zc: number, r: number, clear: number) {
    // Promedio de ±0,6 m: la chapa se curva en los cambios de pendiente en vez de quebrarse.
    const spring = (x: number) => { let s = 0; for (let k = -3; k <= 3; k++) s += tread(x + k * 0.2); return s / 7 + clear; };
    const n = Math.ceil(Math.abs(x1 - x0) / 0.25), arcs = 16, position: number[] = [], index: number[] = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = spring(x);
      for (let j = 0; j <= arcs; j++) position.push(x, y + r * Math.sin((Math.PI * j) / arcs), zc + r * Math.cos((Math.PI * j) / arcs));
      if (i) for (let j = 0; j < arcs; j++) { const a = (i - 1) * (arcs + 1) + j, b = a + arcs + 1; index.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(position, 3));
    geo.setIndex(index); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, m.canopy); mesh.castShadow = true; visual.add(mesh);
    // Arcos de acero cada 2,5 m.
    for (let k = 0, ribs = Math.ceil(Math.abs(x1 - x0) / 2.5); k <= ribs; k++) {
      const x = x0 + ((x1 - x0) * k) / ribs, arch = new T.Mesh(new T.TorusGeometry(r, 0.035, 5, 18, Math.PI), m.steel);
      arch.rotation.y = Math.PI / 2; arch.position.set(x, spring(x), zc); visual.add(arch);
    }
    return spring;
  }
  /** Cubierta a cuatro aguas con cara inferior de chapa (textura del escaneo), centrada en x = cx. */
  function hipRoof(w: number, d: number, y: number, rise: number, top: T.Material, cx = 0) {
    const roof = new T.Group(), previous = visual; roof.position.x = cx; visual.add(roof); visual = roof;
    const a = w / 2 + 0.6, b = d / 2 + 0.6, ridge = Math.max(0, a - b), yr = y + rise;
    const faces = [[-a, y, b, a, y, b, ridge, yr, 0, -a, y, b, ridge, yr, 0, -ridge, yr, 0],
      [a, y, -b, -a, y, -b, -ridge, yr, 0, a, y, -b, -ridge, yr, 0, ridge, yr, 0],
      [a, y, b, a, y, -b, ridge, yr, 0], [-a, y, -b, -a, y, b, -ridge, yr, 0]].flat();
    const upper = new T.BufferGeometry(); upper.setAttribute("position", new T.Float32BufferAttribute(faces, 3));
    upper.computeVertexNormals();
    const reversed: number[] = [];
    for (let i = 0; i < faces.length; i += 9) reversed.push(...faces.slice(i, i + 3), ...faces.slice(i + 6, i + 9), ...faces.slice(i + 3, i + 6));
    const lower = new T.BufferGeometry(); lower.setAttribute("position", new T.Float32BufferAttribute(reversed.map((v, i) => i % 3 === 1 ? v - 0.04 : v), 3));
    lower.computeVertexNormals();
    const tile = m.roofUnder.userData.tile as number[], uv: number[] = [];
    for (let i = 0; i < reversed.length; i += 3) uv.push(reversed[i] / tile[0], reversed[i + 2] / tile[1]);
    lower.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    upper.setAttribute("uv", new T.Float32BufferAttribute(new Float32Array(faces.length / 3 * 2), 2));
    for (const [geo, mat] of [[upper, top], [lower, m.roofUnder]] as const) {
      const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; visual.add(mesh);
    }
    // Faldón perimetral.
    for (const s of [-1, 1]) {
      box(2 * a, 0.22, 0.06, 0, y - 0.05, s * b, m.white);
      box(0.06, 0.22, 2 * b, s * a, y - 0.05, 0, m.white);
    }
    visual = previous;
  }
  /** Fachada vidriada con perfilería azul a lo largo de x, en z, con una hoja abierta en el paño `door`. */
  function glazing(w: number, z: number, door: number) {
    const bays = Math.ceil(w / 1.2), bay = w / bays;
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + bay * (i + 0.5), entrance = i === door;
      if (entrance) {
        box(bay - 0.06, 2.12, 0.055, x + bay * 0.32, 1.16, z - bay * 0.35, m.glass, false, { rotation: Math.PI / 2.5 });
        box(bay - 0.06, 0.5, 0.055, x, 2.72, z, m.glass);
      } else box(bay - 0.06, 2.75, 0.055, x, 1.47, z, m.glass, true);
      box(0.055, 3, 0.08, x - bay / 2, 1.55, z, m.blue);
      for (const y of entrance ? [2.3, 3.0] : [0.15, 1.05, 2.15, 3.0]) box(bay, 0.055, 0.08, x, y, z, m.blue);
    }
  }

  /** Bloque de aulas con galería abierta (Bloque 1 y Bloque G). */
  function academicBlock(s: BlockSpec) {
    const { length: L, depth: D, levels, bay, gallery: G, front } = s;
    const zWall = front * (D / 2 - G), zEdge = front * D / 2, zBack = -front * D / 2;
    const zGallery = front * (D / 2 - G / 2), zRooms = -front * G / 2, bays = Math.round(L / bay);
    for (let level = 0; level < levels; level++) {
      const y = level * H, top = level === levels - 1, hw = top ? s.topWall : H, open = s.openings(level);
      box(L, 0.24, D, 0, y - 0.12, 0, m.concrete, true);
      // Galería: granito con franjas sobre las líneas de módulo; aulas: baldosa clara.
      box(L, 0.03, G, 0, y + 0.015, zGallery, m.galleryFloor, false, { offset: [0.5, 0] });
      box(L, 0.03, D - G, 0, y + 0.015, zRooms, m.tile);
      if (level) {
        box(L + 0.1, 0.32, 0.08, 0, y - 0.1, zEdge + front * 0.04, m.white);
        box(L + 0.1, 0.32, 0.08, 0, y - 0.1, zBack - front * 0.04, m.white);
      }
      for (let i = 0; i < bays; i++) {
        const x0 = -L / 2 + i * bay, x1 = x0 + bay, xc = (x0 + x1) / 2;
        // Pared de la galería: pilastras de hormigón, ladrillo hasta 2,85 m y dintel de hormigón.
        if (i) box(0.45, hw, 0.32, x0, y + hw / 2, zWall + front * 0.06, m.concrete, true);
        const left = x0 + (i ? 0.225 : 0.12), right = x1 - (i < bays - 1 ? 0.225 : 0.12);
        const doors = s.doors(i).map((d) => x0 + d), edges = [left, ...doors.flatMap((d) => [d - 0.5, d + 0.5]), right];
        for (let k = 0; k < edges.length; k += 2) if (edges[k + 1] - edges[k] > 0.05)
          box(edges[k + 1] - edges[k], 2.85, 0.2, (edges[k] + edges[k + 1]) / 2, y + 1.425, zWall, m.brick, true);
        box(right - left, hw - 2.85, 0.2, (left + right) / 2, y + 2.85 + (hw - 2.85) / 2, zWall, m.concrete, true);
        for (const d of doors) {
          box(1, 0.6, 0.05, d, y + 2.45, zWall, m.glass);
          box(1.04, 0.08, 0.22, d, y + 2.15, zWall, m.metal);
          const hinge = d - 0.48, swing = 1.2;
          box(0.95, 2.1, 0.05, hinge + Math.cos(swing) * 0.475, y + 1.05, zWall - front * Math.sin(swing) * 0.475, m.metal, false,
            { rotation: front * swing });
        }
        // Tabique entre aulas y fachada posterior con ventanales.
        if (i) box(0.12, hw, D - G - 0.2, x0, y + hw / 2, zRooms - front * 0.1, m.plaster, true);
        box(bay, 1, 0.2, xc, y + 0.5, zBack, m.brick, true);
        box(bay, hw - 2.7, 0.2, xc, y + 2.7 + (hw - 2.7) / 2, zBack, m.brick, true);
        for (const px of [x0 + 0.3, x1 - 0.3]) box(0.6, 1.7, 0.2, px, y + 1.85, zBack, m.brick, true);
        box(bay - 1.2, 1.7, 0.05, xc, y + 1.85, zBack, m.glass, true);
        for (let k = 1; k < 4; k++) box(0.05, 1.7, 0.09, x0 + 0.6 + (k * (bay - 1.2)) / 4, y + 1.85, zBack, m.metal);
        box(bay - 1.2, 0.05, 0.09, xc, y + 2.1, zBack, m.metal);
        // Borde de la galería: columna redonda, viga transversal, baranda y lamas.
        const column = !s.noColumns?.some(([a, b]) => x0 > a && x0 < b);
        if (column) pole(0.17, hw, x0 + (i ? 0 : 0.2), y + hw / 2, zEdge - front * 0.2, m.concrete, true);
        if (column && !top) box(0.28, 0.42, G, x0 + (i ? 0 : 0.2), y + H - 0.45, zGallery, m.concrete);
        if (level) for (const [a, b] of spans(x0 + 0.17, x1 - 0.17, open)) rail(a, b, y, zEdge - front * 0.08);
        if (level && s.louvers) for (const [a, b] of spans(x0 + 0.18, x1 - 0.18, open))
          box(b - a, 0.96, 0.04, (a + b) / 2, y + 2.6, zEdge - front * 0.03, m.louver);
        if (i % 3 === 1) bench(xc + 0.6, zWall + front * 0.42, y, front);
      }
      pole(0.17, hw, L / 2 - 0.2, y + hw / 2, zEdge - front * 0.2, m.concrete, true);
      for (const x of [-L / 2, L / 2]) {
        box(0.24, hw, D - G, x, y + hw / 2, zRooms, m.brick, true);
        if (level && !open.some(([a, b]) => a <= x + 0.5 && b >= x - 0.5)) railZ(Math.min(zWall, zEdge) + 0.1, Math.max(zWall, zEdge) - 0.1, y, x - Math.sign(x) * 0.08);
      }
      sign(s.label(level), -L / 2 + 2.5 * bay, y + 3.02, zWall + front * 0.13, 1.6, front < 0 ? Math.PI : 0);
    }
    const roofY = (levels - 1) * H + s.topWall, eave = s.eaveEast ?? 0;
    hipRoof(L + eave, D, roofY, 1.2, s.roof, eave / 2);
    // Cerchas bajo la cubierta en cada línea de módulo (visibles desde el último piso).
    const rise = 1.2, half = D / 2 + 0.6;
    for (let i = 1; i < bays; i++) {
      const x = -L / 2 + i * bay;
      if (Math.abs(x) > L / 2 - D / 2) continue;
      beam(v3(x, roofY - 0.05, -D / 2), v3(x, roofY - 0.05, D / 2), 0.035, m.steel);
      for (const sgn of [-1, 1]) {
        const eave = v3(x, roofY - 0.05 + rise * (0.6 / half), sgn * D / 2), ridgeP = v3(x, roofY + rise - 0.08, 0);
        beam(eave, ridgeP, 0.035, m.steel);
        beam(v3(x, roofY - 0.05, sgn * D / 4), eave.clone().lerp(ridgeP, 0.5), 0.025, m.steel);
      }
    }
  }

  // ---- Bloque 1 ----
  const st = plan.stair, step = st.run + st.landing;
  /** Descanso del nivel l (1..3): tramo de x donde la escalera se une a la galería. */
  const landingAt = (level: number): Range => [st.start - level * step, st.start - level * step + st.landing];
  const [ex, ez] = plan.elevator.center, [ew, ed] = plan.elevator.size, tw = plan.tower, es = plan.eastStair;
  const towerDoor: Range = [tw.center[0] - tw.core / 2, tw.center[0] + tw.core / 2];
  /** Borde exterior de la escalera de la cabecera este y de su descanso en el primer piso. */
  const eastEdge = es.x + es.width / 2 + 0.2;
  frame(plan.main, () => {
    academicBlock({
      ...block1, front: 1, topWall: 4.1, roof: m.roof, louvers: true,
      label: (level) => level ? "AULAS" : "LABORATORIOS",
      openings: (level) => [
        ...(level ? [landingAt(level)] : []),
        // Salida del primer piso a la escalera de la plaza techada.
        ...(level === 1 ? [[block1.length / 2 - 0.05, eastEdge] as Range] : []),
        [ex - 0.6, ex + 0.6],
        towerDoor,
      ],
      // El núcleo de la torre de baños apoya el borde de la galería en su acceso.
      noColumns: [towerDoor],
      // El alero se prolonga sobre la escalera de la cabecera este.
      eaveEast: eastEdge + 0.3 - (block1.length / 2 + 0.6),
      doors: (i) => i % 2 ? [1.3] : i % 4 === 0 ? [1.3, 3.7] : [3.7],
    });
    // Mesas del laboratorio en planta baja.
    for (let i = 4; i < 9; i++) for (const z of [-1, -3.4]) {
      const x = -block1.length / 2 + (i + 0.5) * block1.bay;
      box(2.6, 0.06, 0.8, x, 0.78, z, m.white);
      for (const dx of [-1.1, 1.1]) box(0.06, 0.75, 0.7, x + dx, 0.39, z, m.metal);
    }
    // Escalera tipo Pompidou: tramo y descanso unido a la galería por piso, bajo una bóveda que
    // sigue la pisada (sube con los tramos y se aplana en los descansos).
    const z0 = st.z - st.width / 2, z1 = st.z + st.width / 2;
    const tread = (x: number) => {
      for (let f = 0; f < st.flights; f++) {
        const xs = st.start - f * step, xe = xs - st.run;
        if (x >= xe) return f * H + Math.max(0, Math.min(H, (H * (xs - x)) / st.run));
        if (x >= xe - st.landing) return (f + 1) * H;
      }
      return st.flights * H;
    };
    const spring = vault(st.start + 0.5, st.start - st.flights * step + 0.1, tread, st.z, st.width / 2 + 0.06, 2.3);
    for (let f = 0; f < st.flights; f++) {
      const xs = st.start - f * step, xe = xs - st.run, y0 = f * H, y1 = y0 + H, xl = xe - st.landing;
      flight(xs, y0, xe, y1, st.z, st.width);
      box(st.landing, 0.22, z1 - block1.depth / 2 + 0.05, (xe + xl) / 2, y1 - 0.11, (block1.depth / 2 - 0.05 + z1) / 2, m.stone, true);
      rail(xl, xe, y1, z1 + 0.03);
      if (f === st.flights - 1) railZ(z0 - 0.05, z1, y1, xl + 0.05);
      for (const x of [xl + 0.15, xe, xs - 0.15]) for (const z of [z0 - 0.02, z1 + 0.02])
        beam(v3(x, tread(x), z), v3(x, spring(x), z), 0.04, m.steel);
    }
    // Ascensor de 2 × 2 m: caja de hormigón con murales en sus caras este, sur y oeste hasta la
    // mitad superior entre el primer y el segundo piso; puertas con marco azul hacia la galería
    // (IMG_5706). Por ahora las tres caras repiten el único mural fotografiado (IMG_5727).
    const shaftTop = (block1.levels - 1) * H + 4.1 + 0.9, muralHeight = plan.elevator.mural - 0.1;
    box(ew, shaftTop, ed, ex, shaftTop / 2, ez, m.concrete, true);
    const mural = new T.TextureLoader().load("/assets/photos/IMG_5727.webp");
    mural.colorSpace = T.SRGBColorSpace; mural.offset.set(0.748, 0.279); mural.repeat.set(0.102, 0.497);
    const muralMat = new T.MeshStandardMaterial({ map: mural, roughness: 0.9 });
    for (const [dx, dz, width] of [[1, 0, ed], [0, 1, ew], [-1, 0, ed]] as const) {
      const panel = new T.Mesh(new T.PlaneGeometry(width - 0.06, muralHeight), muralMat);
      panel.position.set(ex + dx * (ew / 2 + 0.01), 0.1 + muralHeight / 2, ez + dz * (ed / 2 + 0.01));
      panel.rotation.y = Math.atan2(dx, dz); visual.add(panel);
    }
    for (let level = 0; level < block1.levels; level++) {
      const y = level * H, zd = ez - ed / 2;
      box(1, 2.1, 0.06, ex, y + 1.05, zd - 0.03, m.steel);
      box(1.3, 0.12, 0.08, ex, y + 2.16, zd - 0.04, m.blue);
      for (const s of [-1, 1]) box(0.12, 2.1, 0.08, ex + s * 0.59, y + 1.05, zd - 0.04, m.blue);
    }
    box(ew + 0.3, 1.1, ed + 0.3, ex, shaftTop + 0.55, ez, m.white);
    // Escalera del primer piso a la plaza techada: descanso a la salida de la galería y un tramo
    // pegado a la cabecera que baja hacia el norte hasta la plataforma.
    const landingDepth = block1.depth / 2 - es.top;
    box(eastEdge - block1.length / 2, 0.24, landingDepth, (block1.length / 2 + eastEdge) / 2, H - 0.12, es.top + landingDepth / 2, m.concrete, true);
    box(eastEdge - block1.length / 2, 0.03, landingDepth, (block1.length / 2 + eastEdge) / 2, H + 0.015, es.top + landingDepth / 2, m.granite);
    rail(block1.length / 2 - 0.05, eastEdge, H, block1.depth / 2 - 0.05);
    railZ(es.top, block1.depth / 2 - 0.05, H, eastEdge - 0.05);
    frame({ center: [es.x, es.top - es.run / 2], size: [es.run, es.width], angle: -Math.PI / 2 },
      () => flight(es.run / 2, PLAZA_LEVEL, -es.run / 2, H, 0, es.width, [1]));
  });

  // ---- Torre de baños: núcleo desde la galería y dos semicírculos a sus costados ----
  {
    const [cx, cz] = tw.center, r = tw.radius, c = tw.core / 2, top = (block1.levels - 1) * H + 4.1;
    const north = block1.depth / 2, south = cz + r, door = cz - r + 1;   // z del centro de las puertas de los baños
    const brickTile = m.brick.userData.tile as number[], gt = m.granite.userData.tile as number[];
    const arc = (xc: number, y0: number, y1: number, a0: number, a1: number, mat: T.Material, radius: number = r) => {
      if (a1 - a0 < 0.01) return;
      const geo = new T.CylinderGeometry(radius, radius, y1 - y0, Math.max(3, Math.ceil((a1 - a0) * 9)), 1, true, a0, a1 - a0);
      const uv = geo.attributes.uv, length = radius * (a1 - a0), tile = (mat.userData.tile as number[]) ?? brickTile;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * length) / tile[0], (y0 + uv.getY(i) * (y1 - y0)) / tile[1]);
      const mesh = new T.Mesh(geo, mat); mesh.position.set(xc, (y0 + y1) / 2, cz);
      mesh.castShadow = mesh.receiveShadow = true; visual.add(mesh); solid.add(new T.Mesh(geo, mat).copy(mesh, false));
    };
    const wallMat = m.brick.clone(); wallMat.side = T.DoubleSide; wallMat.userData.tile = brickTile;
    // Semicírculos a cada lado del núcleo. En CylinderGeometry θ = 0 apunta al sur y θ = π/2 al
    // este: cada mitad va de θ0 a θ0 + π, con la punta (`apex`) hacia afuera.
    const halves = [-1, 1].map((side) => ({
      side, xc: cx + side * c, a0: side > 0 ? 0 : Math.PI, apex: side > 0 ? Math.PI / 2 : 1.5 * Math.PI,
      name: side === tw.menSide ? "HOMBRES" : "MUJERES",
    }));
    for (let level = 0; level < block1.levels; level++) {
      const y = level * H, y1 = level === block1.levels - 1 ? top : y + H, hw = y1 - y;
      for (const { side, xc, a0, apex, name } of halves) {
        // Muro curvo con una ventana en banda en la punta (IMG_5646).
        arc(xc, y, y1, a0, apex - 0.26, wallMat);
        arc(xc, y, y1, apex + 0.26, a0 + Math.PI, wallMat);
        arc(xc, y, y + 1.2, apex - 0.26, apex + 0.26, wallMat);
        arc(xc, y + 2.1, y1, apex - 0.26, apex + 0.26, wallMat);
        arc(xc, y + 1.2, y + 2.1, apex - 0.26, apex + 0.26, m.glass, r - 0.03);
        // Losa, piso de granito y franja blanca en el canto.
        const slab = new T.Mesh(new T.CylinderGeometry(r, r, 0.24, 24, 1, false, a0, Math.PI), m.concrete);
        slab.position.set(xc, y - 0.12, cz); visual.add(slab); solid.add(slab.clone());
        const floor = new T.Mesh(new T.CircleGeometry(r - 0.05, 24, side > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), m.granite);
        const fuv = floor.geometry.attributes.uv, fp = floor.geometry.attributes.position;
        for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fp.getX(i) / gt[0], fp.getY(i) / gt[1]);
        floor.rotation.x = -Math.PI / 2; floor.position.set(xc, y + 0.02, cz); floor.receiveShadow = true; visual.add(floor);
        if (level) {
          const band = new T.Mesh(new T.CylinderGeometry(r + 0.04, r + 0.04, 0.3, 24, 1, true, a0, Math.PI), m.white);
          band.position.set(xc, y - 0.1, cz); visual.add(band);
        }
        // Tabique hacia el núcleo con la puerta del baño y su cartel.
        const wx = cx + side * (c - 0.06);
        box(0.12, hw, door - 0.5 - (cz - r), wx, y + hw / 2, (cz - r + door - 0.5) / 2, m.plaster, true);
        box(0.12, hw, south - door - 0.5, wx, y + hw / 2, (door + 0.5 + south) / 2, m.plaster, true);
        box(0.12, hw - 2.1, 1, wx, y + 2.1 + (hw - 2.1) / 2, door, m.plaster, true);
        sign(name, wx - side * 0.07, y + 2.4, door, 0.9, -side * Math.PI / 2);
        // Mesada con lavatorios junto al tabique y cubículos contra el muro curvo, en la mitad sur;
        // la entrada y la mitad norte quedan libres para circular.
        box(0.55, 0.06, 2.4, xc + side * 0.4, y + 0.85, cz + 0.6, m.white, true);
        for (let k = 1; k < 6; k++) {
          const a = a0 + (Math.PI * k) / 6;
          if (Math.cos(a) > 0.2)
            box(0.05, 1.9, 1.5, xc + Math.sin(a) * (r - 0.85), y + 1.1, cz + Math.cos(a) * (r - 0.85), m.plaster, true, { rotation: a });
        }
      }
      // Núcleo: losa y piso, muros del acceso, frente sur y dintel con el cartel hacia la galería.
      box(2 * c, 0.24, south - north, cx, y - 0.12, (north + south) / 2, m.concrete, true);
      box(2 * c, 0.03, south - north, cx, y + 0.015, (north + south) / 2, m.granite);
      for (const side of [-1, 1]) {
        box(0.2, hw, cz - r - north, cx + side * (c - 0.1), y + hw / 2, (north + cz - r) / 2, m.brick, true);
        if (level) box(0.04, 0.3, cz - r - north, cx + side * (c + 0.02), y - 0.1, (north + cz - r) / 2, m.white);
      }
      box(2 * c, hw, 0.2, cx, y + hw / 2, south - 0.1, m.brick, true);
      box(2 * c, hw - 2.6, 0.2, cx, y + 2.6 + (hw - 2.6) / 2, north + 0.1, m.concrete, true);
      sign("BAÑOS", cx, y + 2.85, north - 0.04, 1.2, Math.PI);
    }
    // Pilastras de hormigón en los encuentros de los semicírculos con el núcleo (IMG_5646).
    for (const side of [-1, 1]) for (const z of [cz - r, south])
      box(0.3, top + 0.7, 0.3, cx + side * (c + 0.1), (top + 0.7) / 2, z, m.concrete);
    for (const { xc, a0 } of halves) {
      const lid = new T.Mesh(new T.CylinderGeometry(r + 0.1, r + 0.1, 0.3, 24, 1, false, a0, Math.PI), m.white);
      lid.position.set(xc, top + 0.15, cz); visual.add(lid);
      arc(xc, top, top + 0.7, a0, a0 + Math.PI, wallMat);
    }
    box(2 * c, 0.3, south - north, cx, top + 0.15, (north + south) / 2, m.white);
    box(2.6, 2.6, 4.4, cx, top + 1.6, cz, m.white);
    box(2.8, 0.15, 4.6, cx, top + 2.95, cz, m.concrete);
    // Anexo cuadrado de planta baja que sobresale al sur, con portón enrollable al este. Sus muros
    // laterales arrancan donde cortan a los semicírculos.
    const a = tw.annex.size / 2, zs = south + tw.annex.beyond, zn = cz + Math.sqrt(r * r - (a - c) ** 2);
    box(2 * a, H, 0.24, cx, H / 2, zs - 0.12, m.brick, true);
    for (const side of [-1, 1]) box(0.24, H, zs - zn, cx + side * (a - 0.12), H / 2, (zn + zs) / 2, m.brick, true);
    box(2 * a, 0.2, zs - zn + 0.3, cx, H - 0.1, (zn + zs - 0.3) / 2, m.concrete);
    box(2 * a + 0.1, 0.3, 0.06, cx, H - 0.1, zs + 0.03, m.white);
    box(0.05, 2.6, 2.2, cx + a + 0.03, 1.3, (zn + zs) / 2 + 0.3, m.steel);
  }

  // ---- Bloque G ----
  const gStair = -13, gHalf = 2.8, gWidth = 1.4;
  frame(plan.block2, () => {
    academicBlock({
      ...blockG, front: -1, topWall: 3.6, roof: m.blue, louvers: false,
      label: () => "BLOQUE G",
      openings: (level) => level ? [[gStair - 1.3, gStair]] : [],
      doors: (i) => i % 2 ? [1.6] : [3.4],
    });
    // Escalera de ida y vuelta sobre la fachada hacia el Bloque 1 (fotos IMG_5666/5668).
    const zA = -blockG.depth / 2 - 0.1 - gWidth / 2, zB = zA - gWidth;
    for (let level = 0; level < blockG.levels - 1; level++) {
      const y = level * H;
      flight(gStair, y, gStair + gHalf, y + H / 2, zA, gWidth);
      box(1.3, 0.2, 2 * gWidth, gStair + gHalf + 0.65, y + H / 2 - 0.1, (zA + zB) / 2, m.stone, true);
      railZ(zB - gWidth / 2, zA + gWidth / 2, y + H / 2, gStair + gHalf + 1.3);
      rail(gStair + gHalf, gStair + gHalf + 1.3, y + H / 2, zB - gWidth / 2 - 0.03);
      rail(gStair + gHalf, gStair + gHalf + 1.3, y + H / 2, zA + gWidth / 2 + 0.03);
      flight(gStair + gHalf, y + H / 2, gStair, y + H, zB, gWidth);
      box(1.3, 0.2, 2 * gWidth + 0.15, gStair - 0.65, y + H - 0.1, (zA + zB) / 2 + 0.075, m.stone, true);
      rail(gStair - 1.3, gStair, y + H, zB - gWidth / 2 - 0.03);
      railZ(zB - gWidth / 2, zA + gWidth / 2, y + H, gStair - 1.3);
    }
  });

  // ---- Plataforma a media altura: plaza techada, cuadrado, Bedelía, cantina y Sala Manfred ----
  for (const outline of plan.platform) {
    prism(outline, 0, PLAZA_LEVEL, m.concrete);
    pave(outline, m.stone, PLAZA_LEVEL + 0.005);
  }
  for (const s of plan.platformSteps)
    frame({ center: s.top, size: [STEPS_RUN, s.width], angle: s.angle }, () => steps(STEPS_RUN, 0, PLAZA_LEVEL, s.width));

  // ---- Plaza techada: la cubierta arranca después de la escalera de la cabecera este ----
  {
    const [w, n, e, s] = rectCorners(plan.coveredPlaza), edge = eastEdge + 0.1;
    const outline: Vec2[] = [pointAtX(w, n, edge), n, e, s, pointAtX(w, s, edge)];
    const height = 4.6, roofY = PLAZA_LEVEL + height;
    flipFaces(pave(outline, m.roofUnder, roofY - 0.02).geometry);
    pave(outline, m.roof, roofY + 0.12);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      box(length, 0.35, 0.08, (a[0] + b[0]) / 2, roofY - 0.05, (a[1] + b[1]) / 2, m.white, false,
        { rotation: -Math.atan2(b[1] - a[1], b[0] - a[0]) });
    }
    // Columnas en los bordes y cerchas paralelas al lado corto, apoyadas al oeste en una viga.
    const inset = (p: Vec2, c: Vec2, k = 0.35): Vec2 => [p[0] + (c[0] - p[0]) * k / Math.hypot(c[0] - p[0], c[1] - p[1]), p[1] + (c[1] - p[1]) * k / Math.hypot(c[0] - p[0], c[1] - p[1])];
    const centre: Vec2 = [(n[0] + s[0]) / 2, (n[1] + s[1]) / 2], [wn, , , , ws] = outline;
    for (const [a, b, ts] of [[n, e, [0, 1 / 3, 2 / 3, 1]], [e, s, [0.5, 1]], [ws, wn, [0.06, 0.94]]] as const) for (const t of ts) {
      const p = inset([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], centre);
      pole(0.16, height, p[0], PLAZA_LEVEL + height / 2, p[1], m.steel, true);
    }
    beam(v3(ws[0] + 0.1, roofY - 0.45, ws[1]), v3(wn[0] + 0.1, roofY - 0.45, wn[1]), 0.07, m.steel);
    const X: Vec2 = [(n[0] - w[0]) / 10, (n[1] - w[1]) / 10], Z: Vec2 = [(s[0] - w[0]) / 15, (s[1] - w[1]) / 15];
    for (const k of [3, 6, 9, 12]) {
      const start = [w[0] + Z[0] * k, w[1] + Z[1] * k], t0 = (edge + 0.1 - start[0]) / X[0];
      const a = v3(start[0] + X[0] * Math.max(0, t0), roofY - 0.45, start[1] + X[1] * Math.max(0, t0));
      const b = v3(start[0] + X[0] * 10, roofY - 0.45, start[1] + X[1] * 10);
      beam(a, b, 0.05, m.steel); beam(a.clone().setY(roofY - 0.05), b.clone().setY(roofY - 0.05), 0.045, m.steel);
      for (let t = 0; t <= 1.001; t += 0.25) {
        const p = a.clone().lerp(b, t), q = a.clone().lerp(b, Math.min(1, t + 0.125));
        beam(p, q.setY(roofY - 0.05), 0.025, m.steel);
      }
    }
  }

  // ---- Cuadrado descubierto, Bedelía, Sala Manfred, cantina y Electrónica ----
  for (const [px, pz] of [[46.1, -7.35], [54.4, -10.9]]) frame({ center: [px, pz], size: [3.4, 1.6], angle: gridAngle }, () => {
    box(3.4, 0.4, 1.6, 0, 0.2, 0, m.brick, true);
    box(3.2, 0.08, 1.4, 0, 0.41, 0, m.grass);
    bench(0, 1.5, 0.06, -1);
  }, PLAZA_LEVEL);
  function glazedRoom(w: number, d: number, name: string) {
    box(w, 0.16, d, 0, 0.02, 0, m.stone, true);
    box(w, 3.2, 0.2, 0, 1.68, -d / 2, m.brick, true);
    for (const x of [-w / 2, w / 2]) box(0.2, 3.2, d, x, 1.68, 0, m.brick, true);
    box(w + 0.8, 0.2, d + 0.8, 0, 3.4, 0, m.concrete);
    glazing(w, d / 2, Math.floor(Math.ceil(w / 1.2) / 2));
    sign(name, 0, 2.65, d / 2 + 0.08, Math.min(w - 1, 4.5));
  }
  frame(plan.bedelia, () => {
    const [w, d] = plan.bedelia.size;
    glazedRoom(w, d, "BEDELÍA");
    const gold = new T.MeshStandardMaterial({ color: "#c2a65a", metalness: 0.25, roughness: 0.45 });
    for (let x = -6; x <= 6; x += 1.5) {
      box(0.7, 0.07, 0.55, x, 0.8, d / 2 - 1.5, m.metal);
      pole(0.09, 0.3, x, 1, d / 2 - 1.5, gold); pole(0.22, 0.25, x, 1.27, d / 2 - 1.5, gold);
    }
  }, PLAZA_LEVEL);
  // Sala Manfred: auditorio con el frente curvo hacia la plaza techada, fachada vidriada hacia el
  // pasillo (IMG_5685), escenario contra el fondo y tres gradas hacia el arco.
  frame(plan.manfred, () => {
    const [w, d] = plan.manfred.size, bulge = plan.manfred.bulge, zf = d / 2 - bulge, hw = 3.3;
    const radius = (w * w / 4 + bulge * bulge) / (2 * bulge), zc = d / 2 - radius, outline = bulgedOutline(w, d, bulge);
    pave(outline, m.tile, 0.03);
    prism(outline, hw, 0.22, m.concrete, false);
    box(w, hw, 0.2, 0, hw / 2, -d / 2 + 0.1, m.brick, true);
    box(0.2, hw, zf + d / 2, -w / 2 + 0.1, hw / 2, (zf - d / 2) / 2, m.brick, true);
    const a = Math.asin(w / 2 / radius), front = new T.CylinderGeometry(radius, radius, hw, 20, 1, true, -a, 2 * a);
    const fuv = front.attributes.uv, tile = m.brick.userData.tile as number[], wallMat = m.brick.clone();
    for (let i = 0; i < fuv.count; i++) fuv.setXY(i, (fuv.getX(i) * radius * 2 * a) / tile[0], (fuv.getY(i) * hw) / tile[1]);
    wallMat.side = T.DoubleSide; wallMat.userData.tile = tile;
    const curved = new T.Mesh(front, wallMat); curved.position.set(0, hw / 2, zc); curved.castShadow = curved.receiveShadow = true;
    visual.add(curved); solid.add(new T.Mesh(front).copy(curved, false));
    // Fachada vidriada (+x) con la puerta entre el escenario y las gradas, y dintel hasta la losa.
    frame({ center: [w / 2 - 0.05, (zf - d / 2) / 2], size: [zf + d / 2, 0.2], angle: -Math.PI / 2 }, () => {
      glazing(zf + d / 2, 0, 2);
      sign("SALA MANFRED STARK", 0, 2.65, 0.08, 3);
    });
    box(0.2, hw - 3.05, zf + d / 2, w / 2 - 0.05, 3.05 + (hw - 3.05) / 2, (zf - d / 2) / 2, m.concrete);
    box(w - 0.4, 0.4, 0.8, 0, 0.2, -d / 2 + 0.6, m.wood, true);
    box(3.2, 1.8, 0.04, 0, 2, -d / 2 + 0.22, m.white);
    const ri = radius - 0.05, wi = w / 2 - 0.2, ai = Math.asin(wi / ri);
    const curve = Array.from({ length: 13 }, (_, i): Vec2 => { const t = ai - (2 * ai * i) / 12; return [ri * Math.sin(t), zc + ri * Math.cos(t)]; });
    [-0.6, 0.3, 1.2].forEach((z, k) => {
      const h = 0.25 * (k + 1);
      prism([[-wi, z], [wi, z], ...curve], 0, h, m.concrete);
      // Butacas de 0,5 m en fila sobre cada grada.
      for (let x = -wi + 0.55; x <= wi - 0.5; x += 0.56) {
        box(0.5, 0.07, 0.42, x, h + 0.42, z + 0.3, m.wood);
        box(0.5, 0.35, 0.05, x, h + 0.62, z + 0.53, m.wood);
        box(0.05, 0.42, 0.4, x - 0.27, h + 0.21, z + 0.3, m.metal);
      }
    });
  }, PLAZA_LEVEL);
  // Losa del pasillo cubierto entre la Sala Manfred y Bedelía.
  frame(plan.corridor, () => box(2.4, 0.2, plan.corridor.size[1], 0, 3.4, 0, m.concrete), PLAZA_LEVEL);
  frame(plan.cantina, () => {
    const [w, d] = plan.cantina.size;
    box(w, 0.25, d, 0, 0.32, 0, m.stone, true);
    box(w, 4.1, 0.2, 0, 2.4, -d / 2, m.brick, true);
    for (const x of [-w / 2, w / 2]) box(0.24, 4.1, d, x, 2.4, 0, m.brick, true);
    hipRoof(w - 1.2, d - 1.2, 4.5, 0.9, m.blue);
    box(w + 0.7, 1.05, 0.12, 0, 4.22, d / 2 + 0.2, new T.MeshStandardMaterial({ color: "#b7795e", roughness: 0.9 }));
    box(w - 1, 0.16, 3.5, 0, 0.36, d / 2 + 1.75, m.stone, true);
    for (let x = -w / 2 + 1.5; x <= w / 2 - 1.4; x += 3) {
      if (Math.abs(x) < 1) box(1.35, 2.8, 0.06, x + 0.95, 1.9, d / 2 - 0.6, m.glass, false, { rotation: Math.PI / 2.5 });
      else box(2.8, 2.8, 0.06, x, 1.9, d / 2, m.glass, true);
      pole(0.04, 3.1, x + 1.45, 2.02, d / 2 + 0.12);
      box(2.9, 0.07, 0.1, x, 3.36, d / 2 + 0.1, m.metal);
      if (Math.abs(x) > 3) bench(x, d / 2 + 2.2, 0.45, 1);
    }
    // Dos escalones de la terraza hacia el cuadrado.
    for (const k of [0, 1]) box(w - 1 + k * 0.6, 0.3 - k * 0.12, 0.5, 0, 0.15 - k * 0.06, d / 2 + 3.75 + k * 0.5, m.stone, true);
    sign("CANTINA · CyT", 0, 4.2, d / 2 + 0.28, 3.8);
  }, PLAZA_LEVEL);
  frame(plan.electronics, () => {
    const [w, d] = plan.electronics.size;
    box(w, 0.2, d, 0, 0, 0, m.concrete, true);
    box(w, 3.2, 0.22, 0, 1.6, -d / 2, m.brick, true);
    for (const x of [-w / 2, w / 2]) box(0.22, 3.2, d, x, 1.6, 0, m.brick, true);
    for (let x = -w / 2 + 1.2; x <= w / 2 - 1.2; x += 2.75) {
      pole(0.14, 3.4, x, 1.7, d / 2 - 0.2, m.concrete);
      box(2.6, 2.3, 0.1, x, 1.8, d / 2 - 2.3, m.glass);
    }
    hipRoof(w, d, 3.5, 0.8, m.roof);
    sign("ELECTRÓNICA E INFORMÁTICA", 0, 2.9, d / 2 - 0.05, 7.5);
  });

  // ---- Áreas comunes, caminos y estacionamiento ----
  pave(plan.courtyard, m.grass, 0.015);
  pave(plan.common1, m.grass, 0.018);
  pave(plan.parking, m.grass, 0.02);
  plan.paths.forEach((p) => path(p));
  for (const [x, z] of plan.picnic) {
    box(2.5, 0.06, 1, x, 0.77, z, m.metal);
    for (const dz of [-0.85, 0.85]) {
      box(2.7, 0.08, 0.42, x, 0.43, z + dz, m.blue);
      for (const dx of [-0.9, 0.9]) pole(0.035, 0.75, x + dx, 0.38, z + dz * 0.5);
    }
  }
  // Cuatro árboles de referencia; sin bosque generado. Los de la plataforma nacen en su piso.
  for (const [x, z] of plan.trees) {
    const y = plan.platform.some((p) => insidePolygon([x, z], p)) ? PLAZA_LEVEL : 0;
    pole(0.3, 5.5, x, y + 2.75, z, m.bark, true);
    const crown = new T.Mesh(new T.IcosahedronGeometry(1, 2), m.leaves[0]);
    crown.scale.set(3.4, 2.1, 3.1); crown.position.set(x, y + 6, z); crown.castShadow = true; visual.add(crown);
  }
  {
    const [[ax, az], [bx, bz]] = plan.coveredWalk, length = Math.hypot(bx - ax, bz - az);
    const walk = new T.Group(); walk.position.set((ax + bx) / 2, 0, (az + bz) / 2); walk.rotation.y = Math.atan2(bx - ax, bz - az);
    visual.add(walk); const previous = visual; visual = walk;
    box(2.6, 0.12, length, 0, 2.7, 0, m.blue);
    for (const x of [-1.1, 1.1]) for (let z = -length / 2; z <= length / 2; z += 4) pole(0.05, 2.7, x, 1.35, z);
    visual = previous;
  }
  // Marcadores de los puntos de visita en el suelo y sobre la plataforma (no en los pisos altos).
  for (const place of facultyPlaces) {
    if (place.position[1] > PLAZA_LEVEL + 0.5) continue;
    const marker = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.04, 16), new T.MeshBasicMaterial({ color: 0xbca36d }));
    marker.position.set(place.position[0], (place.position[1] > 1 ? PLAZA_LEVEL : 0) + 0.13, place.position[2]); marker.userData.placeId = place.id;
    marker.userData.keep = true; group.add(marker); markers.push(marker);
  }
  mergeByMaterial(group);
  group.updateMatrixWorld(true); colliders.updateMatrixWorld(true);
  return { group, colliders, markers };
}

/** Invierte las caras de una geometría indexada (cielorraso visto desde abajo). */
function flipFaces(geo: T.BufferGeometry) {
  const index = geo.index!;
  for (let i = 0; i < index.count; i += 3) { const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b); }
  const normal = geo.attributes.normal;
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
}

/** Une las piezas estáticas por material: miles de cajas pasan a pocas llamadas de dibujo. */
function mergeByMaterial(root: T.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const buckets = new Map<T.Material, T.BufferGeometry[]>(), merged: T.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || o.userData.keep || Array.isArray(o.material)) return;
    let geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()) as T.BufferGeometry;
    for (const name of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute("uv", new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo = geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material)!.push(geo); merged.push(o);
  });
  for (const o of merged) o.parent?.remove(o);
  const empty: T.Object3D[] = [];
  root.traverse((o) => { if (o !== root && o.type === "Group" && !o.children.length) empty.push(o); });
  for (const o of empty) o.parent?.remove(o);
  for (const [material, geometries] of buckets) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = !(material as T.MeshStandardMaterial).transparent; mesh.receiveShadow = true;
    root.add(mesh);
  }
}
