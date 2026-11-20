import { pavementOutside } from "./faculty/pavement-cutout";
import {addCourtyardElevatorTree, pruneTreeStructures} from "./courtyard-elevator-tree";
import { registerSeats } from "./seating";
import * as T from "three";
import { friendshipMaterial, friendshipSign } from "./friendship-materials";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeGrassMaterial, makeMaterials } from "./materials";
import { addCourtyardVegetation } from "./courtyard-vegetation";
import { addCantinaGarden } from "./faculty/cantina-garden";
import { createFacultyBuilder, galleryTileOffset, type Range } from "./faculty/builder";
import { addRestroomTower } from "./faculty/restroom-tower";
import { addManfredHall } from "./faculty/manfred-hall";
import { addCoveredPlazaSeating } from "./faculty/covered-plaza-seating";
import { addCantina } from "./faculty/cantina";
import { addGardenHedge } from "./faculty/garden-hedge";
import { addWalkChannels } from "./faculty/walk-channels";
import { addAnnexes } from "./faculty/annexes";
import { addElevatorShaft } from "./faculty/elevator-shaft";
import { addSegmentedGardenPath, makeGardenPaving, gardenJunctionReach, type WalkOptions } from "./faculty/garden-path";
import {
  facultyBlueprint as plan, block1, blockG, gridAngle, FLOOR_HEIGHT as H, PLAZA_LEVEL, ELEVATOR_LANDING_LEVEL, STEPS_RUN, rectCorners,
  manfredExitCutout, manfredOutline, elevatorStairEdge, classroomDoor, structureLines, pilasters, ROOMS_PER_FLOOR, fromRect,
  type Rect, type Rooms, type Vec2,
} from "../data/faculty-blueprint";
import { insidePolygon } from "../data/campus-geometry";
import { gardenHeight, gardenBounds, inCantina, coveredWalkSurface } from "../data/cantina-terrain";
import { cantinaRearCourtyard, coveredWalkPostInset, deiGardenPath, diciaWalkExtension, gardenWalkHedge } from "../data/faculty-annexes";

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
  const group = new T.Group(), colliders = new T.Group();
  const m = makeMaterials(grass);
  const gardenWalkMaterial = makeGardenPaving();
  const builder = createFacultyBuilder(group, colliders, m);
  const { layers, unit, box, pole, beam, v3, sign, frame, prism, pave, path, spans, ramp, glazing, slopedWall, solidRoof } = builder;

  /** Lona azul continua con caída leve entre apoyos y faldón festoneado. */
  function fabricCover(curve: T.Curve<T.Vector3>, width: number, supports: number[], ridge = 0, ridgeAtStart = ridge, postOffset = width * 0.475) {
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
    const cover = new T.Mesh(geometry, m.awning); cover.castShadow = cover.receiveShadow = true; layers.visual.add(cover); solidRoof(cover);
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
      const valance = new T.Mesh(edge, m.awning); valance.castShadow = true; layers.visual.add(valance);
    }
    for (const t of supports) {
      const a = at(t, -0.95), b = at(t, 0.95);
      if (ridge > 0) {
        const peak = at(t, 0);
        beam(a, peak, 0.025, m.metal); beam(peak, b, 0.025, m.metal);
      } else beam(a, b, 0.025, m.metal);
      const center = curve.getPointAt(t);
      for (const edge of [a, b]) {
        const outward = edge.clone().sub(center).setY(0).normalize();
        const p = edge.clone().addScaledVector(outward, postOffset - width * 0.475);
        if (postOffset > width * 0.475) beam(edge, p, 0.025, m.metal);
        const support = pole(0.035, p.y, p.x, p.y / 2, p.z, m.metal, true);
        if (postOffset > width * 0.475) {
          support.userData.walkCanopyPost = true; support.userData.keep = true;
        }
      }
    }
  }
  /** Baranda de barras horizontales, como la del escaneo, a lo largo de x. */
  function rail(x0: number, x1: number, y: number, z: number) {
    if (x1 - x0 < 0.25) return;
    for (let x = x0; x <= x1 + 0.01; x += Math.max(0.6, (x1 - x0) / Math.ceil((x1 - x0) / 1.25))) pole(0.03, 1.05, x, y + 0.53, z);
    for (const h of [0.14, 0.42, 0.7]) box(x1 - x0, 0.035, 0.035, (x0 + x1) / 2, y + h, z, m.metal);
    box(x1 - x0, 0.05, 0.07, (x0 + x1) / 2, y + 1.03, z, m.metal);
    const body = new T.Mesh(unit); body.scale.set(x1 - x0, 1.1, 0.1); body.position.set((x0 + x1) / 2, y + 0.55, z); layers.solid.add(body);
  }
  /** Baranda a lo largo de z (cabeceras de galería y descansos). */
  function railZ(z0: number, z1: number, y: number, x: number) {
    for (const z of [z0, z1]) pole(0.03, 1.05, x, y + 0.53, z);
    for (const h of [0.14, 0.42, 0.7]) box(0.035, 0.035, z1 - z0, x, y + h, (z0 + z1) / 2, m.metal);
    box(0.07, 0.05, z1 - z0, x, y + 1.03, (z0 + z1) / 2, m.metal);
    const body = new T.Mesh(unit); body.scale.set(0.1, 1.1, z1 - z0); body.position.set(x, y + 0.55, (z0 + z1) / 2); layers.solid.add(body);
  }
  function bench(x: number, z: number, y = 0, facing = 1) {
    registerSeats(layers.visual, 1.7, x, y + 0.46, z, facing);
    for (let i = 0; i < 4; i++) box(1.7, 0.05, 0.09, x, y + 0.46, z + facing * (i * 0.11 - 0.16), m.wood);
    for (let i = 0; i < 3; i++) box(1.7, 0.09, 0.05, x, y + 0.65 + i * 0.12, z - facing * 0.22, m.wood);
    for (const dx of [-0.68, 0.68]) for (const dz of [-0.2, 0.15]) pole(0.028, 0.46, x + dx, y + 0.23, z + facing * dz);
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
      layers.visual.add(mesh);
    } else {
    for (let i = 0; i < n; i++) {
      const xa = xs + dir * (i * run) / n, xb = xs + dir * ((i + 1) * run) / n, top = ys + ((i + 0.5) * rise) / n;
      box(Math.abs(xb - xa) + 0.02, 0.2, width, (xa + xb) / 2, top - 0.1, zc, m.stone);
    }
    const slope = Math.atan2(rise, run), length = Math.hypot(run, rise);
    const under = new T.Mesh(unit, m.concrete);
    under.scale.set(length, 0.16, width); under.position.set((xs + xe) / 2, (ys + ye) / 2 - 0.26, zc);
    under.rotation.z = dir * slope; under.castShadow = true; layers.visual.add(under);
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
      geo.computeVertexNormals(); layers.solid.add(new T.Mesh(geo));
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
    const mesh = new T.Mesh(geo, m.canopy); mesh.castShadow = true; layers.visual.add(mesh); solidRoof(mesh);
    // Arcos de acero cada 2,5 m.
    for (let k = 0, ribs = Math.ceil(Math.abs(x1 - x0) / 2.5); k <= ribs; k++) {
      const x = x0 + ((x1 - x0) * k) / ribs, arch = new T.Mesh(new T.TorusGeometry(r, 0.035, 5, 18, Math.PI), m.steel);
      arch.rotation.y = Math.PI / 2; arch.position.set(x, spring(x), zc); layers.visual.add(arch);
    }
    return spring;
  }

  /** Cubierta a cuatro aguas con cara inferior de chapa (textura del escaneo), centrada en x = cx. */
  function hipRoof(w: number, d: number, y: number, rise: number, top: T.Material, cx = 0) {
    const roof = new T.Group(), previous = layers.visual; roof.position.x = cx; layers.visual.add(roof); layers.visual = roof;
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
      const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; layers.visual.add(mesh); solidRoof(mesh);
    }
    // Faldón perimetral.
    for (const s of [-1, 1]) {
      box(2 * a, 0.22, 0.06, 0, y - 0.05, s * b, m.white);
      box(0.06, 0.22, 2 * b, s * a, y - 0.05, 0, m.white);
    }
    layers.visual = previous;
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
    mesh.position.set(x, y, z); mesh.rotation.y = front > 0 ? 0 : Math.PI; layers.visual.add(mesh);
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
    mesh.position.set(x, y, z); mesh.rotation.y = Math.PI / 2; layers.visual.add(mesh);
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
    layers.visual.add(disk);
    const grille = new T.Mesh(fanRing, fanGrille);
    grille.position.set(fanX, y, faceZ - 0.009);
    layers.visual.add(grille);
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
      for (const side of [-1, 1]) {
        const openings = side === front ? s.noColumns ?? [] : [];
        for (const [a, b] of spans(-L / 2 - t, L / 2 + t, openings))
          box(b - a, hb, t, (a + b) / 2, yb, side * (D + t) / 2, m.concrete);
      }
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
      box(L, 0.03, G, 0, y + 0.015, zGallery, m.galleryFloor, false, { offset: [galleryTileOffset, 0] });
      box(b - a, 0.03, D - G, (a + b) / 2, y + 0.015, zRooms, m.tile);
      if (level && !s.bands?.includes(level)) {
        for (const [p, q] of spans(-L / 2 - 0.05, L / 2 + 0.05, open))
          box(q - p, 0.32, 0.08, (p + q) / 2, y - 0.1, zEdge + front * 0.04, m.white);
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
  const [ex] = plan.elevator.center, [ew] = plan.elevator.size, tw = plan.tower, es = plan.eastStair;
  const towerFront: Range = [tw.center[0] - tw.entry.halfWidth, tw.center[0] + tw.entry.halfWidth];
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
      openings: (level) => [...(level ? [landingAt(level)] : []), [ex - ew / 2, ex + ew / 2] as Range, towerFront].map(local),
      // Llegada de la escalera de la plaza a la galería del primer piso.
      innerOpenings: (level) => level === 1 ? [local([stairWest, stairEast])] : [],
      columns: { radius: 0.25 },
      noColumns: [local(towerFront)],
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


  // Ascensor de 2,5 × 2,5 m entre las dos últimas columnas de la galería, con murales en sus caras este,
  // sur y oeste y la puerta hacia la galería (fotos del 19/11/2026). Se usa en los cuatro niveles.
  const elevator = addElevatorShaft(builder, m, {
    center: plan.elevator.center, size: plan.elevator.size, floorHeight: H,
    top: (block1.levels - 1) * H + 4.1 + 0.9, mural: plan.elevator.mural,
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
    // ---- Cabecera este: planta baja y primer piso retraídos bajo los pisos 2 y 3 ----
    const ee = plan.eastEnd, rp = ee.ramp, [groundEnd] = ee.roomsEnd;
    // Columnas que sostienen los pisos 2 y 3 donde planta baja y primer piso se retraen.
    for (const [x, z] of ee.columns) {
      if (x === ee.serviceColumn[0] && z === ee.serviceColumn[1])
        box(0.65, 2 * H, 0.65, x, H, z, m.concrete, true,
          { rotation: -(gridAngle - Math.PI / 2) });
      else pole(0.25, 2 * H, x, H, z, m.concrete, true);
    }
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
    logo.rotation.y = Math.PI / 2; logo.position.set(wallX + 0.025, logoY, logoZ); layers.visual.add(logo);
    for (const dy of [-1.22, 1.22]) for (const dz of [-0.79, 0.79])
      beam(v3(wallX, logoY + dy, logoZ + dz), v3(wallX + 0.04, logoY + dy, logoZ + dz), 0.022, m.steel);
  }

  addRestroomTower(builder);

  // ---- Bloque G ----
  const { start: gStair, halfRun: gHalf, width: gWidth } = plan.blockGStair;
  const gEntry = gStair + gHalf;
  frame(plan.block2, () => {
    academicBlock({
      ...blockG, front: -1, topWall: 3.6, roof: m.blue, louvers: false,
      label: () => "BLOQUE G",
      rooms: (level) => plan.rooms.block2[level],
      openings: (level) => level ? [[gEntry, gEntry + 1.3]] : [],
      door: "single",
      columns: { radius: 0.17 },
    });
    // Escalera de ida y vuelta sobre la fachada hacia el Bloque 1 (fotos IMG_5666/5668).
    const zA = -blockG.depth / 2 - 0.1 - gWidth / 2, zB = zA - gWidth;
    for (let level = 0; level < blockG.levels - 1; level++) {
      const y = level * H;
      flight(gEntry, y, gStair, y + H / 2, zA, gWidth);
      box(1.3, 0.2, 2 * gWidth, gStair - 0.65, y + H / 2 - 0.1, (zA + zB) / 2, m.stone, true);
      railZ(zB - gWidth / 2, zA + gWidth / 2, y + H / 2, gStair - 1.3);
      rail(gStair - 1.3, gStair, y + H / 2, zB - gWidth / 2 - 0.03);
      rail(gStair - 1.3, gStair, y + H / 2, zA + gWidth / 2 + 0.03);
      flight(gStair, y + H / 2, gEntry, y + H, zB, gWidth);
      box(1.3, 0.2, 2 * gWidth + 0.15, gEntry + 0.65, y + H - 0.1, (zA + zB) / 2 + 0.075, m.stone, true);
      rail(gEntry, gEntry + 1.3, y + H, zB - gWidth / 2 - 0.03);
      railZ(zB - gWidth / 2, zA + gWidth / 2, y + H, gEntry + 1.3);
    }
  });

  // Rellano de granito rosado al nivel del pasillo, no de la plaza elevada.
  // La base aporta una superficie transitable y tapa el césped bajo este acceso.
  prism(plan.elevatorLanding, -0.06, ELEVATOR_LANDING_LEVEL + 0.06, m.granite);

  // ---- Plataforma a 0,90 m: plaza techada, cuadrado, Bedelía, cantina, Sala Manfred y cabecera este ----

  const pavedPlatform: (readonly Vec2[])[] = [];
  for (const [i, outline] of plan.platform.entries()) {
    // Preservar huecos de Manfred y escalera, y aplicar la prioridad remota de acabados.
    for (const piece of pavementOutside(outline, manfredOutline()).flatMap(p=>pavementOutside(p,manfredExitCutout))) {
      prism(piece,0,PLAZA_LEVEL,m.concrete);
      pave(piece,i===0?m.tile:m.stone,PLAZA_LEVEL+(i===0?.008:.005),false,[0,0],
        [cantinaRearCourtyard.paving,...pavedPlatform]);
      pavedPlatform.push(piece);
    }
  }
  for(const piece of pavementOutside(plan.northPassageLanding,manfredExitCutout)) {
    prism(piece,0,PLAZA_LEVEL,m.concrete);
    pave(piece,m.stone,PLAZA_LEVEL+.005,false,[0,0],[cantinaRearCourtyard.paving,...pavedPlatform]);
    pavedPlatform.push(piece);
  }
  // Circulación frente a Maquetas y jardín enrasado junto a cantina.
  prism(cantinaRearCourtyard.paving, 0, PLAZA_LEVEL, m.concrete, true);
  const rearPaving = pave(cantinaRearCourtyard.paving, m.maquetasConcrete, PLAZA_LEVEL + 0.005);
  // Orientar las juntas con las fachadas del patio, conservando la huella y su colisión.
  const rearPositions = rearPaving.geometry.attributes.position;
  const rearUV = rearPaving.geometry.attributes.uv;
  const [concreteTileX, concreteTileZ] = m.maquetasConcrete.userData.tile as number[];
  const patioCos = Math.cos(plan.cantina.angle), patioSin = Math.sin(plan.cantina.angle);
  for (let i = 0; i < rearPositions.count; i++) {
    const dx = rearPositions.getX(i) - plan.cantina.center[0];
    const dz = rearPositions.getZ(i) - plan.cantina.center[1];
    rearUV.setXY(i, (dx * patioCos + dz * patioSin) / concreteTileX,
      (-dx * patioSin + dz * patioCos) / concreteTileZ);
  }
  const rearGarden = prism(cantinaRearCourtyard.garden, 0, PLAZA_LEVEL + 0.005, m.grass);
  rearGarden.castShadow = false;

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
    roof.position.set(diciaWalkExtension / 2, axisY, 0); layers.visual.add(roof); solidRoof(roof);
    const rib = new T.TorusGeometry(radius, 0.025, 6, 24, 2 * halfAngle);
    rib.rotateZ(start); rib.rotateY(Math.PI / 2);
    const bays = Math.ceil(roofLength / 3.8);
    for (let i = 0; i <= bays * 2; i++) {
      const x = -half + i * roofLength / (2 * bays);
      const arch = new T.Mesh(rib, steel); arch.position.set(x, axisY - 0.025, 0); layers.visual.add(arch);
      if (i % 2 === 0) {
        const postX = T.MathUtils.clamp(x, -half + coveredWalkPostInset, half + diciaWalkExtension - coveredWalkPostInset);
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
      layers.visual.add(blade);
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
        const face=new T.Mesh(geo,riser);face.receiveShadow=true;layers.visual.add(face);
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
      layers.solid.add(new T.Mesh(geometry));
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
    // Todos los apoyos de esta galería son cilíndricos.
    for (const [x, z] of g.columns)
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
    const equipmentAt = plan.eastEnd.serviceColumn;
    // Frente hacia la plaza (el observador de la captura), no hacia las escaleras.
    frame({ center: equipmentAt, size: [2.8, 1.5], angle: gridAngle - Math.PI / 2 }, () => {
      const inox = new T.MeshStandardMaterial({ color: "#cbd2cf", roughness: 0.45, metalness: 0.3 });
      const white = new T.MeshStandardMaterial({ color: "#e5e4d8", roughness: 0.6, metalness: 0.12 });
      const recess = new T.MeshStandardMaterial({ color: "#313d3d", roughness: 0.6 });
      // Bebedero de acero con pileta, rejilla de drenaje y grifo curvado.
      box(0.56, 0.88, 0.52, -0.83, 0.49, 0, inox, true);
      box(0.62, 0.055, 0.58, -0.83, 0.96, 0.02, inox);
      box(0.47, 0.018, 0.38, -0.83, 0.992, 0.04, recess);
      for (let i = 0; i < 7; i++) box(0.43, 0.012, 0.014, -0.83, 1.005, -0.09 + i * 0.043, inox);
      const tap = new T.CatmullRomCurve3([v3(-0.99, 0.99, -0.17), v3(-0.99, 1.2, -0.17), v3(-0.9, 1.24, -0.12), v3(-0.83, 1.15, -0.04)]);
      const faucet = new T.Mesh(new T.TubeGeometry(tap, 14, 0.018, 8, false), inox); layers.visual.add(faucet);
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
        planter.position.set(0.91, 0.4, 0); planter.castShadow = true; layers.visual.add(planter);
        pole(0.315, 0.045, 0.91, 0.65, 0, pot);
        pole(0.285, 0.015, 0.91, 0.675, 0, m.bark);
        const potBody = new T.Mesh(unit); potBody.scale.set(0.62, 0.68, 0.62);
        potBody.position.set(0.91, 0.34, 0); layers.solid.add(potBody);
        for (let i = 0; i < 18; i++) {
          const a = i * 2.4, reach = 0.16 + (i % 4) * 0.065, height = 0.8 + (i % 6) * 0.18;
          const points = [v3(0, 0, 0), v3(-0.055, height * 0.5, reach * 0.3), v3(0, height, reach),
            v3(0, 0, 0), v3(0, height, reach), v3(0.055, height * 0.5, reach * 0.3)];
          const geo = new T.BufferGeometry().setFromPoints(points); geo.computeVertexNormals();
          const leaf = new T.Mesh(geo, i % 4 ? leafMat : leafEdge);
          leaf.position.set(0.91 + Math.cos(a) * 0.13, 0.68, Math.sin(a) * 0.13); leaf.rotation.y = a;
          leaf.castShadow = true; layers.visual.add(leaf);
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
        leaf.castShadow=leaf.receiveShadow=true;layers.visual.add(leaf);
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
        stone.position.set(px,0.038,pz);stone.scale.set(1.3,0.5,0.85);layers.visual.add(stone);
        if(i<4||k%2) continue;
        for(let j=0;j<9;j++) {
          const leaf=new T.Mesh(leafGeo,j%3?silver:purple),angle=j*Math.PI*2/9;
          leaf.position.set(px,0.055,pz);leaf.rotation.order="YXZ";leaf.rotation.set(0.95,angle,0);
          leaf.scale.set(0.7,0.32+noise(i*31+k+j)*0.13,1);leaf.castShadow=true;layers.visual.add(leaf);
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
    const underside = pave(outline, m.roofUnder, roofY - 0.02);
    flipFaces(underside.geometry); solidRoof(underside);
    solidRoof(pave(outline, m.roof, roofY + 0.12, true));
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

  addCoveredPlazaSeating(builder);

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
    for(const [a,b] of [[-w/2,7.8],[10.2,w/2]])box(b-a,3.2,.2,(a+b)/2,1.6,-d/2,officeBrick,true);
    box(2.4,.9,.2,9,2.75,-d/2,officeBrick,true);
    box(w+.8,.2,d+.8,0,3.4,0,m.concrete,true);
    // Interior diáfano solicitado: sin habitaciones, tabiques ni escritorios.
    // Dependencia curva posterior y sus dos recintos de enlace, sin atribuirle un uso no rotulado.
    const curved: Vec2[] = [[7.8,-5],[7.8,-7.1]];
    // Dos lóbulos redondeados como el contorno señalado en el plano.
    for(let i=0;i<=48;i++) {const a=Math.PI*.42+i/48*Math.PI*1.68;
      curved.push([9+3.5*(1+.2*Math.cos(2*a))*Math.cos(a),-10+3.1*(1+.2*Math.cos(2*a))*Math.sin(a)]);}
    curved.push([10.2,-7.1],[10.2,-5]);
    prism(curved,-PLAZA_LEVEL,PLAZA_LEVEL+.03,m.stone,true);prism(curved,3.4,.18,m.concrete,true);
    for(let i=1;i<curved.length;i++) {const a=curved[i-1],b=curved[i];
      box(Math.hypot(b[0]-a[0],b[1]-a[1]),3.2,.18,(a[0]+b[0])/2,1.6,(a[1]+b[1])/2,officeBrick,true,{rotation:-Math.atan2(b[1]-a[1],b[0]-a[0])});}
    for(const x of [6,12]) {box(2.5,.12,2,x,.02,-6,m.stone,true);box(2.5,.18,2,x,3.4,-6,m.concrete,true);box(.15,3.2,2,x-1.25,1.6,-6,officeBrick,true);}
    // Muros laterales: el frente hacia Manfred incluye acceso de profesores y vitrina.
    for(const side of [-1,1]) {
      if(side===1)box(.2,3.2,d,side*w/2,1.6,0,officeBrick,true);
      else {
        const doorZ=0, dw=1.4;
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
    ].map(([x,z]) => [x * 1.5,z]);

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

        openingsInRecess = openingsInRecess.map(o => ({...o,x:o.x*1.5,width:o.door?o.width:o.width*1.5}));
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
    box(w+1,.2,depth,0,3.4,z+depth/2,m.concrete,true);
    box(w+1,.05,depth,0,bedeliaPavingTop-.025,z+depth/2,m.stone,true);
    const gold = new T.MeshStandardMaterial({ color: "#c2a65a", metalness: 0.25, roughness: 0.45 });
    // Vitrina visible desde el acceso de Manfred, sobre el lateral de Bedelía.
    const displayX = -w / 2 - 0.31, displayZ = 2.3;
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
        layers.visual.add(trophy);
      }
    }
    const clearGlass = m.glass.clone();
    clearGlass.color.set("#d7e2dd");
    clearGlass.opacity = 0.18;
    box(0.035, 1.9, 2.25, displayX - 0.21, 1.11, displayZ, clearGlass, true);
    sign("CECYT", displayX - 0.23, 2.02, displayZ, 0.96, -Math.PI / 2);
    
    // Gabinete de incendio reubicado donde estaba la primera columna
    const red=new T.MeshStandardMaterial({color:"#a92e2b",roughness:.6});
    const ex = -w/2 + 0.5; // X exacto donde estaba la columna eliminada
    box(.55,.7,.18,ex,1.25,z+.18,red,true);
    box(.44,.57,.02,ex,1.25,z+.28,m.glass);
    pole(.105,.52,ex+0.45,1.55,z+.22,red);
    box(.15,.07,.12,ex+0.45,1.85,z+.22,m.metal);
    beam(v3(ex+0.51,1.82,z+.25),v3(ex+0.6,1.42,z+.25),.018,m.metal);
  },PLAZA_LEVEL);

  addManfredHall(builder);

  addCantina(builder);

  addAnnexes(builder, officeBrick, passageTile, annexPavingHeight, gardenWalkMaterial);

  // ---- Caminos entre áreas comunes ----
  const galleryEdge = block1.depth / 2;
  const lawnEdge = 9.55;
  const courtyardConcrete = m.accessStone.clone();
  courtyardConcrete.color.set("#aaaeb0");
  plan.paths.forEach((p, index) => {
    if (index === 0) {
      // Hormigón contiguo a la galería, más angosto del lado del césped.
      const [start, , end] = p;
      // Sin hormigón dentro de la caja del ascensor: la cabina tiene su propio piso.
      const x0 = Math.min(start[0] - 0.06, end[0]), x1 = Math.max(start[0] - 0.06, end[0]);
      const [shaftX, shaftZ] = plan.elevator.center, [shaftW, shaftD] = plan.elevator.size;
      const sx0 = Math.max(x0, shaftX - shaftW / 2), sx1 = Math.min(x1, shaftX + shaftW / 2);
      const strip = (a: number, b: number, c: number, d: number) => {
        if (b - a > 0.01 && d - c > 0.01) pave([[a, c], [b, c], [b, d], [a, d]], courtyardConcrete, 0.049);
      };
      strip(x0, sx0, galleryEdge, lawnEdge);
      strip(sx1, x1, galleryEdge, lawnEdge);
      strip(sx0, sx1, galleryEdge, shaftZ - shaftD / 2);
      strip(sx0, sx1, shaftZ + shaftD / 2, lawnEdge);
    } else if (index === 2) {
      // Termina junto a la terraza: se retira el brazo transversal sobrante.
      path(p.slice(0, 2));
    } else if (index === 6) {
      // El enlace desde el toldo hasta la plaza ya tiene peldaños y piso propio.
      path(p.slice(1));
    } else if (index !== 3 && index !== 4) {
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
      registerSeats(layers.visual, 2, tableX, floor + 0.44, z, dz < 0 ? 1 : -1);
      box(2, 0.055, 0.32, tableX, floor + 0.44, z, benchSeat, true);
      for (const dx of [-0.86, 0.86]) for (const legZ of [-0.12, 0.12]) {
        box(0.045, 0.42, 0.045, tableX + dx, floor + 0.21, z + legZ, frameMetal, true);
      }
    }

    const chairX = tableX - 1.55;
    frame({center: [chairX, tableZ], size: [0.45,0.46], angle: -Math.PI / 2}, () => registerSeats(layers.visual, 0.45, 0, floor + 0.44));
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
        layers.visual.add(blade);
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
    function segmentedCurve(c: T.Curve<T.Vector3>, width: number, name: string, options: WalkOptions = {}) {
      const samples = c.getPoints(Math.max(48, Math.ceil(c.getLength() / 0.35)));
      const points: Vec2[] = samples.map(p => [p.x, p.z]);
      const height = ([x, z]: Vec2) => {
        let nearest = Infinity, y = samples[0].y;
        for (let i = 1; i < samples.length; i++) {
          const a = samples[i - 1], b = samples[i], dx = b.x - a.x, dz = b.z - a.z;
          const t = T.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
          const distance = (x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2;
          if (distance < nearest) { nearest = distance; y = T.MathUtils.lerp(a.y, b.y, t); }
        }
        return y;
      };
      addSegmentedGardenPath(builder, points, height, gardenWalkMaterial,
        { ...options, width, finishedHeight: true, name });
      return { points, height };
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
      layers.visual.add(mesh);
      layers.solid.add(new T.Mesh(geometry));
    }
    const approachLeft = startX - approachWidth / 2, approachRight = startX + approachWidth / 2;
    segmentedCurve(new T.LineCurve3(start, bend), approachWidth, "Acceso segmentado a la carpa");
    segmentedCurve(bendCurve, approachWidth, "Curva segmentada de la carpa");
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
    const gardenJoinDistance = v3(deiGardenPath[0][0] - ax, 0, deiGardenPath[0][1] - az).dot(direction);
    const fullWalk = new T.CurvePath<T.Vector3>();
    fullWalk.add(walk);
    fullWalk.add(new T.LineCurve3(walkEnd, v3(55, endHeight, 37)));
    fullWalk.add(new T.LineCurve3(v3(55, endHeight, 37), v3(30, endHeight, 50)));
    const { junction, end } = plan.blockGAwning;
    const branchT = v3(junction[0] - ax, 0, junction[1] - az).dot(direction) / Math.hypot(bx - ax, bz - az);
    const branchFloorStart = walk.getPoint(branchT), branchFloorEnd = v3(end[0], 0.05, end[1]);
    const branchCurve = new T.LineCurve3(branchFloorStart, branchFloorEnd);
    const branchPoints: Vec2[] = [[branchFloorStart.x, branchFloorStart.z], end];
    const branchHeight = ([x, z]: Vec2) => {
      const dx = end[0] - branchFloorStart.x, dz = end[1] - branchFloorStart.z;
      const t = T.MathUtils.clamp(((x - branchFloorStart.x) * dx + (z - branchFloorStart.z) * dz) / (dx * dx + dz * dz), 0, 1);
      return T.MathUtils.lerp(branchFloorStart.y, branchFloorEnd.y, t);
    };
    const coveredPaving = segmentedCurve(fullWalk, width, "Caminero bajo carpa", {
      junctionAt: gardenJoinDistance, junctionBranch: { points: deiGardenPath, ground: annexPavingHeight },
      junctions: [{ at: branchT * walk.getLength(), points: branchPoints, width: 2.25,
        height: branchHeight, label: "Bloque G" }],
    });
    const roof = new T.LineCurve3(canopyFoot,v3(bx,2.5,bz));
    const bays = Math.ceil(roof.getLength() / 4.5);
    fabricCover(roof, canopyWidth, Array.from({length:bays + 1},(_,i)=>i / bays), canopyRidge, canopyRidge, 1.28);
    // El ramal se une a la lona existente y desemboca en el eje de la galería del Bloque G.
    const junctionPoint = v3(junction[0], 0, junction[1]);
    const junctionT = junctionPoint.sub(walkStart).dot(direction) / Math.hypot(bx - ax, bz - az);
    const branchStart = roof.getPoint(junctionT);
    const branchEnd = v3(end[0], branchStart.y - 0.12, end[1]);
    const branchRoof = new T.LineCurve3(branchStart, branchEnd);
    const branchBays = Math.ceil(branchRoof.getLength() / 4.5);
    fabricCover(branchRoof, canopyWidth,
      Array.from({ length: branchBays }, (_, i) => (i + 1) / branchBays), canopyRidge);
    // El piso arranca en el empalme real de la cubierta, cubriendo la junta.
    segmentedCurve(branchCurve, 2.25, "Ramal segmentado al Bloque G", { startDistance: gardenJunctionReach });
    const normal = v3(-direction.z, 0, direction.x);
    const gardenSide = Math.sign(v3(deiGardenPath[1][0] - deiGardenPath[0][0], 0,
      deiGardenPath[1][1] - deiGardenPath[0][1]).dot(normal));
    const branchSide = Math.sign(v3(end[0] - branchStart.x, 0, end[1] - branchStart.z).dot(normal));
    addWalkChannels(builder, coveredPaving.points, coveredPaving.height, width, [
      { side: gardenSide, from: gardenJoinDistance - 1.5, to: gardenJoinDistance + 1.5 },
      { side: branchSide, from: junctionT * walk.getLength() - 1.4, to: junctionT * walk.getLength() + 1.4 },
      { side: 1, from: junctionDistance - 1.2, to: junctionDistance + 1.2 },
    ]);
    addGardenHedge(builder, gardenWalkHedge, point => gardenHeight(...inCantina(point)));
    // Macizos bajos de sansevierias flanqueando la salida, sin invadir los peldaños.
    const leafGeo = new T.BufferGeometry().setFromPoints([
      v3(-0.065,0,0),v3(0.065,0,0),v3(0.015,0.95,0.08)]);
    leafGeo.computeVertexNormals();
    const leafMat = new T.MeshStandardMaterial({color: '#455d3c',side:T.DoubleSide,roughness:1});
    const lateral=v3(-(bz-az),0,bx-ax).normalize();
    // Fila exterior de hojas siguiendo el giro de la foto y dejando libre el empalme.
    const approachLength = curve.getLength();
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
        layers.visual.add(leaf);
      }
    }
    for (const side of [-1,1]) for(let i=0;i<16;i++) {
      const at=walk.getPoint(i/180).addScaledVector(lateral,side*(1.05+(i%3)*0.13));
      if (side > 0 && Math.abs(at.clone().sub(walkStart).dot(direction) - junctionDistance) < approachWidth / 2 + 0.3) continue;
      for(let j=0;j<3;j++) {
        const leaf=new T.Mesh(leafGeo,leafMat);leaf.position.copy(at);
        leaf.rotation.y=i*2.4+j*1.8;leaf.scale.y=0.6+((i+j)%5)*0.12;
        leaf.castShadow=true;layers.visual.add(leaf);
      }
    }
  }

  // Plaza de la Amistad frente al Bloque G, junto al mural del ascensor.
  {
    const { terrace, gravel, tables } = plan.blockGCourtyard;
    const floor = 0.055;
    // Cuña entre el sendero oblicuo y el borde de la terraza.
    prism([[22.8,19.2],[32.9,19.2],[22.8,24.27]], -0.03, floor + 0.03, friendshipMaterial("tile"));
    pave(gravel, m.courtyardGravel, 0.043);
    const paving = friendshipMaterial("tile"), soil = friendshipMaterial("soil");
    prism(rectCorners(terrace), -0.03, floor + 0.03, paving);
    // Sendero de piezas circulares desde el mural al área de bancos.
    pave([[22.8,9.52],[25,9.52],[26,12.6],[23.8,12.6]], friendshipMaterial("round"), .05);
    for (const [tx,tz] of [plan.tree1,plan.blockGCourtyard.addedTree]) {
      const patch: Vec2[] = Array.from({length:32},(_,i)=>{
        const a=i*Math.PI/16,r=1.7+Math.sin(i*2.3)*.13;
        return [tx+Math.cos(a)*r,tz+Math.sin(a)*r*.8];
      });
      pave(patch,soil,.046);
    }
    // Cantero cuadrangular junto al acceso desde la escalera.
    frame(plan.blockGCourtyard.planter,()=>{
      const [w,d]=plan.blockGCourtyard.planter.size;
      for(const side of [-1,1]) {
        box(w,.42,.16,0,.21,side*(d/2-.08),m.brick,true);
        box(.16,.42,d-.32,side*(w/2-.08),.21,0,m.brick,true);
      }
      box(w-.32,.28,d-.32,0,.14,0,soil);
      for(let i=0;i<9;i++) {
        const x=(i%3-1)*.43,z=(Math.floor(i/3)-1)*.43;
        for(let j=0;j<7;j++) {
          const a=j*Math.PI*2/7, height=.32+(j%3)*.1;
          const leaf=new T.Mesh(new T.ConeGeometry(.075,height,4),m.leaves[(i+j)%m.leaves.length]);
          leaf.position.set(x+Math.cos(a)*.1,.28+height/2,z+Math.sin(a)*.1);
          leaf.rotation.z=Math.cos(a)*.35;leaf.rotation.x=Math.sin(a)*.35;
          leaf.castShadow=true;layers.visual.add(leaf);
        }
      }
      addCourtyardElevatorTree(layers.visual,layers.solid,{center:[0,0],baseY:.28,height:6.7,spread:1.6,name:"Árbol del cantero del patio"});
    },floor);
    // Cartel azul sobre dos postes, al borde de acceso a la plaza.
    frame(plan.blockGCourtyard.sign,()=>{
      for(const x of [-.67,.67]) pole(.025,2.25,x,1.125,0,m.metal,true);
      box(1.24,1.52,.06,0,1.42,0,m.blue,true);
      const board=new T.Mesh(new T.PlaneGeometry(1.2,1.5),friendshipSign());
      board.position.set(0,1.42,.035);layers.visual.add(board);
    });

    const tileEdge = m.tile.clone();
    tileEdge.color.set("#8b9eaa");
    const lowWall = m.concrete.clone(); lowWall.color.set("#ac6554");
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
        frame({ center: [w / 2 - 0.14, z], size: [1.17, 0.35], angle: Math.PI / 2 }, () => registerSeats(layers.visual, 1.17, 0, 0.36));
        box(0.31, 0.32, 1.17, w / 2 - 0.14, 0.16, z, lowWall, true);
        box(0.35, 0.045, 1.17, w / 2 - 0.14, 0.34, z, lowWall);
      }
      // Copias del banco rojizo en los dos bordes señalados junto al árbol.
      for (const z of [-1.3, -0.1]) {
        frame({ center: [-w / 2 + 0.14, z], size: [1.17, 0.35], angle: -Math.PI / 2 }, () => registerSeats(layers.visual, 1.17, 0, 0.36));
        box(0.31, 0.32, 1.17, -w / 2 + 0.14, 0.16, z, lowWall, true);
        box(0.35, 0.045, 1.17, -w / 2 + 0.14, 0.34, z, lowWall);
      }
      for (const x of [-3.65, -2.45]) {
        registerSeats(layers.visual, 1.17, x, 0.36, -d / 2 + 0.14);
        box(1.17, 0.32, 0.31, x, 0.16, -d / 2 + 0.14, lowWall, true);
        box(1.17, 0.045, 0.35, x, 0.34, -d / 2 + 0.14, lowWall);
      }
    }, floor);

    // Farolas de cuatro caras, en las posiciones indicadas junto a cada mesa.
    const lampIron = new T.MeshStandardMaterial({color:"#161a1b",roughness:.68,metalness:.65});
    const lampGlass = new T.MeshStandardMaterial({color:"#e6e8d9",roughness:.4,emissive:"#fff0c4",emissiveIntensity:.22});
    for (const [x,z] of plan.blockGCourtyard.lamps) {
      pole(.085,.16,x,floor+.08,z,lampIron,true);
      pole(.036,2.15,x,floor+1.075,z,lampIron,true);
      for(const y of [.18,.5,1.5,2.08]) pole(.055,.065,x,floor+y,z,lampIron);
      const glass = new T.Mesh(new T.CylinderGeometry(.22,.14,.43,4),lampGlass);
      glass.rotation.y=Math.PI/4;glass.position.set(x,floor+2.34,z);layers.visual.add(glass);
      for(const dx of [-1,1]) for(const dz of [-1,1])
        beam(v3(x+dx*.1,floor+2.125,z+dz*.1),v3(x+dx*.156,floor+2.555,z+dz*.156),.014,lampIron);
      box(.36,.035,.36,x,floor+2.12,z,lampIron);
      box(.5,.035,.5,x,floor+2.57,z,lampIron);
      const roof=new T.Mesh(new T.ConeGeometry(.34,.19,4),lampIron);
      roof.rotation.y=Math.PI/4;roof.position.set(x,floor+2.68,z);layers.visual.add(roof);
      pole(.035,.08,x,floor+2.81,z,lampIron);
    }

    const blueSlats = friendshipMaterial("blue");
    const tube = new T.MeshStandardMaterial({ color: "#303536", roughness: 0.76 });
    function seat(center: Vec2, angle: number, width: number) {
      frame({ center, size: [width, 0.65], angle }, () => {
        registerSeats(layers.visual, width, 0, 0.44);
        for (let i = 0; i < 4; i++) box(width, 0.032, 0.093, 0, 0.44, -0.14 + i * 0.1, blueSlats);
        for (let i = 0; i < 4; i++) box(width, 0.074, 0.035, 0, 0.54 + i * 0.082, -0.17 - i * 0.025, blueSlats);
        for (const x of [-width / 2 + 0.075, width / 2 - 0.075]) {
          const shape = new T.CatmullRomCurve3([
            v3(x, 0.02, 0.27), v3(x, 0.14, 0.21), v3(x, 0.39, 0.21),
            v3(x, 0.44, 0.13), v3(x, 0.44, -0.16), v3(x, 0.78, -0.26),
          ]);
          const support = new T.Mesh(new T.TubeGeometry(shape, 16, 0.022, 6, false), tube);
          support.castShadow = true; layers.visual.add(support);
          beam(v3(x, 0.44, -0.15), v3(x, 0.018, -0.27), 0.024, tube);
        }
        const body = new T.Mesh(unit);
        body.scale.set(width, 0.8, 0.52);
        body.position.set(0, 0.4, 0);
        layers.solid.add(body);
      }, floor);
    }
    for (const [x, z] of tables) {
      for (let i = 0; i < 6; i++) {
        box(1.45, 0.045, 0.122, x, floor + 0.74, z + (i - 2.5) * 0.126, blueSlats);
      }
      for (const dx of [-0.6, 0.6]) for (const dz of [-0.27, 0.27]) {
        beam(v3(x + dx, floor + 0.71, z + dz), v3(x + dx * 1.13, floor + 0.02, z + dz * 1.2), 0.027, tube);
      }
      const body = new T.Mesh(unit);
      body.scale.set(1.45, 0.74, 0.76); body.position.set(x, floor + 0.37, z); layers.solid.add(body);
      seat([x, z - 1.12], 0, 1.58);
      seat([x, z + 1.12], Math.PI, 1.58);
      seat([x - 1.28, z], -Math.PI / 2, 0.55);
      seat([x + 1.28, z], Math.PI / 2, 0.55);
    }
  }

  addCantinaGarden(builder);
  addCourtyardVegetation(layers.visual, layers.solid);
  const [treeX, treeZ] = plan.tree2;
  box(2.8, 0.45, 0.6, treeX + 3, 0.225, treeZ - 2.5, m.brick, true);
  box(2.4, 0.45, 0.6, treeX + 3, 0.225, treeZ - 5, m.brick, true);
  pruneTreeStructures(group,colliders);
  builder.finishRoofs();
  mergeByMaterial(group);
  group.updateMatrixWorld(true); colliders.updateMatrixWorld(true);
  return { group, colliders, elevator };
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
