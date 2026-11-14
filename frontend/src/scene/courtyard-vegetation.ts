import * as T from "three";
import { facultyBlueprint as plan, type Vec2 } from "../data/faculty-blueprint";

const TAU = Math.PI * 2;
type Point = [number, number, number];

function barkMaterial(random: () => number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#514b3f";
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 1800; i++) {
    const x = random() * 128, y = random() * 256;
    ctx.fillStyle = i % 3 ? "rgba(41,29,23,.24)" : "rgba(190,164,130,.28)";
    ctx.fillRect(x, y, 0.5 + random() * 2, 4 + random() * 36);
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  return new T.MeshStandardMaterial({ map, roughness: 1 });
}

export function addCourtyardVegetation(group: T.Object3D, colliders: T.Object3D) {
  let seed = 1507;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const bark = barkMaterial(random);
  const dummy = new T.Object3D(), tint = new T.Color();
  const collider = new T.BoxGeometry(1, 1, 1);
  const leaf = new T.BufferGeometry();
  leaf.setAttribute("position", new T.Float32BufferAttribute([
    -1, 0, 0, -0.28, 0, -0.5, 0.48, 0, -0.38, 1, 0, 0,
    0.48, 0, 0.38, -0.28, 0, 0.5, 0, 0.21, 0,
  ], 3));
  leaf.setIndex([6, 0, 5, 6, 5, 4, 6, 4, 3, 6, 3, 2, 6, 2, 1, 6, 1, 0]);
  leaf.computeVertexNormals();
  const leafCanvas = document.createElement("canvas"); leafCanvas.width=128;leafCanvas.height=64;
  const leafContext=leafCanvas.getContext("2d")!;
  leafContext.fillStyle="#b0c48a";leafContext.fillRect(0,0,128,64);
  leafContext.strokeStyle="#deebb0";leafContext.lineWidth=2;
  leafContext.beginPath();leafContext.moveTo(0,32);leafContext.lineTo(128,32);leafContext.stroke();
  leafContext.lineWidth=1;
  for(let x=12;x<120;x+=12) for(const side of [-1,1]) {
    leafContext.beginPath();leafContext.moveTo(x,32);leafContext.lineTo(x+18,32+side*28);leafContext.stroke();
  }
  const leafMap=new T.CanvasTexture(leafCanvas);leafMap.colorSpace=T.SRGBColorSpace;
  const position=leaf.attributes.position;
  leaf.setAttribute("uv",new T.Float32BufferAttribute(Array.from({length:position.count},(_,i)=>
    [(position.getX(i)+1)/2,position.getZ(i)+.5]).flat(),2));
  const foliage = new T.MeshStandardMaterial({ map:leafMap, side: T.DoubleSide, roughness: 0.88 });

  function leafBatch(count: number) {
    const mesh = new T.InstancedMesh(leaf, foliage, count);
    mesh.userData.keep = true;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function putLeaf(mesh: T.InstancedMesh, i: number, at: T.Vector3, size: number, light: number) {
    dummy.position.copy(at);
    dummy.rotation.set((random() - 0.5) * 2.7, random() * TAU, (random() - 0.5) * 2);
    dummy.scale.set(size, size, size * (0.65 + random() * 0.45));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.195 + random() * 0.07, 0.34 + random() * 0.27, light + random() * 0.095, T.SRGBColorSpace);
    mesh.setColorAt(i, tint);
  }

  function branch(from: T.Vector3, to: T.Vector3, base: number, tip: number) {
    const direction = to.clone().sub(from);
    const mesh = new T.Mesh(new T.CylinderGeometry(tip, base, direction.length(), 8), bark);
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }

  function obstacle(position: Point, size: Point) {
    const mesh = new T.Mesh(collider);
    mesh.position.set(...position);
    mesh.scale.set(...size);
    colliders.add(mesh);
  }

  function tree([x, z]: Vec2, y: number, height: number, spread: number, radius: number, forkRatio: number, spreading = false) {
    const base = new T.Vector3(x, y, z);
    const fork = base.clone().add(new T.Vector3(-radius * 0.5, height * forkRatio, radius * 0.55));
    const mid = base.clone().lerp(fork, 0.47).add(new T.Vector3(radius * 0.4, 0, -radius * 0.25));
    branch(base, mid, radius, radius * 0.76);
    branch(mid, fork, radius * 0.78, radius * 0.56);
    obstacle([x, y + height * forkRatio / 2, z], [radius * 1.6, height * forkRatio, radius * 1.6]);
    for (let i = 0; i < (spreading ? 11 : 5); i++) {
      const a = i * TAU / (spreading ? 11 : 5);
      branch(base.clone().add(new T.Vector3(0, radius * 1.15, 0)),
        base.clone().add(new T.Vector3(Math.cos(a) * radius * (spreading ? 3.1 : 2.25), 0.025, Math.sin(a) * radius * (spreading ? 3.1 : 2.25))),
        radius * 0.34, 0.018);
    }

    const limbs = spreading ? 6 : 15, clusters = spreading ? 14 : 6, perCluster = 120;
    const leaves = leafBatch(limbs * clusters * perCluster);
    const at = new T.Vector3();
    let index = 0;
    for (let i = 0; i < limbs; i++) {
      const a = i * 2.39996;
      const reach = spread * ((spreading ? 0.48 : 0.26) + random() * 0.49);
      const bend = base.clone().add(new T.Vector3(Math.cos(a) * reach * 0.48, height * (0.51 + random() * 0.14), Math.sin(a) * reach * 0.48));
      const end = base.clone().add(new T.Vector3(Math.cos(a + 0.14) * reach, height * (0.68 + random() * 0.24), Math.sin(a + 0.14) * reach));
      const thickness = radius * (0.18 + random() * 0.13);
      branch(fork, bend, thickness, thickness * 0.62);
      branch(bend, end, thickness * 0.65, 0.022);
      for (let j = 0; j < clusters; j++) {
        const start = bend.clone().lerp(end, 0.16 + j * (0.8 / (clusters - 1)));
        const heading = a + (j % 2 ? -0.95 : 0.95);
        const length = spread * (0.10 + random() * 0.13);
        const tuft = start.clone().add(new T.Vector3(Math.cos(heading) * length, height * (0.025 + random() * 0.035), Math.sin(heading) * length));
        branch(start, tuft, 0.025, 0.009);
        for (let k = 0; k < perCluster; k++) {
          const azimuth = random() * TAU, vertical = 2 * random() - 1;
          const r = Math.cbrt(random()) * spread * 0.23;
          const horizontal = Math.sqrt(1 - vertical * vertical) * r;
          at.set(tuft.x + Math.cos(azimuth) * horizontal, tuft.y + vertical * r * 0.63, tuft.z + Math.sin(azimuth) * horizontal);
          putLeaf(leaves, index++, at, 0.13 + random() * 0.14, 0.13 + (vertical + 1) * 0.043);
        }
      }
    }
    leaves.computeBoundingSphere();
  }

  tree(plan.tree1, 0.015, 10.5, 6.2, 0.74, 0.26, true);
  tree(plan.tree2, 0.015, 17.2, 7.3, 0.65, 0.34);
  tree(plan.tree3, 0.015, 10.1, 4.8, 0.48, 0.39);
  plan.courtyardTrees.forEach((point, index) => {
    tree(point, 0.015, 10.8 + index * 1.15, 5.1 + index * 0.55, 0.56 + index * 0.06, index === 2 ? 0.25 : 0.35, index === 2);
  });

  const [x, z] = plan.courtyardCT;
  const points: Vec2[] = [];
  for (let i = 0; i <= 42; i++) {
    const a = (0.37 + i / 42 * 1.26) * Math.PI;
    points.push([-1.77 + Math.cos(a) * 1.42, Math.sin(a) * 1.61]);
  }
  // El brazo izquierdo de la T entra en la abertura de la C.
  for (let i = 0; i <= 23; i++) points.push([-0.99 + i * 3.72 / 23, 0.26]);
  for (let i = 1; i <= 21; i++) points.push([0.98, 0.26 - i * 3.19 / 21]);

  // Perfil de poda con caras más planas y esquinas redondeadas.
  const rounded = (value: number) => Math.sign(value) * Math.pow(Math.abs(value), 0.58);
  const core = new T.IcosahedronGeometry(1, 2);
  const vertices = core.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    vertices.setXYZ(i, rounded(vertices.getX(i)), rounded(vertices.getY(i)), rounded(vertices.getZ(i)));
  }
  core.computeVertexNormals();
  const coreMaterial = new T.MeshStandardMaterial({ color: "#3a471a", roughness: 1 });
  const perPoint = 146, leaves = leafBatch(points.length * perPoint);
  const at = new T.Vector3();
  points.forEach(([u, v], index) => {
    const px = x - u * 1.36, pz = z + v * 1.36;
    const body = new T.Mesh(core, coreMaterial);
    body.position.set(px, 0.72, pz);
    body.scale.set(0.69, 0.54, 0.69);
    body.receiveShadow = body.castShadow = true;
    group.add(body);
    if (index % 2 === 0 || index === points.length - 1) {
      obstacle([px, 0.70, pz], [1.18, 1.22, 1.18]);
      branch(new T.Vector3(px, 0.02, pz), new T.Vector3(px + 0.18, 0.58, pz - 0.10), 0.028, 0.013);
    }
    for (let j = 0; j < perPoint; j++) {
      const a = random() * TAU, vertical = 2 * random() - 1;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      const radius = 0.66 + random() * 0.14;
      at.set(
        px + rounded(Math.cos(a) * horizontal) * radius,
        0.73 + rounded(vertical) * (0.51 + random() * 0.11),
        pz + rounded(Math.sin(a) * horizontal) * radius,
      );
      putLeaf(leaves, index * perPoint + j, at, 0.043 + random() * 0.065, 0.26 + (vertical + 1) * 0.079);
    }
  });
  leaves.computeBoundingSphere();
}
