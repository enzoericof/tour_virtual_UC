import * as T from "three";
import { layout, campusBounds, insidePolygon, distanceToSegment, type Point } from "../data/campus-geometry";
import { inFacultyZone } from "../data/faculty-blueprint";

export function createCampusContext() {
  const group = new T.Group(), colliders = new T.Group();
  group.name = "CyT · canchas y estacionamientos";
  const material = (color: string) => new T.MeshStandardMaterial({ color, roughness: 0.95 });
  const ground = material("#768961"), outside = material("#d7dacb");
  const road = material("#b4b1a5"), parking = material("#b6b2a2");
  const pitchMat = material("#6a8e4a");
  const baseGeo = new T.BoxGeometry(1, 1, 1);
  function polygon(points: Point[], mat: T.Material, y: number, depth = 0) {
    const shape = new T.Shape(points.map((p) => new T.Vector2(p[0], -p[1])));
    const geometry = depth ? new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }) : new T.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.y = y; mesh.receiveShadow = true; mesh.castShadow = depth > 0;
    group.add(mesh); return mesh;
  }
  function strip(points: Point[], width: number, mat: T.Material, y = 0.035) {
    const vertices: number[] = [], indices: number[] = [];
    points.forEach((p, i) => {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const dx = ((b[1] - a[1]) / d) * width / 2, dz = ((b[0] - a[0]) / d) * width / 2;
      vertices.push(p[0] + dx, y, p[1] - dz, p[0] - dx, y, p[1] + dz);
      if (i) { const k = i * 2; indices.push(k - 2, k - 1, k, k, k - 1, k + 1); }
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, mat); mesh.receiveShadow = true; group.add(mesh);
  }
  const w = campusBounds.maxX - campusBounds.minX + 10, d = campusBounds.maxZ - campusBounds.minZ + 10;
  const base = new T.Mesh(baseGeo, outside);
  base.scale.set(w, 0.4, d);
  base.position.set((campusBounds.minX + campusBounds.maxX) / 2, -0.25, (campusBounds.minZ + campusBounds.maxZ) / 2);
  base.receiveShadow = true; group.add(base);
  const floor = new T.Mesh(baseGeo); floor.scale.copy(base.scale); floor.position.copy(base.position); colliders.add(floor);
  polygon(layout.boundary, ground, -0.025);
  layout.parking.filter((p) => !inFacultyZone(p.points)).forEach((p) => polygon(p.points, parking, 0.008));
  layout.roads.filter((r) => !inFacultyZone(r.points)).forEach((r) => strip(r.points, r.width, road));

  const lineMat = new T.LineBasicMaterial({ color: "#e1e8ce" });
  function line(points: T.Vector3[], closed = false) {
    const geo = new T.BufferGeometry().setFromPoints(points);
    group.add(closed ? new T.LineLoop(geo, lineMat) : new T.Line(geo, lineMat));
  }
  layout.pitches.forEach((p) => {
    polygon(p.points, pitchMat, 0.05);
    const pts = p.points.slice(0, 4), center = new T.Vector3(
      pts.reduce((s, q) => s + q[0], 0) / 4, 0.085, pts.reduce((s, q) => s + q[1], 0) / 4);
    const corners = pts.map((q) => new T.Vector3(q[0], 0.085, q[1]).lerp(center, 0.045));
    line(corners, true);
    const longer = corners[0].distanceTo(corners[1]) > corners[1].distanceTo(corners[2]) ? 0 : 1;
    const a = corners[longer], b = corners[(longer + 1) % 4], c = corners[(longer + 2) % 4], e = corners[(longer + 3) % 4];
    line([a.clone().lerp(b, 0.5), c.clone().lerp(e, 0.5)]);
    line(Array.from({ length: 40 }, (_, i) => center.clone().add(new T.Vector3(Math.cos(i * Math.PI / 20) * 4.5, 0, Math.sin(i * Math.PI / 20) * 4.5))), true);
    for (const [start, end, sign] of [[a, e, 1], [b, c, -1]] as const) {
      const mid = start.clone().lerp(end, 0.5), axis = b.clone().sub(a).normalize().multiplyScalar(sign * 8);
      const across = end.clone().sub(start).normalize().multiplyScalar(8);
      line([mid.clone().sub(across), mid.clone().sub(across).add(axis), mid.clone().add(across).add(axis), mid.clone().add(across)]);
    }
  });

  let seed = 73161;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function free(x: number, z: number) {
    const point = [x, z];
    return insidePolygon(point, layout.boundary)
      && !layout.buildings.some((b) => insidePolygon(point, b.points) || b.points.some((a, i) => distanceToSegment(point, a, b.points[(i + 1) % b.points.length]) < 3.2))
      && !layout.pitches.some((p) => insidePolygon(point, p.points))
      && !layout.parking.some((p) => insidePolygon(point, p.points))
      && !layout.roads.some((r) => r.points.some((p, i) => i && distanceToSegment(point, r.points[i - 1], p) < r.width / 2 + 2.1));
  }
  // Sparse reference trees only: keep the campus layout and paths unobstructed.
  const treeCandidates: [number, number][] = [
    [-125, -70], [-110, 85], [105, -35], [100, 60],
  ];
  const trees = treeCandidates.filter(([x, z]) => free(x, z));
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.25, 0.4, 1, 5), material("#655744"), trees.length);
  const leaves = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), material("#416745"), trees.length * 2);
  const dummy = new T.Object3D(), color = new T.Color();
  trees.forEach(([x, z], i) => {
    const h = 5 + random() * 2, radius = 2.2 + random() * 0.8;
    dummy.position.set(x, h / 2, z); dummy.scale.set(1, h, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    for (let k = 0; k < 2; k++) {
      dummy.position.set(x + k * 0.9, h - k * 1.4, z + k * 0.7);
      dummy.scale.set(radius, radius * 0.7, radius * 0.87);
      dummy.rotation.set(random(), random(), random()); dummy.updateMatrix(); leaves.setMatrixAt(i * 2 + k, dummy.matrix);
      leaves.setColorAt(i * 2 + k, color.setHSL(0.25 + random() * 0.08, 0.18 + random() * 0.15, 0.35 + random() * 0.1));
    }
  });
  trunks.castShadow = leaves.castShadow = true;
  leaves.receiveShadow = true; group.add(trunks, leaves);

  const carPoints: [number, number][] = [];
  for (const area of layout.parking) {
    const xs = area.points.map((p) => p[0]), zs = area.points.map((p) => p[1]);
    for (let x = Math.min(...xs) + 4; x < Math.max(...xs) - 3; x += 7)
      for (let z = Math.min(...zs) + 4; z < Math.max(...zs) - 3; z += 13)
      if (!inFacultyZone(area.points) && random() > 0.35 && insidePolygon([x, z], area.points) && !layout.roads.some((r) => r.points.some((p, i) => i && distanceToSegment([x, z], r.points[i - 1], p) < 4.6))) carPoints.push([x, z]);
  }
  const cars = new T.InstancedMesh(baseGeo, material("#eee9dc"), carPoints.length);
  const carColors = ["#e3e0d4", "#455663", "#9d5245", "#757b75"];
  carPoints.forEach(([x, z], i) => {
    dummy.position.set(x, 0.7, z); dummy.scale.set(1.8, 1.25, 4.1); dummy.rotation.set(0, 0.12, 0); dummy.updateMatrix(); cars.setMatrixAt(i, dummy.matrix);
    cars.setColorAt(i, color.set(carColors[i % carColors.length]));
  });
  cars.castShadow = true; group.add(cars);

  const labels = [
    ["CIENCIAS Y TECNOLOGÍA", -58, -160, true],
    ["ESTACIONAMIENTO", 0, -35, false],
    ["CANCHAS", -83, 5, false],
    ["N", -125, -190, false],
  ] as const;
  for (const [name, x, z, faculty] of labels) {
    const isNorth = name === "N";
    const canvas = document.createElement("canvas"); canvas.width = isNorth ? 128 : 512; canvas.height = isNorth ? 128 : 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = faculty ? "#234b3c" : "#f8f7ed"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = faculty ? "#f8f7ed" : "#385247";
    ctx.font = isNorth ? "600 68px Arial" : "600 32px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(name, canvas.width / 2, canvas.height / 2, canvas.width - 20);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false, sizeAttenuation: false }));
    const width = isNorth ? 0.038 : faculty ? 0.22 : 0.17;
    sprite.position.set(x, 25, z); sprite.scale.set(width, width * canvas.height / canvas.width, 1); sprite.renderOrder = 4;
    sprite.userData.contextLabel = true; group.add(sprite);
  }
  return { group, colliders };
}
