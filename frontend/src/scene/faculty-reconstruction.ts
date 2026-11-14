import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { brushedSteel, elevatorLabel, type ElevatorModel } from "./elevator";
import { makeGrassMaterial, makeMaterials } from "./materials";
import { addCourtyardVegetation } from "./courtyard-vegetation";
import { addCantinaTree } from "./cantina-tree";
import {
  facultyBlueprint as plan, block1, blockG, gridAngle, FLOOR_HEIGHT as H, PLAZA_LEVEL, ELEVATOR_LANDING_LEVEL, STEPS_RUN, rectCorners,
  elevatorStairEdge, bulgedOutline, cantinaForecourt, classroomDoor, structureLines, pilasters, ROOMS_PER_FLOOR, fromRect,
  type Rect, type Rooms, type Vec2,
} from "../data/faculty-blueprint";
import { facultyToWorld, insidePolygon } from "../data/campus-geometry";
import { gardenHeight, gardenBounds, inCantina, coveredWalkSurface } from "../data/cantina-terrain";
import { facultyAnnexes, annexPaths, annexCoveredPaths, annexEnclosedLink, annexWalkEnd, diciaWalkExtension } from "../data/faculty-annexes";
import { facultyPlaces } from "../data/places";

type BoxOptions = { tile?: readonly number[]; offset?: readonly number[]; rotation?: number; pitch?: number };
type Range = readonly [number, number];
type BlockSpec = {
  length: number; depth: number; levels: number; bay: number; margin: number; gallery: number;
  /** +1: galería hacia +z del marco local; -1: hacia -z. */
  front: 1 | -1;
  topWall: number; roof: T.Material; louvers: boolean;
  rearScreens?: boolean;
  /** Cartel de la galería en cada nivel (vacío: sin cartel). */
  label: (level: number) => string;
  /** Aulas de cada nivel; donde terminan antes del extremo del bloque solo sigue la galería. */
  rooms: (level: number) => Rooms;
  /** Puerta de cada aula: doble (Bloque 1, `classroomDoor`) o de una hoja de 1 m. */
  door: "double" | "single";
  /** Ventana en el muro de cabecera del último recinto, con hueco real en el ladrillo. */
  endWindow?: { level: number; z: number; width: number; sill: number; height: number };
  /** Número del prisma sobre cada puerta (`index` desde el extremo -x); null: sin prisma. */
  roomSign?: (level: number, index: number) => string | null;
  /** Tramos (x) de la galería sin baranda ni lamas: descansos, ascensor, accesos. */
  openings: (level: number) => Range[];
  /** Tramos (x) sin baranda en el borde interior de la galería, más allá de las aulas (llegada de una escalera). */
  innerOpenings?: (level: number) => Range[];
  /** Columnas del borde de la galería, enteras desde la planta baja hasta la cubierta, en las líneas de la estructura. */
  columns: { radius: number };
  /** Tramos (x) del borde de la galería sin columna (los apoya otro elemento, como la torre). */
  noColumns?: Range[];
  /** Niveles con banda de hormigón alrededor del bloque, en el canto de su losa (`levels`: bajo la cubierta). */
  bands?: number[];
};

/** CyT en metros sobre el plano del equipo (faculty-blueprint.ts), con texturas del escaneo. */
export function createFaculty(grass = makeGrassMaterial()) {
  const group = new T.Group(), colliders = new T.Group(), markers: T.Mesh[] = [];
  const m = makeMaterials(grass);
  const elevatorLevels = ["PB", "1", "2", "3"];
  const displayLabel = (text: string) => elevatorLabel(text, "#ff5945", "#242522");
  const elevator: ElevatorModel = {
    stops: [], car: new T.Group(), carDoors: [], carButtons: [],
    directionLabels: { idle: displayLabel(""), up: displayLabel("▲"), down: displayLabel("▼") },
    floorLabels: elevatorLevels.map(displayLabel),
  };
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
    if (options.pitch) mesh.rotation.x = options.pitch;
    mesh.castShadow = !mat.transparent && mat !== grass; mesh.receiveShadow = true; visual.add(mesh);
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
  /** Lona azul continua con caída leve entre apoyos y faldón festoneado. */
  function fabricCover(curve: T.Curve<T.Vector3>, width: number, supports: number[], ridge = 0, ridgeAtStart = ridge) {
    const length = curve.getLength(), segments = Math.ceil(length / 0.12), across = 8;
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    const at = (t: number, u: number) => {
      const p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      const side = v3(-tangent.z, 0, tangent.x).normalize();
      const rise = ridge > 0 ? T.MathUtils.lerp(ridgeAtStart, ridge, t) * (1 - Math.abs(u))
        : u * 0.08 - 0.06 * (1 - u * u);
      p.y += rise;
      return p.addScaledVector(side, u * width / 2);
    };
    for (let i = 0; i <= segments; i++) for (let j = 0; j <= across; j++) {
      const t = i / segments, u = j / across * 2 - 1, p = at(t, u);
      positions.push(p.x, p.y, p.z); uv.push(j / across * width, t * length);
      if (i < segments && j < across) {
        const a = i * (across + 1) + j, b = a + across + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const cover = new T.Mesh(geometry, m.awning); cover.castShadow = cover.receiveShadow = true; visual.add(cover);
    for (const side of [-1, 1]) {
      const vertices: number[] = [], coords: number[] = [], faces: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments, p = at(t, side);
        const drop = 0.13 + 0.035 * Math.sin(Math.PI * ((t * length / 0.45) % 1));
        vertices.push(p.x, p.y, p.z, p.x, p.y - drop, p.z);
        coords.push(t * length, 0, t * length, drop);
        if (i < segments) { const a = i * 2; faces.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const edge = new T.BufferGeometry(); edge.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
      edge.setAttribute("uv", new T.Float32BufferAttribute(coords, 2)); edge.setIndex(faces); edge.computeVertexNormals();
      const valance = new T.Mesh(edge, m.awning); valance.castShadow = true; visual.add(valance);
    }
    for (const t of supports) {
      const a = at(t, -0.95), b = at(t, 0.95);
      if (ridge > 0) {
        const peak = at(t, 0);
        beam(a, peak, 0.025, m.metal); beam(peak, b, 0.025, m.metal);
      } else beam(a, b, 0.025, m.metal);
      for (const p of [a, b]) pole(0.035, p.y, p.x, p.y / 2, p.z, m.metal, true);
    }
  }
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
  function pave(points: readonly Vec2[], mat: T.Material, y: number, castShadow = false) {
    const geo = new T.ShapeGeometry(new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z))));
    geo.rotateX(-Math.PI / 2);
    const tile = mat.userData.tile as number[] | undefined;
    if (tile) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) geo.attributes.uv.setXY(i, p.getX(i) / tile[0], p.getZ(i) / tile[1]);
    }
    const mesh = new T.Mesh(geo, mat); mesh.position.y = y;
    mesh.castShadow = castShadow; mesh.receiveShadow = true; visual.add(mesh);
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
  function flight(xs: number, ys: number, xe: number, ye: number, zc: number, width: number, continuous = false) {
    const run = Math.abs(xe - xs), rise = ye - ys, n = Math.round(rise / 0.175), dir = Math.sign(xe - xs);
    if (continuous) {
      const profile = [new T.Vector2(xs, ys - 0.26)];
      for (let i = 0; i < n; i++) {
        const top = ys + ((i + 0.5) * rise) / n;
        profile.push(new T.Vector2(xs + dir * i * run / n, top),
          new T.Vector2(xs + dir * (i + 1) * run / n, top));
      }
      profile.push(new T.Vector2(xe, ye - 0.26));
      const geometry = new T.ExtrudeGeometry(new T.Shape(profile), { depth: width, bevelEnabled: false });
      geometry.translate(0, 0, zc - width / 2);
      const mesh = new T.Mesh(geometry, m.stone);
      mesh.castShadow = mesh.receiveShadow = true;
      visual.add(mesh);
    } else {
    for (let i = 0; i < n; i++) {
      const xa = xs + dir * (i * run) / n, xb = xs + dir * ((i + 1) * run) / n, top = ys + ((i + 0.5) * rise) / n;
      box(Math.abs(xb - xa) + 0.02, 0.2, width, (xa + xb) / 2, top - 0.1, zc, m.stone);
    }
    const slope = Math.atan2(rise, run), length = Math.hypot(run, rise);
    const under = new T.Mesh(unit, m.concrete);
    under.scale.set(length, 0.16, width); under.position.set((xs + xe) / 2, (ys + ye) / 2 - 0.26, zc);
    under.rotation.z = dir * slope; under.castShadow = true; visual.add(under);
    }
    ramp(v3(xs, ys, zc), v3(xe, ye, zc), width);
    for (const side of [-1, 1]) {
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
  function glazing(w: number, z: number, door: number, bays = Math.ceil(w / 1.2), privacy?: T.Material) {
    const bay = w / bays;
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + bay * (i + 0.5), entrance = i === door;
      if (entrance) {
        box(bay - 0.06, 2.12, 0.055, x + bay * 0.32, 1.16, z - bay * 0.35, privacy ?? m.glass, false, { rotation: Math.PI / 2.5 });
        box(bay - 0.06, privacy ? 0.75 : 0.5, 0.055, x, privacy ? 2.6 : 2.72, z, m.glass);
      } else if (privacy) {
        box(bay - 0.06, 2.04, 0.055, x, 1.12, z, privacy, true);
        box(bay - 0.06, 0.83, 0.055, x, 2.565, z, m.glass, true);
      } else box(bay - 0.06, 2.75, 0.055, x, 1.47, z, m.glass, true);
      box(0.055, 3, 0.08, x - bay / 2, 1.55, z, m.blue);
      for (const y of entrance ? [2.3, 3.0] : [0.15, 1.05, 2.15, 3.0]) box(bay, 0.055, 0.08, x, y, z, m.blue);
    }
  }

  /** Muro de ladrillo de 0,2 m a lo largo de z, de z0 a z1, cuyo borde de arriba sube de h0 a h1 (el
   * lateral de la bodega bajo la escalera). */
  function slopedWall(x: number, z0: number, z1: number, h0: number, h1: number, bottom = 0, material = m.brick) {
    const shape = new T.Shape([new T.Vector2(z0, bottom), new T.Vector2(z1, bottom), new T.Vector2(z1, h1), new T.Vector2(z0, h0)]);
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2); geo.translate(x + 0.1, 0, 0);
    const tile = material.userData.tile as number[], p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / tile[0], p.getY(i) / tile[1]);
    const mesh = new T.Mesh(geo, material); mesh.castShadow = mesh.receiveShadow = true; visual.add(mesh);
    solid.add(new T.Mesh(geo));
  }

  /** Puerta doble de aula (IMG_5639) centrada en x = d, en la pared z cuya galería queda hacia `front`.
   * Vista desde la galería: hoja izquierda fija, con la ventana cuadrada; la derecha, abierta hacia el
   * aula, deja el paso. Marco con montante de dos paños. Devuelve la altura del marco. */
  function doubleDoor(d: number, y: number, z: number, front: number) {
    const { width: w, height: h, frame: f, window: win, windowSill: sill, transom: t } = classroomDoor;
    const leaf = w / 2, top = h + t + 2 * f, left = -front, mat = m.door;
    for (const side of [-1, 1]) box(f, top, 0.12, d + side * (w + f) / 2, y + top / 2, z, mat, true);
    box(w, f, 0.12, d, y + top - f / 2, z, mat);
    box(w, f, 0.1, d, y + h + f / 2, z, mat);
    box(f, t, 0.1, d, y + h + f + t / 2, z, mat);
    for (const side of [-1, 1]) box((w - f) / 2, t, 0.02, d + side * (w + f) / 4, y + h + f + t / 2, z, m.glass, true);
    // Hoja fija, cerrada, con la ventana de 45 cm desde 1,30 m.
    const xl = d + (left * leaf) / 2, lw = leaf - 0.01, jamb = (lw - win) / 2;
    box(lw, sill, 0.05, xl, y + sill / 2, z, mat, true);
    box(lw, h - sill - win, 0.05, xl, y + (h + sill + win) / 2, z, mat, true);
    for (const side of [-1, 1]) box(jamb, win, 0.05, xl + side * (win + jamb) / 2, y + sill + win / 2, z, mat, true);
    box(win, win, 0.02, xl, y + sill + win / 2, z, m.glass, true);
    // Hoja de abrir, girada sobre su bisagra (en el marco derecho) hacia el aula.
    const hinge = d - left * leaf, swing = 1.45;
    box(lw, h, 0.05, hinge + left * Math.cos(swing) * leaf / 2, y + h / 2, z - front * Math.sin(swing) * leaf / 2, mat, false,
      { rotation: -swing });
    return top;
  }
  /** Cartel con el número del aula sobre la puerta (IMG_5639): dos placas verticales unidas en una
   * arista que sale de la pared, una mirando hacia cada lado de la galería; la base, contra el muro,
   * no lleva texto. */
  function roomSign(text: string, x: number, y: number, z: number, front: number) {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 124;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1f4c7c"; ctx.fillRect(0, 0, 256, 124);
    ctx.fillStyle = "#f4f1e8"; ctx.font = "600 50px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 64, 236);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    // Planta con la galería hacia +z: base de 0,5 m sobre la pared y arista a 0,22 m. Cada placa va de
    // la izquierda a la derecha de quien la mira de frente, para que el texto se lea derecho.
    const half = 0.25, out = 0.22, h = 0.08, position: number[] = [], uv: number[] = [];
    for (const [[ax, az], [bx, bz]] of [[[-half, 0], [0, out]], [[0, out], [half, 0]]]) {
      for (const [px, py, pz, u, v] of [[ax, h, az, 0, 1], [bx, h, bz, 1, 1], [bx, -h, bz, 1, 0],
        [ax, h, az, 0, 1], [bx, -h, bz, 1, 0], [ax, -h, az, 0, 0]]) { position.push(px, py, pz); uv.push(u, v); }
    }
    // Tapas de arriba y de abajo, del color del fondo.
    for (const py of [h, -h]) for (const [px, pz] of [[-half, 0], [0, out], [half, 0]]) { position.push(px, py, pz); uv.push(0.01, 0.02); }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(position, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map, side: T.DoubleSide }));
    // Galería hacia -z: se gira en vez de reflejarse, para no invertir el texto.
    mesh.position.set(x, y, z); mesh.rotation.y = front > 0 ? 0 : Math.PI; visual.add(mesh);
  }
  /** Letras corpóreas claras sobre ladrillo, en un plano vertical que mira hacia +x (cara este). Cada
   * renglón: texto, alto de letra y altura de su eje desde el borde superior, en metros. */
  function lettering(lines: { text: string; size: number; at: number; weight?: string }[], width: number, height: number,
    x: number, y: number, z: number) {
    const px = 2048 / width, canvas = document.createElement("canvas");
    canvas.width = 2048; canvas.height = Math.round(height * px);
    const ctx = canvas.getContext("2d")!;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#f1ece0";
    // Sombra corta: las letras están separadas del muro.
    ctx.shadowColor = "rgba(40, 20, 10, 0.55)"; ctx.shadowOffsetX = -4; ctx.shadowOffsetY = 7; ctx.shadowBlur = 5;
    for (const { text, size, at, weight = "600" } of lines) {
      ctx.font = `${weight} ${Math.round(size * px)}px Georgia, "Times New Roman", serif`;
      ctx.fillText(text, canvas.width / 2, at * px, canvas.width * 0.96);
    }
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const mat = new T.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.55, metalness: 0.15 });
    const mesh = new T.Mesh(new T.PlaneGeometry(width, height), mat);
    mesh.position.set(x, y, z); mesh.rotation.y = Math.PI / 2; visual.add(mesh);
  }

  const rearSlat = new T.MeshStandardMaterial({ color: "#59778d", roughness: 0.71, metalness: 0.25 });
  const rearPost = new T.MeshStandardMaterial({ color: "#46657c", roughness: 0.69, metalness: 0.28 });
  const condenserCase = new T.MeshStandardMaterial({ color: "#c9c5b8", roughness: 0.83 });
  const fanShade = new T.MeshStandardMaterial({ color: "#30383b", roughness: 0.94 });
  const fanGrille = new T.MeshStandardMaterial({ color: "#999f9e", roughness: 0.75 });
  const fanRing = new T.TorusGeometry(0.155, 0.008, 5, 20);
  const fanDisk = new T.CircleGeometry(0.164, 20);
  fanDisk.rotateY(Math.PI);

  function rearCondenser(x: number, y: number, z: number, grounded: boolean) {
    box(0.86, 0.56, 0.33, x, y, z, condenserCase, grounded);
    const fanX = x - 0.13, faceZ = z - 0.167;
    const disk = new T.Mesh(fanDisk, fanShade);
    disk.position.set(fanX, y, faceZ);
    visual.add(disk);
    const grille = new T.Mesh(fanRing, fanGrille);
    grille.position.set(fanX, y, faceZ - 0.009);
    visual.add(grille);
    for (let i = -3; i <= 3; i++) {
      const offset = i * 0.038;
      const span = 2 * Math.sqrt(0.148 ** 2 - offset ** 2);
      box(span, 0.008, 0.008, fanX, y + offset, faceZ - 0.01, fanGrille);
    }
    for (let i = 0; i < 4; i++) box(0.14, 0.012, 0.009, x + 0.22, y + i * 0.035 - 0.05, faceZ - 0.007, fanShade);
    if (grounded) {
      box(0.95, 0.09, 0.41, x, y - 0.325, z, m.concrete);
    } else {
      for (const dx of [-0.29, 0.29]) {
        box(0.045, 0.045, 0.45, x + dx, y - 0.302, z + 0.035, rearPost);
        beam(v3(x + dx, y - 0.50, z + 0.24), v3(x + dx, y - 0.30, z - 0.10), 0.016, rearPost);
      }
      beam(v3(x + 0.37, y - 0.12, z + 0.14), v3(x + 0.48, y - 0.31, z + 0.23), 0.013, condenserCase);
    }
  }

  /** Bloque de aulas con galería abierta (Bloque 1 y Bloque G). */
  function academicBlock(s: BlockSpec) {
    const { length: L, depth: D, levels, bay, gallery: G, front } = s;
    const zWall = front * (D / 2 - G), zEdge = front * D / 2, zBack = -front * D / 2;
    const zGallery = front * (D / 2 - G / 2), zRooms = -front * G / 2;
    const roofY = (levels - 1) * H + s.topWall;
    // Líneas de la estructura: pilastras de la pared de las aulas (`modules`) y columnas del borde de la
    // galería, que suben enteras hasta la cubierta. `stops` corta la fachada en tramos de punta a punta.
    const modules = pilasters(s), stops = [-L / 2, ...modules, L / 2];
    const { radius: r } = s.columns, end = Math.max(0.2, r);
    const columns = structureLines(s).map((x) => Math.max(-L / 2 + end, Math.min(L / 2 - end, x)))
      .filter((x) => !s.noColumns?.some(([a, b]) => x > a && x < b));
    const edge = [-L / 2, ...columns, L / 2];
    for (const x of columns) pole(r, roofY, x, roofY / 2, zEdge - front * (r + 0.03), m.concrete, true);
    // Bandas de hormigón que rodean el bloque en el canto de las losas (fotos de la cabecera este).
    for (const level of s.bands ?? []) {
      const yb = (level === levels ? roofY : level * H) - 0.25, hb = 0.5, t = 0.24;
      for (const z of [D / 2 + t / 2, -D / 2 - t / 2]) box(L + 2 * t, hb, t, 0, yb, z, m.concrete);
      for (const x of [L / 2 + t / 2, -L / 2 - t / 2]) box(t, hb, D, x, yb, 0, m.concrete);
    }
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
      if (level && !s.bands?.includes(level)) {
        box(L + 0.1, 0.32, 0.08, 0, y - 0.1, zEdge + front * 0.04, m.white);
        box(b - a + 0.1, 0.32, 0.08, (a + b) / 2, y - 0.1, zBack - front * 0.04, m.white);
      }
      if (level) {
        for (const [p, q] of beyond) {
          box(q - p, 0.32, 0.08, (p + q) / 2, y - 0.1, zWall - front * 0.04, m.white);
          for (const [c, d] of spans(p, q, s.innerOpenings?.(level) ?? [])) rail(c, d, y, zWall + front * 0.08);
        }
      }
      // Pared de la galería: pilastras de hormigón en las líneas de módulo, ladrillo hasta 2,85 m con la
      // puerta de cada aula y dintel de hormigón.
      const posts = [a, ...modules.filter((x) => x > a + 0.5 && x < b - 0.5), b];
      const opening = s.door === "double" ? classroomDoor.width / 2 + classroomDoor.frame : 0.5;
      for (let i = 0; i + 1 < posts.length; i++) {
        const left = posts[i] + (i ? 0.225 : 0.12), right = posts[i + 1] - (i + 2 < posts.length ? 0.225 : 0.12);
        if (i) box(0.45, hw, 0.32, posts[i], y + hw / 2, zWall + front * 0.06, m.concrete, true);
        const edges = [left, ...doors.filter((d) => d > left && d < right).flatMap((d) => [d - opening, d + opening]), right];
        for (let k = 0; k < edges.length; k += 2) if (edges[k + 1] - edges[k] > 0.05)
          box(edges[k + 1] - edges[k], 2.85, 0.2, (edges[k] + edges[k + 1]) / 2, y + 1.425, zWall, m.brick, true);
        box(right - left, hw - 2.85, 0.2, (left + right) / 2, y + 2.85 + (hw - 2.85) / 2, zWall, m.concrete, true);
      }
      doors.forEach((d, i) => {
        if (s.door === "single") {
          box(1, 0.6, 0.05, d, y + 2.45, zWall, m.glass);
          box(1.04, 0.08, 0.22, d, y + 2.15, zWall, m.metal);
          const hinge = d - 0.48, swing = 1.2;
          box(0.95, 2.1, 0.05, hinge + Math.cos(swing) * 0.475, y + 1.05, zWall - front * Math.sin(swing) * 0.475, m.metal, false,
            { rotation: front * swing });
          return;
        }
        // Puerta doble con montante; encima, ladrillo hasta el dintel y el prisma con el número del aula.
        const frameTop = doubleDoor(d, y, zWall, front);
        box(2 * opening, 2.85 - frameTop, 0.2, d, y + (2.85 + frameTop) / 2, zWall, m.brick, true);
        const label = s.roomSign?.(level, i);
        if (label) roomSign(label, d, y + frameTop + 0.14, zWall + front * 0.1, front);
      });
      // Tabiques entre aulas y fachada posterior con ventanales por módulo, recortada donde terminan las aulas.
      for (const x of walls) box(0.12, hw, D - G - 0.2, x, y + hw / 2, zRooms - front * 0.1, m.plaster, true);
      for (let i = 0; i + 1 < stops.length; i++) {
        const x0 = Math.max(a, stops[i]), x1 = Math.min(b, stops[i + 1]), w = x1 - x0, xc = (x0 + x1) / 2;
        if (w < 0.05) continue;
        if (w < 1.6) { box(w, hw, 0.2, xc, y + hw / 2, zBack, m.brick, true); continue; }
        box(w, 1, 0.2, xc, y + 0.5, zBack, m.brick, true);
        box(w, hw - 2.7, 0.2, xc, y + 2.7 + (hw - 2.7) / 2, zBack, m.brick, true);
        for (const px of [x0 + 0.3, x1 - 0.3]) box(0.6, 1.7, 0.2, px, y + 1.85, zBack, m.brick, true);
        box(w - 1.2, 1.7, 0.05, xc, y + 1.85, zBack, m.glass, true);
        for (let k = 1; k < 4; k++) box(0.05, 1.7, 0.09, x0 + 0.6 + (k * (w - 1.2)) / 4, y + 1.85, zBack, m.metal);
        box(w - 1.2, 0.05, 0.09, xc, y + 2.1, zBack, m.metal);
        if (s.rearScreens) {
          // Lamas exteriores, con una franja alta libre para ventilación y equipos.
          const screenZ = zBack - 0.26;
          for (let row = 0; row < 10; row++) {
            const slat = box(w - 0.14, 0.083, 0.20, xc, y + 0.48 + row * 0.167, screenZ, rearSlat);
            slat.rotation.x = -0.24;
          }
          for (const px of [x0 + 0.055, x1 - 0.055]) {
            box(0.06, hw, 0.075, px, y + hw / 2, screenZ - 0.03, rearPost);
          }
          if (w > 2.2 && (level ? (i + level) % 4 !== 0 : i % 3 === 1)) {
            rearCondenser(x0 + w * 0.71, y + (level ? 2.36 : 0.37), zBack - (level ? 0.37 : 0.52), level === 0);
          }
        }
      }
      // Borde de la galería: viga transversal en cada línea de módulo con columna; baranda entre
      // columnas (y en los voladizos de los extremos) y, encima, dos paños de lamas por módulo.
      if (!top) for (const x of modules) if (columns.some((c) => Math.abs(c - x) < 0.01))
        box(0.28, 0.42, G, x, y + H - 0.45, zGallery, m.concrete);
      if (level) for (let i = 0; i + 1 < edge.length; i++) {
        const p0 = edge[i] + (i ? r : 0.1), q0 = edge[i + 1] - (i + 2 < edge.length ? r : 0.1), mid = (p0 + q0) / 2;
        for (const [p, q] of spans(p0, q0, open)) rail(p, q, y, zEdge - front * 0.08);
        if (!s.louvers) continue;
        const panels: Range[] = q0 - p0 > 2.5 ? [[p0, mid - 0.03], [mid + 0.03, q0]] : [[p0, q0]];
        for (const panel of panels) for (const [p, q] of spans(panel[0], panel[1], open)) {
          if (q - p < 0.2) continue;
          box(q - p, 0.96, 0.04, (p + q) / 2, y + 2.6, zEdge - front * 0.03, m.louver);
          for (const x of [p + 0.025, q - 0.025]) box(0.05, 1, 0.06, x, y + 2.6, zEdge - front * 0.03, m.steel);
        }
      }
      for (let i = 1; i + 1 < stops.length; i += 3) {
        const x = (stops[i] + stops[i + 1]) / 2 + 0.6;
        if (x > a + 1 && x < b - 1 && doors.every((d) => Math.abs(d - x) > opening + 1)) bench(x, zWall + front * 0.42, y, front);
      }
      for (const x of [a, b]) {
        const window = x === b && s.endWindow?.level === level ? s.endWindow : null;
        if (!window) { box(0.24, hw, D - G, x, y + hw / 2, zRooms, m.brick, true); continue; }
        const lo = zRooms - (D - G) / 2, hi = zRooms + (D - G) / 2;
        const left = window.z - window.width / 2, right = window.z + window.width / 2;
        box(0.24, window.sill, D - G, x, y + window.sill / 2, zRooms, m.brick, true);
        box(0.24, hw - window.sill - window.height, D - G, x,
          y + (hw + window.sill + window.height) / 2, zRooms, m.brick, true);
        for (const [p, q] of [[lo, left], [right, hi]])
          box(0.24, window.height, q - p, x, y + window.sill + window.height / 2, (p + q) / 2, m.brick, true);
        box(0.035, window.height, window.width, x, y + window.sill + window.height / 2, window.z, m.glass, true);
        for (const z of [left, window.z, right]) box(0.27, window.height + 0.08, 0.055, x,
          y + window.sill + window.height / 2, z, m.white);
        for (const h of [window.sill, window.sill + window.height])
          box(0.27, 0.065, window.width + 0.1, x, y + h, window.z, m.white);
        box(0.42, 0.07, window.width + 0.16, x + 0.06, y + window.sill - 0.05, window.z, m.concrete);
      }
      for (const x of [-L / 2, L / 2]) {
        if (!level || open.some(([p, q]) => p <= x + 0.5 && q >= x - 0.5)) continue;
        const xr = x - Math.sign(x) * 0.08, z0 = Math.min(zWall, zEdge) + 0.1, z1 = Math.max(zWall, zEdge) - 0.1;
        railZ(z0, z1, y, xr);
        // Los extremos de la galería también llevan lamas (cabecera este, fotos del 02/11/2026).
        if (s.louvers) box(0.04, 0.96, z1 - z0, xr + Math.sign(x) * 0.05, y + 2.6, (z0 + z1) / 2, m.louver);
      }
      if (s.label(level)) sign(s.label(level), (stops[2] + stops[3]) / 2, y + 3.02, zWall + front * 0.13, 1.6, front < 0 ? Math.PI : 0);
    }
    hipRoof(L, D, roofY, 1.2, s.roof);
    // Cerchas bajo la cubierta en cada línea de módulo (visibles desde el último piso).
    const rise = 1.2, half = D / 2 + 0.6;
    for (const x of modules) {
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
  /** El Bloque 1 está corrido en el plano (cabecera este fija): tramo del plano → x de su marco. */
  const b1x = plan.main.center[0], local = ([a, b]: Range): Range => [a - b1x, b - b1x];
  frame(plan.main, () => {
    academicBlock({
      ...block1, front: 1, topWall: 4.1, roof: m.roof, louvers: true, rearScreens: true,
      label: (level) => level ? "" : "LABORATORIOS",
      rooms: (level) => plan.rooms.main[level],
      endWindow: { level: 1, z: -2.8, width: 2.4, sill: 0.9, height: 1.5 },
      door: "double",
      // 10x, 20x y 30x por piso. En IMG_5639, mirando al este, el 204 está antes que el 203: se numera
      // desde la cabecera este (interpretación de la foto).
      roomSign: (level, index) => level ? `Aula ${level}0${ROOMS_PER_FLOOR - index}` : null,
      openings: (level) => [...(level ? [landingAt(level)] : []), [ex - ew / 2, ex + ew / 2] as Range, towerDoor].map(local),
      // Llegada de la escalera de la plaza a la galería del primer piso.
      innerOpenings: (level) => level === 1 ? [local([stairWest, stairEast])] : [],
      columns: { radius: 0.25 },
      // El núcleo de la torre de baños apoya el borde de la galería en su acceso.
      noColumns: [local(towerDoor)],
      // Bandas en la base y el techo de los pisos 2 y 3, que separan los títulos de la cara este.
      bands: [2, 3, block1.levels],
    });
    // Mesas del laboratorio en planta baja, sin cruzar los tabiques.
    for (let x = -15; x <= 5; x += 5) {
      if (plan.rooms.main[0].walls.some((w) => Math.abs(w - x) < 1.5)) continue;
      for (const z of [-1, -3.4]) {
        box(2.6, 0.06, 0.8, x, 0.78, z, m.white);
        for (const dx of [-1.1, 1.1]) box(0.06, 0.75, 0.7, x + dx, 0.39, z, m.metal);
      }
    }
    // Títulos de la cara este, sobre el ladrillo de las aulas entre las bandas (fotos del 02/11/2026):
    // en el tercer piso, la universidad y la facultad; en el segundo, el nombre del edificio.
    const faceX = block1.length / 2 + 0.135, faceZ = -block1.gallery / 2;
    lettering([
      { text: "Universidad", size: 0.36, at: 0.45, weight: "500" },
      { text: "Católica", size: 0.72, at: 1.0 },
      { text: "«Nuestra Señora de la Asunción»", size: 0.15, at: 1.47, weight: "500" },
      { text: "FACULTAD DE CIENCIAS Y TECNOLOGÍA", size: 0.4, at: 2.35 },
    ], 9, 3.2, faceX, 3 * H + 2.05, faceZ);
    lettering([
      { text: "EDIFICIO", size: 0.42, at: 0.85, weight: "700" },
      { text: "PROF. ING. LUIS ALBERTO MEYER JOU", size: 0.34, at: 1.6 },
    ], 9, 2.6, faceX, 2 * H + 1.75, faceZ);
  });


  {
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
      // Un apoyo de hormigón bajo la esquina exterior de cada descanso.
      const supportHeight = y1 - 0.22;
      box(0.42, supportHeight, 0.42, xl + 0.26, supportHeight / 2, z1 - 0.27, m.concrete, true);
      rail(xl, xe, y1, z1 + 0.03);
      if (f === st.flights - 1) railZ(z0 - 0.05, z1, y1, xl + 0.05);
      for (const x of [xl + 0.15, xe, xs - 0.15]) for (const z of [z0 - 0.02, z1 + 0.02])
        beam(v3(x, tread(x), z), v3(x, spring(x), z), 0.04, m.steel);
    }
    // Ascensor de 2,5 × 2,5 m entre dos columnas: caja revocada en crema con murales en sus caras este,
    // sur y oeste hasta la mitad superior entre el primer y el segundo piso; puertas con marco azul hacia
    // la galería (IMG_5706, IMG_5694). Por ahora las tres caras repiten el único mural fotografiado (IMG_5727).
    const shaftTop = (block1.levels - 1) * H + 4.1 + 0.9, muralHeight = plan.elevator.mural - 0.1;
    const zd = ez - ed / 2;
    const wall = 0.14, doorWidth = 1.12, doorHeight = 2.14;
    const brushed = brushedSteel();
    const blueFinish = m.concrete.clone();
    blueFinish.color.set("#47689a");
    blueFinish.bumpMap = blueFinish.map;
    blueFinish.bumpScale = 0.014;
    const landingSteel = brushed.clone();
    landingSteel.color.set("#f3e5d2");
    landingSteel.metalness = 0.28;
    landingSteel.roughness = 0.36;
    const notice = elevatorLabel("UC", "#29343a", "#e3e0d6");
    box(ew, shaftTop, wall, ex, shaftTop / 2, ez + ed / 2 - wall / 2, m.render, true);
    for (const side of [-1, 1]) {
      box(wall, shaftTop, ed - wall, ex + side * (ew - wall) / 2, shaftTop / 2, ez + wall / 2, m.render, true);
    }
    const mural = new T.TextureLoader().load("/assets/photos/IMG_5727.webp");
    mural.colorSpace = T.SRGBColorSpace; mural.offset.set(0.748, 0.279); mural.repeat.set(0.102, 0.497);
    const muralMat = new T.MeshStandardMaterial({ map: mural, roughness: 0.9 });
    for (const [dx, dz, width] of [[1, 0, ed], [0, 1, ew], [-1, 0, ed]] as const) {
      const panel = new T.Mesh(new T.PlaneGeometry(width - 0.06, muralHeight), muralMat);
      panel.position.set(ex + dx * (ew / 2 + 0.01), 0.1 + muralHeight / 2, ez + dz * (ed / 2 + 0.01));
      panel.rotation.y = Math.atan2(dx, dz); visual.add(panel);
    }
    const roundButton = new T.CylinderGeometry(0.064, 0.064, 0.018, 24);
    roundButton.rotateX(-Math.PI / 2);
    const { position, normal, uv } = roundButton.attributes;
    for (let i = 0; i < position.count; i++) {
      if (normal.getZ(i) < -0.5) uv.setXY(i, 0.5 - position.getX(i) / 0.128, 0.5 + position.getY(i) / 0.128);
    }
    const button = (label: string, x: number, y: number, z: number, destination: number | null) => {
      const mesh = new T.Mesh(roundButton, elevatorLabel(label, "#eeeee7", "#353838"));
      mesh.position.set(x, y, z);
      mesh.userData.keep = true;
      visual.add(mesh);
      return { mesh, destination };
    };
    const callPlate = new T.MeshStandardMaterial({ color: "#838688", metalness: 0.36, roughness: 0.52 });
    for (let level = 0; level < block1.levels; level++) {
      const y = level * H;
      const height = level === block1.levels - 1 ? shaftTop - y : H;
      const jamb = (ew - doorWidth) / 2;
      for (const side of [-1, 1]) {
        box(jamb - 0.006, doorHeight, wall, ex + side * (doorWidth + jamb - 0.006) / 2,
          y + doorHeight / 2, zd + wall / 2, blueFinish, true);
        const trimWidth = side < 0 ? 0.25 : 0.36;
        box(trimWidth, doorHeight, 0.07, ex + side * (doorWidth + trimWidth) / 2,
          y + doorHeight / 2, zd - 0.02, landingSteel);
      }
      box(ew - 0.012, height - doorHeight, wall, ex, y + (height + doorHeight) / 2, zd + wall / 2, blueFinish, true);
      box(doorWidth + 0.61, 0.19, 0.07, ex + 0.055, y + doorHeight + 0.095, zd - 0.02, landingSteel);
      box(doorWidth + 0.61, 0.026, 0.076, ex + 0.055, y + doorHeight + 0.195, zd - 0.02, m.metal);
      box(0.17, 0.24, 0.006, ex + doorWidth / 2 + 0.18, y + 1.74, zd - 0.059, notice);
      const doors = [-1, 1].map(side => {
        const closedX = ex + side * doorWidth / 4;
        const mesh = box(doorWidth / 2 - 0.009, doorHeight - 0.035, 0.065, closedX, y + doorHeight / 2, zd + 0.055, landingSteel);
        mesh.userData.keep = true;
        return { mesh, closedX, offset: side * doorWidth / 2 };
      });
      const barrier = new T.Mesh(unit);
      barrier.position.set(ex, y + doorHeight / 2, zd + 0.055);
      barrier.scale.set(doorWidth, doorHeight, 0.07);
      barrier.visible = false;
      barrier.userData.keep = true;
      visual.add(barrier);
      box(doorWidth, 0.06, 0.15, ex, y, zd + 0.068, brushed, true);
      const floor = new T.Mesh(unit);
      floor.scale.set(ew - 0.28, 0.12, ed - 0.14);
      floor.position.set(ex, y - 0.03, ez + 0.07);
      floor.visible = false;
      floor.userData.keep = true;
      visual.add(floor);

      // Desde la galería, el montante de la derecha corresponde a -X.
      const panelX = ex - doorWidth / 2 - 0.125;
      const arrows = level === 0 ? ["▲"] : level === elevatorLevels.length - 1 ? ["▼"] : ["▲", "▼"];
      const plateHeight = arrows.length === 2 ? 0.56 : 0.39;
      box(0.19, plateHeight, 0.024, panelX, y + 1.14, zd - 0.062, callPlate);
      const buttons = arrows.map((arrow, i) =>
        button(arrow, panelX, y + (arrows.length === 2 ? 1.13 - i * 0.16 : 1.08), zd - 0.084, null));
      const floorDisplay = box(0.114, 0.083, 0.016, panelX,
        y + (arrows.length === 2 ? 1.32 : 1.25), zd - 0.080, elevator.floorLabels[0]);
      floorDisplay.userData.keep = true;
      box(0.12, 0.29, 0.024, panelX, y + 1.91, zd - 0.062, landingSteel);
      const directionDisplay = box(0.095, 0.146, 0.016, panelX, y + 1.93, zd - 0.079, elevator.directionLabels.idle);
      directionDisplay.userData.keep = true;
      elevator.stops.push({ buttons, doors, barrier, floor, floorDisplay, directionDisplay });
    }

    // Una sola cabina visual recorre el hueco. Las puertas exteriores pertenecen a cada piso.
    const car = elevator.car;
    visual.add(car);
    car.position.set(ex, 0, ez);
    const landingGroup = visual;
    visual = car;
    const carPanel = (w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material) => {
      const mesh = box(w, h, d, x, y, z, mat);
      mesh.userData.keep = true;
      return mesh;
    };
    carPanel(ew - 0.28, 0.12, ed - 0.14, 0, -0.03, 0.07, m.granite);
    carPanel(ew - 0.28, 0.12, ed - 0.18, 0, 2.41, 0.08, brushed);
    carPanel(0.95, 0.022, 0.34, 0, 2.335, 0, m.white);
    carPanel(ew - 0.30, 2.32, 0.07, 0, 1.19, ed / 2 - 0.20, brushed);
    carPanel(ew - 0.45, 0.045, 0.075, 0, 0.97, ed / 2 - 0.29, brushed);
    for (const side of [-1, 1]) {
      const sideWidth = (ew - 0.28 - doorWidth) / 2;
      carPanel(sideWidth, 2.32, 0.06, side * (doorWidth + sideWidth) / 2, 1.19, -ed / 2 + 0.24, brushed);
      carPanel(0.07, 2.32, ed - 0.36, side * (ew / 2 - 0.19), 1.19, 0.03, brushed);
      const closedX = side * doorWidth / 4;
      const mesh = carPanel(doorWidth / 2 - 0.009, doorHeight - 0.035, 0.052,
        closedX, doorHeight / 2, -ed / 2 + 0.175, brushed);
      elevator.carDoors.push({ mesh, closedX, offset: side * doorWidth / 2 });
    }
    // Botonera centrada en la pared izquierda al entrar, a media altura.
    const insidePanelX = ew / 2 - 0.25;
    carPanel(0.035, 0.79, 0.24, insidePanelX, 1.12, 0.08, brushed);
    elevatorLevels.forEach((label, destination) => {
      const control = button(label, insidePanelX - 0.035, 0.85 + destination * 0.18, 0.08, destination);
      control.mesh.rotation.y = Math.PI / 2;
      elevator.carButtons.push(control);
    });
    visual = landingGroup;
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
    box(rampWidth, 0.2, Math.hypot(rampRun, PLAZA_LEVEL), rampX, PLAZA_LEVEL / 2 - 0.1, (rp.top + es.top) / 2, m.asphalt)
      .rotation.x = Math.atan2(PLAZA_LEVEL, rampRun);
    ramp(v3(rampX, 0, es.top), v3(rampX, PLAZA_LEVEL, rp.top), rampWidth);
    // Acabado del compañero, adaptado al largo local de la rampa.
    const treadMark = new T.MeshStandardMaterial({ color: "#4f514d", roughness: 0.98 });
    for (let z = rp.top + 0.15; z < Math.min(rp.top + 2, es.top - 0.16); z += 0.16) {
      const outerZ = z + 0.16;
      const tip = v3(rampX, rampAt(z) + 0.006, z);
      for (const side of [-1, 1])
        beam(tip, v3(rampX + side * (rampWidth / 2 - 0.08), rampAt(outerZ) + 0.006, outerZ), 0.011, treadMark);
    }
    beam(v3(groundEnd + 0.2, rampAt(-block1.depth / 2) + 0.9, -block1.depth / 2), v3(groundEnd + 0.2, 0.9, es.top), 0.03);
    railZ(rp.top, stairFoot, PLAZA_LEVEL, rp.east + 0.06);
    // Se retiró la prolongación de baranda fuera de la cabecera.
    // Bodega bajo la escalera: laterales de ladrillo que siguen los peldaños (el oeste deja ver el paso
    // de la rampa, como en IMG_5694) y frente hacia la galería con una puerta de chapa.
    const bodegaTop = H - 0.26 - (H - PLAZA_LEVEL) * 0.2 / es.run, door = es.x - 0.3;
    const eastTread = (z: number) => PLAZA_LEVEL + ((H - PLAZA_LEVEL) * (z - stairFoot)) / es.run;
    // La cara exterior de la bodega coincide con el extremo del retorno de la escalinata.
    for (const x of [stairWest + 0.13, stairEast - 0.1])
      slopedWall(x, stairFoot, es.top - 0.2, PLAZA_LEVEL - 0.26, eastTread(es.top - 0.2) - 0.26);
    for (const [p, q] of [[stairWest, door - 0.5], [door + 0.5, stairEast]])
      box(q - p, bodegaTop, 0.2, (p + q) / 2, bodegaTop / 2, es.top - 0.1, m.brick, true);
    box(1, bodegaTop - 2.1, 0.2, door, 2.1 + (bodegaTop - 2.1) / 2, es.top - 0.1, m.brick, true);
    box(0.95, 2.1, 0.05, door, 1.05, es.top + 0.02, m.steel, true);
    // Mismo ancho y eje originales; bajada prolongada siguiendo la pared de ladrillo.
    frame({ center: [es.x, es.top - es.run / 2], size: [es.run, es.width], angle: -Math.PI / 2 },
      () => flight(es.run / 2, PLAZA_LEVEL, -es.run / 2, H, 0, es.width, true));
    // Placa del Centro de Estudiantes en el paño de ladrillo junto a la escalera.
    // Reproducción vectorial de la referencia: cuatro enlaces, puntos azules y leyenda.
    const logoCanvas = document.createElement("canvas"); logoCanvas.width = 1024; logoCanvas.height = 1536;
    const ctx = logoCanvas.getContext("2d")!;
    ctx.save(); ctx.translate(512, 390); ctx.scale(1.65, 1.65);
    ctx.strokeStyle = "#163c4b"; ctx.lineWidth = 25; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.shadowColor = "#00000055"; ctx.shadowBlur = 5; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(25, -55); ctx.lineTo(-79, -165);
      ctx.bezierCurveTo(-118, -205, -181, -162, -164, -115);
      ctx.quadraticCurveTo(-158, -96, -121, -58); ctx.stroke(); ctx.restore();
    }
    for (const [i, [x, y]] of [[-205, -205], [205, -205], [205, 205], [-205, 205]].entries()) {
      ctx.fillStyle = i % 2 ? "#16b4dc" : "#155776";
      ctx.beginPath(); ctx.arc(x, y, 31, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#163c4b";
    ctx.shadowColor = "#00000055"; ctx.shadowBlur = 5; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;
    ctx.font = "900 188px Arial, sans-serif"; ctx.fillText("CECYT", 512, 1000, 940);
    ctx.font = "800 54px Arial, sans-serif";
    ctx.fillText("CENTRO DE ESTUDIANTES", 512, 1180, 950);
    ctx.fillText("CIENCIAS Y TECNOLOGÍA", 512, 1250, 950);
    const logoMap = new T.CanvasTexture(logoCanvas); logoMap.colorSpace = T.SRGBColorSpace; logoMap.anisotropy = 8;
    const wallX = plan.eastEnd.roomsEnd[1] + 0.14, logoY = H + 1.75, logoZ = 1;
    const acrylic = new T.MeshStandardMaterial({ color: "#e2f2ee", transparent: true, opacity: 0.1, roughness: 0.2, depthWrite: false });
    box(0.018, 2.65, 1.8, wallX, logoY, logoZ, acrylic);
    const logo = new T.Mesh(new T.PlaneGeometry(1.7, 2.55), new T.MeshStandardMaterial({ map: logoMap,
      transparent: true, alphaTest: 0.05, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1 }));
    logo.rotation.y = Math.PI / 2; logo.position.set(wallX + 0.025, logoY, logoZ); visual.add(logo);
    for (const dy of [-1.22, 1.22]) for (const dz of [-0.79, 0.79])
      beam(v3(wallX, logoY + dy, logoZ + dz), v3(wallX + 0.04, logoY + dy, logoZ + dz), 0.022, m.steel);
  }

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
      door: "single",
      columns: { radius: 0.17 },
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

  // Rellano de granito rosado al nivel del pasillo, no de la plaza elevada.
  // La base aporta una superficie transitable y tapa el césped bajo este acceso.
  prism(plan.elevatorLanding, -0.06, ELEVATOR_LANDING_LEVEL + 0.06, m.granite);

  // ---- Plataforma a 0,90 m: plaza techada, cuadrado, Bedelía, cantina, Sala Manfred y cabecera este ----

  for (const [i, outline] of plan.platform.entries()) {
    prism(outline, 0, PLAZA_LEVEL, m.concrete);
    pave(outline, i === 0 ? m.tile : m.stone, PLAZA_LEVEL + (i === 0 ? 0.008 : 0.005));
  }
  // La galería y el sendero comparten cota de piso terminado.
  const bedeliaPavingTop = 0.012;
  const passageTile = m.tile.clone(); passageTile.color.set("#cad0d1");
  function annexPavingHeight(point: Vec2) {
    return T.MathUtils.clamp(gardenHeight(...inCantina(point)) + 0.035, 0.05, PLAZA_LEVEL + bedeliaPavingTop);
  }
  frame(plan.bedeliaWalk, () => {
    const [length, width] = plan.bedeliaWalk.size, half = length / 2;
    box(length, 0.08, width, 0, bedeliaPavingTop - 0.04, 0, passageTile, true);
    // Rejilla transversal enrasada en el pavimento.
    for (let i = 0; i < 6; i++)
      box(0.014, 0.002, width - 0.08, half - 0.5 + i * 0.03, bedeliaPavingTop + 0.002, 0, m.metal);

    const steel = m.metal, eave = 2.86, rise = 0.44, span = width / 2;
    const radius = (span * span + rise * rise) / (2 * rise);
    const halfAngle = Math.asin(span / radius), start = Math.PI / 2 - halfAngle;
    const axisY = eave + rise - radius;
    const roofLength = length + diciaWalkExtension;
    const sheet = new T.CylinderGeometry(radius, radius, roofLength, 24, 1, true, start, 2 * halfAngle);
    sheet.rotateZ(Math.PI / 2);
    const roof = new T.Mesh(sheet, new T.MeshStandardMaterial({
      color: "#718392", transparent: true, opacity: 0.76, side: T.DoubleSide, roughness: 0.38, depthWrite: false,
    }));
    roof.position.set(diciaWalkExtension / 2, axisY, 0); visual.add(roof);
    const rib = new T.TorusGeometry(radius, 0.025, 6, 24, 2 * halfAngle);
    rib.rotateZ(start); rib.rotateY(Math.PI / 2);
    const bays = Math.ceil(roofLength / 3.8);
    for (let i = 0; i <= bays * 2; i++) {
      const x = -half + i * roofLength / (2 * bays);
      const arch = new T.Mesh(rib, steel); arch.position.set(x, axisY - 0.025, 0); visual.add(arch);
      if (i % 2 === 0) {
        const postX = T.MathUtils.clamp(x, -half + 0.05, half + diciaWalkExtension - 0.05);
        for (const side of [-1, 1]) {
          const z = side * (span - 0.045);
          const foot = postX <= half ? bedeliaPavingTop
            : annexPavingHeight(fromRect(plan.bedeliaWalk, [postX, z])) - PLAZA_LEVEL;
          box(0.075, eave - foot, 0.075, postX, (eave + foot) / 2, z, steel, true);
        }
        box(0.045, 0.045, width, x, eave, 0, steel);
        pole(0.11, 0.045, x, eave - 0.045, 0, m.white);
      }
    }
    for (const side of [-1, 1])
      box(roofLength, 0.1, 0.085, diciaWalkExtension / 2, eave, side * (span - 0.045), steel);

    // Cantero lateral de la foto de vuelta. El borde bajo termina antes del cruce.
    const bedZ = -span - 0.57;
    const bedX = -half + 4.8;
    box(5, 0.18, 1, bedX, 0.08, bedZ, m.brick, true);
    box(4.85, 0.02, 0.85, bedX, 0.17, bedZ, m.bark);
    const leaf = new T.BufferGeometry().setFromPoints([
      v3(0, 0, 0), v3(-0.065, 0.29, 0.09), v3(0, 0.53, 0.29),
      v3(0, 0, 0), v3(0, 0.53, 0.29), v3(0.065, 0.29, 0.09),
    ]);
    leaf.computeVertexNormals();
    const foliage = m.leaves[1].clone(); foliage.side = T.DoubleSide;
    for (let plant = 0; plant < 8; plant++) for (let j = 0; j < 9; j++) {
      const blade = new T.Mesh(leaf, foliage);
      blade.position.set(bedX - 2.15 + plant * 0.61, 0.18, bedZ + Math.sin(plant) * 0.12);
      blade.rotation.y = plant + j * 2.4;
      blade.scale.y = 0.75 + 0.12 * ((plant + j) % 5);
      visual.add(blade);
    }
  }, PLAZA_LEVEL);
  // La escalera de la galería junto al ascensor (primer elemento) tiene su propio modelado, abajo; la
  // salida norte del pasillo de Manfred conserva la escalinata recta genérica.
  for (const s of plan.platformSteps.slice(1))
    frame({ center: s.top, size: [STEPS_RUN, s.width], angle: s.angle }, () => steps(STEPS_RUN, 0, PLAZA_LEVEL, s.width));
  {
    const count = 5, tread = STEPS_RUN / count, base = ELEVATOR_LANDING_LEVEL;
    const groove = new T.MeshStandardMaterial({ color: "#8d918c", roughness: 0.9 });
    const riser = m.accessStone.clone(); riser.color.set("#bab7aa"); riser.side = T.DoubleSide;
    const nosing = m.accessStone.clone(); nosing.color.set("#e8e4d5");
    for (let i = 0; i < count; i++) {
      const inner = elevatorStairEdge(i * tread), outer = elevatorStairEdge((i + 1) * tread);
      const top = base + (PLAZA_LEVEL - base) * (i + 1) / count;
      // Una sola huella poligonal por nivel: no hay encuentro entre cajas superpuestas.
      prism([...inner, ...outer.slice().reverse()], 0, top, m.accessStone, false);
      // Contrahuella ligeramente más oscura y nariz de piedra, como en la foto de detalle.
      const front = elevatorStairEdge(i*tread-0.002), bottom = base+(PLAZA_LEVEL-base)*i/count;
      for(let side=0;side<2;side++) {
        const a=front[side],b=front[side+1],geo=new T.BufferGeometry().setFromPoints([
          v3(a[0],bottom,a[1]),v3(b[0],bottom,b[1]),v3(a[0],top,a[1]),
          v3(b[0],bottom,b[1]),v3(b[0],top,b[1]),v3(a[0],top,a[1]),
        ]);
        const p=geo.attributes.position,uv:number[]=[];
        for(let k=0;k<p.count;k++) uv.push((side?p.getX(k):p.getZ(k))/1.2,p.getY(k)/1.2);
        geo.setAttribute("uv",new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
        const face=new T.Mesh(geo,riser);face.receiveShadow=true;visual.add(face);
      }
      pave([...elevatorStairEdge(i*tread-0.018),...elevatorStairEdge(i*tread+0.018).reverse()],nosing,top+0.002);
      for (const offset of [0.025, 0.05, 0.075]) {
        const a = elevatorStairEdge(i * tread + offset), b = elevatorStairEdge(i * tread + offset + 0.009);
        pave([...a, ...b.slice().reverse()], groove, top + 0.002);
      }
    }
    // Dos trapecios inclinados comparten exactamente la arista del inglete.
    const lower = elevatorStairEdge(0), upper = elevatorStairEdge(STEPS_RUN);
    for (let i = 0; i < 2; i++) {
      const a = v3(lower[i][0], base, lower[i][1]), b = v3(lower[i + 1][0], base, lower[i + 1][1]);
      const c = v3(upper[i][0], PLAZA_LEVEL, upper[i][1]), d = v3(upper[i + 1][0], PLAZA_LEVEL, upper[i + 1][1]);
      const geometry = new T.BufferGeometry().setFromPoints([a, c, b, b, c, d]);
      geometry.computeVertexNormals();
      solid.add(new T.Mesh(geometry));
    }
  }

  // Encuentro fotografiado desde la plaza: galería de hormigón, jardín y desagüe.
  // Cotas estimadas; el ascensor, los niveles y ambas escaleras conservan su ubicación.
  {
    const g = plan.plazaGallery;
    prism(g.outline, g.roof, 0.22, m.concrete);
    // El pavimento usa el contorno recortado de la plataforma; el techo sobresale.
    const ss = g.smallSteps;
    frame({ center: ss.center, size: [ss.width, ss.run], angle: ss.angle }, () => {
      for (let i = 0; i < ss.count; i++) {
        const y = ss.bottom + (PLAZA_LEVEL - ss.bottom) * (i + 1) / ss.count;
        const z = ss.run - (i + 0.5) * ss.run / ss.count;
        box(ss.width, y, ss.run / ss.count, 0, y / 2, z, m.accessStone);
      }
    });
    ramp(v3(ss.center[0] + ss.direction[0] * ss.run, ss.bottom, ss.center[1] + ss.direction[1] * ss.run),
      v3(ss.center[0], PLAZA_LEVEL, ss.center[1]), ss.width);
    // El pavimento lo define la plataforma, recortada por el borde superior de la escalera.
    // El primer apoyo aloja los servicios y se construye rectangular más abajo.
    for (const [x, z] of g.columns.slice(1))
      pole(0.23, g.roof - PLAZA_LEVEL, x, (g.roof + PLAZA_LEVEL) / 2, z, m.concrete, true);
    // Segunda fila, lado plaza: deja libre el eje de circulación como en el video.
    const rearA=g.outline[1], rearB=g.outline[2];
    for (const t of [0.025,0.2625,0.5,0.7375,0.975]) {
      const x=rearA[0]+(rearB[0]-rearA[0])*t, z=rearA[1]+(rearB[1]-rearA[1])*t;
      pole(0.18,g.roof-PLAZA_LEVEL,x,(g.roof+PLAZA_LEVEL)/2,z,m.concrete,true);
    }
    const [frontA, frontB] = g.front;
    const galleryAngle = -Math.atan2(frontB[1] - frontA[1], frontB[0] - frontA[0]);
    const edgeBox = (a: Vec2, b: Vec2, h: number, depth: number, y: number, material: T.Material) =>
      box(Math.hypot(b[0] - a[0], b[1] - a[1]), h, depth,
        (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, material, false,
        { rotation: -Math.atan2(b[1] - a[1], b[0] - a[0]) });
    edgeBox(frontA, frontB, 0.38, 0.42, g.roof - 0.19, m.concrete);
    // Pretil bajo de ladrillo sobre el borde exterior de la losa.
    edgeBox(g.outline[0], g.outline[3], 0.30, 0.18, g.roof + 0.37, m.brick);
    const fluorescent = new T.MeshStandardMaterial({ color: "#f5f5e8", emissive: "#fff7de", emissiveIntensity: 1.3 });
    for (const t of [0.125, 0.375, 0.625, 0.875]) {

      const a = g.outline[0], b = g.outline[3], c = g.outline[1];
      const x = a[0] + (b[0] - a[0]) * t + (c[0] - a[0]) / 2;
      const z = a[1] + (b[1] - a[1]) * t + (c[1] - a[1]) / 2;
      frame({ center: [x, z], size: [1.2, 0.24], angle: -galleryAngle }, () => {
        box(1.24, 0.055, 0.25, 0, g.roof - 0.045, 0, m.white);
        for (const dz of [-0.07, 0.07]) beam(v3(-0.53, g.roof - 0.09, dz), v3(0.53, g.roof - 0.09, dz), 0.022, fluorescent);
        for (const dx of [-0.57, 0.57]) box(0.055, 0.08, 0.21, dx, g.roof - 0.07, 0, m.white);
      });
    }
    // Equipamiento reubicado alrededor de una columna rectangular: bebedero a la
    // izquierda, maceta en la esquina y máquina de hielo a su derecha.
    const equipmentAt = g.columns[0];
    // Frente hacia la plaza (el observador de la captura), no hacia las escaleras.
    frame({ center: equipmentAt, size: [2.8, 1.5], angle: gridAngle - Math.PI / 2 }, () => {
      const inox = new T.MeshStandardMaterial({ color: "#cbd2cf", roughness: 0.45, metalness: 0.3 });
      const white = new T.MeshStandardMaterial({ color: "#e5e4d8", roughness: 0.6, metalness: 0.12 });
      const recess = new T.MeshStandardMaterial({ color: "#313d3d", roughness: 0.6 });
      const columnHeight = g.roof - PLAZA_LEVEL - 0.015;
      box(0.65, columnHeight, 0.65, 0, columnHeight / 2, 0, m.concrete, true);
      // Bebedero de acero con pileta, rejilla de drenaje y grifo curvado.
      box(0.56, 0.88, 0.52, -0.83, 0.49, 0, inox, true);
      box(0.62, 0.055, 0.58, -0.83, 0.96, 0.02, inox);
      box(0.47, 0.018, 0.38, -0.83, 0.992, 0.04, recess);
      for (let i = 0; i < 7; i++) box(0.43, 0.012, 0.014, -0.83, 1.005, -0.09 + i * 0.043, inox);
      const tap = new T.CatmullRomCurve3([v3(-0.99, 0.99, -0.17), v3(-0.99, 1.2, -0.17), v3(-0.9, 1.24, -0.12), v3(-0.83, 1.15, -0.04)]);
      const faucet = new T.Mesh(new T.TubeGeometry(tap, 14, 0.018, 8, false), inox); visual.add(faucet);
      box(0.08, 0.025, 0.04, -0.67, 1.015, -0.16, m.blue);
      for (const x of [-1.03, -0.63]) for (const z of [-0.18, 0.18]) pole(0.025, 0.08, x, 0.04, z, recess);
      // Dispensador de hielo blanco sobre patas, hueco frontal y ventilación lateral.
      frame({ center: [0, 0.9], size: [0.76, 0.78], angle: 0 }, () => {
        box(0.76, 1.27, 0.78, 0, 0.96, 0, white, true);
        for (const x of [-0.29, 0.29]) for (const z of [-0.29, 0.29]) pole(0.022, 0.32, x, 0.16, z, inox);
        box(0.69, 0.045, 0.72, 0, 1.61, 0, inox);
        box(0.36, 0.25, 0.025, 0, 1.05, 0.397, recess);
        box(0.31, 0.025, 0.18, 0, 0.92, 0.44, inox);
        box(0.1, 0.12, 0.06, 0.03, 1.04, 0.43, inox);
        for (let i = 0; i < 10; i++) box(0.015, 0.018, 0.48, 0.389, 0.49 + i * 0.035, 0.02, recess);
        box(0.045, 0.045, 0.012, 0.24, 1.43, 0.397, m.blue);
      });
      // Maceta de terracota sobre soporte y hojas altas de sansevieria.
      frame({ center: [-1.66, 0.8], size: [0.65, 0.65], angle: 0 }, () => {
        const pot = new T.MeshStandardMaterial({ color: "#a94c30", roughness: 0.88 });
        const leafMat = new T.MeshStandardMaterial({ color: "#31462c", side: T.DoubleSide, roughness: 0.85 });
        const leafEdge = new T.MeshStandardMaterial({ color: "#89935b", side: T.DoubleSide, roughness: 0.9 });
        pole(0.3, 0.045, 0.91, 0.15, 0, recess);
        for (const a of [0, 2.1, 4.2]) pole(0.014, 0.16, 0.91 + Math.cos(a) * 0.23, 0.08, Math.sin(a) * 0.23, recess);
        const planter = new T.Mesh(new T.CylinderGeometry(0.31, 0.22, 0.48, 24), pot);
        planter.position.set(0.91, 0.4, 0); planter.castShadow = true; visual.add(planter);
        pole(0.315, 0.045, 0.91, 0.65, 0, pot);
        pole(0.285, 0.015, 0.91, 0.675, 0, m.bark);
        const potBody = new T.Mesh(unit); potBody.scale.set(0.62, 0.68, 0.62);
        potBody.position.set(0.91, 0.34, 0); solid.add(potBody);
        for (let i = 0; i < 18; i++) {
          const a = i * 2.4, reach = 0.16 + (i % 4) * 0.065, height = 0.8 + (i % 6) * 0.18;
          const points = [v3(0, 0, 0), v3(-0.055, height * 0.5, reach * 0.3), v3(0, height, reach),
            v3(0, 0, 0), v3(0, height, reach), v3(0.055, height * 0.5, reach * 0.3)];
          const geo = new T.BufferGeometry().setFromPoints(points); geo.computeVertexNormals();
          const leaf = new T.Mesh(geo, i % 4 ? leafMat : leafEdge);
          leaf.position.set(0.91 + Math.cos(a) * 0.13, 0.68, Math.sin(a) * 0.13); leaf.rotation.y = a;
          leaf.castShadow = true; visual.add(leaf);
        }
      });
    }, PLAZA_LEVEL + 0.015);
    // Rejilla a lo largo de la unión diagonal con la cubierta metálica.
    const a = g.outline[1], b = g.outline[2], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const angle = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    box(length, 0.018, 0.24, (a[0] + b[0]) / 2, PLAZA_LEVEL + 0.025, (a[1] + b[1]) / 2, m.metal, false, { rotation: angle });
    for (let i = 0; i <= Math.floor(length / 0.08); i++) {
      const t = i * 0.08 / length;
      box(0.018, 0.025, 0.23, a[0] + (b[0] - a[0]) * t, PLAZA_LEVEL + 0.04,
        a[1] + (b[1] - a[1]) * t, m.steel, false, { rotation: angle });
    }
    // Macizo a ras del suelo: sigue la esquina y el camino, sin la jardinera rectangular anterior.
    prism(g.garden,0.012,0.035,m.bark);
    const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    const leafGeo=new T.BufferGeometry(),vertices:number[]=[],uvs:number[]=[],faces:number[]=[];
    for(let i=0;i<=10;i++) {
      const t=i/10,w=0.064*Math.pow(1-t,0.35)+0.001,bend=0.15*t*t;
      for(const side of [-1,0,1]) { vertices.push(side*w,t,bend+(1-Math.abs(side))*0.026);uvs.push((side+1)/2,t); }
      if(i<10) for(let j=0;j<2;j++) {const a=i*3+j;faces.push(a,a+3,a+1,a+1,a+3,a+4);}
    }
    leafGeo.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    leafGeo.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));leafGeo.setIndex(faces);leafGeo.computeVertexNormals();
    let plant=0;
    const gardenXs = g.garden.map(p => p[0]), gardenZs = g.garden.map(p => p[1]);
    for(let x=Math.min(...gardenXs);x<Math.max(...gardenXs);x+=0.36) for(let z=Math.min(...gardenZs);z<Math.max(...gardenZs);z+=0.36) {
      const n=plant++,px=x+(noise(n)-0.5)*0.14,pz=z+(noise(n+8)-0.5)*0.14;
      if(!insidePolygon([px,pz],g.garden)||noise(n+25)<0.06) continue;
      for(let j=0;j<5;j++) {
        const leaf=new T.Mesh(leafGeo,m.accessLeaf),a=noise(n*7+j)*Math.PI*2;
        leaf.position.set(px+Math.cos(a)*0.045,0.055,pz+Math.sin(a)*0.045);
        leaf.rotation.order="YXZ";
        leaf.rotation.set((noise(n+j+90)-0.5)*0.25,a,(noise(n+j+120)-0.5)*0.25);
        const height=(0.65+noise(n+44)*0.6)*(0.8+noise(n*5+j+170)*0.3)*(pz>8.6?0.7:1);
        leaf.scale.set(1+noise(n+j+140)*0.45,height,1);
        leaf.castShadow=leaf.receiveShadow=true;visual.add(leaf);
      }
    }
    const silver=new T.MeshStandardMaterial({color:"#a7b7a2",roughness:1,side:T.DoubleSide});
    const purple=new T.MeshStandardMaterial({color:"#526257",roughness:1,side:T.DoubleSide});
    for(let i=0;i<g.garden.length;i++) {
      const a=g.garden[i],b=g.garden[(i+1)%g.garden.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const count=Math.ceil(length/0.3);
      for(let k=0;k<count;k++) {
        const t=k/count,px=a[0]+(b[0]-a[0])*t,pz=a[1]+(b[1]-a[1])*t;
        const stone=new T.Mesh(new T.IcosahedronGeometry(0.055,0),m.stone);
        stone.position.set(px,0.038,pz);stone.scale.set(1.3,0.5,0.85);visual.add(stone);
        if(i<4||k%2) continue;
        for(let j=0;j<9;j++) {
          const leaf=new T.Mesh(leafGeo,j%3?silver:purple),angle=j*Math.PI*2/9;
          leaf.position.set(px,0.055,pz);leaf.rotation.order="YXZ";leaf.rotation.set(0.95,angle,0);
          leaf.scale.set(0.7,0.32+noise(i*31+k+j)*0.13,1);leaf.castShadow=true;visual.add(leaf);
        }
      }
    }
    // Banco retirado por la ampliación longitudinal de la escalera.

  }

  // ---- Plaza techada: cubierta exenta, separada de la cabecera este del Bloque 1 ----
  {
    const outline = rectCorners(plan.coveredPlaza);
    const dx = (outline[1][0] - outline[0][0]) / plan.coveredPlaza.size[0];
    const dz = (outline[1][1] - outline[0][1]) / plan.coveredPlaza.size[0];
    for (const i of [0, 3]) {
      outline[i] = [outline[i][0] + dx * plan.plazaGallery.metalRoofSetback,
        outline[i][1] + dz * plan.plazaGallery.metalRoofSetback];
    }
    const [w, n, e, s] = outline;
    const height = 4.6, roofY = PLAZA_LEVEL + height;
    flipFaces(pave(outline, m.roofUnder, roofY - 0.02).geometry);
    pave(outline, m.roof, roofY + 0.12, true);
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
        if (a === w) {
          // Apoyos cortos sobre la losa, sin postes metálicos atravesando la galería.
          const slabTop = plan.plazaGallery.roof + 0.22;
          pole(0.16, roofY - slabTop, p[0], (roofY + slabTop) / 2, p[1], m.steel);
        } else {
          pole(0.16, height, p[0], PLAZA_LEVEL + height / 2, p[1], m.steel, true);
        }
      }
      const [pa, pb] = [inset(a, centre), inset(b, centre)];
      beam(v3(pa[0], roofY - 0.45, pa[1]), v3(pb[0], roofY - 0.45, pb[1]), 0.07, m.steel);
    }
    for (const tRoof of [0.15, 0.35, 0.55, 0.75, 0.95]) {
      const a = v3(w[0]+(s[0]-w[0])*tRoof, roofY-.45, w[1]+(s[1]-w[1])*tRoof);
      const b = v3(n[0]+(e[0]-n[0])*tRoof, roofY-.45, n[1]+(e[1]-n[1])*tRoof);
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
  // Fachada administrativa: ladrillo naranja con junta fina, ventanas y accesos individuales.
  const brickCanvas=document.createElement("canvas");brickCanvas.width=512;brickCanvas.height=256;
  const bc=brickCanvas.getContext("2d")!;bc.fillStyle="#a59b89";bc.fillRect(0,0,512,256);
  for(let row=0;row<8;row++) for(let col=-1;col<8;col++) {
    const x=col*85+(row%2)*42.5,y=row*32;
    bc.fillStyle=["#b87950","#bd8056","#c2895e","#b7754c"][(row*7+col+8)%4];
    bc.fillRect(x+2,y+2,81,28);
    bc.fillStyle="rgba(70,50,35,.14)";bc.fillRect(x+3,y+27,80,2);
  }
  const brickMap=new T.CanvasTexture(brickCanvas);brickMap.colorSpace=T.SRGBColorSpace;
  brickMap.wrapS=brickMap.wrapT=T.RepeatWrapping;brickMap.anisotropy=8;
  const officeBrick=new T.MeshStandardMaterial({map:brickMap,roughness:0.93});officeBrick.userData.tile=[1.5,0.64];
  const blueFrame=new T.MeshStandardMaterial({color:"#365663",roughness:0.7});
  frame(plan.bedelia, () => {
    const [w,d]=plan.bedelia.size, z=d/2;
    box(w,.16,d,0,.02,0,m.stone,true);
    box(w,3.2,.2,0,1.6,-d/2,officeBrick,true);
    box(w+.8,.2,d+.8,0,3.4,0,m.concrete);
    // Muros laterales: el frente hacia Manfred incluye acceso de profesores y vitrina.
    for(const side of [-1,1]) {
      if(side===1)box(.2,3.2,d,side*w/2,1.6,0,officeBrick,true);
      else {
        const doorZ=-2.4, dw=1.05;
        for(const [start,end] of [[-d/2,doorZ-dw/2],[doorZ+dw/2,d/2]])
          box(.2,3.2,end-start,-w/2,1.6,(start+end)/2,officeBrick,true);
        box(.2,.7,dw,-w/2,2.85,doorZ,officeBrick,true);
        frame({center:[-w/2-.12,doorZ],size:[dw,.1],angle:-Math.PI/2},()=>{
          for(const x of [-dw/2,dw/2])box(.05,2.5,.06,x,1.25,0,blueFrame);
          box(dw,.05,.06,0,2.5,0,blueFrame);
          box(.025,2.4,.9,dw/2,1.2,-.45,m.glass,true);
          sign("SALA DE PROFESORES",0,2.75,-.04,1.2,Math.PI);
        });
      }
      box(.22,.13,d,side*w/2,.065,0,m.metal);
    }
const frontWallLocal = [
      [-10, 5], [-8.75, 5], [-8.75, 4.2], [-3.75, 4.2],
      [-3.75, 5], [-2.5, 5], [-2.5, 4.2], [2.5, 4.2],
      [2.5, 5], [3.75, 5], [3.75, 4.2], [8.75, 4.2],
      [8.75, 5], [10, 5]
    ];

for (let i = 0; i < frontWallLocal.length - 1; i++) {
      const a = frontWallLocal[i], b = frontWallLocal[i + 1];
      const isRecess = a[1] === 4.2 && b[1] === 4.2;

      if (!isRecess) {
        // Pilares y muros laterales del retranqueo (sin aberturas)
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const angle = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        box(length, 3.2, 0.2, (a[0] + b[0]) / 2, 1.6, (a[1] + b[1]) / 2, officeBrick, true, { rotation: angle });
      } else {
        // Zonas retranqueadas (Entradas)
        let openingsInRecess: { x: number; width: number; door: boolean }[] = [];
        
        // Hacemos que la ventana de la izquierda (i === 2) sea gigante y centrada en su pared
        if (i === 2) openingsInRecess = [{x: -6.25, width: 4.2, door: false}];
        else if (i === 6) openingsInRecess = [{x: 0, width: 4.2, door: false}];
        else if (i === 10) openingsInRecess = [{x: 4.6, width: 1.05, door: true}, {x: 7.1, width: 2.4, door: false}];

        let cursor = a[0];
        const rz = a[1];
        for (const o of openingsInRecess) {
          const left = o.x - o.width / 2, right = o.x + o.width / 2, sill = o.door ? 0 : 0.85, top = o.door ? 2.5 : 2.45;
          box(left - cursor, 3.2, 0.2, (left + cursor) / 2, 1.6, rz, officeBrick, true);
          if (sill) box(o.width, sill, 0.2, o.x, sill / 2, rz, officeBrick, true);
          box(o.width, 3.2 - top, 0.2, o.x, (top + 3.2) / 2, rz, officeBrick, true);
          box(o.width, top - sill, 0.035, o.x, (top + sill) / 2, rz, m.glass, !o.door);
          for (const px of [left, right]) box(0.055, top - sill, 0.08, px, (top + sill) / 2, rz + 0.04, blueFrame);
          for (const py of [sill, top]) box(o.width, 0.055, 0.08, o.x, py, rz + 0.04, blueFrame);
          
          if (o.door) {
            sign("RECEPCIÓN", o.x, 2.76, rz + 0.13, 1.05);
            box(0.035, 2.45, 0.95, right - 0.04, 1.225, rz - 0.5, m.glass, true);
          } else {
            // El código original dibuja las barras diagonales perfectas
            box(o.width, 0.035, 0.07, o.x, 1.65, rz + 0.05, m.white);
            for (let wx = left + 0.1; wx < right; wx += 0.24)
              beam(v3(wx, 0.85, rz + 0.27), v3(Math.min(wx + 0.32, right), 2.45, rz + 0.15), 0.018, blueFrame);
            for (const wy of [0.85, 2.45]) beam(v3(left, wy, rz + 0.23), v3(right, wy, rz + 0.23), 0.022, blueFrame);
          }
          cursor = right;
        }
        box(b[0] - cursor, 3.2, 0.2, (b[0] + cursor) / 2, 1.6, rz, officeBrick, true);
      }
    }
    box(w,.12,.23,0,.06,z,m.metal);
    const depth=plan.bedeliaGalleryDepth;
    box(w+1,.2,depth,0,3.4,z+depth/2,m.concrete);
    box(w+1,.05,depth,0,bedeliaPavingTop-.025,z+depth/2,m.stone,true);
    for(let x=-w/2+.5;x<=w/2;x+=3.1) {
      for(const dz of [.3,depth-.2]) {
        // Eliminamos la primera columna pegada a la pared
        if (x === -w/2+.5 && dz === .3) continue;
        pole(.17,3.3,x,1.65,z+dz,m.concrete,true);
      }
      box(1.05,.065,.16,x,3.25,z+1.3,m.white);
      box(3.0, 0.04, 2.8, 1.3, bedeliaPavingTop, z + depth + 1.4, m.grass, true);
      // --- SANTA RITA PROCEDURAL ALTA DENSIDAD (~21k vértices en T.Mesh estándar) ---
    {
      const bushX = 0.4;
      const bushZ = z + depth + 0.5;
      const baseY = bedeliaPavingTop;

      const bushGroup = new T.Group();
      bushGroup.position.set(bushX, baseY, bushZ);
      bushGroup.scale.setScalar(0.68); // Ajustá este número (ej. 0.55 - 0.75) para calibrar la altura

      let seed = 4219;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // 1. TRONCOS Y RAMAS ENTRELAZADAS
      for (let s = 0; s < 9; s++) {
        const angle = (s / 9) * Math.PI * 2 + rand() * 0.4;
        const spread = 0.28 + rand() * 0.48;
        const topH = 0.95 + rand() * 0.45;
        const twist = (rand() - 0.5) * 0.65;

        const curve = new T.CatmullRomCurve3([
          new T.Vector3(Math.cos(angle) * 0.07, -0.02, Math.sin(angle) * 0.07),
          new T.Vector3(Math.cos(angle + twist) * 0.19, topH * 0.35, Math.sin(angle + twist) * 0.19),
          new T.Vector3(Math.cos(angle - twist * 0.5) * (spread * 0.78), topH * 0.72, Math.sin(angle - twist * 0.5) * (spread * 0.78)),
          new T.Vector3(Math.cos(angle) * spread, topH, Math.sin(angle) * spread),
        ]);

        const trunkGeo = new T.TubeGeometry(curve, 10, 0.024 - s * 0.001, 6, false);
        const trunkMesh = new T.Mesh(trunkGeo, m.bark);
        trunkMesh.castShadow = true;
        bushGroup.add(trunkMesh);
      }

      // Helper para acumular geometría en T.Mesh estándar por color
      type Bucket = { mat: T.MeshStandardMaterial; verts: number[]; indices: number[] };
      const makeBucket = (hex: string, roughness = 0.78): Bucket => ({
        mat: new T.MeshStandardMaterial({ color: hex, roughness, metalness: 0.02, side: T.DoubleSide }),
        verts: [],
        indices: [],
      });

      const greenBuckets = [
        makeBucket("#1a3815", 0.85), // verde sombra interior
        makeBucket("#285420", 0.78), // verde medio
        makeBucket("#3d752e", 0.72), // verde brote exterior
      ];
      const flowerBuckets = [
        makeBucket("#a31256", 0.62), // fucsia profundo
        makeBucket("#db237c", 0.58), // fucsia brillante
      ];

      const dummy = new T.Object3D();
      const vTmp = new T.Vector3();

      // Plantilla de hoja 3D curvada (5 vértices, 4 triángulos)
      const localLeafVerts = [
        [0.0, 0.0, 0.0],
        [-0.046, 0.013, 0.058],
        [0.046, 0.013, 0.058],
        [0.0, 0.005, 0.068],
        [0.0, -0.015, 0.132],
      ];
      const localLeafTris = [0, 1, 3, 0, 3, 2, 1, 4, 3, 3, 4, 2];

      const stampLeaf = (bucket: Bucket) => {
        dummy.updateMatrix();
        const base = bucket.verts.length / 3;
        for (const [lx, ly, lz] of localLeafVerts) {
          vTmp.set(lx, ly, lz).applyMatrix4(dummy.matrix);
          bucket.verts.push(vTmp.x, vTmp.y, vTmp.z);
        }
        for (const idx of localLeafTris) bucket.indices.push(base + idx);
      };

      // 2. FOLLAJE PRINCIPAL (2.600 hojas = 13.000 vértices)
      const canopyCenter = new T.Vector3(0, 1.38, 0);
      const leafCount = 2600;

      for (let i = 0; i < leafCount; i++) {
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        const r = Math.pow(rand(), 0.36);

        let lx = r * Math.sin(phi) * Math.cos(theta) * 1.18;
        let ly = r * Math.cos(phi) * 0.86;
        let lz = r * Math.sin(phi) * Math.sin(theta) * 1.15;

        if (ly < 0) ly *= 0.62;
        const bump = 1 + 0.15 * Math.sin(theta * 5) * Math.cos(phi * 4);
        lx *= bump;
        lz *= bump;

        dummy.position.set(canopyCenter.x + lx, canopyCenter.y + ly, canopyCenter.z + lz);
        dummy.lookAt(
          canopyCenter.x + lx * 2.2,
          canopyCenter.y + ly * 1.8 - 0.25,
          canopyCenter.z + lz * 2.2
        );
        dummy.rotateZ((rand() - 0.5) * 1.3);
        const s = 0.8 + rand() * 0.65;
        dummy.scale.set(s, s, s);

        const toneIdx = r < 0.62 ? 0 : rand() < 0.55 ? 1 : 2;
        stampLeaf(greenBuckets[toneIdx]);
      }

      // 3. YUYOS BAJOS Y PÉTALOS CAÍDOS EN LA BASE (240 hojas = 1.200 vértices)
      for (let i = 0; i < 240; i++) {
        const a = rand() * Math.PI * 2;
        const dist = 0.08 + rand() * 0.75;
        const isFallenPetal = i > 185;

        dummy.position.set(
          Math.cos(a) * dist,
          isFallenPetal ? 0.025 : 0.03 + rand() * 0.24,
          Math.sin(a) * dist
        );
        if (isFallenPetal) {
          dummy.rotation.set(0.08, rand() * Math.PI * 2, 0.08);
          dummy.scale.set(0.75, 0.75, 0.75);
          stampLeaf(flowerBuckets[1]);
        } else {
          dummy.rotation.set(-0.65 - rand() * 0.6, rand() * Math.PI * 2, (rand() - 0.5) * 0.5);
          const gs = 0.85 + rand() * 0.75;
          dummy.scale.set(gs, gs, gs);
          stampLeaf(greenBuckets[Math.floor(rand() * 3)]);
        }
      }

      // 4. RACIMOS DE FLORES FUCSIA (650 ramilletes × 12 vértices = 7.800 vértices)
      const localFlowerVerts: [number, number, number][] = [];
      const localFlowerTris: number[] = [];
      for (let p = 0; p < 3; p++) {
        const a = (p / 3) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const baseIdx = p * 4;
        localFlowerVerts.push(
          [ca * 0.008, 0.0, sa * 0.008],
          [ca * 0.048 - sa * 0.034, 0.019, sa * 0.048 + ca * 0.034],
          [ca * 0.048 + sa * 0.034, 0.019, sa * 0.048 - ca * 0.034],
          [ca * 0.09, 0.006, sa * 0.09]
        );
        localFlowerTris.push(baseIdx, baseIdx + 1, baseIdx + 3, baseIdx, baseIdx + 3, baseIdx + 2);
      }

      const clusters: T.Vector3[] = [];
      for (let c = 0; c < 115; c++) {
        const theta = rand() * Math.PI * 2;
        const phi = rand() * Math.PI * 0.64;
        const r = 0.9 + rand() * 0.18;
        clusters.push(
          new T.Vector3(
            r * Math.sin(phi) * Math.cos(theta) * 1.19,
            r * Math.cos(phi) * 0.87,
            r * Math.sin(phi) * Math.sin(theta) * 1.16
          )
        );
      }

      for (let i = 0; i < 650; i++) {
        const cl = clusters[i % clusters.length];
        dummy.position.set(
          canopyCenter.x + cl.x + (rand() - 0.5) * 0.24,
          canopyCenter.y + cl.y + (rand() - 0.5) * 0.19,
          canopyCenter.z + cl.z + (rand() - 0.5) * 0.24
        );
        dummy.rotation.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI);
        const fs = 0.9 + rand() * 0.55;
        dummy.scale.set(fs, fs, fs);
        dummy.updateMatrix();

        const bucket = flowerBuckets[rand() < 0.45 ? 0 : 1];
        const base = bucket.verts.length / 3;
        for (const [fx, fy, fz] of localFlowerVerts) {
          vTmp.set(fx, fy, fz).applyMatrix4(dummy.matrix);
          bucket.verts.push(vTmp.x, vTmp.y, vTmp.z);
        }
        for (const idx of localFlowerTris) bucket.indices.push(base + idx);
      }

      // 5. CONSTRUIR LOS 5 MESHES FINALES
      for (const bucket of [...greenBuckets, ...flowerBuckets]) {
        if (bucket.verts.length === 0) continue;
        const geo = new T.BufferGeometry();
        geo.setAttribute("position", new T.Float32BufferAttribute(bucket.verts, 3));
        geo.setIndex(bucket.indices);
        geo.computeVertexNormals();
        geo.computeBoundingSphere();

        const mesh = new T.Mesh(geo, bucket.mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        bushGroup.add(mesh);
      }

      visual.add(bushGroup);
    }
    // -----------------------------------------------------------------------------

    // --- CROTONES VARIEGADOS PROCEDURALES (2 plantas, verdes vivos + variegado) ---
    {
      type Bucket = { mat: T.MeshStandardMaterial; verts: number[]; indices: number[] };
      const makeBucket = (hex: string, roughness = 0.55): Bucket => ({
        mat: new T.MeshStandardMaterial({ color: hex, roughness, metalness: 0.02, side: T.DoubleSide }),
        verts: [],
        indices: [],
      });

      // Plantilla de hoja de crotón (15 vértices, curvada y ondulada)
      const localVerts: [number, number, number][] = [];
      const rows = [
        { z: 0.00, halfW: 0.006, archY: 0.000, cupY: 0.000 }, // pecíolo
        { z: 0.05, halfW: 0.036, archY: 0.012, cupY: 0.006 }, // base ancha
        { z: 0.12, halfW: 0.048, archY: 0.018, cupY: 0.009 }, // zona media
        { z: 0.19, halfW: 0.033, archY: 0.006, cupY: 0.005 }, // caída
        { z: 0.25, halfW: 0.002, archY: -0.018, cupY: 0.000 }, // punta
      ];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const wave = r === 2 ? 0.004 : r === 3 ? -0.004 : 0;
        localVerts.push([-row.halfW, row.archY + row.cupY + wave, row.z]);
        localVerts.push([0.0,        row.archY,                   row.z]);
        localVerts.push([row.halfW,  row.archY + row.cupY - wave, row.z]);
      }

      const addCroton = (crotonX: number, crotonZ: number, seedInit: number, scaleScalar: number) => {
        const crotonGroup = new T.Group();
        crotonGroup.position.set(crotonX, bedeliaPavingTop, crotonZ);
        crotonGroup.scale.setScalar(scaleScalar);

        let seed = seedInit;
        const rand = () => {
          seed = (seed * 1664525 + 1013904223) % 4294967296;
          return seed / 4294967296;
        };

        // 1. TALLOS LEÑOSOS VERTICALES Y BIFURCACIONES
        type StemPath = { curve: T.CatmullRomCurve3; isVariegated: boolean; leafDensity: number };
        const stems: StemPath[] = [];

        const stemCount = 11;
        for (let s = 0; s < stemCount; s++) {
          const a = (s / stemCount) * Math.PI * 2 + rand() * 0.35;
          const baseR = 0.05 + rand() * 0.24;
          const topR = baseR + 0.14 + rand() * 0.26;
          const h = 1.25 + rand() * 0.65;
          const bx = Math.cos(a) * baseR;
          const bz = Math.sin(a) * baseR;
          const tx = Math.cos(a + (rand() - 0.5) * 0.3) * topR;
          const tz = Math.sin(a + (rand() - 0.5) * 0.3) * topR;

          const mainCurve = new T.CatmullRomCurve3([
            new T.Vector3(bx, -0.02, bz),
            new T.Vector3(bx + (tx - bx) * 0.35 + (rand() - 0.5) * 0.07, h * 0.35, bz + (tz - bz) * 0.35 + (rand() - 0.5) * 0.07),
            new T.Vector3(bx + (tx - bx) * 0.72, h * 0.72, bz + (tz - bz) * 0.72),
            new T.Vector3(tx, h, tz),
          ]);

          const isVariegated = s % 2 === 0;
          stems.push({ curve: mainCurve, isVariegated, leafDensity: 52 });

          const mainGeo = new T.TubeGeometry(mainCurve, 10, 0.017, 6, false);
          const mainMesh = new T.Mesh(mainGeo, m.bark);
          mainMesh.castShadow = true;
          crotonGroup.add(mainMesh);

          if (s < 8) {
            const splitT = 0.38 + rand() * 0.25;
            const p0 = mainCurve.getPoint(splitT);
            const subAngle = a + (rand() > 0.5 ? 0.65 : -0.65);
            const subLen = 0.45 + rand() * 0.35;
            const subCurve = new T.CatmullRomCurve3([
              p0,
              new T.Vector3(
                p0.x + Math.cos(subAngle) * subLen * 0.55,
                p0.y + subLen * 0.55,
                p0.z + Math.sin(subAngle) * subLen * 0.55
              ),
              new T.Vector3(
                p0.x + Math.cos(subAngle) * subLen,
                p0.y + subLen * 0.92,
                p0.z + Math.sin(subAngle) * subLen
              ),
            ]);
            stems.push({ curve: subCurve, isVariegated, leafDensity: 26 });

            const subGeo = new T.TubeGeometry(subCurve, 6, 0.011, 5, false);
            const subMesh = new T.Mesh(subGeo, m.bark);
            subMesh.castShadow = true;
            crotonGroup.add(subMesh);
          }
        }

        // 2. BUCKETS DE COLORES VERDES Y VARIEGADOS (sin vertexColors ni DataTexture)
        const buckets = {
          darkGreen:  makeBucket("#1f4d19", 0.62), // verde bosque
          midGreen:   makeBucket("#317324", 0.55), // verde hoja vibrante
          limeGreen:  makeBucket("#559c33", 0.50), // verde lima brote
          yellowVein: makeBucket("#bcc72c", 0.48), // amarillo-lima nervadura/punta
          warmOlive:  makeBucket("#6e5c22", 0.60), // toque cálido oliva-cobre en hojas bajas
        };

        const dummy = new T.Object3D();
        const vTmp = new T.Vector3();

        const stampCrotonLeaf = (baseBucket: Bucket, tipBucket: Bucket) => {
          dummy.updateMatrix();
          const transformed: [number, number, number][] = localVerts.map(([lx, ly, lz]) => {
            vTmp.set(lx, ly, lz).applyMatrix4(dummy.matrix);
            return [vTmp.x, vTmp.y, vTmp.z];
          });

          for (let r = 0; r < rows.length - 1; r++) {
            // La mitad superior de la hoja (r >= 2) toma el tono de la punta/variegado
            const target = r >= 2 ? tipBucket : baseBucket;
            const baseIdx = target.verts.length / 3;

            for (let rowOffset = 0; rowOffset <= 1; rowOffset++) {
              for (let col = 0; col < 3; col++) {
                const [vx, vy, vz] = transformed[(r + rowOffset) * 3 + col];
                target.verts.push(vx, vy, vz);
              }
            }
            // 4 triángulos de esta banda
            target.indices.push(
              baseIdx + 0, baseIdx + 3, baseIdx + 1,
              baseIdx + 1, baseIdx + 3, baseIdx + 4,
              baseIdx + 1, baseIdx + 4, baseIdx + 2,
              baseIdx + 2, baseIdx + 4, baseIdx + 5
            );
          }
        };

        // 3. GENERAR HOJAS EN ESPIRAL A LO LARGO DE LOS TALLOS
        for (const stem of stems) {
          const count = stem.leafDensity;
          for (let i = 0; i < count; i++) {
            const t = 0.22 + (i / count) * 0.78;
            const pos = stem.curve.getPoint(t);
            const goldenAngle = i * 2.39996 + rand() * 0.25;

            dummy.position.copy(pos);
            dummy.rotation.set(0, goldenAngle, 0);
            const pitch = -0.95 * Math.pow(t, 1.3) - 0.15 + (rand() - 0.5) * 0.25;
            dummy.rotateX(pitch);
            dummy.rotateZ((rand() - 0.5) * 0.35);

            const sizeCurve = Math.sin(Math.min(1, (t - 0.15) * 1.15) * Math.PI);
            const scale = (0.65 + sizeCurve * 0.65) * (0.85 + rand() * 0.35);
            dummy.scale.set(scale, scale, scale * (0.95 + rand() * 0.25));

            if (t > 0.82) {
              // Brotes superiores: verde lima con punta amarillo-dorada
              stampCrotonLeaf(buckets.limeGreen, buckets.yellowVein);
            } else if (stem.isVariegated && rand() < 0.58) {
              // Hojas variegadas: base verde vibrante + punta amarillo-lima
              stampCrotonLeaf(buckets.midGreen, buckets.yellowVein);
            } else if (t < 0.42 && rand() < 0.28) {
              // Algunas hojas inferiores con matiz oliva cálido
              stampCrotonLeaf(buckets.darkGreen, buckets.warmOlive);
            } else {
              // Verde bosque a verde hoja
              stampCrotonLeaf(buckets.darkGreen, buckets.midGreen);
            }
          }
        }

        // Hojas caídas en la base
        for (let f = 0; f < 32; f++) {
          const a = rand() * Math.PI * 2;
          const d = 0.08 + rand() * 0.42;
          dummy.position.set(Math.cos(a) * d, 0.022, Math.sin(a) * d);
          dummy.rotation.set(0.05, rand() * Math.PI * 2, 0.05);
          const fs = 0.6 + rand() * 0.4;
          dummy.scale.set(fs, fs, fs);
          stampCrotonLeaf(buckets.warmOlive, buckets.midGreen);
        }

        // 4. CONSTRUIR LOS MESHES FINALES
        for (const bucket of Object.values(buckets)) {
          if (bucket.verts.length === 0) continue;
          const geo = new T.BufferGeometry();
          geo.setAttribute("position", new T.Float32BufferAttribute(bucket.verts, 3));
          geo.setIndex(bucket.indices);
          geo.computeVertexNormals();
          geo.computeBoundingSphere();

          const mesh = new T.Mesh(geo, bucket.mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          crotonGroup.add(mesh);
        }

        visual.add(crotonGroup);
      };

      // Planta 1 (misma ubicación que ya te quedó bien)
      addCroton(1.45, z + depth + 0.45, 8831, 0.75);

      // Planta 2 (justo a la derecha sobre el cantero de pasto)
      addCroton(2.45, z + depth + 0.50, 5173, 0.72);
    }
    // -----------------------------------------------------------------------------
    }
    const gold = new T.MeshStandardMaterial({ color: "#c2a65a", metalness: 0.25, roughness: 0.45 });
    // Vitrina visible desde el acceso de Manfred, sobre el lateral de Bedelía.
    const displayX = -w / 2 - 0.31, displayZ = 1.0;
    const displayFrame = new T.MeshStandardMaterial({ color: "#2f3635", roughness: 0.64 });
    box(0.06, 2.1, 2.32, displayX + 0.18, 1.05, displayZ, displayFrame, true);
    for (const z of [displayZ - 1.14, displayZ, displayZ + 1.14])
      box(0.42, 2.1, 0.05, displayX, 1.05, z, displayFrame, true);
    for (const y of [0.14, 0.79, 1.44, 2.07])
      box(0.42, 0.05, 2.32, displayX, y, displayZ, displayFrame, true);
    const cup = new T.CylinderGeometry(0.10, 0.035, 1, 14);
    for (const [row, y] of [0.14, 0.79, 1.44].entries()) {
      for (const [i, offset] of [-0.82, -0.32, 0.25, 0.8].entries()) {
        const z = displayZ + offset, material = (row + i) % 3 === 0 ? m.steel : gold;
        const height = 0.16 + ((i + row * 2) % 4) * 0.055;
        box(0.13, 0.06, 0.15, displayX, y + 0.055, z, displayFrame);
        pole(0.025, 0.11, displayX, y + 0.14, z, material);
        const trophy = new T.Mesh(cup, material);
        trophy.position.set(displayX, y + 0.195 + height / 2, z);
        trophy.scale.y = height;
        visual.add(trophy);
      }
    }
    const clearGlass = m.glass.clone();
    clearGlass.color.set("#d7e2dd");
    clearGlass.opacity = 0.18;
    box(0.035, 1.9, 2.25, displayX - 0.21, 1.11, displayZ, clearGlass, true);
    sign("CECYT", displayX - 0.23, 2.02, displayZ, 0.96, -Math.PI / 2);
    // Macetas de madera con follaje ligero junto a las ventanas.
    const leafGeo=new T.SphereGeometry(.055,4,3);
    for(const px of [-.7,7.8]) {
      for(const side of [-1,1])for(let row=0;row<3;row++) {
        box(.68,.12,.04,px,.1+row*.14,z+.65+side*.32,m.wood);
        box(.04,.12,.68,px+side*.32,.1+row*.14,z+.65,m.wood);
      }
      box(.6,.05,.6,px,.43,z+.65,m.bark);
      beam(v3(px,.4,z+.65),v3(px,1.85,z+.65),.035,m.bark);
      for(let i=0;i<30;i++) {
        const angle=i*2.4, height=.8+(i%6)*.19;
        const tip=v3(px+Math.cos(angle)*.42,height+.12,z+.65+Math.sin(angle)*.42);
        beam(v3(px,height-.2,z+.65),tip,.008,m.bark);
        const leaf=new T.Mesh(leafGeo,m.leaves[i%3]);leaf.position.copy(tip);
        leaf.scale.set(3.4,.5,1);leaf.rotation.y=-angle;visual.add(leaf);
      }
    }
    // Estante verde en el antiguo hueco rotulado Recepción: pared cerrada detrás.
    // Estante verde desplazado a la izquierda
    // Estante verde y gabinete movidos bien a la izquierda (entre ventana y columna)
    const shelfGreen=new T.MeshStandardMaterial({color:"#254c3d",roughness:.72});
    const sx = -5.4 // Acomodado justo a la izquierda de la columna
    box(.85,.52,.48,sx,.3,z+.38,shelfGreen,true);
    for(const dx of [-.38,.38])box(.045,1.65,.045,sx+dx,1.25,z+.2,shelfGreen);
    for(const y of [.85,1.25,1.65,2.05]) {
      const shelf=box(.82,.045,.4,sx,y,z+.38,shelfGreen);
      shelf.rotation.x=.22;
    }
    // El gabinete cerrado se acomoda al lado del estante, salvando la columna
    box(.55,1.9,.48,sx+0.75,1,z+.32,shelfGreen,true);
    
    // Gabinete de incendio reubicado donde estaba la primera columna
    const red=new T.MeshStandardMaterial({color:"#a92e2b",roughness:.6});
    const ex = -w/2 + 0.5; // X exacto donde estaba la columna eliminada
    box(.55,.7,.18,ex,1.25,z+.18,red,true);
    box(.44,.57,.02,ex,1.25,z+.28,m.glass);
    pole(.105,.52,ex+0.45,1.55,z+.22,red);
    box(.15,.07,.12,ex+0.45,1.85,z+.22,m.metal);
    beam(v3(ex+0.51,1.82,z+.25),v3(ex+0.6,1.42,z+.25),.018,m.metal);
  },PLAZA_LEVEL);
  // ---- Sala Manfred: anfiteatro con gradas que bajan hacia el escenario y el pizarrón al norte (fondo),
  // el frente curvo hacia la rampa del Bloque 1 y la fachada vidriada con la entrada en la curva. Sus muros
  // bajan hasta cerrar el foso, que queda por debajo del nivel de la plataforma. ----
  frame(plan.manfred, () => {
    const [w, d] = plan.manfred.size, bulge = plan.manfred.bulge, zf = d / 2 - bulge, hw = 3.6;
    const outline = bulgedOutline(w, d, bulge);

    // Foso 0,15 m sobre el terreno, como al diseñarlo con la plataforma a 1,40 m (pitY = −1,25): al bajar
    // la plataforma a 0,90 m quedaba bajo el césped. La bajada se reparte entre las cinco gradas.
    const pitY = -(PLAZA_LEVEL - 0.15);
    const wallYMin = pitY - 0.1; // Extensión hacia abajo para cerrar el hueco inferior

    // 1. TECHO Y CIELORRASO
    prism(outline, hw, 0.22, m.concrete, false);
    pave(outline, m.roofUnder, hw - 0.01);

    // 2. PAREDES DE LADRILLO VISTO (EXTENDIDAS HASTA wallYMin)
    const privacyGlass = new T.MeshStandardMaterial({ color: "#d0cdc4", roughness: 0.72 });

    const wallH = hw - wallYMin;
    const wallCenterY = (hw + wallYMin) / 2;

    // Pared trasera
    box(w + .8, wallH, 0.2, -.4, wallCenterY, -d / 2 + 0.1, m.brick, true);
    // Paredes laterales rectas (-x y +x)
    // Retorno lateral hasta el extremo prolongado del paño diagonal; el edificio no se traslada.
    const returnA=outline[0], returnB=outline[outline.length-1];
    box(Math.hypot(returnB[0]-returnA[0],returnB[1]-returnA[1]),wallH,.2,
      (returnA[0]+returnB[0])/2,wallCenterY,(returnA[1]+returnB[1])/2,m.brick,true,
      {rotation:-Math.atan2(returnB[1]-returnA[1],returnB[0]-returnA[0])});
    box(0.2, wallH, zf + d / 2, w / 2 - 0.1, wallCenterY, (zf - d / 2) / 2, m.brick, true);

    // Frente local con la puerta abierta y los paños de la versión del compañero.
    const facade = outline.slice(2);
    for (let i=0;i<facade.length-1;i++) {
      const a=facade[i], b=facade[i+1], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if (i === 2) {
        // Puerta en el paño diagonal hacia la rampa, según la flecha del usuario.
        const bays = Math.ceil(length / 1.2), doorBay = 2;
        frame({center:[(a[0]+b[0])/2,(a[1]+b[1])/2],size:[length,.12],
          angle:Math.atan2(a[1]-b[1],a[0]-b[0])},()=>{
          glazing(length, 0, doorBay, bays, privacyGlass);
          box(.055,3,.08,length/2,1.55,0,m.blue);
          box(length,hw-3,.2,0,(hw+3)/2,0,m.brick,true);
          sign("SALA MANFRED STARK", -length/2+length*(doorBay-.5)/bays,1.63,.06,.88);
        });
        continue;
      }
      frame({center:[(a[0]+b[0])/2,(a[1]+b[1])/2],size:[length,.12],
        angle:Math.atan2(b[1]-a[1],b[0]-a[0])},()=>{
        box(length,2.6-wallYMin,.12,0,(2.6+wallYMin)/2,0,privacyGlass,true);
        box(length,hw-2.6,.12,0,(hw+2.6)/2,0,m.glass,true);
        const bays=Math.ceil(length/1.15);
        for(let j=0;j<=bays;j++)box(.065,hw,.16,-length/2+length*j/bays,hw/2,0,m.blue);
        for(const y of [.05,.8,1.65,2.6,hw])box(length,.055,.16,0,y,0,m.blue);
      });
    }

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
    const rowRise = -pitY / rowsZ.length;
    rowsZ.forEach((z, k) => {
      const stepY = -rowRise * k;
      box(rowWidth, 0.2, rowDepth, 0, stepY - 0.1, z, m.tile, true);

      const nextY = k < rowsZ.length - 1 ? -rowRise * (k + 1) : pitY;
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

  // El techo sigue la misma banda recta del suelo entre Manfred y administración.
  prism(plan.corridor, PLAZA_LEVEL + 3.6, 0.2, m.concrete, false);
  // Cubierta continua sobre el desembarco y la franja exterior de Manfred.
  for (const outline of [plan.platform[2], plan.platform[3]]) {
    prism(outline, PLAZA_LEVEL + 3.6, 0.2, m.concrete, false);
  }
  {
    const [a,b,c,d]=plan.corridor;
    for(const t of [.12,.32,.52,.72,.92]) {
      for(const [start,end] of [[a,d],[b,c]]) {
        // Frente de Manfred libre de los apoyos señalados.
        if(start===a && t<=.52) continue;
        const x=start[0]+(end[0]-start[0])*t,z=start[1]+(end[1]-start[1])*t;
        pole(.16,3.6,x,PLAZA_LEVEL+1.8,z,m.concrete,true);
      }
      const x=(a[0]+b[0])/2+((c[0]+d[0]-a[0]-b[0])/2)*t;
      const z=(a[1]+b[1])/2+((c[1]+d[1]-a[1]-b[1])/2)*t;
      box(.18,.055,1.1,x,PLAZA_LEVEL+3.5,z,m.white,false,{rotation:-gridAngle});
    }
  }

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
    pave(plan.platform[2].map(inCantina), terrace, 0.461);
    // Jardín continuo: reemplaza los bloques verticales por terreno que desciende
    // gradualmente al suelo. La única subida junto al acceso son 3 × 15 cm.
    const lawnVertices: number[] = [], lawnUV: number[] = [];
    const [tileX, tileZ] = grass.userData.tile as [number, number];
    function lawnTriangle(a: Vec2, b: Vec2, c: Vec2) {
      for (const [x, z] of [a, b, c]) {
        lawnVertices.push(x, gardenHeight(x, z) - (PLAZA_LEVEL - 0.45), z);
        const [fx, fz] = fromRect(plan.cantina, [x, z]);
        const [worldX, , worldZ] = facultyToWorld([fx, 0, fz]);
        lawnUV.push(worldX / tileX, worldZ / tileZ);
      }
    }
    // Ambas plantas tienen lados paralelos a esta malla. Cortarla en sus esquinas
    // mantiene el césped y su colisión fuera de las salas, incluso donde sube el jardín.
    const footprints = facultyAnnexes.filter(b => b.id === "lab-maquetas" || b.id === "cta-dicia")
      .map(b => b.outline.map(p => inCantina(fromRect(b.rect, p))));
    function lawnCuts(min: number, max: number, axis: 0 | 1) {
      const cuts = new Set(Array.from({ length: max - min + 1 }, (_, i) => min + i));
      for (const polygon of footprints) for (const point of polygon) {
        const value = Math.round(point[axis] * 1e5) / 1e5;
        if (value > min && value < max) cuts.add(value);
      }
      return [...cuts].sort((a, b) => a - b);
    }
    const xs = lawnCuts(gardenBounds.minX, gardenBounds.maxX, 0);
    const zs = lawnCuts(gardenBounds.minZ, gardenBounds.maxZ, 1);
    for (let i = 1; i < xs.length; i++) for (let j = 1; j < zs.length; j++) {
      const x = xs[i - 1], z = zs[j - 1], nextX = xs[i], nextZ = zs[j];
      const center: Vec2 = [(x + nextX) / 2, (z + nextZ) / 2];
      if (footprints.some(outline => insidePolygon(center, outline))) continue;
      lawnTriangle([x, z], [x, nextZ], [nextX, z]);
      lawnTriangle([nextX, z], [x, nextZ], [nextX, nextZ]);
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
    const staffExitZ = -2.35, staffExitWidth = 1.1;
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
    for (const [a, b] of [[-front, exitZ - exitWidth / 2], [exitZ + exitWidth / 2, staffExitZ - staffExitWidth / 2], [staffExitZ + staffExitWidth / 2, front]])
      box(0.24, 4.8, b - a, -w / 2, 2.85, (a + b) / 2, m.brick, true);
    box(0.24, wallTop - 3.2, exitWidth, -w / 2, (wallTop + 3.2) / 2, exitZ, m.brick, true);
    box(0.24, wallTop - 3.2, staffExitWidth, -w / 2, (wallTop + 3.2) / 2, staffExitZ, m.brick, true);
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
    // Acceso del personal a la cocina curva adosada; la puerta pública sigue al exterior.
    for (const [doorZ, doorWidth, doorMaterial] of [
      [exitZ, exitWidth, windowGlass], [staffExitZ, staffExitWidth, m.white],
    ] as const) {
      frame({ center: [-w / 2, doorZ], size: [doorWidth, 0.1], angle: -Math.PI / 2 }, () => {
        for (const x of [-doorWidth / 2, doorWidth / 2]) box(0.065, 2.75, 0.12, x, 1.825, 0, aluminum);
        box(doorWidth, 0.065, 0.12, 0, 3.2, 0, aluminum);
        frame({ center: [-doorWidth / 2, doorZ === staffExitZ ? -0.17 : 0], size: [doorWidth, 0.1],
          angle: doorZ === staffExitZ ? Math.PI : -Math.PI / 2 }, () => {
          box(doorWidth - 0.08, 2.66, 0.035, doorWidth / 2, 1.82, 0, doorMaterial, true);
          for (const x of [0, doorWidth]) box(0.04, 2.72, 0.06, x, 1.82, 0, aluminum);
          for (const y of [0.46, 3.18]) box(doorWidth, 0.04, 0.06, doorWidth / 2, y, 0, aluminum);
          box(0.035, 0.5, 0.1, doorWidth - 0.16, 1.6, 0.06, aluminum);
        });
        if (doorZ === staffExitZ) return; // La cocina comparte el piso, sin peldaños interiores.
        box(2.2, PLAZA_LEVEL + 0.45, 1.35, 0, (0.45 - PLAZA_LEVEL) / 2, -0.65, m.stone, true);
        const ground = gardenHeight(-w / 2 - 2.8, doorZ) - (PLAZA_LEVEL - 0.45);
        for (let i = 0; i < 3; i++) {
          const top = 0.45 - (i + 1) * (0.45 - ground) / 3;
          box(2.2, PLAZA_LEVEL + top, 0.5, 0, (top - PLAZA_LEVEL) / 2, -1.55 - i * 0.5, stepStone);
        }
        ramp(v3(0, ground, -2.8), v3(0, 0.45, -1.3), 2.2);
      });
    }
    // Cocina de la foto aérea: media circunferencia de ladrillo, más baja que el salón.
    // El diámetro se apoya en la pared izquierda y encierra la puerta del personal.
    const kitchenRadius = 3.4, kitchenZ = 2.8, kitchenSegments = 40;
    const kitchenPoint = (angle: number, radius = kitchenRadius): Vec2 =>
      [-w / 2 - Math.sin(angle) * radius, kitchenZ + Math.cos(angle) * radius];
    const kitchenOutline = Array.from({ length: kitchenSegments + 1 }, (_, i) =>
      kitchenPoint(i * Math.PI / kitchenSegments));
    // Conexión de servicio desde la puerta derecha hasta la cocina curva existente.
    const [serviceX, serviceZ] = kitchenPoint(32 * Math.PI / kitchenSegments);
    const serviceEnd = staffExitZ - staffExitWidth / 2 - 0.15;
    const serviceWidth = -w / 2 - serviceX, serviceLength = serviceZ - serviceEnd;
    const serviceCenterX = (serviceX - w / 2) / 2, serviceCenterZ = (serviceZ + serviceEnd) / 2;
    box(serviceWidth, PLAZA_LEVEL + 0.45, serviceLength, serviceCenterX,
      (0.45 - PLAZA_LEVEL) / 2, serviceCenterZ, m.concrete, true);
    box(serviceWidth, 0.025, serviceLength, serviceCenterX, 0.4625, serviceCenterZ, terrace);
    box(0.23, 2.9, serviceLength, serviceX, 1.9, serviceCenterZ, m.brick, true);
    box(serviceWidth, 2.9, 0.23, serviceCenterX, 1.9, serviceEnd, m.brick, true);
    box(serviceWidth + 0.23, 0.12, serviceLength, serviceCenterX, 3.41, serviceCenterZ, m.roof, true);
    prism(kitchenOutline, -PLAZA_LEVEL, PLAZA_LEVEL + 0.45, m.concrete);
    pave(kitchenOutline, terrace, 0.463);
    const kitchenRing = (a: number, b: number, outer: number, inner: number): Vec2[] =>
      [kitchenPoint(a, outer), kitchenPoint(b, outer), kitchenPoint(b, inner), kitchenPoint(a, inner)];
    for (let i = 0; i < kitchenSegments; i++) {
      if (i >= 32) continue; // Apertura real hacia el corredor de servicio techado.
      const a = i * Math.PI / kitchenSegments, b = (i + 1) * Math.PI / kitchenSegments;
      const wall = kitchenRing(a, b, kitchenRadius, kitchenRadius - 0.23);
      // Ventana horizontal en el tramo curvo que mira a la explanada.
      const hasWindow = i >= 5 && i < 15;
      if (hasWindow) {
        prism(wall, 0.45, 1.25, m.brick);
        prism(wall, 2.35, 1.35, m.brick);
        prism(kitchenRing(a, b, kitchenRadius - 0.1, kitchenRadius - 0.135), 1.7, 0.65, windowGlass);
        for (const y of [1.68, 2.35]) prism(wall, y, 0.055, aluminum, false);
        if (i === 5 || i === 14) {
          const edge = i === 5 ? a : b;
          prism(kitchenRing(edge - 0.008, edge + 0.008, kitchenRadius, kitchenRadius - 0.23), 1.7, 0.65, aluminum);
        }
      } else prism(wall, 0.45, 3.25, m.brick);
      // Remate continuo del parapeto sobre la cubierta baja.
      prism(kitchenRing(a, b, kitchenRadius + 0.035, kitchenRadius - 0.265), 3.7, 0.07, m.stone, false);
    }
    prism(kitchenOutline, 3.35, 0.12, m.roof);
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
      // Hueco alineado con la salida del personal en el muro exterior del fondo.
      for (const [a, b] of [[-5.4, 1.7], [3, 4.4]])
        box(b - a, 3.1, 0.15, (a + b) / 2, 2, -2.05, backing);
      box(1.3, 0.6, 0.15, 2.35, 3.25, -2.05, backing);
      box(11.3, 0.6, 3.9, -0.65, 3.8, -0.1, cream);
      for (const x of [-6.15, 3.15]) box(0.25, 3.1, 0.7, x, 2, -1.8, cream);
      // El extremo izquierdo queda cerrado junto a la fachada.
      box(0.16, 1.04, 3.4, -6.12, 0.97, 0.1, terracotta, true);
      box(0.2, 3.1, 0.35, -6.12, 2, 1.3, cream, true);
      // Acceso del personal al extremo derecho del mostrador.
      box(0.22, 3.1, 0.35, 3.4, 2, 1.3, dark, true);
      // Divisoria blanca entre atención y pasillo público.
      box(0.18, 3.1, 3.7, 3.55, 2, -0.35, cream, true);

      // Giro adicional del frente de venta en planta, alrededor de su extremo izquierdo.
      // Mesada, ladrillos, vitrina, bandejas y caja comparten exactamente ese giro.
      function counterFrame(build: () => void) {
        const vg = new T.Group(), cg = new T.Group();
        const pivot = v3(-6.2, 0, 1.3);
        const matrix = new T.Matrix4().makeTranslation(pivot.x, 0, pivot.z)
          .multiply(new T.Matrix4().makeRotationY(0.14))
          .multiply(new T.Matrix4().makeTranslation(-pivot.x, 0, -pivot.z));
        vg.applyMatrix4(matrix); cg.applyMatrix4(matrix);
        const pv = visual, ps = solid; pv.add(vg); ps.add(cg); visual = vg; solid = cg;
        build(); visual = pv; solid = ps;
      }
      counterFrame(() => {
        // Frente de ladrillos huecos: huecos reales entre piezas, interior oscuro detrás.
        const counterLeft = -6.25, counterRight = 1.9;
        const counterWidth = counterRight - counterLeft, counterCenter = (counterLeft + counterRight) / 2;
        box(counterWidth, 0.72, 0.8, counterCenter, 0.83, 1.3, black, true);
        for (let row = 0; row < 6; row++) {
          const y = 0.53 + row * 0.105;
          box(counterWidth, 0.035, 0.045, counterCenter, y, 1.73, terracotta);
          for (let x = counterLeft + 0.04; x < counterRight; x += 0.16) box(0.035, 0.105, 0.045, x, y + 0.05, 1.73, terracotta);
        }
        box(counterWidth + 0.2, 0.09, 1, counterCenter, 1.22, 1.3, black);
        // Puerta blanca abierta en el espacio recortado al extremo derecho.
        for (const x of [2.05, 3.35]) box(0.055, 2.75, 0.12, x, 1.825, 1.3, aluminum, true);
        box(1.35, 0.065, 0.12, 2.7, 3.2, 1.3, aluminum);
        // Dos paños centrales bajos y un módulo derecho más alto, según la foto.
        const edges = [-3.2, -1.52, 0.16, 1.85];
        for (let i = 0; i < 3; i++) {
          const a = edges[i], b = edges[i + 1], width = b - a;
          const x = (a + b) / 2, top = i === 2 ? 2.18 : 1.76;
          box(width - 0.05, top - 1.26, 0.035, x, (top + 1.26) / 2, 1.77, displayGlass);
          for (const edge of [a, b]) box(0.05, top - 1.22, 0.07, edge, (top + 1.22) / 2, 1.78, black);
          for (const y of [1.26, top]) box(width, 0.05, 0.95, x, y, 1.32, black);
          // Tapa de vidrio y lateral visible en el salto de altura del módulo derecho.
          box(width - 0.06, 0.025, 0.85, x, top - 0.02, 1.32, displayGlass);
          if (i === 2) box(0.025, top - 1.26, 0.85, a, (top + 1.26) / 2, 1.32, displayGlass);
          box(width - 0.08, 0.025, 0.75, x, 1.45, 1.35, aluminum);
        }
        for (const y of [1.29, 1.47]) {
          box(4.9, 0.015, 0.02, -0.675, y + 0.14, 1.65, light);
          for (let i = 0; i < 10; i++) {
            const x = -2.85 + i * 0.48;
            box(0.48, 0.025, 0.43, x, y, 1.35, m.white);
            if (i < 5) {
              const food = pole(0.10, 0.26, x, y + 0.1, 1.35, tableTop); food.rotation.z = Math.PI / 2;
            } else box(0.32, 0.12, 0.25, x, y + 0.08, 1.35, i % 2 ? m.leaves[1] : terracotta);
          }
        }
      });
      // Hoja abierta paralela a la divisoria para no invadir la circulación detrás de la caja.
      box(0.045, 2.66, 1.22, 3.26, 1.82, -0.64, cream, true);
      box(0.09, 0.4, 0.035, 3.2, 1.65, -1.15, aluminum);
      // Fondo desplazado en conjunto hacia la izquierda y atrás para ampliar el paso.
      frame({ center: [-2, -0.3], size: [9, 1], angle: 0 }, () => {
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
        box(3.4, 0.9, 0.65, 2.15, 0.93, -1.55, aluminum, true);
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
        box(1.05, 0.63, 0.6, 2.5, 1.65, -1.42, black);
        box(0.95, 0.16, 0.07, 2.5, 1.7, -1.08, aluminum);
        for (const x of [2.22, 2.72]) { pole(0.025, 0.16, x, 1.48, -1.07, aluminum); pole(0.06, 0.1, x, 1.37, -0.97, m.white); }
        box(0.27, 0.32, 0.3, 3.4, 1.55, -1.43, aluminum);
        pole(0.1, 0.25, 3.4, 1.82, -1.43, displayGlass);
      });
      counterFrame(() => {
        box(0.5, 0.08, 0.4, -5, 1.31, 1.3, black);
        box(0.45, 0.35, 0.09, -5, 1.54, 1.1, black);
        box(0.37, 0.25, 0.012, -5, 1.55, 1.155, light);
      });
      counterFrame(() => {
        box(0.46, 0.54, 0.06, 0.7, 1.55, 1.4, tableTop);
        box(0.39, 0.46, 0.025, 0.7, 1.56, 1.44, black);
      });
      // TV en el extremo izquierdo, orientada en diagonal hacia las mesas.
      frame({ center: [-5.1, 1.05], size: [1.7, 0.1], angle: -0.5 }, () => {
        box(1.7, 1.02, 0.08, 0, 3.02, 0, black);
        box(1.55, 0.88, 0.015, 0, 3.02, 0.05, new T.MeshStandardMaterial({ color: "#101414", roughness: 0.2 }));
        beam(v3(0, 3.55, 0), v3(0, 3.8, 0), 0.035, black);
      });
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
    function chair(x: number, z: number, facing: number, perforated = false, raised = 0, yaw = 0) {
      frame({ center: [x, z], size: [0.5, 0.5], angle: (facing > 0 ? 0 : Math.PI) + yaw }, () => {
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
    // Sillones exteriores de hierro: respaldo de rombos, asiento de listones y brazos curvos.
    // Las posiciones se conservan; solo cambia el modelo utilizado en el exterior.
    function ironChair(x: number, z: number, facing: number, yaw = 0) {
      frame({ center: [x, z], size: [0.62, 0.6], angle: (facing > 0 ? 0 : Math.PI) + yaw }, () => {
        for (let i = 0; i < 6; i++) box(0.52, 0.032, 0.065, 0, 0.91, -0.19 + i * 0.075, blackFurniture);
        for (const dx of [-0.23, 0.23]) for (const dz of [-0.19, 0.2])
          beam(v3(dx, 0.9, dz), v3(dx * 1.2, 0.48, dz * 1.3), 0.022, blackFurniture);
        for (const y of [1.01, 1.45]) box(0.59, 0.045, 0.045, 0, y, 0.24 + (y - 1.01) * 0.18, blackFurniture);
        for (const dx of [-0.275, 0.275]) beam(v3(dx, 0.91, 0.22), v3(dx, 1.46, 0.32), 0.024, blackFurniture);
        for (const sign of [-1, 1]) for (let b = -0.36; b <= 0.361; b += 0.12) {
          const lo = Math.max(-0.24, sign > 0 ? -0.18 - b : b - 0.18);
          const hi = Math.min(0.24, sign > 0 ? 0.18 - b : b + 0.18);
          if (hi <= lo) continue;
          const y0 = 1.23 + sign * lo + b, y1 = 1.23 + sign * hi + b;
          beam(v3(lo, y0, 0.24 + (y0 - 1.01) * 0.18), v3(hi, y1, 0.24 + (y1 - 1.01) * 0.18), 0.011, blackFurniture);
        }
        for (const side of [-1, 1]) {
          const arm = new T.CatmullRomCurve3([v3(side * 0.28, 0.9, -0.2), v3(side * 0.3, 1.13, -0.23), v3(side * 0.3, 1.19, 0.01), v3(side * 0.28, 1.2, 0.27)]);
          const mesh = new T.Mesh(new T.TubeGeometry(arm, 16, 0.021, 6, false), blackFurniture);
          mesh.castShadow = true; visual.add(mesh);
          beam(v3(side * 0.25, 0.8, 0.16), v3(side * 0.29, 1.15, 0.03), 0.013, blackFurniture);
        }
      });
      furnitureBody(0.62, 0.5, 0.58, x, 0.72, z);
    }
    // Mesas cuadradas de madera, sin invadir el pasillo junto a la puerta.
    for (const [column, x] of [-2.4, 1.1, 4.5, 7.5].entries()) for (const z of [-1.7, 3.6]) {
      box(1.1, 0.05, 1.05, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.68, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.1, 0.73, 1.05, x, 0.84, z);
      for (const side of [-1, 1]) chair(x, z + side * 0.88, side, column % 2 === 0);
      pole(0.045, 0.12, x, 1.28, z, m.white);
    }
    // Contra la pared: alternar mesas altas y bajas, como en la foto de Horacio.
    // Sin sillas detrás de las mesas ni separaciones amplias respecto del muro.
    for (const x of [-2.3, 3.3]) {
      box(1.5, 0.045, 0.65, x, 1.55, -5.48, blackFurniture);
      for (const dx of [-0.62, 0.62]) for (const dz of [-0.23, 0.23]) pole(0.022, 1.05, x + dx, 1, -5.48 + dz, blackFurniture);
      furnitureBody(1.5, 1.1, 0.65, x, 1, -5.48);
      for (const side of [-1, 1]) chair(x + side * 1.03, -5.18, 1, false, 0.3, -side * Math.PI / 2);
    }
    for (const x of [0.5, 6.4]) {
      box(1.25, 0.05, 0.85, x, 1.2, -5.38, tableTop);
      pole(0.055, 0.7, x, 0.83, -5.38, blackFurniture);
      box(0.68, 0.045, 0.45, x, 0.5, -5.38, blackFurniture);
      furnitureBody(1.25, 0.73, 0.85, x, 0.84, -5.38);
      for (const side of [-1, 1]) {
        chair(x + side * 0.98, -5.12, 1, false, 0, -side * Math.PI / 2);
        chair(x + side * 0.34, -4.48, 1, true);
      }
      pole(0.045, 0.12, x, 1.28, -5.38, m.white);
    }
    // Dos conjuntos frente a la entrada: cuatro sillas, una en cada lado de la mesa.
    // Reemplazan los bancos anteriores y dejan el acceso central despejado.
    for (const x of [-3.4, 4.8]) {
      const z = front + 2.6;
      box(1.2, 0.055, 1.1, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.65, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.2, 0.73, 1.1, x, 0.84, z);
      for (const side of [-1, 1]) {
        ironChair(x, z + side * 0.95, side);
        ironChair(x + side * 1, z, 1, -side * Math.PI / 2);
      }
    }
    // Mobiliario de terraza; el paso de blindex queda despejado entre las mesas.
    for (const z of [-3.7, -0.3, 5.1]) {
      const x = w / 2 + 2.6;
      box(1.2, 0.055, 0.9, x, 1.2, z, tableTop);
      pole(0.055, 0.7, x, 0.83, z, blackFurniture);
      box(0.65, 0.045, 0.45, x, 0.5, z, blackFurniture);
      furnitureBody(1.2, 0.73, 0.9, x, 0.84, z);
      for (const side of [-1, 1]) ironChair(x, z + side * 0.88, side);
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
  // ---- Anexos del plano general: exteriores provisionales, sin interiores relevados ----
  type AnnexOpening = { center: number; width: number; height: number };
  const workshopBrick = officeBrick.clone();
  workshopBrick.color.set("#ffb4a0");
  const workshopMetal = new T.MeshStandardMaterial({ color: "#353a41", roughness: 0.78 });

  function workshopRoof(width: number, start: number, end: number, eave: number) {
    const half = (end - start) / 2, ridge = start + half, rise = 1.15;
    for (const side of [-1, 1]) {
      const x = side * width / 2;
      slopedWall(x, start, ridge, eave, eave + rise, eave, workshopBrick);
      slopedWall(x, ridge, end, eave + rise, eave, eave, workshopBrick);
      box(width - 0.2, 0.10, Math.hypot(half, rise) + 0.06, 0, eave + rise / 2,
        ridge + side * half / 2, workshopMetal, true, { pitch: side * Math.atan2(rise, half) });
    }
  }

  // Frente de los portones hacia la cantina.
  function workshopFront(x: number, z0: number, z1: number, h: number, tall: boolean, sharedEnd = false) {
    const z = (z0 + z1) / 2, width = tall ? 3.0 : 2.4, gateH = tall ? 3.15 : 2.75;
    // Los pilares de los extremos quedan dentro de la longitud total del frente.
    for (const end of sharedEnd ? [z0 + 0.165] : [z0, z1 - 0.165])
      box(0.30, h + 0.13, 0.33, x, (h + 0.13) / 2, end, workshopBrick);
    box(0.035, 0.26, z1 - z0, x + 0.108, gateH + 0.12, z, workshopMetal);
    if (tall) box(0.035, 0.22, z1 - z0, x + 0.108, h - 0.20, z, workshopMetal);
    box(0.065, gateH, width, x + 0.14, gateH / 2 + 0.05, z, workshopMetal);
    const ribs = Math.round(width / 0.14);
    for (let i = 0; i <= ribs; i++)
      box(0.045, gateH, 0.029, x + 0.18, gateH / 2 + 0.05, z - width / 2 + i * width / ribs, workshopMetal);
    box(0.075, gateH, 0.06, x + 0.19, gateH / 2 + 0.05, z, m.metal);
    box(0.06, 0.065, width, x + 0.19, gateH * 0.49, z, workshopMetal);
    for (const side of [-1, 1])
      box(0.065, 0.20, 0.035, x + 0.23, 1.23, z + side * 0.085, m.metal);
    box(0.57, 0.075, width + 0.48, x + 0.35, gateH + 0.24, z, workshopMetal);
    if (tall) {
      beam(v3(x + 0.10, h - 1.0, z), v3(x + 0.52, h - 0.73, z), 0.027, workshopMetal);
      pole(0.15, 0.075, x + 0.52, h - 0.77, z, workshopMetal);
      pole(0.11, 0.11, x + 0.52, h - 0.86, z, m.white);
    }
    const plaqueOffset = (width / 2 + (z1 - z) - 0.15) / 2;
    const plaqueZ = tall ? z + plaqueOffset : z - plaqueOffset;
    const plaqueWidth = Math.min(0.52, z1 - z - width / 2 - 0.25);
    box(0.033, 0.75, plaqueWidth, x + 0.115, 1.72, plaqueZ, m.blue);
    sign("CyT", x + 0.137, 1.94, plaqueZ, plaqueWidth, Math.PI / 2);
  }
  // La unión y los edificios comparten ladrillo, ventanas y dinteles. Los vanos
  // se descuentan también de las colisiones, para comunicar realmente los interiores.
  function annexWall(a: Vec2, b: Vec2, h: number, openings: AnnexOpening[] = [], masonry = false) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    const opts = { rotation: -angle };
    const parts = spans(-length / 2, length / 2,
      openings.map((opening): Range => [opening.center - opening.width / 2, opening.center + opening.width / 2]));
    for (const [start, end] of parts) {
      const mid = (start + end) / 2, x = cx + mid * Math.cos(angle), z = cz + mid * Math.sin(angle);
      if (masonry) {
        box(end - start, h, 0.2, x, h / 2, z, workshopBrick, true, opts);
        continue;
      }
      box(end - start, 1, 0.2, x, 0.55, z, m.brick, true, opts);
      box(end - start, h - 2.5, 0.2, x, (h + 2.5) / 2, z, m.brick, true, opts);
      box(end - start, 1.45, 0.08, x, 1.78, z, m.glass, true, opts);
      const count = Math.ceil((end - start) / 2.4);
      for (let k = 0; k <= count; k++) {
        const t = start + (end - start) * k / count;
        box(0.1, 1.5, 0.16, cx + t * Math.cos(angle), 1.78, cz + t * Math.sin(angle), m.metal, false, opts);
      }
    }
    for (const opening of openings) {
      box(opening.width, h - opening.height, 0.2,
        cx + opening.center * Math.cos(angle), (h + opening.height) / 2,
        cz + opening.center * Math.sin(angle), masonry ? workshopBrick : m.brick, true, opts);
    }
  }

  for (const annex of facultyAnnexes) frame(annex.rect, () => {
    const h = annex.height, outline = annex.outline;
    const isMaquetas = annex.id === "lab-maquetas";
    const maxZ = Math.max(...outline.map((p) => p[1]));
    // Desde el extremo del pasillo, los primeros 9,50 m corresponden a la nave alta.
    const roofBreakZ = maxZ - 9.50, lowEave = 3.55;
    prism(outline, -0.1, 0.15, m.concrete);
    if (isMaquetas) {
      workshopRoof(annex.rect.size[0], roofBreakZ, maxZ, h);
      box(annex.rect.size[0], 0.12, roofBreakZ + maxZ, 0, lowEave + 0.06, (roofBreakZ - maxZ) / 2, workshopMetal, true);
      box(annex.rect.size[0], h - lowEave, 0.2, 0, (h + lowEave) / 2, roofBreakZ, workshopBrick, true);
    }
    else prism(outline, h, 0.18, m.roof);
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const front = a[1] === maxZ && b[1] === maxZ;
      if (isMaquetas && front) {
        // Muro continuo de Maquetas junto al pasillo de Bedelía.
        annexWall([a[0], maxZ - 0.1], [b[0], maxZ - 0.1], h, [], true);
        continue;
      }
      const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      const portal = annexEnclosedLink.portals.find((p) => p.annexId === annex.id
        && Math.abs((p.center[0] - cx) * Math.sin(angle) - (p.center[1] - cz) * Math.cos(angle)) < 0.001
        && Math.hypot(p.center[0] - cx, p.center[1] - cz) < length / 2);
      const openings: AnnexOpening[] = portal ? [{
        center: (portal.center[0] - cx) * Math.cos(angle) + (portal.center[1] - cz) * Math.sin(angle),
        width: annexEnclosedLink.clearWidth, height: annexEnclosedLink.openingHeight,
      }] : front ? [{ center: 0, width: 2.1, height: 2.5 }] : [];
      if (isMaquetas && a[0] === b[0]) {
        annexWall([a[0], -maxZ], [a[0], roofBreakZ], lowEave, [], true);
        annexWall([a[0], roofBreakZ], [a[0], maxZ], h, [], true);
        if (a[0] > 0) {
          workshopFront(a[0], roofBreakZ, maxZ, h, true);
          workshopFront(a[0], -maxZ, roofBreakZ, lowEave, false, true);
        }
      } else if (isMaquetas) {
        annexWall([a[0], -maxZ + 0.1], [b[0], -maxZ + 0.1], lowEave, [], true);
      } else {
        annexWall(a, b, h, openings);
      }
      if (front) {
        if (!portal) box(3.2,0.12,1.4,cx,2.9,cz+0.6,m.concrete);
        sign(annex.name.toUpperCase(),cx,portal ? 3.4 : 3.25,cz+0.13,portal ? 2.6 : Math.min(annex.rect.size[0]-1,9));
      }
    }
    if (!isMaquetas) box(annex.rect.size[0]+1,0.08,2.1,0,0.01,maxZ+1.1,m.stone);
  });
  annexPaths.forEach((points) => path(points, 2));
  // Baldosas hasta la esquina de DICIA; desde allí sigue el caminero exterior.
  {
    const walk = plan.bedeliaWalk;
    const levelEnd = walk.size[0] / 2, roofEnd = levelEnd + diciaWalkExtension;
    const pathEnd = (annexWalkEnd[0] - walk.center[0]) * Math.cos(walk.angle)
      + (annexWalkEnd[1] - walk.center[1]) * Math.sin(walk.angle);
    for (const [from, to, material] of [[levelEnd, roofEnd, passageTile], [roofEnd, pathEnd, m.stone]] as const) {
      const strip = new T.PlaneGeometry(1, 1, Math.ceil((to - from) / 0.4), 2);
      const pos = strip.attributes.position, uv = strip.attributes.uv;
      const [tileX, tileZ] = material.userData.tile;
      for (let i = 0; i < pos.count; i++) {
        const along = T.MathUtils.lerp(from, to, uv.getX(i)), side = (0.5 - uv.getY(i)) * walk.size[1];
        const point = fromRect(walk, [along, side]);
        pos.setXYZ(i, point[0], annexPavingHeight(point), point[1]);
        uv.setXY(i, along / tileX, side / tileZ);
      }
      strip.computeVertexNormals();
      const paving = new T.Mesh(strip, material); paving.receiveShadow = true; visual.add(paving);
      solid.add(new T.Mesh(strip));
    }
  }
  // Pasillo interior LED / DEI: los extremos abiertos coinciden con los vanos
  // de ambos edificios. El pavimento queda prácticamente enrasado con sus pisos.
  frame(annexEnclosedLink.rect, () => {
    const link = annexEnclosedLink, [length, width] = link.rect.size;
    box(length + 0.2, 0.15, width, 0, -0.02, 0, m.concrete, true);
    box(length + 0.2, 0.18, width + 0.2, 0, link.height + 0.09, 0, m.roof, true);
    box(length, 0.08, width - link.wallThickness * 2, 0, link.height - 0.04, 0, m.concrete);
    const galleryZ = (width - link.wallThickness) / 2;
    annexWall([-length / 2, -galleryZ], [length / 2, -galleryZ], link.height);
    annexWall([-length / 2, galleryZ], [length / 2, galleryZ], link.height,
      [{ center: link.sideDoorX, width: link.sideDoorWidth, height: link.openingHeight }]);
    for (const edge of [-1, 1]) box(0.07, link.openingHeight, 0.24,
      link.sideDoorX + edge * (link.sideDoorWidth / 2 + 0.035), link.openingHeight / 2, galleryZ, m.metal);
    box(link.sideDoorWidth + 0.14, 0.07, 0.24,
      link.sideDoorX, link.openingHeight + 0.035, galleryZ, m.metal);
  });
  // La galería exterior de oficinas continúa fuera del nuevo volumen cerrado.
  for (const points of annexCoveredPaths) for (let i=1;i<points.length;i++) {
    const [ax,az]=points[i-1], [bx,bz]=points[i], length=Math.hypot(bx-ax,bz-az);
    box(2.3,0.14,length+0.2,(ax+bx)/2,3.05,(az+bz)/2,m.roof,false,{rotation:Math.atan2(bx-ax,bz-az)});
    path([points[i-1],points[i]],2.3);
    const count=Math.ceil(length/4);
    for(let k=0;k<=count;k++) {
      const t=k/count;
      pole(0.09,3,ax+(bx-ax)*t+(bz-az)/length*1.05,1.5,az+(bz-az)*t-(bx-ax)/length*1.05,m.concrete,true);
    }
  }
  // Suelo de colisión del sector añadido; el césped continuo ya pertenece al contexto.
  const annexCorners=facultyAnnexes.flatMap((a)=>rectCorners(a.rect));
  const xs=annexCorners.map((p)=>p[0]), zs=annexCorners.map((p)=>p[1]);
  const minX=Math.min(...xs)-15,maxX=Math.max(...xs)+15,minZ=Math.min(...zs)-20,maxZ=Math.max(...zs)+15;
  const annexGround=new T.Mesh(unit);
  annexGround.scale.set(maxX-minX,0.1,maxZ-minZ);
  annexGround.position.set((minX+maxX)/2,-0.1,(minZ+maxZ)/2);
  solid.add(annexGround);

  // ---- Caminos entre áreas comunes ----
  const galleryEdge = block1.depth / 2;
  const lawnEdge = 9.55;
  const courtyardConcrete = m.accessStone.clone();
  courtyardConcrete.color.set("#aaaeb0");
  plan.paths.forEach((p, index) => {
    if (index === 0) {
      // Hormigón contiguo a la galería, más angosto del lado del césped.
      const [start, , end] = p;
      pave([
        [start[0] - 0.06, galleryEdge], [end[0], galleryEdge],
        [end[0], lawnEdge], [start[0] - 0.06, lawnEdge],
      ], courtyardConcrete, 0.049);
    } else if (index === 6) {
      // El enlace desde el toldo hasta la plaza ya tiene peldaños y piso propio.
      path(p.slice(1));
    } else if (index !== 3) {
      // El tramo bajo el caminero tiene su propio pavimento.
      path(p);
    }
  });
  {
    // Mobiliario debajo del primer descanso de la escalera exterior.
    const tableX = st.start - st.run - 0.55;
    const tableZ = (galleryEdge + lawnEdge) / 2;
    const floor = 0.049;
    const frameMetal = new T.MeshStandardMaterial({ color: "#2e302d", roughness: 0.69 });
    const benchSeat = new T.MeshStandardMaterial({ color: "#736657", roughness: 0.89 });
    box(2.3, 0.055, 0.82, tableX, floor + 0.77, tableZ, m.steel, true);
    for (const dx of [-1, 1]) for (const dz of [-0.32, 0.32]) {
      box(0.065, 0.74, 0.065, tableX + dx, floor + 0.37, tableZ + dz, frameMetal, true);
    }
    for (const dz of [-1.02, 1.02]) {
      const z = tableZ + dz;
      box(2, 0.055, 0.32, tableX, floor + 0.44, z, benchSeat, true);
      for (const dx of [-0.86, 0.86]) for (const legZ of [-0.12, 0.12]) {
        box(0.045, 0.42, 0.045, tableX + dx, floor + 0.21, z + legZ, frameMetal, true);
      }
    }

    const chairX = tableX - 1.55;
    box(0.45, 0.045, 0.46, chairX, floor + 0.44, tableZ, m.blue, true);
    for (const dz of [-0.19, 0.19]) {
      for (const dx of [-0.18, 0.18]) {
        box(0.038, 0.42, 0.038, chairX + dx, floor + 0.21, tableZ + dz, frameMetal, true);
      }
      beam(v3(chairX - 0.20, floor + 0.43, tableZ + dz),
        v3(chairX - 0.28, floor + 0.93, tableZ + dz), 0.021, frameMetal);
    }
    for (const y of [0.67, 0.76, 0.85, 0.93]) {
      box(0.045, 0.065, 0.43, chairX - 0.20 - (y - 0.43) * 0.16, floor + y, tableZ, m.blue);
    }

    // Sansevierias agrupadas en el borde, dejando libre el cruce con el camino transversal.
    const leaf = new T.BufferGeometry();
    leaf.setAttribute("position", new T.Float32BufferAttribute([
      -0.034, 0, 0, 0.034, 0, 0, -0.055, 0.39, 0.025, 0.055, 0.39, 0.025, 0.013, 1, 0.17,
    ], 3));
    leaf.setAttribute("uv", new T.Float32BufferAttribute([0, 0, 1, 0, 0, 0.39, 1, 0.39, 0.5, 1], 2));
    leaf.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    leaf.computeVertexNormals();
    const plantRow = [[-13, 1.25, 11], [8.5, 1.1, 9], [21.5, 1.15, 10]] as const;
    for (const [start, spacing, count] of plantRow) for (let i = 0; i < count; i++) {
      const x = start + i * spacing;
      const z = lawnEdge + 0.17 + (i % 3) * 0.13;
      for (let j = 0; j < 12; j++) {
        const angle = i * 2.4 + j * 2.4;
        const blade = new T.Mesh(leaf, m.accessLeaf);
        blade.position.set(x + Math.cos(angle) * 0.22, 0.015, z + Math.sin(angle) * 0.22);
        blade.rotation.set(0.12 + (j % 3) * 0.13, angle, 0.06);
        blade.scale.set(1.08 + (j % 3) * 0.25, 0.61 + ((i + j * 3) % 9) * 0.073, 1);
        blade.castShadow = blade.receiveShadow = true;
        visual.add(blade);
      }
    }
  }
  // Acceso curvo con pendiente suave y toldo conectado al pasillo (fotos 16.25.45/52).
  {
    const g = plan.plazaGallery;
    const [[ax, az], [bx, bz]] = plan.coveredWalk;
    const { width, endHeight, controlLift } = coveredWalkSurface;
    const walkStart = v3(ax, g.smallSteps.bottom, az), walkEnd = v3(bx, endHeight, bz);
    const walk = new T.CubicBezierCurve3(walkStart,
      walkStart.clone().lerp(walkEnd, 1 / 3).add(v3(0, controlLift, 0)),
      walkStart.clone().lerp(walkEnd, 2 / 3).add(v3(0, controlLift, 0)), walkEnd);
    const direction = v3(bx - ax, 0, bz - az).normalize();
    const [startX, startZ] = g.approach.start;
    const start = v3(startX, ELEVATOR_LANDING_LEVEL, startZ);
    const [bend, guide, tangent, merge] = g.approach.bend.map(([x, z]) => v3(x, 0.07, z));
    const junctionDistance = merge.clone().sub(walkStart).dot(direction);
    merge.y = walk.getPoint(junctionDistance / Math.hypot(bx - ax, bz - az)).y - 0.006;
    guide.y = 0.085;
    tangent.y = merge.y;
    const curve = new T.CurvePath<T.Vector3>();
    curve.add(new T.LineCurve3(start, bend));
    const bendCurve = new T.CubicBezierCurve3(bend, guide, tangent, merge);
    curve.add(bendCurve);
    const approachWidth = 1.7;
    function ribbon(c: T.Curve<T.Vector3>, width: number, mat: T.Material, collide: boolean, skirt = false) {
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      const sideMaterial = m.stone.clone(); sideMaterial.side = T.DoubleSide;
      const count = 48;
      for (let i = 0; i <= count; i++) {
        const t = i / count, p = c.getPoint(t), tangent = c.getTangent(t);
        const side = v3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
        for (const sign of [-1, 1]) {
          const q = p.clone().addScaledVector(side, sign); positions.push(q.x, q.y, q.z);
          const tile = mat.userData.tile as number[] | undefined;
          uvs.push(tile ? q.x / tile[0] : (sign + 1) / 2, tile ? q.z / tile[1] : t * 5);
        }
        if (i < count) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
      // El orden izquierda/derecha debe producir normales hacia arriba para la colisión.
      if (geo.attributes.normal.getY(0) < 0) flipFaces(geo);
      const mesh = new T.Mesh(geo, mat); mesh.receiveShadow = true; mesh.castShadow = !collide; visual.add(mesh);
      if (collide) solid.add(new T.Mesh(geo));
      if (skirt) for (const side of [0, 1]) for (let i = 0; i < count; i++) {
        const k = (i * 2 + side) * 3, j = ((i + 1) * 2 + side) * 3;
        const a = v3(positions[k], positions[k + 1], positions[k + 2]), b = v3(positions[j], positions[j + 1], positions[j + 2]);
        const wall = new T.BufferGeometry().setFromPoints([a,b,a.clone().setY(0),b,b.clone().setY(0),a.clone().setY(0)]);
        wall.computeVertexNormals(); visual.add(new T.Mesh(wall,sideMaterial));
      }
    }
    // Los empalmes comparten aristas con el granito y con el resto del sendero.
    function joinPaving(a: T.Vector3, b: T.Vector3, c: T.Vector3, d: T.Vector3, material: T.Material) {
      const vertices = [a, b, c, d];
      const geometry = new T.BufferGeometry().setFromPoints(vertices);
      const [u, v] = material.userData.tile as [number, number];
      geometry.setAttribute("uv", new T.Float32BufferAttribute(vertices.flatMap(p => [p.x / u, p.z / v]), 2));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      const mesh = new T.Mesh(geometry, material);
      mesh.receiveShadow = true;
      visual.add(mesh);
      solid.add(new T.Mesh(geometry));
    }
    const bendTangent = bendCurve.getTangent(0);
    const bendSide = v3(bendTangent.z, 0, -bendTangent.x).normalize().multiplyScalar(approachWidth / 2);
    const approachLeft = startX - approachWidth / 2, approachRight = startX + approachWidth / 2;
    joinPaving(v3(approachLeft, start.y, startZ), bend.clone().sub(bendSide),
      bend.clone().add(bendSide), v3(approachRight, start.y, startZ), m.accessStone);
    ribbon(bendCurve, approachWidth, m.accessStone, true, true);
    // Adoquines junto al toldo; el resto del sendero es hormigón liso.
    const approachLength = curve.getLength();
    const paverTones = ["#a29f94", "#c1b9a9", "#b1ad9f"].map(color => {
      const material = m.accessStone.clone();
      material.color.set(color);
      return material;
    });
    for (let distance = approachLength - 2.45; distance < approachLength - 0.24; distance += 0.27) {
      const t = distance / approachLength;
      const p = curve.getPointAt(t), tangent = curve.getTangentAt(t), side = v3(-tangent.z, 0, tangent.x).normalize();
      for (const offset of [-0.53, -0.265, 0, 0.265, 0.53]) {
        const q = p.clone().addScaledVector(side,offset);
        const material = paverTones[Math.round(distance / 0.27 + offset / 0.265 + 2) % paverTones.length];
        const disc = pole(0.13, 0.012, q.x, q.y + 0.01, q.z, material);
        disc.quaternion.setFromUnitVectors(v3(0,1,0), side.clone().cross(tangent).normalize());
      }
    }
    // La lona arranca plana dentro del canto de la losa y forma la cumbrera hacia el caminero.
    const [stepX, stepZ] = g.smallSteps.center;
    const attachment = v3(stepX, g.roof + 0.08, stepZ).addScaledVector(direction, -0.12);
    const canopyFoot = v3(ax, 2.75, az);
    const canopy = new T.CubicBezierCurve3(attachment,
      attachment.clone().lerp(canopyFoot, 1 / 3).setY(g.roof - 0.12),
      attachment.clone().lerp(canopyFoot, 2 / 3).setY(canopyFoot.y + 0.08), canopyFoot);
    const canopyWidth = 2.25, canopyRidge = 0.42;
    fabricCover(canopy, canopyWidth, [], canopyRidge, 0);
    // El enlace lateral se apoya en el borde del pasillo y termina a ras del granito.
    const [landingX, landingZ] = g.approach.courtyardLanding;
    const [galleryX] = plan.paths[0][2];
    const landingLeft = landingX - 0.725, landingRight = landingX + 0.725;
    joinPaving(v3(galleryX, 0.049, lawnEdge - 1.45), v3(galleryX, 0.049, lawnEdge),
      v3(landingRight, start.y, landingZ), v3(landingLeft, start.y, landingZ), courtyardConcrete);
    const edgeBand = new T.MeshStandardMaterial({ color: "#596664", roughness: 0.85 });
    const [, , , [landingEndX], [landingStartX]] = plan.elevatorLanding;
    for (const [left, right] of [[landingStartX, landingLeft], [landingRight, approachLeft], [approachRight, landingEndX - 0.02]]) {
      pave([[left, landingZ - 0.025], [left, landingZ], [right, landingZ], [right, landingZ - 0.025]],
        edgeBand, ELEVATOR_LANDING_LEVEL + 0.003);
    }
    ribbon(walk, width, m.accessStone, true, true);
    ribbon(new T.LineCurve3(walkEnd,v3(55,endHeight,37)), width, m.accessStone, true);
    const roof = new T.LineCurve3(canopyFoot,v3(bx,2.5,bz));
    const bays = Math.ceil(roof.getLength() / 4.5);
    fabricCover(roof, canopyWidth, Array.from({length:bays + 1},(_,i)=>i / bays), canopyRidge);
    // Bordes del caminero y juntas transversales: pavimento angosto entre jardines.
    for (const offset of [-0.85, 0.85]) {
      const side = v3(-(bz-az),0,bx-ax).normalize().multiplyScalar(offset);
      for (let i=0; i<30; i++) {
        if (offset > 0 && Math.abs(i + 0.5 - junctionDistance) < approachWidth / 2 + 0.5) continue;
        const a=walk.getPoint(i/30).add(side), b=walk.getPoint((i+1)/30).add(side);
        beam(a.clone().add(v3(0,0.025,0)),b.clone().add(v3(0,0.025,0)),0.035,m.stone);
      }
    }
    // Macizos bajos de sansevierias flanqueando la salida, sin invadir los peldaños.
    const leafGeo = new T.BufferGeometry().setFromPoints([
      v3(-0.065,0,0),v3(0.065,0,0),v3(0.015,0.95,0.08)]);
    leafGeo.computeVertexNormals();
    const leafMat = new T.MeshStandardMaterial({color: '#455d3c',side:T.DoubleSide,roughness:1});
    const lateral=v3(-(bz-az),0,bx-ax).normalize();
    // Fila exterior de hojas siguiendo el giro de la foto y dejando libre el empalme.
    for (let distance = 1; distance < approachLength - 1.1; distance += 0.31) {
      const t = distance / approachLength;
      const tangent = curve.getTangent(t);
      const outside = v3(-tangent.z, 0, tangent.x).normalize();
      const root = curve.getPoint(t).addScaledVector(outside, approachWidth / 2 + 0.19);
      root.y = Math.max(0.02, gardenHeight(...inCantina([root.x, root.z])));
      for (let j = 0; j < 5; j++) {
        const leaf = new T.Mesh(leafGeo, leafMat);
        leaf.position.copy(root);
        leaf.rotation.y = distance * 3 + j * 2.4;
        leaf.scale.y = 0.32 + 0.06 * ((Math.round(distance / 0.31) + j) % 5);
        leaf.castShadow = true;
        visual.add(leaf);
      }
    }
    for (const side of [-1,1]) for(let i=0;i<16;i++) {
      const at=walk.getPoint(i/180).addScaledVector(lateral,side*(1.05+(i%3)*0.13));
      if (side > 0 && Math.abs(at.clone().sub(walkStart).dot(direction) - junctionDistance) < approachWidth / 2 + 0.3) continue;
      for(let j=0;j<3;j++) {
        const leaf=new T.Mesh(leafGeo,leafMat);leaf.position.copy(at);
        leaf.rotation.y=i*2.4+j*1.8;leaf.scale.y=0.6+((i+j)%5)*0.12;
        leaf.castShadow=true;visual.add(leaf);
      }
    }
  }

  // Patio de las mesas rojas frente al Bloque G, junto al mural del ascensor.
  {
    const { terrace, gravel, tables } = plan.blockGCourtyard;
    const floor = 0.055;
    pave(gravel, m.courtyardGravel, 0.043);
    prism(rectCorners(terrace), -0.03, floor + 0.03, m.tile);

    const tileEdge = m.tile.clone();
    tileEdge.color.set("#8b9eaa");
    const [w, d] = terrace.size;
    frame(terrace, () => {
      for (const z of [-d / 2 + 0.16, d / 2 - 0.16]) {
        box(w, 0.006, 0.32, 0, 0, z, tileEdge);
      }
      for (const x of [-w / 2 + 0.16, w / 2 - 0.16]) {
        box(0.32, 0.006, d - 0.64, x, 0, 0, tileEdge);
      }
      // Murete bajo en tramos, con una salida hacia el sendero y el césped.
      for (const z of [-2.15, -0.95, 0.25]) {
        box(0.31, 0.32, 1.17, w / 2 - 0.14, 0.16, z, m.brick, true);
        box(0.35, 0.045, 1.17, w / 2 - 0.14, 0.34, z, m.wood);
      }
    }, floor);

    const redSlats = m.wood.clone(); redSlats.color.set("#9f493b");
    const tube = new T.MeshStandardMaterial({ color: "#303536", roughness: 0.76 });
    function seat(center: Vec2, angle: number, width: number) {
      frame({ center, size: [width, 0.65], angle }, () => {
        for (let i = 0; i < 4; i++) box(width, 0.032, 0.093, 0, 0.44, -0.14 + i * 0.1, redSlats);
        for (let i = 0; i < 4; i++) box(width, 0.074, 0.035, 0, 0.54 + i * 0.082, -0.17 - i * 0.025, redSlats);
        for (const x of [-width / 2 + 0.075, width / 2 - 0.075]) {
          const shape = new T.CatmullRomCurve3([
            v3(x, 0.02, 0.27), v3(x, 0.14, 0.21), v3(x, 0.39, 0.21),
            v3(x, 0.44, 0.13), v3(x, 0.44, -0.16), v3(x, 0.78, -0.26),
          ]);
          const support = new T.Mesh(new T.TubeGeometry(shape, 16, 0.022, 6, false), tube);
          support.castShadow = true; visual.add(support);
          beam(v3(x, 0.44, -0.15), v3(x, 0.018, -0.27), 0.024, tube);
        }
        const body = new T.Mesh(unit);
        body.scale.set(width, 0.8, 0.52);
        body.position.set(0, 0.4, 0);
        solid.add(body);
      }, floor);
    }
    for (const [x, z] of tables) {
      for (let i = 0; i < 6; i++) {
        box(1.45, 0.045, 0.122, x, floor + 0.74, z + (i - 2.5) * 0.126, redSlats);
      }
      for (const dx of [-0.6, 0.6]) for (const dz of [-0.27, 0.27]) {
        beam(v3(x + dx, floor + 0.71, z + dz), v3(x + dx * 1.13, floor + 0.02, z + dz * 1.2), 0.027, tube);
      }
      const body = new T.Mesh(unit);
      body.scale.set(1.45, 0.74, 0.76); body.position.set(x, floor + 0.37, z); solid.add(body);
      seat([x, z - 1.12], 0, 1.58);
      seat([x, z + 1.12], Math.PI, 1.58);
      seat([x - 1.28, z], -Math.PI / 2, 0.55);
      seat([x + 1.28, z], Math.PI / 2, 0.55);
    }
  }

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
  addCourtyardVegetation(visual, solid);
  const [treeX, treeZ] = plan.tree2;
  box(2.8, 0.45, 0.6, treeX + 3, 0.225, treeZ - 2.5, m.brick, true);
  box(2.4, 0.45, 0.6, treeX + 3, 0.225, treeZ - 5, m.brick, true);
  // Árbol personalizado de la cantina / mesas
  addCantinaTree(visual, solid, plan.cantinaTree, plan.platform.some((p) => insidePolygon(plan.cantinaTree, p)) ? PLAZA_LEVEL : 0);
  // Marcadores de los puntos de visita en el suelo y sobre la plataforma (no en los pisos altos).
  for (const place of facultyPlaces) {
    if (place.position[1] > PLAZA_LEVEL + 0.5 || place.id === "cantina-cyt" || place.id === "patio") continue;
    const marker = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.04, 16), new T.MeshBasicMaterial({ color: 0xbca36d }));
    marker.position.set(place.position[0], (place.position[1] > 1 ? PLAZA_LEVEL : 0) + 0.13, place.position[2]); marker.userData.placeId = place.id;
    marker.userData.keep = true; group.add(marker); markers.push(marker);
  }
  mergeByMaterial(group);
  group.updateMatrixWorld(true); colliders.updateMatrixWorld(true);
  return { group, colliders, markers, elevator };
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
  const buckets = new Map<T.Material, Map<number, T.BufferGeometry[]>>(), merged: T.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || o instanceof T.InstancedMesh || o.userData.keep || Array.isArray(o.material)
      || o.material.transparent) return;
    let geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()) as T.BufferGeometry;
    for (const name of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute("uv", new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo = geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    const flags = (o.castShadow ? 1 : 0) | (o.receiveShadow ? 2 : 0);
    let byShadow = buckets.get(o.material);
    if (!byShadow) buckets.set(o.material, byShadow = new Map());
    const batch = byShadow.get(flags);
    if (batch) batch.push(geo); else byShadow.set(flags, [geo]);
    merged.push(o);
  });
  for (const o of merged) o.parent?.remove(o);
  const empty: T.Object3D[] = [];
  root.traverse((o) => { if (o !== root && o.type === "Group" && !o.children.length) empty.push(o); });
  for (const o of empty) o.parent?.remove(o);
  for (const [material, byShadow] of buckets) for (const [flags, geometries] of byShadow) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = Boolean(flags & 1); mesh.receiveShadow = Boolean(flags & 2);
    root.add(mesh);
  }
}
