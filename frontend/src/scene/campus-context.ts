import * as T from "three";
import { layout } from "../data/campus-geometry";
import { createCampusRock, createRockMist } from "./campus-rock";

export function createCampusContext(grass: T.MeshStandardMaterial) {
  const group = new T.Group(), colliders = new T.Group();
  group.name = "CyT · terreno";
  const edge = layout.boundary.slice(0, -1);
  const shape = new T.Shape(edge.map(([x, z]) => new T.Vector2(x, -z)));
  const terrainGeometry = new T.ShapeGeometry(shape);
  terrainGeometry.rotateX(-Math.PI / 2);
  const [tileX, tileZ] = grass.userData.tile as [number, number];
  const { position, uv } = terrainGeometry.attributes;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / tileX, position.getZ(i) / tileZ);
  const terrain = new T.Mesh(terrainGeometry, grass);
  terrain.name = "Terreno continuo";
  const groundLevel = -0.005;
  terrain.position.y = groundLevel;
  terrain.receiveShadow = true;
  group.add(terrain);
  const floor = new T.Mesh(terrainGeometry);
  floor.position.y = groundLevel;
  colliders.add(floor);

  const rock = createCampusRock(edge, groundLevel);
  group.add(rock, createRockMist(rock));

  const barrierPoints: T.Vector3[] = [];
  for (let i = 1; i < layout.boundary.length; i++) {
    const [ax, az] = layout.boundary[i - 1], [bx, bz] = layout.boundary[i];
    const a = new T.Vector3(ax, -0.3, az), b = new T.Vector3(bx, -0.3, bz);
    const c = new T.Vector3(ax, 3.1, az), d = new T.Vector3(bx, 3.1, bz);
    barrierPoints.push(a, b, c, b, d, c);
  }
  const boundary = new T.Mesh(new T.BufferGeometry().setFromPoints(barrierPoints));
  addPerimeterTrees(group, edge, groundLevel);

  const labels = [
    ["CIENCIAS Y TECNOLOGÍA", -58, -160, true],
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
  return { group, colliders, boundary };
}

/** Copas agrupadas y siluetas variadas con dos lotes de instancias para todo el perímetro. */
function addPerimeterTrees(group: T.Group, edge: number[][], y: number) {
  let seed = 5293;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const trees: { x: number; z: number; height: number; spread: number; narrow: boolean }[] = [];
  let remaining = 2;
  for (let i = 0; i < edge.length; i++) {
    const [x, z] = edge[i], [nextX, nextZ] = edge[(i + 1) % edge.length];
    const length = Math.hypot(nextX - x, nextZ - z);
    const dx = (nextX - x) / length, dz = (nextZ - z) / length;
    while (remaining < length) {
      const inset = 2.5 + random() * 2.3;
      trees.push({ x: x + dx * remaining - dz * inset, z: z + dz * remaining + dx * inset,
        height: 3.5 + random() * 4, spread: 1.25 + random() * 0.8, narrow: random() < 0.24 });
      if (random() < 0.36) {
        const secondInset = inset + 2.2;
        trees.push({ x: x + dx * (remaining + 1.1) - dz * secondInset, z: z + dz * (remaining + 1.1) + dx * secondInset,
          height: 2.4 + random() * 3.7, spread: 1.05 + random() * 0.72, narrow: random() < 0.18 });
      }
      remaining += 2.7 + random() * 2.5;
    }
    remaining -= length;
  }

  const trunkShape = new T.CylinderGeometry(0.11, 0.23, 1, 6);
  const crownShape = new T.IcosahedronGeometry(1, 2);
  const tips = crownShape.attributes.position;
  for (let i = 0; i < tips.count; i++) {
    const x = tips.getX(i), y = tips.getY(i), z = tips.getZ(i);
    const relief = 1 + 0.09 * Math.sin(11 * x + 4 * z) * Math.cos(9 * y - 5 * z);
    tips.setXYZ(i, x * relief, y * relief, z * relief);
  }
  crownShape.computeVertexNormals();
  const trunks = new T.InstancedMesh(trunkShape, new T.MeshStandardMaterial({ color: "#564638", roughness: 1 }), trees.length);
  const lobes = 7;
  const crowns = new T.InstancedMesh(crownShape, new T.MeshStandardMaterial({ roughness: 1 }), trees.length * lobes);
  trunks.name = "Troncos del perímetro";
  crowns.name = "Copas del perímetro";
  const dummy = new T.Object3D(), color = new T.Color();
  trees.forEach(({ x, z, height, spread, narrow }, index) => {
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, y + height * 0.25, z);
    dummy.scale.set(height * 0.18, height * 0.5, height * 0.18);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);

    const hue = 0.21 + random() * 0.055, tone = 0.22 + random() * 0.11;
    const heading = random() * 2 * Math.PI;
    for (let i = 0; i < lobes; i++) {
      const angle = heading + i * 2.4;
      const radial = i === 0 ? 0 : spread * (0.45 + random() * 0.32) * (narrow ? 0.65 : 1);
      const rise = i === 0 ? 0.79 : 0.48 + random() * 0.23;
      const size = spread * (i === 0 ? 0.67 : 0.48 + random() * 0.26);
      dummy.position.set(x + Math.cos(angle) * radial, y + height * rise, z + Math.sin(angle) * radial);
      dummy.rotation.set(0, angle, 0);
      dummy.scale.set(size, size * (narrow ? 1.55 : 0.94), size * 0.9);
      dummy.updateMatrix();
      const slot = index * lobes + i;
      crowns.setMatrixAt(slot, dummy.matrix);
      crowns.setColorAt(slot, color.setHSL(hue, 0.39, tone + (rise - 0.52) * 0.26, T.SRGBColorSpace));
    }
  });
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  group.add(trunks, crowns);
}
