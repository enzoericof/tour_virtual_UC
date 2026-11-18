import * as T from "three";
import type { Rect, Vec2 } from "../../data/faculty-blueprint";
import type { makeMaterials } from "../materials";

type BoxOptions = { tile?: readonly number[]; offset?: readonly number[]; rotation?: number; pitch?: number };
export const galleryTileOffset = 0.5;
export type Range = readonly [number, number];

export function createFacultyBuilder(visual: T.Object3D, solid: T.Object3D, m: ReturnType<typeof makeMaterials>) {
  const unit = new T.BoxGeometry(1, 1, 1);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 14);
  const layers = { visual, solid };

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
    mesh.castShadow = !mat.transparent && mat !== m.grass; mesh.receiveShadow = true; layers.visual.add(mesh);
    if (collide) {
      const body = new T.Mesh(unit);
      body.position.copy(mesh.position); body.scale.copy(mesh.scale); body.rotation.copy(mesh.rotation);
      layers.solid.add(body);
    }
    return mesh;
  }
  function pole(r: number, h: number, x: number, y: number, z: number, mat: T.Material = m.metal, collide = false) {
    const mesh = new T.Mesh(cylinder, mat); mesh.scale.set(r, h, r); mesh.position.set(x, y, z);
    mesh.castShadow = true; layers.visual.add(mesh);
    if (collide) { const body = new T.Mesh(unit); body.scale.set(r * 2, h, r * 2); body.position.set(x, y, z); layers.solid.add(body); }
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
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; layers.visual.add(mesh);
  }
  /** Construye dentro del marco de un rectángulo del plano (giro y traslación, sin escala), con el
   * piso a la altura y. */
  function frame(rect: Rect, build: () => void, y = 0) {
    const vg = new T.Group(), cg = new T.Group();
    for (const g of [vg, cg]) { g.position.set(rect.center[0], y, rect.center[1]); g.rotation.y = -rect.angle; }
    const pv = layers.visual, ps = layers.solid; layers.visual.add(vg); layers.solid.add(cg); layers.visual = vg; layers.solid = cg;
    try {
      build();
    } finally {
      layers.visual = pv;
      layers.solid = ps;
    }
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
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; layers.visual.add(mesh);
    if (collide) layers.solid.add(new T.Mesh(geo));
    return mesh;
  }
  function pave(points: readonly Vec2[], mat: T.Material, y: number, castShadow = false, offset: Vec2 = [0, 0]) {
    const geo = new T.ShapeGeometry(new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z))));
    geo.rotateX(-Math.PI / 2);
    const tile = mat.userData.tile as number[] | undefined;
    if (tile) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++)
        geo.attributes.uv.setXY(i, p.getX(i) / tile[0] + offset[0], p.getZ(i) / tile[1] + offset[1]);
    }
    const mesh = new T.Mesh(geo, mat); mesh.position.y = y;
    mesh.castShadow = castShadow; mesh.receiveShadow = true; layers.visual.add(mesh);
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

  /** Plano inclinado de colisión (rampa invisible) bajo los escalones. */
  function ramp(a: T.Vector3, b: T.Vector3, width: number) {
    const dx = b.x - a.x, dz = b.z - a.z, run = Math.hypot(dx, dz);
    const n = v3(-dz / run, 0, dx / run).multiplyScalar(width / 2);
    const p = [a.clone().add(n), a.clone().sub(n), b.clone().add(n), b.clone().sub(n)];
    const geo = new T.BufferGeometry().setFromPoints([p[0], p[2], p[1], p[1], p[2], p[3]]); geo.computeVertexNormals();
    layers.solid.add(new T.Mesh(geo));
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
    const mesh = new T.Mesh(geo, material); mesh.castShadow = mesh.receiveShadow = true; layers.visual.add(mesh);
    layers.solid.add(new T.Mesh(geo));
  }

  return { m, layers, unit, box, pole, beam, v3, sign, frame, prism, pave, path, spans, ramp, glazing, slopedWall };
}

export type FacultyBuilder = ReturnType<typeof createFacultyBuilder>;
