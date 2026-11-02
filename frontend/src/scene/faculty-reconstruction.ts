import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeMaterials } from "./materials";
import {
  facultyBlueprint as plan, block1, blockG, gridAngle, FLOOR_HEIGHT as H, PLAZA_LEVEL, STEPS_RUN, rectCorners,
  bulgedOutline, cantinaForecourt, type Rect, type Rooms, type Vec2,
} from "../data/faculty-blueprint";
import { insidePolygon } from "../data/campus-geometry";
import { gardenHeight, gardenBounds } from "../data/cantina-terrain";
import { facultyPlaces } from "../data/places";

type BoxOptions = { tile?: readonly number[]; offset?: readonly number[]; rotation?: number };
type Range = readonly [number, number];
type BlockSpec = {
  length: number; depth: number; levels: number; bay: number; gallery: number;
  /** +1: galería hacia +z del marco local; -1: hacia -z. */
  front: 1 | -1;
  topWall: number; roof: T.Material; louvers: boolean;
  label: (level: number) => string;
  /** Aulas de cada nivel; donde terminan antes del extremo del bloque solo sigue la galería. */
  rooms: (level: number) => Rooms;
  /** Tramos (x) de la galería sin baranda ni lamas: descansos, ascensor, accesos. */
  openings: (level: number) => Range[];
  /** Tramos (x) sin baranda en el borde interior de la galería, más allá de las aulas (llegada de una escalera). */
  innerOpenings?: (level: number) => Range[];
  /** Columnas del borde de la galería, enteras desde la planta baja hasta la cubierta. */
  columns: { spacing: number; radius: number };
  /** Tramos (x) del borde de la galería sin columna (los apoya otro elemento, como la torre). */
  noColumns?: Range[];
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

  /** Muro de ladrillo de 0,2 m a lo largo de z, de z0 a z1, cuyo borde de arriba sube de h0 a h1 (el
   * lateral de la bodega bajo la escalera). */
  function slopedWall(x: number, z0: number, z1: number, h0: number, h1: number) {
    const shape = new T.Shape([new T.Vector2(z0, 0), new T.Vector2(z1, 0), new T.Vector2(z1, h1), new T.Vector2(z0, h0)]);
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2); geo.translate(x + 0.1, 0, 0);
    const tile = m.brick.userData.tile as number[], p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / tile[0], p.getY(i) / tile[1]);
    const mesh = new T.Mesh(geo, m.brick); mesh.castShadow = mesh.receiveShadow = true; visual.add(mesh);
    solid.add(new T.Mesh(geo));
  }

  /** Bloque de aulas con galería abierta (Bloque 1 y Bloque G). */
  function academicBlock(s: BlockSpec) {
    const { length: L, depth: D, levels, bay, gallery: G, front } = s;
    const zWall = front * (D / 2 - G), zEdge = front * D / 2, zBack = -front * D / 2;
    const zGallery = front * (D / 2 - G / 2), zRooms = -front * G / 2, bays = Math.round(L / bay);
    const roofY = (levels - 1) * H + s.topWall;
    const modules = Array.from({ length: bays - 1 }, (_, i) => -L / 2 + (i + 1) * bay);
    // Columnas del borde de la galería: cada una sube entera hasta la cubierta.
    const { spacing, radius: r } = s.columns, end = Math.max(0.2, r);
    const columns = [-L / 2 + end, ...Array.from({ length: Math.round(L / spacing) - 1 }, (_, k) => -L / 2 + (k + 1) * spacing),
      L / 2 - end].filter((x) => !s.noColumns?.some(([a, b]) => x > a && x < b));
    for (const x of columns) pole(r, roofY, x, roofY / 2, zEdge - front * (r + 0.03), m.concrete, true);
    for (let level = 0; level < levels; level++) {
      const y = level * H, top = level === levels - 1, hw = top ? s.topWall : H, open = s.openings(level);
      const { from: a, to: b, walls, doors } = s.rooms(level);
      // Losa: entera bajo las aulas y, donde estas terminan antes, solo la franja de la galería.
      box(level ? b - a : L, 0.24, D, level ? (a + b) / 2 : 0, y - 0.12, 0, m.concrete, true);
      const beyond = level ? spans(-L / 2, L / 2, [[a, b]]) : [];
      for (const [p, q] of beyond) box(q - p, 0.24, G, (p + q) / 2, y - 0.12, zGallery, m.concrete, true);
      // Galería: granito con franjas sobre las líneas de módulo; aulas: baldosa clara.
      box(L, 0.03, G, 0, y + 0.015, zGallery, m.galleryFloor, false, { offset: [0.5, 0] });
      box(b - a, 0.03, D - G, (a + b) / 2, y + 0.015, zRooms, m.tile);
      if (level) {
        box(L + 0.1, 0.32, 0.08, 0, y - 0.1, zEdge + front * 0.04, m.white);
        box(b - a + 0.1, 0.32, 0.08, (a + b) / 2, y - 0.1, zBack - front * 0.04, m.white);
        for (const [p, q] of beyond) {
          box(q - p, 0.32, 0.08, (p + q) / 2, y - 0.1, zWall - front * 0.04, m.white);
          for (const [c, d] of spans(p, q, s.innerOpenings?.(level) ?? [])) rail(c, d, y, zWall + front * 0.08);
        }
      }
      // Pared de la galería: pilastras de hormigón en las líneas de módulo, ladrillo hasta 2,85 m con la
      // puerta de cada aula y dintel de hormigón.
      const posts = [a, ...modules.filter((x) => x > a + 0.5 && x < b - 0.5), b];
      for (let i = 0; i + 1 < posts.length; i++) {
        const left = posts[i] + (i ? 0.225 : 0.12), right = posts[i + 1] - (i + 2 < posts.length ? 0.225 : 0.12);
        if (i) box(0.45, hw, 0.32, posts[i], y + hw / 2, zWall + front * 0.06, m.concrete, true);
        const edges = [left, ...doors.filter((d) => d > left && d < right).flatMap((d) => [d - 0.5, d + 0.5]), right];
        for (let k = 0; k < edges.length; k += 2) if (edges[k + 1] - edges[k] > 0.05)
          box(edges[k + 1] - edges[k], 2.85, 0.2, (edges[k] + edges[k + 1]) / 2, y + 1.425, zWall, m.brick, true);
        box(right - left, hw - 2.85, 0.2, (left + right) / 2, y + 2.85 + (hw - 2.85) / 2, zWall, m.concrete, true);
      }
      for (const d of doors) {
        box(1, 0.6, 0.05, d, y + 2.45, zWall, m.glass);
        box(1.04, 0.08, 0.22, d, y + 2.15, zWall, m.metal);
        const hinge = d - 0.48, swing = 1.2;
        box(0.95, 2.1, 0.05, hinge + Math.cos(swing) * 0.475, y + 1.05, zWall - front * Math.sin(swing) * 0.475, m.metal, false,
          { rotation: front * swing });
      }
      // Tabiques entre aulas y fachada posterior con ventanales por módulo, recortada donde terminan las aulas.
      for (const x of walls) box(0.12, hw, D - G - 0.2, x, y + hw / 2, zRooms - front * 0.1, m.plaster, true);
      for (let i = 0; i < bays; i++) {
        const x0 = Math.max(a, -L / 2 + i * bay), x1 = Math.min(b, -L / 2 + (i + 1) * bay), w = x1 - x0, xc = (x0 + x1) / 2;
        if (w < 0.05) continue;
        if (w < 1.6) { box(w, hw, 0.2, xc, y + hw / 2, zBack, m.brick, true); continue; }
        box(w, 1, 0.2, xc, y + 0.5, zBack, m.brick, true);
        box(w, hw - 2.7, 0.2, xc, y + 2.7 + (hw - 2.7) / 2, zBack, m.brick, true);
        for (const px of [x0 + 0.3, x1 - 0.3]) box(0.6, 1.7, 0.2, px, y + 1.85, zBack, m.brick, true);
        box(w - 1.2, 1.7, 0.05, xc, y + 1.85, zBack, m.glass, true);
        for (let k = 1; k < 4; k++) box(0.05, 1.7, 0.09, x0 + 0.6 + (k * (w - 1.2)) / 4, y + 1.85, zBack, m.metal);
        box(w - 1.2, 0.05, 0.09, xc, y + 2.1, zBack, m.metal);
      }
      // Borde de la galería: viga transversal en cada línea de módulo con columna; baranda y lamas
      // entre columnas.
      if (!top) for (const x of modules) if (columns.some((c) => Math.abs(c - x) < 0.01))
        box(0.28, 0.42, G, x, y + H - 0.45, zGallery, m.concrete);
      if (level) for (let i = 0; i + 1 < columns.length; i++) for (const [p, q] of spans(columns[i] + r, columns[i + 1] - r, open)) {
        rail(p, q, y, zEdge - front * 0.08);
        if (s.louvers) box(q - p, 0.96, 0.04, (p + q) / 2, y + 2.6, zEdge - front * 0.03, m.louver);
      }
      for (let i = 1; i < bays; i += 3) {
        const x = -L / 2 + (i + 0.5) * bay + 0.6;
        if (x > a + 1 && x < b - 1 && doors.every((d) => Math.abs(d - x) > 1.5)) bench(x, zWall + front * 0.42, y, front);
      }
      for (const x of [a, b]) box(0.24, hw, D - G, x, y + hw / 2, zRooms, m.brick, true);
      for (const x of [-L / 2, L / 2])
        if (level && !open.some(([p, q]) => p <= x + 0.5 && q >= x - 0.5)) railZ(Math.min(zWall, zEdge) + 0.1, Math.max(zWall, zEdge) - 0.1, y, x - Math.sign(x) * 0.08);
      sign(s.label(level), -L / 2 + 2.5 * bay, y + 3.02, zWall + front * 0.13, 1.6, front < 0 ? Math.PI : 0);
    }
    hipRoof(L, D, roofY, 1.2, s.roof);
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
  const stairWest = es.x - es.width / 2, stairEast = es.x + es.width / 2, stairFoot = es.top - es.run;
  frame(plan.main, () => {
    academicBlock({
      ...block1, front: 1, topWall: 4.1, roof: m.roof, louvers: true,
      label: (level) => level ? "AULAS" : "LABORATORIOS",
      rooms: (level) => plan.rooms.main[level],
      openings: (level) => [...(level ? [landingAt(level)] : []), [ex - ew / 2, ex + ew / 2], towerDoor],
      // Llegada de la escalera de la plaza a la galería del primer piso.
      innerOpenings: (level) => level === 1 ? [[stairWest, stairEast]] : [],
      columns: { spacing: block1.column, radius: 0.25 },
      // El núcleo de la torre de baños apoya el borde de la galería en su acceso.
      noColumns: [towerDoor],
    });
    // Mesas del laboratorio en planta baja, sin cruzar los tabiques.
    for (let x = -15; x <= 5; x += 5) {
      if (plan.rooms.main[0].walls.some((w) => Math.abs(w - x) < 1.5)) continue;
      for (const z of [-1, -3.4]) {
        box(2.6, 0.06, 0.8, x, 0.78, z, m.white);
        for (const dx of [-1.1, 1.1]) box(0.06, 0.75, 0.7, x + dx, 0.39, z, m.metal);
      }
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
    // Ascensor de 2,5 × 2,5 m: caja de hormigón con murales en sus caras este, sur y oeste hasta la
    // mitad superior entre el primer y el segundo piso; puertas con marco azul hacia la galería
    // (IMG_5706, IMG_5694). Por ahora las tres caras repiten el único mural fotografiado (IMG_5727).
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
      box(1.5, 0.14, 0.08, ex, y + 2.17, zd - 0.04, m.blue);
      for (const s of [-1, 1]) box(0.2, 2.1, 0.08, ex + s * 0.64, y + 1.05, zd - 0.04, m.blue);
    }
    box(ew + 0.3, 1.1, ed + 0.3, ex, shaftTop + 0.55, ez, m.white);

    // ---- Cabecera este: planta baja y primer piso retraídos bajo los pisos 2 y 3 ----
    const ee = plan.eastEnd, rp = ee.ramp, [groundEnd] = ee.roomsEnd;
    // Columnas que sostienen los pisos 2 y 3 donde planta baja y primer piso se retraen.
    for (const [x, z] of ee.columns) pole(0.25, 2 * H, x, H, z, m.concrete, true);
    // Rampa: losa inclinada de la explanada de Manfred a la galería de planta baja, con pasamanos sobre
    // la pared de las aulas y baranda del lado del rellano. Donde estaba la pared de la cabecera quedan
    // solo las columnas.
    const rampWidth = rp.east - rp.west, rampX = (rp.west + rp.east) / 2, rampRun = es.top - rp.top;
    const rampAt = (z: number) => (PLAZA_LEVEL * (es.top - z)) / rampRun;
    box(rampWidth, 0.2, Math.hypot(rampRun, PLAZA_LEVEL), rampX, PLAZA_LEVEL / 2 - 0.1, (rp.top + es.top) / 2, m.granite)
      .rotation.x = Math.atan2(PLAZA_LEVEL, rampRun);
    ramp(v3(rampX, 0, es.top), v3(rampX, PLAZA_LEVEL, rp.top), rampWidth);
    beam(v3(groundEnd + 0.2, rampAt(-block1.depth / 2) + 0.9, -block1.depth / 2), v3(groundEnd + 0.2, 0.9, es.top), 0.03);
    railZ(rp.top, stairFoot, PLAZA_LEVEL, rp.east + 0.06);
    railZ(rp.top, -block1.depth / 2, PLAZA_LEVEL, rp.west - 0.06);
    // Bodega bajo la escalera: laterales de ladrillo que siguen los peldaños (el oeste deja ver el paso
    // de la rampa, como en IMG_5694) y frente hacia la galería con una puerta de chapa.
    const bodegaTop = H - 0.12, door = es.x - 0.3;
    const eastTread = (z: number) => PLAZA_LEVEL + ((H - PLAZA_LEVEL) * (z - stairFoot)) / es.run;
    for (const x of [stairWest + 0.1, stairEast - 0.1])
      slopedWall(x, stairFoot, es.top - 0.2, PLAZA_LEVEL, eastTread(es.top - 0.2) - 0.1);
    for (const [p, q] of [[stairWest, door - 0.5], [door + 0.5, stairEast]])
      box(q - p, bodegaTop, 0.2, (p + q) / 2, bodegaTop / 2, es.top - 0.1, m.brick, true);
    box(1, bodegaTop - 2.1, 0.2, door, 2.1 + (bodegaTop - 2.1) / 2, es.top - 0.1, m.brick, true);
    box(0.95, 2.1, 0.05, door, 1.05, es.top + 0.02, m.steel, true);
    // Escalera de la plataforma al primer piso (2,8 m): sube hacia el sur hasta la galería, frente al ascensor.
    frame({ center: [es.x, es.top - es.run / 2], size: [es.run, es.width], angle: -Math.PI / 2 },
      () => flight(es.run / 2, PLAZA_LEVEL, -es.run / 2, H, 0, es.width));
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
      rooms: (level) => plan.rooms.block2[level],
      openings: (level) => level ? [[gStair - 1.3, gStair]] : [],
      columns: { spacing: blockG.bay, radius: 0.17 },
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

  // ---- Plataforma a 1,40 m: plaza techada, cuadrado, Bedelía, cantina, Sala Manfred y cabecera este ----
  for (const outline of plan.platform) {
    prism(outline, 0, PLAZA_LEVEL, m.concrete);
    pave(outline, m.stone, PLAZA_LEVEL + 0.005);
  }
  for (const s of plan.platformSteps.filter((_, i) => i !== 1))
    frame({ center: s.top, size: [STEPS_RUN, s.width], angle: s.angle }, () => steps(STEPS_RUN, 0, PLAZA_LEVEL, s.width));

  // ---- Plaza techada: cubierta exenta, separada de la cabecera este del Bloque 1 ----
  {
    const outline = rectCorners(plan.coveredPlaza), [w, n, e, s] = outline;
    const height = 4.6, roofY = PLAZA_LEVEL + height;
    flipFaces(pave(outline, m.roofUnder, roofY - 0.02).geometry);
    pave(outline, m.roof, roofY + 0.12);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      box(length, 0.35, 0.08, (a[0] + b[0]) / 2, roofY - 0.05, (a[1] + b[1]) / 2, m.white, false,
        { rotation: -Math.atan2(b[1] - a[1], b[0] - a[0]) });
    }
    // Columnas en los dos lados largos, con una viga a lo largo de cada uno, y cerchas paralelas al
    // lado corto apoyadas en ellas.
    const inset = (p: Vec2, c: Vec2, k = 0.35): Vec2 => [p[0] + (c[0] - p[0]) * k / Math.hypot(c[0] - p[0], c[1] - p[1]), p[1] + (c[1] - p[1]) * k / Math.hypot(c[0] - p[0], c[1] - p[1])];
    const centre: Vec2 = [(n[0] + s[0]) / 2, (n[1] + s[1]) / 2];
    for (const [a, b] of [[n, e], [w, s]] as const) {
      for (const t of [0, 1 / 3, 2 / 3, 1]) {
        const p = inset([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], centre);
        pole(0.16, height, p[0], PLAZA_LEVEL + height / 2, p[1], m.steel, true);
      }
      const [pa, pb] = [inset(a, centre), inset(b, centre)];
      beam(v3(pa[0], roofY - 0.45, pa[1]), v3(pb[0], roofY - 0.45, pb[1]), 0.07, m.steel);
    }
    const X: Vec2 = [(n[0] - w[0]) / 10, (n[1] - w[1]) / 10], Z: Vec2 = [(s[0] - w[0]) / 15, (s[1] - w[1]) / 15];
    for (const k of [3, 6, 9, 12]) {
      const start = [w[0] + Z[0] * k, w[1] + Z[1] * k];
      const a = v3(start[0], roofY - 0.45, start[1]);
      const b = v3(start[0] + X[0] * 10, roofY - 0.45, start[1] + X[1] * 10);
      beam(a, b, 0.05, m.steel); beam(a.clone().setY(roofY - 0.05), b.clone().setY(roofY - 0.05), 0.045, m.steel);
      for (let t = 0; t <= 1.001; t += 0.25) {
        const p = a.clone().lerp(b, t), q = a.clone().lerp(b, Math.min(1, t + 0.125));
        beam(p, q.setY(roofY - 0.05), 0.025, m.steel);
      }
    }
  }

  // ---- Cuadrado descubierto, Bedelía, Sala Manfred, cantina y Electrónica ----
  for (const center of plan.planters) frame({ center, size: [3.4, 1.6], angle: gridAngle }, () => {
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
  // Sala Manfred: auditorio con el escenario y el pizarrón al norte (fondo), el frente curvo hacia la
  // rampa del Bloque 1, fachada vidriada con entrada 2 cortando la curva frontal (rectángulo verde).
// ---- Sala Manfred (Reconstrucción Limpia - Anfiteatro Descendente) ----
// ---- Sala Manfred (Anfiteatro Descendente con Paredes Extendidas) ----
  frame(plan.manfred, () => {
    const [w, d] = plan.manfred.size, bulge = plan.manfred.bulge, zf = d / 2 - bulge, hw = 3.6;
    const radius = (w * w / 4 + bulge * bulge) / (2 * bulge), zc = d / 2 - radius, outline = bulgedOutline(w, d, bulge);
    
    const pitY = -1.25;
    const wallYMin = -1.35; // Extensión hacia abajo para cerrar el hueco inferior

    // 1. TECHO Y CIELORRASO
    prism(outline, hw, 0.22, m.concrete, false);
    pave(outline, m.roofUnder, hw - 0.01);

    // 2. PAREDES DE LADRILLO VISTO (EXTENDIDAS HASTA wallYMin)
    const wallMat = m.brick.clone();
    wallMat.side = T.DoubleSide;
    wallMat.userData.tile = m.brick.userData.tile as number[];

    const wallH = hw - wallYMin;
    const wallCenterY = (hw + wallYMin) / 2;

    // Pared trasera
    box(w, wallH, 0.2, 0, wallCenterY, -d / 2 + 0.1, m.brick, true);
    // Paredes laterales rectas (-x y +x)
    box(0.2, wallH, zf + d / 2, -w / 2 + 0.1, wallCenterY, (zf - d / 2) / 2, m.brick, true);
    box(0.2, wallH, zf + d / 2, w / 2 - 0.1, wallCenterY, (zf - d / 2) / 2, m.brick, true);

    // 3. MURO CURVO FRONTAL Y ENTRADA
    const doorXStart = -0.8; 
    const doorXEnd = 2.4;
    const glassH = 2.8;

    const a = Math.asin(w / 2 / radius);
    const aStart = Math.asin(Math.max(-w / 2 + 0.05, doorXStart) / radius);
    const aEnd = Math.asin(Math.min(w / 2 - 0.05, doorXEnd) / radius);

    const buildArc = (a0: number, a1: number, y0: number, y1: number) => {
      if (a1 <= a0) return;
      const geo = new T.CylinderGeometry(radius, radius, y1 - y0, Math.max(4, Math.ceil((a1 - a0) * 12)), 1, true, a0, a1 - a0);
      const fuv = geo.attributes.uv, tile = wallMat.userData.tile as number[];
      for (let i = 0; i < fuv.count; i++) {
        fuv.setXY(i, (fuv.getX(i) * radius * (a1 - a0)) / tile[0], (fuv.getY(i) * (y1 - y0)) / tile[1]);
      }
      const mesh = new T.Mesh(geo, wallMat);
      mesh.position.set(0, (y0 + y1) / 2, zc);
      mesh.castShadow = mesh.receiveShadow = true;
      visual.add(mesh);
      solid.add(new T.Mesh(geo).copy(mesh, false));
    };

    // Muros curvos extendidos verticalmente desde wallYMin hasta hw
    buildArc(-a, aStart, wallYMin, hw);
    buildArc(aEnd, a, wallYMin, hw);
    buildArc(aStart, aEnd, glassH, hw);

    const p1 = new T.Vector3(radius * Math.sin(aStart), 0, zc + radius * Math.cos(aStart));
    const p2 = new T.Vector3(radius * Math.sin(aEnd), 0, zc + radius * Math.cos(aEnd));
    const chordCenter = p1.clone().add(p2).multiplyScalar(0.5);
    const chordLen = p1.distanceTo(p2);
    const chordAngle = Math.atan2(p2.z - p1.z, p2.x - p1.x);

    frame({ center: [chordCenter.x, chordCenter.z], size: [chordLen, 0.2], angle: -chordAngle }, () => {
      glazing(chordLen, 0, 1);
      sign("SALA MANFRED STARK", 0, 2.5, 0.08, Math.min(chordLen - 0.4, 3.2));
    });

    // 4. PISO DEL HALL Y BUTACAS DESCENDENTES
    const rowsZ = [1.2, 0.4, -0.4, -1.2, -2.0];
    const rowWidth = w - 0.6;
    const rowDepth = 0.8;

    // Piso del vestíbulo hasta la curva de entrada
    const arcPoints = outline.slice(2) as Vec2[];
    const vestibuleOutline: Vec2[] = [
      [-w / 2 + 0.1, 1.6],
      [w / 2 - 0.1, 1.6],
      ...arcPoints
    ];
    prism(vestibuleOutline, -0.15, 0.15, m.tile, true);

    // Gradas descendentes e individuales
    rowsZ.forEach((z, k) => {
      const stepY = -0.25 * k;
      box(rowWidth, 0.2, rowDepth, 0, stepY - 0.1, z, m.tile, true);

      const nextY = k < rowsZ.length - 1 ? -0.25 * (k + 1) : pitY;
      const riserH = Math.abs(stepY - nextY);
      box(rowWidth, riserH, 0.08, 0, stepY - riserH / 2, z - rowDepth / 2, m.concrete, true);

      for (let x = -rowWidth / 2 + 0.4; x <= rowWidth / 2 - 0.4; x += 0.58) {
        box(0.5, 0.07, 0.42, x, stepY + 0.42, z - 0.05, m.wood);
        box(0.5, 0.35, 0.05, x, stepY + 0.62, z + 0.14, m.wood);
        box(0.05, 0.42, 0.4, x - 0.27, stepY + 0.21, z - 0.05, m.metal);
      }
    });

    // 5. FOSO DEL PIZARRÓN Y ESCENARIO AL FONDO
    const stageZ = -d / 2 + 1.4;
    box(rowWidth, 0.15, 1.2, 0, pitY + 0.075, stageZ + 0.5, m.tile, true);
    box(rowWidth - 0.8, 0.25, 0.9, 0, pitY + 0.25, stageZ - 0.4, m.wood, true);
    box(4.8, 1.4, 0.04, 0, pitY + 1.4, -d / 2 + 0.22, m.white);
  }, PLAZA_LEVEL);

  // ---- TECHO 1 (MARQUESINA EXTIENDE LA COBERTURA SOBRE EL SECTOR SUPERIOR RED) ----
// ---- TECHO 1 (COBERTURA EXTENDIDA HACIA LA DERECHA) ----
  {
    const mf = plan.manfred;
    const [mw] = mf.size, mb = mf.bulge;
    const mx = mf.center[0];
    const zArcGlobal = mf.center[1] + (mf.size[1] / 2 - mb);

    // PARÁMETROS DE CONTROL EXTENDIDOS:
    const canopyW = 23.0;       // <-- Ancho incrementado (de 18.0 a 23.0) para llegar a la derecha
    const canopyDepth = 10.5;   // <-- Profundidad para sellar la brecha
    const mx_canopy = mx + 2.0; // <-- Desplazamiento a la derecha (+X hacia Bedelía)
    const canopyH = PLAZA_LEVEL + 4.1; 
    const colH = canopyH - PLAZA_LEVEL;

    const posZ = zArcGlobal + canopyDepth / 2 - 3.0;
    const zColGlobal = posZ + canopyDepth / 2 - 0.6;

    // Losa superior del Techo 1
    box(canopyW, 0.20, canopyDepth, mx_canopy, canopyH, posZ, m.concrete, false);
    box(canopyW, 0.30, 0.12, mx_canopy, canopyH - 0.1, posZ + canopyDepth / 2, m.white, false);

    // Columnas de soporte distribuidas a lo largo de la losa ensanchada
    for (const cx of [-canopyW / 2 + 1.0, -canopyW / 4, 0, canopyW / 4, canopyW / 2 - 1.0]) {
      pole(0.09, colH, mx_canopy + cx, PLAZA_LEVEL + colH / 2, zColGlobal, m.white, true);
    }
  }

  // Losa del pasillo cubierto entre la Sala Manfred y Bedelía.
  prism(plan.corridor, PLAZA_LEVEL + 3.6, 0.2, m.concrete, false);
  // Cantina: IMG_5714/5719/5720/5721, frente vidriado bajo marquesina suspendida.
  frame(plan.cantina, () => {
    const [w, d] = plan.cantina.size, front = d / 2;
    const terracotta = new T.MeshStandardMaterial({ color: "#c88d70", roughness: 0.86 });
    const dark = new T.MeshStandardMaterial({ color: "#393d3b", roughness: 0.62, metalness: 0.45 });
    const aluminum = new T.MeshStandardMaterial({ color: "#b8b7aa", roughness: 0.4, metalness: 0.65 });
    const glazing = new T.MeshStandardMaterial({ color: "#71817d", roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.6 });
    const terrace = m.courtyardPaving;
    // Misma orientación y dibujo en explanada y enlace con la plaza, sin modificar
    // su contorno ni abrir huecos de césped en el paso existente.
    const toLocal = ([x, z]: Vec2): Vec2 => {
      const dx = x - plan.cantina.center[0], dz = z - plan.cantina.center[1], a = plan.cantina.angle;
      return [dx * Math.cos(a) + dz * Math.sin(a), -dx * Math.sin(a) + dz * Math.cos(a)];
    };
    pave(plan.platform[2].map(toLocal), terrace, 0.461);
    // Terreno y relleno macizo: la terraza sobresale de la plataforma original del plano.
    // La base llega al suelo (y mundial = 0); el césped continúa por sus laterales.
    box(w + 12, 0.12, d + 18, 2, -PLAZA_LEVEL - 0.035, 5, m.grass);
    // Jardín continuo: reemplaza los bloques verticales por terreno que desciende
    // gradualmente al suelo. La única subida junto al acceso son 3 × 15 cm.
    const lawnVertices: number[] = [], lawnUV: number[] = [];
    function lawnTriangle(a: Vec2, b: Vec2, c: Vec2) {
      for (const [x, z] of [a, b, c]) { lawnVertices.push(x, gardenHeight(x, z) - (PLAZA_LEVEL - 0.45), z); lawnUV.push(x / 4, z / 4); }
    }
    for (let x = gardenBounds.minX; x < gardenBounds.maxX; x++) for (let z = gardenBounds.minZ; z < gardenBounds.maxZ; z++) {
      lawnTriangle([x, z], [x, z + 1], [x + 1, z]);
      lawnTriangle([x + 1, z], [x, z + 1], [x + 1, z + 1]);
    }
    const lawnGeometry = new T.BufferGeometry();
    lawnGeometry.setAttribute("position", new T.Float32BufferAttribute(lawnVertices, 3));
    lawnGeometry.setAttribute("uv", new T.Float32BufferAttribute(lawnUV, 2));
    lawnGeometry.computeVertexNormals();
    const lawn = new T.Mesh(lawnGeometry, m.grass); lawn.receiveShadow = true; visual.add(lawn);
    solid.add(new T.Mesh(lawnGeometry));
    const baseHeight = PLAZA_LEVEL + 0.39;
    box(w + 1, baseHeight, d, 0, -PLAZA_LEVEL + baseHeight / 2, 0, m.concrete, true);
    box(w + 1, 0.12, d, 0, 0.39, 0, terrace, true);
    prism(cantinaForecourt.outline, -PLAZA_LEVEL, PLAZA_LEVEL + 0.45, m.concrete, true);
    pave(cantinaForecourt.outline, terrace, 0.461);
    const stepStone = new T.MeshStandardMaterial({ color: "#929697", roughness: 0.95 });
    // Los tres escalones siguen el borde quebrado entero, incluida la diagonal.
    for (let k = 0; k < 3; k++) {
      const inner = cantinaForecourt.edge.map(([x, z]): Vec2 => [x, z + k * 0.4]);
      const outer = cantinaForecourt.edge.map(([x, z]): Vec2 => [x, z + (k + 1) * 0.4]);
      prism([...inner, ...outer.reverse()], -PLAZA_LEVEL, PLAZA_LEVEL + 0.45 - k * 0.15, stepStone, false);
    }
    for (let i = 1; i < cantinaForecourt.edge.length; i++) {
      const [ax, az] = cantinaForecourt.edge[i - 1], [bx, bz] = cantinaForecourt.edge[i];
      // Mismo contorno para la colisión: dos triángulos por tramo de escalinata.
      const points = [v3(ax, 0.45, az), v3(bx, 0.45, bz), v3(ax, 0, az + 1.2), v3(bx, 0, bz + 1.2)];
      const geometry = new T.BufferGeometry().setFromPoints([points[0], points[2], points[1], points[1], points[2], points[3]]);
      geometry.computeVertexNormals(); solid.add(new T.Mesh(geometry));
    }
    // Continuación de los tres peldaños junto al jardín, hasta antes del pilar azul.
    const sideSteps = cantinaForecourt.sideSteps;
    const sideLength = sideSteps.to - sideSteps.from, sideZ = (sideSteps.from + sideSteps.to) / 2;
    for (let k = 0; k < 3; k++) {
      const height = PLAZA_LEVEL + 0.45 - k * 0.15;
      box(0.4, height, sideLength, sideSteps.x + 0.2 + k * 0.4,
        -PLAZA_LEVEL + height / 2, sideZ, stepStone);
    }
    ramp(v3(sideSteps.x + 1.2, 0, sideZ), v3(sideSteps.x, 0.45, sideZ), sideLength);
    // Fotos interiores de Horacio: pared de hormigón opuesta al frente vidriado.
    // La puerta está junto al mostrador; la ventana corrida sigue hacia el comedor.
    const interiorConcrete = m.concrete.clone(); interiorConcrete.color.set("#e4e0d4");
    const exitZ = -5.15, exitWidth = 1.4;
    const sill = 1.48, windowTop = 2.3, wallTop = 5.25;
    const windowLeft = -w / 2 + 0.3, windowRight = w / 2 - 0.3;
    // El lateral de ventanas ya no tiene ningún hueco de puerta.
    box(w, sill - 0.45, 0.24, 0, (sill + 0.45) / 2, -front, interiorConcrete, true);
    box(w, wallTop - windowTop, 0.24, 0, (wallTop + windowTop) / 2, -front, interiorConcrete, true);
    for (const [a, b] of [[-w / 2, windowLeft], [windowRight, w / 2]])
      box(b - a, windowTop - sill, 0.24, (a + b) / 2, (windowTop + sill) / 2, -front, interiorConcrete, true);
    const windowGlass = new T.MeshStandardMaterial({ color: "#d4e3df", transparent: true, opacity: 0.17, roughness: 0.12, metalness: 0.1 });
    const windowSpan = windowRight - windowLeft, windowCount = 5;
    box(windowSpan, windowTop - sill, 0.035, (windowLeft + windowRight) / 2, (sill + windowTop) / 2, -front, windowGlass, true);
    for (const y of [sill, windowTop]) box(windowSpan + 0.08, 0.065, 0.28, (windowLeft + windowRight) / 2, y, -front, aluminum);
    for (let i = 0; i <= windowCount; i++) box(0.045, windowTop - sill, 0.12, windowLeft + i * windowSpan / windowCount, (sill + windowTop) / 2, -front, aluminum);
    box(windowSpan + 0.12, 0.055, 0.35, (windowLeft + windowRight) / 2, sill - 0.04, -front, m.stone);
    // Viga de hormigón vista sobre la ventana corrida.
    box(w, 0.42, 0.42, 0, 3.85, -front + 0.12, interiorConcrete);
    // Puerta en la pared del fondo del pasillo (x = -9), perpendicular a las ventanas.
    // Recorte real del muro de ladrillo, pegado a la esquina posterior del sector de ventas.
    for (const [a, b] of [[-front, exitZ - exitWidth / 2], [exitZ + exitWidth / 2, front]])
      box(0.24, 4.8, b - a, -w / 2, 2.85, (a + b) / 2, m.brick, true);
    box(0.24, wallTop - 3.2, exitWidth, -w / 2, (wallTop + 3.2) / 2, exitZ, m.brick, true);
    // Cerramiento lateral completo de blindex, como el frente de acceso.
    // Una hoja corre detrás de la siguiente y deja paso hacia la terraza (z = 2..4).
    const sideGlass = new T.MeshStandardMaterial({ color: "#c3d8d3", transparent: true, opacity: 0.23, roughness: 0.16, metalness: 0.12 });
    for (let i = 0; i < 6; i++) {
      const z = -front + (i + 0.5) * 2 + (i === 4 ? 2 : 0);
      const x = w / 2 + (i === 4 ? 0.08 : 0);
      box(0.035, 4.55, 1.94, x, 2.76, z, sideGlass, true);
      for (const dz of [-1, 1]) box(0.095, 4.65, 0.045, x, 2.77, z + dz, aluminum);
      for (const y of [0.48, 5.08]) box(0.09, 0.045, 2, x, y, z, aluminum);
      if (i === 4) box(0.1, 0.45, 0.025, x - 0.06, 1.65, z - 0.82, aluminum);
    }
    // Terraza a la misma cota: baldosas iguales a la explanada, base maciza y
    // prolongación por la esquina para enlazar con el piso exterior existente.
    const patioX = w / 2 + 2.5;
    box(5, PLAZA_LEVEL + 0.45, 14, patioX, (0.45 - PLAZA_LEVEL) / 2, 1, m.concrete, true);
    box(5, 0.025, 14, patioX, 0.4625, 1, terrace);
    const canopyTop = 3.95;
    const patioRoof = box(5.7, 0.1, 13.5, patioX, canopyTop, 0.5, m.roof);
    patioRoof.rotation.z = -0.035;
    for (const z of [-5.75, 0.5, 6.75]) {
      pole(0.055, 3.4, w / 2 + 4.65, 2.15, z, dark, true);
      box(5.4, 0.1, 0.09, patioX, 3.83, z, dark);
    }
    for (const x of [w / 2, w / 2 + 4.65]) box(0.1, 0.14, 13.1, x, 3.83, 0.5, dark);
    box(0.12, 0.22, 13.6, w / 2 + 5.15, 3.76, 0.5, aluminum);
    // Tres escalones por el borde exterior de la terraza, con apoyo hasta el suelo.
    const patioGround = gardenHeight(w / 2 + 6.2, 1) - (PLAZA_LEVEL - 0.45);
    for (let i = 0; i < 3; i++) {
      const top = 0.45 - (i + 1) * (0.45 - patioGround) / 3;
      box(0.4, PLAZA_LEVEL + top, 14, w / 2 + 5.2 + i * 0.4, (top - PLAZA_LEVEL) / 2, 1, stepStone);
    }
    ramp(v3(w / 2 + 6.2, patioGround, 1), v3(w / 2 + 5, 0.45, 1), 14);
    frame({ center: [-w / 2, exitZ], size: [exitWidth, 0.1], angle: -Math.PI / 2 }, () => {
      for (const x of [-exitWidth / 2, exitWidth / 2]) box(0.065, 2.75, 0.12, x, 1.825, 0, aluminum);
      box(exitWidth, 0.065, 0.12, 0, 3.2, 0, aluminum);
      frame({ center: [-exitWidth / 2, 0], size: [exitWidth, 0.1], angle: -Math.PI / 2 }, () => {
        box(exitWidth - 0.08, 2.66, 0.035, exitWidth / 2, 1.82, 0, windowGlass, true);
        for (const x of [0, exitWidth]) box(0.04, 2.72, 0.06, x, 1.82, 0, aluminum);
        for (const y of [0.46, 3.18]) box(exitWidth, 0.04, 0.06, exitWidth / 2, y, 0, aluminum);
        box(0.035, 0.5, 0.1, exitWidth - 0.16, 1.6, 0.06, aluminum);
      });
      box(2.2, PLAZA_LEVEL + 0.45, 1.35, 0, (0.45 - PLAZA_LEVEL) / 2, -0.65, m.stone, true);
      const ground = gardenHeight(-w / 2 - 2.8, exitZ) - (PLAZA_LEVEL - 0.45);
      for (let i = 0; i < 3; i++) {
        const top = 0.45 - (i + 1) * (0.45 - ground) / 3;
        box(2.2, PLAZA_LEVEL + top, 0.5, 0, (top - PLAZA_LEVEL) / 2, -1.55 - i * 0.5, stepStone);
      }
      ramp(v3(0, ground, -2.8), v3(0, 0.45, -1.3), 2.2);
    });
    box(w + 0.4, 0.18, d - 1.8, 0, 5.3, -1.15, m.roof, true);
    // El paño izquierdo de ladrillo reduce la vidriera al sector de acceso real.
    const left = -w / 2 + 4.5, right = w / 2 - 0.4;
    box(4.4, 3.6, 0.24, -w / 2 + 2.2, 2.25, front, m.brick, true);
    box(right - left, 0.18, 0.25, (left + right) / 2, 3.68, front, aluminum);
    box(right - left, 0.1, 0.25, (left + right) / 2, 0.5, front, aluminum);
    // Cuatro hojas de blindex de piso a dintel. La segunda corre 2,4 m hacia la
    // izquierda, detrás de la primera: queda un paso real sin sumar una quinta hoja.
    const panelWidth = (right - left) / 4;
    for (let i = 0; i < 4; i++) {
      const shift = i === 1 ? -2.4 : 0;
      const x = left + (i + 0.5) * panelWidth + shift;
      const z = front + (i === 1 ? -0.09 : 0);
      box(panelWidth - 0.05, 3, 0.035, x, 2.02, z, glazing, true);
      for (const dx of [-panelWidth / 2, panelWidth / 2])
        box(0.045, 3.15, 0.075, x + dx, 2.06, z + 0.025, aluminum);
      for (const y of [0.5, 3.58]) box(panelWidth, 0.045, 0.07, x, y, z + 0.025, aluminum);
      if (i === 1 || i === 2) box(0.025, 0.42, 0.07, x - panelWidth / 2 + 0.15, 1.75, z + 0.08, aluminum);
    }
    // Ventanas altas en sombra, cubierta plana y gran fascia de paneles salmón.
    box(w - 0.5, 0.65, 0.06, 0, 4.15, front - 0.4, glazing);
    box(w + 0.5, 1.45, 0.16, 0, 5.04, front + 0.28, terracotta);
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.75)
      box(0.024, 1.46, 0.04, x, 5.04, front + 0.38, aluminum);
    for (const y of [4.32, 4.8, 5.28, 5.76]) box(w + 0.5, 0.018, 0.025, 0, y, front + 0.38, aluminum);
    const awning = box(w - 0.3, 0.12, 1.65, 0, 3.96, front + 1.03, terracotta);
    awning.rotation.x = 0.12;
    box(w, 0.12, 0.12, 0, 3.82, front + 1.85, dark);
    for (let x = -w / 2 + 0.25; x <= w / 2; x += 3) {
      beam(v3(x, 5.75, front + 0.4), v3(x, 3.86, front + 1.85), 0.025, dark);
      beam(v3(x, 3.86, front + 1.85), v3(x, 3.75, front - 0.1), 0.035, dark);
    }
    for (const x of [left, right]) pole(0.075, 3.4, x, 2.15, front + 0.75, dark, true);
    // Bancos de hierro de la terraza: asiento de listones y respaldo de rombos.
    function ironBench(x: number, z: number) {
      for (let i = 0; i < 5; i++) box(1.85, 0.035, 0.075, x, 0.92, z - 0.18 + i * 0.085, dark);
      for (const dx of [-0.78, 0.78]) {
        pole(0.025, 0.5, x + dx, 0.7, z + 0.15, dark);
        pole(0.025, 0.95, x + dx, 0.93, z - 0.22, dark);
        box(0.04, 0.04, 0.48, x + dx, 1.15, z, dark);
      }
      for (const y of [1.03, 1.4]) box(1.85, 0.035, 0.035, x, y, z - 0.22, dark);
      for (let dx = -0.8; dx < 0.8; dx += 0.2) {
        beam(v3(x + dx, 1.03, z - 0.22), v3(x + dx + 0.2, 1.4, z - 0.22), 0.012, dark);
        beam(v3(x + dx, 1.4, z - 0.22), v3(x + dx + 0.2, 1.03, z - 0.22), 0.012, dark);
      }
    }
    for (const x of [-3.4, -0.9, 5.8]) ironBench(x, front + 1.65);
    // Comedor según las tres fotos: piso claro, cubierta negra y lucernario inclinado.
    const tableTop = new T.MeshStandardMaterial({ color: "#ac7d4f", roughness: 0.63 });
    const blackFurniture = new T.MeshStandardMaterial({ color: "#242a29", roughness: 0.43, metalness: 0.45 });
    const light = new T.MeshStandardMaterial({ color: "#f8fff4", emissive: "#efffe9", emissiveIntensity: 1.15 });
    const ceiling = new T.MeshStandardMaterial({ color: "#303735", roughness: 0.92 });
    const interiorFloor = m.stone.clone(); interiorFloor.color.set("#dedbcd");
    box(w - 0.35, 0.025, d - 0.35, 0, 0.465, 0, interiorFloor);
    box(w - 0.3, 0.09, d - 2.2, 0, 5.14, -1.1, ceiling);
    for (const x of [-5, -1.5, 2, 5.5, 8.6]) {
      box(0.11, 0.18, d - 2.2, x, 5.02, -1.1, dark);
      beam(v3(x, 5.08, 3.8), v3(x, 3.75, front), 0.045, dark);
    }
    // Paños de vidrio inclinados por encima del frente, separados por perfiles negros.
    const roofGlass = new T.MeshStandardMaterial({ color: "#bddad5", transparent: true, opacity: 0.24, roughness: 0.15, side: T.DoubleSide });
    const roofVertices = [v3(-w / 2 + 0.2, 5.08, 3.8), v3(w / 2 - 0.2, 5.08, 3.8), v3(-w / 2 + 0.2, 3.75, front), v3(w / 2 - 0.2, 3.75, front)];
    const roofGeo = new T.BufferGeometry().setFromPoints([roofVertices[0], roofVertices[2], roofVertices[1], roofVertices[1], roofVertices[2], roofVertices[3]]);
    roofGeo.computeVertexNormals(); visual.add(new T.Mesh(roofGeo, roofGlass));
    for (const x of [-3.6, 0.6, 4.8, 8]) {
      for (const z of [-2.9, 2.6]) beam(v3(x, 5, z), v3(x, 4.38, z), 0.008, aluminum);
      box(0.18, 0.08, 5.8, x, 4.4, -0.15, aluminum);
      for (const dz of [-0.055, 0.055]) {
        const tube = pole(0.029, 5.5, x + dz, 4.32, -0.15, light); tube.rotation.x = Math.PI / 2;
      }
      beam(v3(x - 1.8, 5.02, -5.5), v3(x + 1.8, 5.02, 3.6), 0.009, dark);
    }
    // Luz difusa de los tubos: dos puntos sin sombras para conservar el costo del recorrido.
    for (const x of [0, 6]) {
      const roomLight = new T.PointLight(0xf3f5e9, 38, 16, 2);
      roomLight.position.set(x, 4.05, -1.2); visual.add(roomLight);
    }
    // Unidades split blancas sobre la viga de hormigón.
    for (const x of [-1.3, 3.1, 7.4]) {
      box(2.1, 0.48, 0.48, x, 4.45, -front + 0.35, m.white);
      box(1.95, 0.065, 0.035, x, 4.42, -front + 0.61, blackFurniture);
      box(1.94, 0.1, 0.1, x, 4.27, -front + 0.57, aluminum);
      for (const dx of [-0.65, 0.65]) box(0.05, 0.5, 0.06, x + dx, 4.05, -front + 0.22, m.white);
    }
    // Sector de venta a la izquierda al entrar (foto interior aportada por Horacio).
    // Marco del mostrador: +z mira al comedor, x recorre heladeras → cafetera.
    // Sector de ventas oblicuo: el extremo derecho se retira hacia el fondo.
    // Ángulo aproximado de la nueva foto; la fachada exterior conserva su registro.
    frame({ center: [-6.55, -0.2], size: [10.7, 3.6], angle: -Math.PI / 2 - 0.10 }, () => {
      const black = new T.MeshStandardMaterial({ color: "#1b2020", roughness: 0.38, metalness: 0.25 });
      const cream = new T.MeshStandardMaterial({ color: "#e4dfce", roughness: 0.85 });
      const backing = new T.MeshStandardMaterial({ color: "#403b32", roughness: 0.9 });
      const red = new T.MeshStandardMaterial({ color: "#b92b29", roughness: 0.42, metalness: 0.2 });
      const warm = new T.MeshStandardMaterial({ color: "#ffdf8c", emissive: "#ffc35b", emissiveIntensity: 1.6 });
      const displayGlass = new T.MeshStandardMaterial({ color: "#b6d1cd", transparent: true, opacity: 0.2, roughness: 0.12, metalness: 0.1 });
      // Fondo oscuro y gran viga/cenefa clara sobre la zona de atención.
      box(9.8, 3.1, 0.15, -0.5, 2, -1.75, backing);
      box(11.3, 0.6, 3.9, -0.65, 3.8, -0.1, cream);
      for (const x of [-6.15, 4.1]) box(0.25, 3.1, 0.7, x, 2, -1.5, cream);
      // El lado izquierdo llega al cerramiento frontal; no queda un acceso lateral.
      box(0.16, 1.04, 3.4, -6.12, 0.97, 0.1, terracotta, true);
      box(0.2, 3.1, 0.35, -6.12, 2, 1.3, cream, true);
      // Pilar derecho y hueco posterior: único acceso a la zona de atención.
      box(0.22, 3.1, 0.35, 4.4, 2, 1.3, dark, true);
      // Frente de ladrillos huecos: huecos reales entre piezas, interior oscuro detrás.
      box(10.7, 0.72, 0.8, -0.9, 0.83, 1.3, black, true);
      for (let row = 0; row < 6; row++) {
        const y = 0.53 + row * 0.105;
        box(10.7, 0.035, 0.045, -0.9, y, 1.73, terracotta);
        for (let x = -6.2; x < 4.45; x += 0.16) box(0.035, 0.105, 0.045, x, y + 0.05, 1.73, terracotta);
      }
      box(10.9, 0.09, 1, -0.9, 1.22, 1.3, black);
      // Vitrina refrigerada frontal con perfiles negros, dos niveles y bandejas.
      box(6.5, 0.55, 0.06, 0.85, 1.53, 1.77, displayGlass);
      for (const x of [-2.4, -0.23, 1.94, 4.1]) box(0.055, 0.64, 0.08, x, 1.55, 1.78, black);
      for (const y of [1.26, 1.82]) box(6.6, 0.06, 0.95, 0.85, y, 1.32, black);
      box(6.4, 0.025, 0.75, 0.85, 1.52, 1.35, aluminum);
      for (const y of [1.29, 1.55]) {
        box(6.35, 0.015, 0.02, 0.85, y + 0.17, 1.65, light);
        for (let i = 0; i < 10; i++) {
          const x = -2.05 + i * 0.62;
          box(0.48, 0.025, 0.43, x, y, 1.35, m.white);
          if (i < 5) {
            const food = pole(0.12, 0.26, x, y + 0.12, 1.35, tableTop); food.rotation.z = Math.PI / 2;
          } else box(0.32, 0.12, 0.25, x, y + 0.08, 1.35, i % 2 ? m.leaves[1] : terracotta);
        }
      }
      // Tres heladeras expositoras: roja, negra y negra, con botellas por estante.
      for (const [i, x] of [-3.15, -1.95, -0.75].entries()) {
        const casing = i === 0 ? red : black;
        box(1.1, 2.35, 0.12, x, 1.63, -1.5, casing, true);
        for (const dx of [-0.51, 0.51]) box(0.08, 2.35, 0.8, x + dx, 1.63, -1.16, casing);
        for (const y of [0.51, 2.75]) box(1.1, 0.12, 0.8, x, y, -1.16, casing);
        box(0.91, 1.92, 0.06, x, 1.58, -0.72, displayGlass);
        for (const dx of [-0.46, 0.46]) box(0.025, 1.88, 0.025, x + dx, 1.58, -0.68, light);
        box(0.08, 0.6, 0.08, x + 0.38, 1.63, -0.61, aluminum);
        for (const y of [0.78, 1.24, 1.7, 2.16]) {
          box(0.93, 0.035, 0.62, x, y, -1.1, aluminum);
          for (let j = 0; j < 6; j++) {
            const drink = [m.leaves[2], red, m.blue, m.white][j % 4];
            pole(0.045, 0.25, x - 0.36 + j * 0.145, y + 0.15, -0.92, drink);
            pole(0.02, 0.07, x - 0.36 + j * 0.145, y + 0.31, -0.92, drink);
          }
        }
      }
      // Estantería cálida con frascos, paquetes y vajilla sobre la mesada posterior.
      box(3.4, 0.9, 0.65, 2.15, 0.93, -1.15, aluminum, true);
      for (const x of [0.4, 3.9]) box(0.055, 2.45, 0.5, x, 2.08, -1.4, black);
      for (const y of [1.6, 2.2, 2.8]) {
        box(3.5, 0.055, 0.5, 2.15, y, -1.4, tableTop);
        box(3.4, 0.02, 0.025, 2.15, y - 0.04, -1.13, warm);
        for (let i = 0; i < 7; i++) {
          const x = 0.65 + i * 0.45;
          if (i % 2) pole(0.09, 0.24, x, y + 0.15, -1.35, terracotta);
          else box(0.22, 0.3, 0.17, x, y + 0.18, -1.35, i % 3 ? cream : m.leaves[1]);
        }
      }
      // Cafetera, molino, terminal de caja y pequeña pizarra sobre el mostrador.
      box(1.05, 0.63, 0.6, 2.5, 1.65, -1.02, black);
      box(0.95, 0.16, 0.07, 2.5, 1.7, -0.68, aluminum);
      for (const x of [2.22, 2.72]) { pole(0.025, 0.16, x, 1.48, -0.67, aluminum); pole(0.06, 0.1, x, 1.37, -0.57, m.white); }
      box(0.27, 0.32, 0.3, 3.4, 1.55, -1.03, aluminum);
      pole(0.1, 0.25, 3.4, 1.82, -1.03, displayGlass);
      box(0.5, 0.08, 0.4, -3.3, 1.31, 1.3, black);
      box(0.45, 0.35, 0.09, -3.3, 1.54, 1.1, black);
      box(0.37, 0.25, 0.012, -3.3, 1.55, 1.155, light);
      box(0.46, 0.54, 0.06, 2.6, 1.55, 1.4, tableTop);
      box(0.39, 0.46, 0.025, 2.6, 1.56, 1.44, black);
      // Pantalla suspendida a la izquierda y ventilador circular en la pared.
      box(1.7, 1.02, 0.08, -3.3, 3.02, 1.05, black);
      box(1.55, 0.88, 0.015, -3.3, 3.02, 1.1, new T.MeshStandardMaterial({ color: "#101414", roughness: 0.2 }));
      beam(v3(-3.3, 3.55, 1.02), v3(-3.3, 3.8, 1.02), 0.035, black);
      const fan = new T.Mesh(new T.TorusGeometry(0.28, 0.018, 8, 28), aluminum);
      fan.position.set(-3.9, 2.96, -1.59); visual.add(fan);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 8;
        beam(v3(-3.9 - Math.cos(a) * 0.27, 2.96 - Math.sin(a) * 0.27, -1.58),
          v3(-3.9 + Math.cos(a) * 0.27, 2.96 + Math.sin(a) * 0.27, -1.58), 0.006, aluminum);
      }
      // Rieles negros y focos dirigidos a la mesada; sin luces con sombras adicionales.
      for (const x of [-2, 1.4]) {
        box(2.65, 0.045, 0.055, x, 3.42, 0.15, black);
        for (const dx of [-1, 0, 1]) {
          pole(0.065, 0.23, x + dx, 3.28, 0.15, black);
          pole(0.055, 0.015, x + dx, 3.155, 0.15, warm);
        }
        const glow = new T.PointLight(0xffd6a0, 9, 5, 2); glow.position.set(x, 2.9, -0.1); visual.add(glow);
      }
    });
    function furnitureBody(w: number, h: number, d: number, x: number, y: number, z: number) {
      const body = new T.Mesh(unit); body.scale.set(w, h, d); body.position.set(x, y, z); solid.add(body);
    }
    // Dos modelos negros: respaldo perforado y silla metálica de arco abierto.
    const chairBack = new T.Shape();
    chairBack.moveTo(-0.23, 0); chairBack.lineTo(0.23, 0); chairBack.lineTo(0.21, 0.43); chairBack.quadraticCurveTo(0, 0.49, -0.21, 0.43); chairBack.closePath();
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const hole = new T.Path(); hole.absellipse(-0.165 + col * 0.082 + (row % 2) * 0.012, 0.045 + row * 0.078, 0.025, 0.029, 0, Math.PI * 2, true, row * 0.7);
      chairBack.holes.push(hole);
    }
    const perforatedBack = new T.ExtrudeGeometry(chairBack, { depth: 0.025, bevelEnabled: false, curveSegments: 5 });
    function chair(x: number, z: number, facing: number, perforated = false, raised = 0) {
      frame({ center: [x, z], size: [0.5, 0.5], angle: facing > 0 ? 0 : Math.PI }, () => {
        const seatY = 0.91 + raised;
        box(0.44, 0.045, 0.43, 0, seatY, 0, blackFurniture);
        for (const dx of [-0.17, 0.17]) for (const dz of [-0.16, 0.16])
          beam(v3(dx, seatY - 0.02, dz), v3(dx * 1.28, 0.48, dz * 1.35), 0.016, blackFurniture);
        if (perforated) {
          const back = new T.Mesh(perforatedBack, blackFurniture); back.position.set(0, seatY + 0.05, 0.2); back.castShadow = true; visual.add(back);
        } else {
          const curve = new T.CatmullRomCurve3([v3(-0.21, seatY, 0.19), v3(-0.22, seatY + 0.4, 0.2), v3(0, seatY + 0.5, 0.22), v3(0.22, seatY + 0.4, 0.2), v3(0.21, seatY, 0.19)]);
          visual.add(new T.Mesh(new T.TubeGeometry(curve, 16, 0.015, 6, false), blackFurniture));
          box(0.15, 0.23, 0.025, 0, seatY + 0.3, 0.22, blackFurniture);
        }
      });
      furnitureBody(0.46, 0.48 + raised, 0.46, x, 0.7 + raised / 2, z);
    }
    // Mesas cuadradas de madera, sin invadir el pasillo junto a la puerta.
    for (const [column, x] of [-2.4, 1.1, 4.5, 7.5].entries()) for (const z of [0, 3.6]) {
      box(1.1, 0.05, 1.05, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.68, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.1, 0.73, 1.05, x, 0.84, z);
      for (const side of [-1, 1]) chair(x, z + side * 0.88, side, column % 2 === 0);
      pole(0.045, 0.12, x, 1.28, z, m.white);
    }
    // Mesas altas oscuras y banquetas alineadas debajo de la ventana horizontal.
    for (const x of [-0.6, 2.8, 6.2]) {
      box(1.6, 0.045, 0.65, x, 1.55, -4.9, blackFurniture);
      for (const dx of [-0.65, 0.65]) for (const dz of [-0.23, 0.23]) pole(0.022, 1.05, x + dx, 1, -4.9 + dz, blackFurniture);
      furnitureBody(1.6, 1.1, 0.65, x, 1, -4.9);
      for (const dx of [-0.45, 0.45]) chair(x + dx, -3.95, 1, false, 0.3);
    }
    // Mobiliario de terraza; el paso de blindex queda despejado entre las mesas.
    for (const z of [-3.7, -0.3, 5.1]) {
      const x = w / 2 + 2.6;
      box(1.2, 0.055, 0.9, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.65, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.2, 0.73, 0.9, x, 0.84, z);
      for (const side of [-1, 1]) chair(x, z + side * 0.88, side, true);
    }
    // Jardinera de sansevierias junto al muro izquierdo y maceta alta de la explanada.
    box(3.8, 0.2, 0.7, -w / 2 + 2.2, 0.52, front + 0.45, m.brick, true);
    for (let i = 0; i < 22; i++) {
      const leaf = box(0.075, 0.4 + (i % 4) * 0.12, 0.04, -w / 2 + 0.6 + i * 0.15, 0.9, front + 0.45 + (i % 2) * 0.15, m.leaves[i % 4]);
      leaf.rotation.z = Math.sin(i * 2) * 0.3;
    }
    for (const x of [-5.8, 6.7]) {
      pole(0.3, 0.9, x, 0.9, front + 2.9, terracotta, true);
      for (let i = 0; i < 5; i++) beam(v3(x, 1.3, front + 2.9), v3(x + Math.sin(i * 2) * 0.3, 2.1, front + 2.9 + Math.cos(i * 2) * 0.3), 0.012, m.bark);
    }
    const treeGroup = new T.Group(), treeColliders = new T.Group();
    visual.add(treeGroup); solid.add(treeColliders);
    const apronVisual = visual, apronSolid = solid;
    visual = treeGroup; solid = treeColliders;
    // Referencia desde arriba: tronco esbelto, copa permeable y alcorque ovalado.
    // Se mantiene la posición que Horacio indicó en el antiguo círculo beige.
    const [treeX, treeZ] = cantinaForecourt.tree;
    const earth = new T.MeshStandardMaterial({ color: "#71664e", roughness: 1 });
    const bark = new T.MeshStandardMaterial({ color: "#827968", roughness: 1 });
    const bed = new T.Mesh(new T.CylinderGeometry(1, 1, 0.035, 40), earth);
    bed.scale.set(1.95, 1, 1.12); bed.position.set(treeX, 0.035, treeZ);
    bed.receiveShadow = true; visual.add(bed);
    const trunk = v3(treeX, 0, treeZ), fork = v3(treeX - 0.27, 4.3, treeZ - 0.12);
    beam(trunk, fork, 0.115, bark);
    const trunkCollider = new T.Mesh(unit);
    trunkCollider.position.set(treeX - 0.12, 2.1, treeZ); trunkCollider.scale.set(0.26, 4.2, 0.26);
    solid.add(trunkCollider);
    const noise = (n: number) => { const v = Math.sin(n * 127.1 + 71.3) * 43758.5453; return v - Math.floor(v); };
    const leafGeometry = new T.IcosahedronGeometry(1, 0);
    const leafMaterial = new T.MeshStandardMaterial({ color: "#d3d8ac", roughness: 1 });
    const leafCount = 5600;
    const leaves = new T.InstancedMesh(leafGeometry, leafMaterial, leafCount);
    // Conservar instancias al combinar la geometría estática por material.
    leaves.userData.keep = true; leaves.castShadow = true; leaves.receiveShadow = true;
    const transform = new T.Object3D(), tint = new T.Color();
    let leafIndex = 0;
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39996, spread = 1.8 + noise(i + 3) * 1.9;
      const base = fork.clone().add(v3(0, (i % 4) * 0.45, 0));
      const tip = v3(treeX + Math.cos(a) * spread, 6.3 + noise(i + 40) * 2.1, treeZ + Math.sin(a) * spread * 0.82);
      beam(base, tip, 0.035 + noise(i + 9) * 0.018, bark);
      for (let j = 0; j < 5; j++) {
        const t = 0.5 + j * 0.115;
        const twig = base.clone().lerp(tip, t);
        const tuft = twig.clone().add(v3(Math.cos(a + j * 1.8) * 0.65, 0.25 + noise(i * 5 + j) * 0.6, Math.sin(a + j * 1.8) * 0.65));
        beam(twig, tuft, 0.012, bark);
        for (let k = 0; k < 80; k++) {
          const n = leafIndex++, angle = noise(n + 17) * Math.PI * 2;
          const r = Math.sqrt(noise(n + 123)) * 0.85;
          transform.position.copy(tuft).add(v3(Math.cos(angle) * r, (noise(n + 500) - 0.5) * 1.05, Math.sin(angle) * r));
          transform.rotation.set(noise(n) * 3, noise(n + 7) * 6, noise(n + 11) * 3);
          transform.scale.set(0.075 + noise(n + 83) * 0.055, 0.025, 0.035 + noise(n + 31) * 0.04);
          transform.updateMatrix(); leaves.setMatrixAt(n, transform.matrix);
          tint.setHSL(0.22 + noise(n + 8) * 0.035, 0.27 + noise(n + 21) * 0.2, 0.29 + noise(n + 92) * 0.2);
          leaves.setColorAt(n, tint);
        }
      }
    }
    leaves.computeBoundingSphere(); visual.add(leaves);
    // Arbustos recortados a ambos lados, bajos como en la nueva referencia.
    const shrubs = new T.InstancedMesh(leafGeometry, m.leaves[1], 720);
    shrubs.userData.keep = true; shrubs.castShadow = true; shrubs.receiveShadow = true;
    for (let i = 0; i < 720; i++) {
      const side = i < 360 ? -1 : 1, a = noise(i + 50) * Math.PI * 2;
      const r = Math.sqrt(noise(i + 70));
      transform.position.set(treeX + side * 1.35 + Math.cos(a) * r * 0.47, 0.18 + noise(i + 90) * 0.5, treeZ + Math.sin(a) * r * 0.43);
      transform.rotation.set(i, i * 0.7, 0);
      transform.scale.set(0.12, 0.08, 0.1); transform.updateMatrix(); shrubs.setMatrixAt(i, transform.matrix);
    }
    shrubs.computeBoundingSphere(); visual.add(shrubs);
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11;
      const stone = new T.Mesh(new T.IcosahedronGeometry(0.075, 0), m.stone);
      stone.position.set(treeX + Math.cos(a) * 1.88, 0.055, treeZ + Math.sin(a) * 1.06); visual.add(stone);
    }
    treeGroup.position.y = treeColliders.position.y = 0.45;
    visual = apronVisual; solid = apronSolid;
  }, PLAZA_LEVEL - 0.45);
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
    const dx = x - plan.cantina.center[0], dz = z - plan.cantina.center[1], a = plan.cantina.angle;
    const lx = dx * Math.cos(a) + dz * Math.sin(a), lz = -dx * Math.sin(a) + dz * Math.cos(a);
    const y = lx >= gardenBounds.minX && lx <= gardenBounds.maxX && lz >= gardenBounds.minZ && lz <= gardenBounds.maxZ
      ? gardenHeight(lx, lz) : 0;
    box(2.5, 0.06, 1, x, y + 0.77, z, m.metal);
    for (const dz of [-0.85, 0.85]) {
      box(2.7, 0.08, 0.42, x, y + 0.43, z + dz, m.blue);
      for (const dx of [-0.9, 0.9]) pole(0.035, 0.75, x + dx, y + 0.38, z + dz * 0.5);
    }
  }
  // Árbol 1: mango frondoso del patio este (foto árbol_1.HEIC, posición 1 en cómo_debe_ser.png).
  {
    const [x, z] = plan.tree1;
    // Raíces tablares superficiales visibles en el suelo.
    for (const [dx, dz] of [[0.9, 0.4], [-0.8, 0.6], [0.5, -0.8], [-0.7, -0.6]]) {
      beam(new T.Vector3(x, 0.18, z), new T.Vector3(x + dx, 0.08, z + dz), 0.2, m.bark);
    }
    // Tronco grueso y robusto con colisión.
    pole(0.55, 2.7, x, 1.35, z, m.bark, true);
    // Ramas principales que se abren a baja altura (~2.4-2.8 m).
    const branches = [
      new T.Vector3(x + 1.2, 3.8, z + 0.8),
      new T.Vector3(x - 1.3, 3.7, z + 0.9),
      new T.Vector3(x + 1.0, 4.0, z - 1.1),
      new T.Vector3(x - 1.1, 3.8, z - 1.0),
    ];
    for (const b of branches) beam(new T.Vector3(x, 2.4, z), b, 0.25, m.bark);
    // Copa en cúpula densa y ancha, follaje verde oscuro de mango, altura total ~9 m.
    const crownTop = new T.Mesh(new T.IcosahedronGeometry(1, 2), m.leaves[3]);
    crownTop.scale.set(4.6, 2.8, 4.4); crownTop.position.set(x, 6.6, z); crownTop.castShadow = true; visual.add(crownTop);
    const mangoLobes: [number, number, number, number, number, number][] = [
      [2.2, 4.9, 1.2, 3.2, 2.2, 3.0],
      [-2.3, 4.7, 1.4, 3.1, 2.1, 3.1],
      [1.6, 5.0, -2.1, 3.0, 2.2, 2.8],
      [-1.9, 4.8, -1.8, 2.9, 2.1, 2.9],
      [0.0, 5.0, 2.4, 3.2, 2.0, 3.0],
      [0.0, 5.1, -2.2, 3.1, 2.0, 3.0],
    ];
    for (const [ox, oy, oz, sx, sy, sz] of mangoLobes) {
      const lobe = new T.Mesh(new T.IcosahedronGeometry(1, 2), m.leaves[3]);
      lobe.scale.set(sx, sy, sz); lobe.position.set(x + ox, oy, z + oz); lobe.castShadow = true; visual.add(lobe);
    }
  }

  // Árbol 2: árbol autóctono alto y esbelto del patio oeste (foto árbol_2.HEIC, posición 2 en cómo_debe_ser.png).
  {
    const [x, z] = plan.tree2;
    // Tronco alto y despejado hasta ~5.2 m de altura con colisión.
    pole(0.42, 5.4, x, 2.7, z, m.bark, true);
    // Grandes ramas maestras que ascienden hacia la parte alta.
    const boughs: [T.Vector3, T.Vector3, number][] = [
      [new T.Vector3(x, 5.2, z), new T.Vector3(x - 2.5, 9.2, z + 1.8), 0.22],
      [new T.Vector3(x, 5.2, z), new T.Vector3(x + 2.4, 9.8, z + 2.0), 0.22],
      [new T.Vector3(x, 5.2, z), new T.Vector3(x - 1.8, 9.5, z - 2.4), 0.22],
      [new T.Vector3(x, 5.2, z), new T.Vector3(x + 2.0, 10.2, z - 1.8), 0.22],
      [new T.Vector3(x - 2.5, 9.2, z + 1.8), new T.Vector3(x - 3.8, 12.2, z + 2.4), 0.14],
      [new T.Vector3(x + 2.4, 9.8, z + 2.0), new T.Vector3(x + 3.6, 12.6, z + 2.6), 0.14],
      [new T.Vector3(x - 1.8, 9.5, z - 2.4), new T.Vector3(x - 2.6, 12.5, z - 3.2), 0.14],
      [new T.Vector3(x + 2.0, 10.2, z - 1.8), new T.Vector3(x + 3.0, 13.0, z - 2.4), 0.14],
    ];
    for (const [from, to, r] of boughs) beam(from, to, r, m.bark);
    // Copa majestuosa estratificada que supera los 15 m de altura (sobre el techo del Bloque 1).
    const tallCrown: [number, number, number, number, number, number, T.Material][] = [
      [0.0, 14.4, 0.0, 4.4, 2.3, 4.4, m.leaves[1]],
      [0.0, 15.5, 0.0, 3.2, 1.8, 3.2, m.leaves[0]],
      [-3.8, 12.6, 2.5, 3.8, 2.0, 3.6, m.leaves[1]],
      [3.6, 13.0, 2.7, 3.7, 2.1, 3.6, m.leaves[0]],
      [-2.8, 12.8, -3.2, 3.6, 2.0, 3.5, m.leaves[1]],
      [3.2, 13.3, -2.5, 3.8, 2.1, 3.7, m.leaves[0]],
      [-2.2, 9.6, 1.5, 3.4, 1.8, 3.2, m.leaves[0]],
      [2.1, 10.0, 1.6, 3.3, 1.8, 3.2, m.leaves[1]],
      [-1.5, 9.8, -2.0, 3.2, 1.7, 3.1, m.leaves[0]],
      [1.7, 10.3, -1.5, 3.4, 1.8, 3.3, m.leaves[1]],
    ];
    for (const [ox, oy, oz, sx, sy, sz, mat] of tallCrown) {
      const crownMesh = new T.Mesh(new T.IcosahedronGeometry(1, 2), mat);
      crownMesh.scale.set(sx, sy, sz); crownMesh.position.set(x + ox, oy, z + oz); crownMesh.castShadow = true; visual.add(crownMesh);
    }
    // Muretes / canteros de ladrillo visto en el patio junto al árbol (foto árbol_2.HEIC).
    box(2.8, 0.45, 0.6, x + 3.0, 0.225, z - 2.5, m.brick, true);
    box(2.4, 0.45, 0.6, x + 3.0, 0.225, z - 5.0, m.brick, true);
  }

  // Árboles de referencia adicionales; los de la plataforma nacen en su piso.
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
    if (place.position[1] > PLAZA_LEVEL + 0.5 || place.id === "cantina-cyt") continue;
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