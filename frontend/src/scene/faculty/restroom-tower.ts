import * as T from "three";
import { block1, facultyBlueprint as plan, FLOOR_HEIGHT as H, towerEntrance, towerEntryFront, towerRoomOutline, type Rect, type Vec2 } from "../../data/faculty-blueprint";
import { makeRestroomFixtures } from "../restroom-fixtures";
import { galleryTileOffset, type FacultyBuilder, type Range } from "./builder";

// ---- Torre de baños: núcleo desde la galería y dos semicírculos a sus costados ----
export function addRestroomTower(builder: FacultyBuilder) {
  const { layers, m, unit, box, beam, v3, frame, prism, pave, spans } = builder;
  const tw = plan.tower;
  const [b1x] = plan.main.center;
  const [cx, cz] = tw.center, r = tw.radius, rx = tw.radiusX, c = tw.core / 2, top = (block1.levels - 1) * H + 4.1;
  const north = block1.depth / 2, south = cz + r;
  const { halfWidth, doorOffset, doorWidth, recess, angle: entryAngle, curveJoin } = tw.entry;
  const [galleryTileWidth] = m.galleryFloor.userData.tile as number[];
  // El granito de Bloque 1 usa x local. La extensión usa x del plano del campus.
  const porchTileOffset: Vec2 = [galleryTileOffset - b1x / galleryTileWidth, 0];
  const doorHeight = 2.1, transomTop = 2.53, wallThickness = 0.19;
  const charcoal = new T.MeshStandardMaterial({ color: "#353a3c", roughness: 0.67 });
  const frosted = new T.MeshStandardMaterial({ color: "#a7bbba", roughness: 0.48 });
  const stripe = new T.MeshStandardMaterial({ color: "#687d80", roughness: 0.62 });
  const partition = new T.MeshStandardMaterial({ color: "#a8b2ac", roughness: 0.74 });
  const mirror = new T.MeshStandardMaterial({ color: "#9caeaf", roughness: 0.19, metalness: 0.5 });
  const lamp = new T.MeshStandardMaterial({ color: "#eee9d9", emissive: "#e6e0ca", emissiveIntensity: 0.52 });
  const ceiling = new T.MeshStandardMaterial({ color: "#dfdfd2", roughness: 0.84, side: T.DoubleSide });
  const fixtures = makeRestroomFixtures();
  const fixtureBody = (x: number, y: number, z: number, w: number, h: number, d: number, angle = 0) => {
    const body = new T.Mesh(unit);
    body.position.set(x, y, z);
    body.scale.set(w, h, d);
    body.rotation.y = angle;
    layers.solid.add(body);
  };
  const placeFixture = (fixture: T.Group, x: number, y: number, z: number, angle: number) => {
    const model = fixture.clone();
    model.position.set(x, y, z);
    model.rotation.y = angle;
    layers.visual.add(model);
  };
  const halves = [-1, 1].map(side => {
    const xc = cx + side * c;
    const [doorInner, doorOuter, shoulder, arcStart] = towerRoomOutline(side);
    const outer: Vec2[] = [[shoulder[0], north - 0.055], shoulder, arcStart];
    const cuts = [-curveJoin, -0.26, 0.26, Math.PI / 2];
    const window = [0, 0];
    for (let k = 1; k < cuts.length; k++) {
      const segments = Math.ceil((cuts[k] - cuts[k - 1]) * 24);
      for (let i = 1; i <= segments; i++) {
        const angle = T.MathUtils.lerp(cuts[k - 1], cuts[k], i / segments);
        outer.push([xc + side * rx * Math.cos(angle), cz + r * Math.sin(angle)]);
      }
      if (k < 3) window[k - 1] = outer.length - 1;
    }
    outer.push([cx, south]);
    const normal = ([ax, az]: Vec2, [bx, bz]: Vec2) => new T.Vector2(-side * (bz - az), side * (bx - ax)).normalize();
    const insets = outer.map((point, i) => {
      const prev = normal(outer[Math.max(0, i - 1)], point);
      const next = normal(point, outer[Math.min(i + 1, outer.length - 1)]);
      const miter = Math.max(1, 1 + prev.dot(next));
      return prev.add(next).multiplyScalar(1 / miter);
    });
    const insetPath = (depth: number): Vec2[] => outer.map(([x, z], i) =>
      [x + insets[i].x * depth, z + insets[i].y * depth]);
    const outline: Vec2[] = [doorInner, doorOuter, ...outer.slice(1)];
    return { side, xc, outline, entrance: towerEntrance(side), outer, insetPath, window };
  });
  function wallFace(points: readonly Vec2[], from: number, to: number, bottom: number, top: number,
    material: T.Material, facing: number) {
    const [tileX, tileY] = material.userData.tile as number[] ?? [1, 1];
    const positions: number[] = [], uv: number[] = [], indices: number[] = [], normals: number[] = [];
    let distance = 0;
    for (let i = 0; i <= to; i++) {
      const [x, z] = points[i];
      if (i) distance += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
      if (i < from) continue;
      positions.push(x, bottom, z, x, top, z);
      const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
      const n = new T.Vector2(prev[1] - next[1], next[0] - prev[0]).normalize().multiplyScalar(facing);
      normals.push(n.x, 0, n.y, n.x, 0, n.y);
      uv.push(facing * distance / tileX, bottom / tileY, facing * distance / tileX, top / tileY);
      if (i === to) continue;
      const j = (i - from) * 2;
      if (facing > 0) indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
      else indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    const mesh = new T.Mesh(geo, material);
    mesh.castShadow = mesh.receiveShadow = true;
    layers.visual.add(mesh);
  }
  function wallCollision(outer: readonly Vec2[], inner: readonly Vec2[], bottom: number, height: number) {
    const points = [...outer, ...[...inner].reverse()].map(([x, z]) => new T.Vector2(x, -z));
    const geo = new T.ExtrudeGeometry(new T.Shape(points), { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bottom, 0);
    layers.solid.add(new T.Mesh(geo));
  }
  for (let level = 0; level < block1.levels; level++) {
    const y = level * H, y1 = level === block1.levels - 1 ? top : y + H, hw = y1 - y;
    box(0.22, hw, south - north - recess + 0.1, cx, y + hw / 2, (south + north + recess - 0.1) / 2, m.brick, true);
    box(2 * c + 0.12, hw, 0.2, cx, y + hw / 2, south - 0.03, m.brick, true);
    for (const { side, xc, outline, entrance, outer, insetPath, window: [left, right] } of halves) {
      const men = side === tw.menSide;
      frame(entrance, () => {
        const ends = [-side * doorOffset / Math.cos(entryAngle), side * (halfWidth - doorOffset) / Math.cos(entryAngle)];
        const opening: Range[] = [[-doorWidth / 2, doorWidth / 2]];
        for (const [a, b] of spans(Math.min(...ends) - 0.1, Math.max(...ends) + 0.06, opening))
          box(b - a, hw, 0.22, (a + b) / 2, y + hw / 2, 0, m.brick, true);
        // El revestimiento termina dentro del retorno de ladrillo.
        const tileEnds = ends.map(end => end - Math.sign(end) * 0.14);
        for (const [a, b] of spans(Math.min(...tileEnds), Math.max(...tileEnds), opening))
          box(b - a, 2.42, 0.025, (a + b) / 2, y + 1.21, 0.119, m.tile);
        box(doorWidth, hw - transomTop, 0.22, 0, y + (hw + transomTop) / 2, 0, m.brick, true);
        box(doorWidth, transomTop - doorHeight, 0.075, 0, y + (transomTop + doorHeight) / 2, 0, frosted, true);
        for (const dx of [-doorWidth / 2, doorWidth / 2])
          box(0.048, transomTop, 0.24, dx, y + transomTop / 2, 0, charcoal, true);
        for (const h of [doorHeight, transomTop])
          box(doorWidth, 0.058, 0.24, 0, y + h, 0, charcoal, true);
        const hingeX = side * (doorWidth / 2 - 0.085);
        box(0.055, 2.04, 1.08, hingeX, y + 1.05, -0.55, charcoal, true);
        box(0.14, 0.037, 0.13, hingeX, y + 1.03, -0.98, m.steel);
      });
      const [frontInner, frontOuter] = towerEntryFront(side);
      const porch: Vec2[] = [[cx, north], [frontOuter[0], north], frontOuter, frontInner];
      prism(porch, y - 0.24, 0.24, m.concrete);
      pave(porch, m.galleryFloor, y + 0.03, false, porchTileOffset);
      const innerWall = insetPath(wallThickness);
      const last = outer.length - 1;
      const windowSill = men ? 1.9 : 1.2, windowHead = windowSill + 0.9;
      const tileHeight = men ? 3.02 : 2.42;
      wallCollision(outer, innerWall, y, hw);
      const rim = level ? y - 0.001 : y - 0.24;
      wallFace(outer, 0, left, rim, y1, m.brick, -side);
      wallFace(outer, right, last, rim, y1, m.brick, -side);
      wallFace(outer, left, right, rim, y + windowSill, m.brick, -side);
      wallFace(outer, left, right, y + windowHead, y1, m.brick, -side);
      wallFace(outer, left, right, y + windowSill, y + windowHead, frosted, -side);
      wallFace([innerWall[0], outer[0]], 0, 1, rim, y1, m.brick, -side);
      // Azulejo y franja usan el mismo trazado para evitar líneas en el encuentro.
      const tileFrom = 1;
      wallFace(innerWall, 0, tileFrom, y, y1, m.brick, side);
      wallFace(innerWall, tileFrom, last, y + tileHeight, y1, m.brick, side);
      for (const [first, end, bottom, upper] of [
        [tileFrom, left, 0, tileHeight], [right, last, 0, tileHeight],
        [left, right, 0, windowSill], [left, right, windowHead, tileHeight],
      ]) {
        if (bottom < 0.96)
          wallFace(innerWall, first, end, y + bottom, y + 0.96, m.tile, side);
        wallFace(innerWall, first, end, y + Math.max(bottom, 1.12), y + upper, m.tile, side);
      }
      wallFace(innerWall, tileFrom, last, y + 0.96, y + 1.12, stripe, side);
      wallFace(innerWall, left, right, y + windowSill, y + windowHead, frosted, side);
      for (const h of [windowSill, windowHead]) {
        wallFace(insetPath(-0.006), left, right, y + h - 0.025, y + h + 0.025, charcoal, -side);
        wallFace(insetPath(wallThickness + 0.006), left, right, y + h - 0.025, y + h + 0.025, charcoal, side);
      }
      wallCollision(outline, [], y - 0.24, 0.24);
      pave([...outline.slice(0, 2), ...innerWall.slice(1)], m.tile, y + 0.03);
      pave([...outline.slice(0, 2), ...innerWall.slice(1)], ceiling, y1 - 0.245);
      const insideLength = south - frontInner[1];
      box(0.025, 2.42, insideLength, cx + side * 0.119, y + 1.21, (south + frontInner[1]) / 2, m.tile);
      box(0.028, 0.16, insideLength, cx + side * 0.133, y + 1.04, (south + frontInner[1]) / 2, stripe);

      // Los cubículos abren hacia el centro. El más amplio queda en la esquina del fondo.
      const stallEdges = men ? [-4.03, -2.69, -1.35, -0.01] : [-2.18, -0.32, 0.82, 1.96, 3.1];
      const regularFront = men ? 1.5 : 2.55, accessibleFront = 3.14;
      for (let i = 0; i < stallEdges.length; i++) {
        const touchesAccessible = !men && i <= 1;
        const front = touchesAccessible ? accessibleFront : regularFront;
        box(front - 0.12, 1.96, 0.065, cx + side * ((front + 0.12) / 2), y + 1.04, cz + stallEdges[i], partition, true);
      }
      for (let i = 0; i < stallEdges.length - 1; i++) {
        const accessible = !men && i === 0;
        const from = stallEdges[i], to = stallEdges[i + 1];
        const middle = (from + to) / 2;
        const front = accessible ? accessibleFront : regularFront;
        const opening = accessible ? 1.06 : men ? 0.92 : 0.86;
        // El hueco accesible se desplaza hacia el extremo libre del inodoro.
        const doorCenter = middle - (accessible ? 0.24 : 0);
        for (const [a, b] of spans(from, to, [[doorCenter - opening / 2, doorCenter + opening / 2]]))
          box(0.065, 1.96, b - a, cx + side * front, y + 1.04, cz + (a + b) / 2, partition, true);
        const hinge = cz + doorCenter - opening / 2;
        box(opening - 0.04, 1.87, 0.045, cx + side * (front - opening / 2), y + 1.04, hinge, partition, true);
        box(0.09, 0.026, 0.086, cx + side * (front - opening + 0.13), y + 0.98, hinge, m.steel);
        const toiletZ = cz + middle + (accessible ? 0.43 : 0);
        placeFixture(fixtures.toilet, cx + side * 0.15, y + 0.03, toiletZ, side > 0 ? 0 : Math.PI);
        fixtureBody(cx + side * 0.46, y + 0.24, toiletZ, 0.6, 0.48, 0.38);
        if (accessible) {
          for (const z of [toiletZ - 0.31, toiletZ + 0.31])
            beam(v3(cx + side * 0.13, y + 0.76, z), v3(cx + side * 0.81, y + 0.76, z), 0.026, m.steel);
        }
      }
      if (men) {
        // Los muros del fondo y el lateral de la torre completan la esquina del cubículo.
        const outerX = 2.74, nearZ = cz + 1.15, outerZ = cz + 2.17, opening = 1.08;
        const faceLength = Math.hypot(outerX - 0.1, outerZ - nearZ);
        const faceAngle = Math.atan2(nearZ - outerZ, outerX - 0.1);
        const doorT = 0.43; // desde el extremo exterior hacia el muro divisorio
        const face: Rect = {
          center: [cx + side * T.MathUtils.lerp(outerX, 0.1, doorT), T.MathUtils.lerp(outerZ, nearZ, doorT)],
          size: [faceLength, 0.065], angle: faceAngle,
        };
        const backOfSide = cz + r * Math.sqrt(1 - ((outerX - c) / rx) ** 2) + 0.04;
        box(0.065, 1.96, backOfSide - outerZ, cx + side * outerX, y + 1.04,
          (outerZ + backOfSide) / 2, partition, true);
        frame(face, () => {
          for (const [a, b] of spans(-faceLength * doorT - 0.025, faceLength * (1 - doorT) + 0.025,
            [[-opening / 2, opening / 2]]))
            box(b - a, 1.96, 0.065, (a + b) / 2, y + 1.04, 0, partition, true);
          box(0.045, 1.87, opening - 0.04, -opening / 2, y + 1.04, opening / 2, partition, true);
          box(0.085, 0.026, 0.09, -opening / 2, y + 0.98, opening - 0.13, m.steel);
        });
        const toilet: Rect = { center: [cx + side * 0.66, south - 0.25], size: [0.6, 0.38], angle: -Math.PI * 0.63 };
        frame(toilet, () => {
          placeFixture(fixtures.toilet, 0, y + 0.03, 0, 0);
          fixtureBody(0.3, y + 0.24, 0, 0.6, 0.48, 0.38);
          for (const z of [-0.31, 0.31])
            beam(v3(0, y + 0.76, z), v3(0.67, y + 0.76, z), 0.026, m.steel);
        });

        const wallX = cx + side * 2.64;
        box(0.16, 2.29, 2.24, wallX, y + 1.145, cz - 0.85, m.tile, true);
        for (const relative of [-1.37, -0.36]) {
          const x = wallX + side * 0.08;
          placeFixture(fixtures.sink, x, y + 0.03, cz + relative, Math.PI);
          fixtureBody(x + side * 0.24, y + 0.68, cz + relative, 0.48, 0.39, 0.54);
          box(0.028, 0.62, 0.49, x + side * 0.02, y + 1.32, cz + relative, mirror);
        }
        const urinals = [-1.76, -0.86, 0.04, 0.94];
        for (const relative of urinals) {
          const x = xc + side * (rx - 0.25) * Math.sqrt(1 - (relative / (r - 0.25)) ** 2);
          const angle = Math.atan2(relative, xc - x);
          placeFixture(fixtures.urinal, x, y - 0.12, cz + relative, angle);
          fixtureBody(x - side * 0.14, y + 0.67, cz + relative, 0.3, 0.55, 0.35, angle);
        }
        for (const relative of urinals.slice(0, -1).map(z => z + 0.45)) {
          const x = xc + side * ((rx - 0.15) * Math.sqrt(1 - (relative / (r - 0.15)) ** 2) - 0.23);
          box(0.54, 1.05, 0.055, x, y + 0.94, cz + relative, partition, true,
            { rotation: Math.atan2(relative, xc - x) });
        }
      } else {
        for (const relative of [-1.2, -0.38]) {
          const x = xc + side * ((rx - 0.22) * Math.sqrt(1 - (relative / (r - 0.22)) ** 2) - 0.02);
          const facing = Math.atan2(relative, xc - x);
          placeFixture(fixtures.sink, x, y + 0.03, cz + relative, facing);
          fixtureBody(x - side * 0.2, y + 0.68, cz + relative, 0.45, 0.43, 0.52, facing);
          box(0.03, 0.62, 0.48, x, y + 1.31, cz + relative, mirror, false, { rotation: facing });
        }
      }
      box(0.17, 0.07, 1.28, xc + side * 1.8, y1 - 0.28, cz - 0.22, lamp);
    }
    const fountainZ = north + recess - 0.23;
    box(0.28, hw, 0.27, cx, y + hw / 2, fountainZ + 0.08, m.concrete, true);
    placeFixture(fixtures.fountain, cx, y + 0.01, fountainZ - 0.071, Math.PI / 2);
    fixtureBody(cx, y + 0.69, fountainZ - 0.31, 0.54, 0.38, 0.43);
  }
  // El ladrillo reviste el canto de la losa: dibujar también el canto blanco
  // en el mismo plano provoca parpadeos y fragmentos claros en la fachada curva.
  const roofSlab = (outline: readonly Vec2[]) => {
    wallCollision(outline, [], top, 0.3);
    pave(outline, m.white, top + 0.3, true);
  };
  for (const { side, outer, insetPath, outline } of halves) {
    roofSlab(outline);
    const [frontInner, frontOuter] = towerEntryFront(side);
    roofSlab([[cx, north], [frontOuter[0], north], frontOuter, frontInner]);
    const inside = insetPath(wallThickness);
    wallCollision(outer, inside, top, 0.7);
    wallFace(outer, 0, outer.length - 1, top, top + 0.7, m.brick, -side);
    wallFace(inside, 0, inside.length - 1, top + 0.3, top + 0.7, m.brick, side);
  }
  box(2 * halfWidth, 0.7, 0.2, cx, top + 0.35, north + 0.1, m.brick, true);
  box(2 * c + 0.12, 0.7, 0.2, cx, top + 0.35, south - 0.03, m.brick, true);
  box(2.6, 2.6, 4.4, cx, top + 1.6, cz, m.white, true);
  box(2.8, 0.15, 4.6, cx, top + 2.95, cz, m.concrete, true);
  // Anexo cuadrado de planta baja que sobresale al sur, con portón enrollable al este. Sus muros
  // laterales arrancan donde cortan a los semicírculos.
  const a = tw.annex.size / 2, zs = south + tw.annex.beyond, zn = cz + r * Math.sqrt(1 - ((a - c) / rx) ** 2);
  box(2 * a, H, 0.24, cx, H / 2, zs - 0.12, m.brick, true);
  for (const side of [-1, 1]) box(0.24, H, zs - zn + 0.2, cx + side * (a - 0.12), H / 2, (zn + zs - 0.2) / 2, m.brick, true);
  box(2 * a, 0.2, zs - zn + 0.3, cx, H - 0.1, (zn + zs - 0.3) / 2, m.concrete, true);
  box(2 * a + 0.1, 0.3, 0.06, cx, H - 0.1, zs + 0.03, m.white);
  box(0.05, 2.6, 2.2, cx + a + 0.03, 1.3, (zn + zs) / 2 + 0.3, m.steel);
}
