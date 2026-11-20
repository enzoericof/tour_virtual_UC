import * as T from "three";
import type { Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";
import { pathSampler } from "./garden-path";

/** Seto podado: copa rectangular, hojas pequeñas y ramificación desnuda debajo. */
export function addGardenHedge(builder: FacultyBuilder, points: readonly Vec2[], ground: (p: Vec2) => number) {
  const route = pathSampler(points), crownBottom = 0.82, crownTop = 1.82, halfWidth = 0.34;
  let seed = 7319;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const group = new T.Group(); group.name = "Seto podado en la L del jardín";
  builder.layers.visual.add(group);
  // El volumen interior mantiene la copa tupida sin grandes esferas de follaje.
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#648b2c"; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const green = Math.floor(104 + random() * 52);
    ctx.fillStyle = `rgb(${green - 25},${green + 12},${Math.floor(green * 0.37)})`;
    ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 1.5 + random() * 3, 1 + random() * 2, random() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const coreMaterial = new T.MeshStandardMaterial({ map, roughness: 1 });
  const sections = Math.ceil(route.total / 0.30), step = route.total / sections;
  const cores = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), coreMaterial, sections);
  cores.userData.keep = true; cores.castShadow = cores.receiveShadow = true; group.add(cores);
  const bark = new T.MeshStandardMaterial({ color: "#555b45", roughness: 1 });
  const dummy = new T.Object3D(), unitBody = new T.BoxGeometry(1, 1, 1);
  for (let i = 0; i < sections; i++) {
    const d = (i + 0.5) * step, p = route.at(d), a = route.at(d - 0.02), b = route.at(d + 0.02);
    const h = crownTop - crownBottom + Math.sin(i * 2.4) * 0.025;
    dummy.position.set(p[0], ground(p) + crownBottom + h / 2, p[1]);
    dummy.rotation.set(0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0);
    dummy.scale.set(step + 0.04, h, halfWidth * 2); dummy.updateMatrix(); cores.setMatrixAt(i, dummy.matrix);
    const body = new T.Mesh(unitBody); body.position.copy(dummy.position); body.scale.copy(dummy.scale); body.rotation.copy(dummy.rotation);
    body.userData.gardenHedge = true; builder.layers.solid.add(body);
  }
  // Hojas plegadas, pequeñas y densas sobre los laterales y la parte superior plana.
  const leaf = new T.BufferGeometry();
  leaf.setAttribute("position", new T.Float32BufferAttribute([
    -0.5, 0, 0, -0.25, 0, -0.23, 0.27, 0, -0.20, 0.5, 0, 0,
    0.27, 0, 0.20, -0.25, 0, 0.23, 0, 0.09, 0,
  ], 3));
  leaf.setIndex([6, 0, 5, 6, 5, 4, 6, 4, 3, 6, 3, 2, 6, 2, 1, 6, 1, 0]); leaf.computeVertexNormals();
  const leafMaterial = new T.MeshStandardMaterial({ color: "#ffffff", side: T.DoubleSide, roughness: 0.94 });
  const leaves = new T.InstancedMesh(leaf, leafMaterial, Math.ceil(route.total * 3000));
  leaves.name = "Hojas pequeñas del seto"; leaves.userData.keep = true;
  leaves.castShadow = leaves.receiveShadow = true; group.add(leaves);
  const up = new T.Vector3(0, 1, 0), normal = new T.Vector3(), spin = new T.Quaternion(), tint = new T.Color();
  for (let i = 0; i < leaves.count; i++) {
    const d = random() * route.total, top = i % 5 === 0;
    const side = i % 2 ? 1 : -1, offset = top ? (random() - 0.5) * 0.70 : side * (halfWidth + random() * 0.035);
    const p = route.at(d, offset), a = route.at(d - 0.02), b = route.at(d + 0.02);
    const y = top ? crownTop + (random() - 0.5) * 0.045 : crownBottom + random() * (crownTop - crownBottom);
    dummy.position.set(p[0], ground(p) + y, p[1]);
    normal.set(-(b[1] - a[1]) * side, 0, (b[0] - a[0]) * side).normalize();
    normal.y = 0.18; normal.normalize();
    if (top) normal.copy(up);
    dummy.quaternion.setFromUnitVectors(up, normal);
    spin.setFromAxisAngle(up, random() * Math.PI * 2); dummy.quaternion.multiply(spin);
    const size = 0.045 + random() * 0.04; dummy.scale.set(size, size, size); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.20 + random() * 0.035, 0.48 + random() * 0.13, (top ? 0.48 : 0.35) + random() * 0.12, T.SRGBColorSpace);
    leaves.setColorAt(i, tint);
  }
  // Troncos separados y bifurcados, como se ven bajo la copa en la fotografía.
  const trunks = Math.ceil(route.total / 0.85);
  for (let i = 0; i < trunks; i++) {
    const d = (i + 0.5) / trunks * route.total, p = route.at(d), y = ground(p);
    builder.pole(0.025, 1.05, p[0], y + 0.525, p[1], bark, true);
    for (const sign of [-1, 1]) {
      const tip = route.at(d + sign * 0.26, sign * 0.12);
      builder.beam(new T.Vector3(p[0], y + 0.40, p[1]), new T.Vector3(tip[0], y + 1.20, tip[1]), 0.016, bark);
    }
  }
  cores.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
  cores.computeBoundingSphere(); leaves.computeBoundingSphere();
}
