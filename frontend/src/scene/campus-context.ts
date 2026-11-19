import * as T from "three";
import { addCourtyardElevatorTree } from "./courtyard-elevator-tree";
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

  const templates = new T.Group();
  const near = addCourtyardElevatorTree(templates,new T.Group(),{center:[0,0],baseY:0,protectShaft:false,leavesPerTuft:280});
  const far = addCourtyardElevatorTree(templates,new T.Group(),{center:[0,0],baseY:0,protectShaft:false,leavesPerTuft:24,distant:true});
  trees.forEach(({x,z,height,spread},index)=>{
    const tree = new T.LOD(); tree.name = "Árbol del perímetro"; tree.userData.realisticTree=true;
    tree.position.set(x,y,z);tree.rotation.y=index*2.39996;
    tree.scale.set(spread/5.4,height/10,spread/5.4);
    tree.addLevel(near.clone(true),0);tree.addLevel(far.clone(true),18);group.add(tree);
  });
}
