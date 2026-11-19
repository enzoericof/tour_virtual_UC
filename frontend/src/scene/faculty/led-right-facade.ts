import * as T from "three";
import { deiRightFacade as detail, type Annex } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";

/** Reconstrucción del lateral derecho del LED a partir de las dos fotos de Horacio. */
export function addLedRightFacade(builder: FacultyBuilder, annex: Annex, brick: T.MeshStandardMaterial) {
  const { layers, box, pole, beam, v3, spans, slopedWall, m } = builder;
  const z = -annex.rect.size[1] / 2, half = annex.rect.size[0] / 2, height = annex.height;
  const steel = new T.MeshStandardMaterial({ color: "#485e63", metalness: 0.4, roughness: 0.7 });
  const louver = new T.MeshStandardMaterial({ color: "#394b50", metalness: 0.25, roughness: 0.78 });
  const wall = brick;
  const sill = new T.MeshStandardMaterial({ color: "#969387", roughness: 1 });
  const dark = new T.MeshStandardMaterial({ color: "#202c2b", roughness: 0.86 });
  const glass = m.glass.clone(); glass.color.set("#6e8f88"); glass.opacity = 0.42;
  const curtain = new T.MeshStandardMaterial({ color: "#c8c9b7", roughness: 1 });
  const service = { x: detail.serviceDoor.x, width: detail.serviceDoor.width, top: detail.serviceDoor.height };
  const windows = detail.windows.map(w => ({ ...w, bottom: detail.sill, top: detail.sill + detail.windowHeight }));
  const openings = [
    ...windows,
    { x: service.x, width: service.width, bottom: 0, top: service.top },
  ];
  const edges = [...new Set([-half, half, ...openings.flatMap(o => [o.x - o.width / 2, o.x + o.width / 2])])].sort((a, b) => a - b);
  // Muros con huecos reales: la envolvente visual y las colisiones coinciden.
  for (let i = 1; i < edges.length; i++) {
    const left = edges[i - 1], right = edges[i], x = (left + right) / 2;
    const hole = openings.find(o => Math.abs(x - o.x) < o.width / 2 + 1e-5);
    if (!hole) box(right - left, height, 0.20, x, height / 2, z, wall, true);
    else {
      if (hole.bottom) box(right - left, hole.bottom, 0.20, x, hole.bottom / 2, z, wall, true);
      box(right - left, height - hole.top, 0.20, x, (height + hole.top) / 2, z, wall, true);
    }
  }
  for (const [a, b] of spans(-half, half, openings.filter(o => o.bottom === 0)
    .map(o => [o.x - o.width / 2, o.x + o.width / 2] as const)))
    box(b - a, 0.18, 0.24, (a + b) / 2, 0.10, z - 0.02, sill);

  function windowBars(x: number, width: number, bottom: number, top: number) {
    const h = top - bottom, w = width - 0.12;
    for (const slope of [-1.8, 1.8]) for (let intercept = -w * 1.8; intercept <= h + w * 1.8; intercept += 0.34) {
      const points: [number, number][] = [];
      for (const u of [-w / 2, w / 2]) {
        const y = slope * u + intercept;
        if (y >= 0 && y <= h) points.push([u, y]);
      }
      for (const y of [0, h]) {
        const u = (y - intercept) / slope;
        if (u > -w / 2 && u < w / 2) points.push([u, y]);
      }
      if (points.length === 2) beam(v3(x + points[0][0], bottom + points[0][1], z - 0.20),
        v3(x + points[1][0], bottom + points[1][1], z - 0.20), 0.009, steel);
    }
  }
  windows.forEach((w, index) => {
    const y = (w.bottom + w.top) / 2, h = w.top - w.bottom;
    box(w.width, h, 0.035, w.x, y, z + 0.13, dark);
    if (index % 3 === 0) box(w.width * 0.65, h - 0.1, 0.025, w.x - w.width * 0.13, y, z + 0.09, curtain);
    box(w.width - 0.10, h - 0.10, 0.06, w.x, y, z - 0.025, glass, true);
    for (const side of [-1, 1]) box(0.07, h + 0.08, 0.15, w.x + side * w.width / 2, y, z - 0.07, steel);
    for (const at of [w.bottom, w.top]) box(w.width + 0.08, 0.07, 0.15, w.x, at, z - 0.07, steel);
    box(0.045, h, 0.14, w.x, y, z - 0.08, steel);
    box(w.width + 0.18, 0.065, 0.34, w.x, w.bottom - 0.055, z - 0.085, sill);
    box(w.width + 0.24, 0.11, 0.25, w.x, w.top + 0.07, z - 0.04, wall);
    windowBars(w.x, w.width, w.bottom + 0.06, w.top - 0.06);
  });

  // Puerta metálica cerrada fotografiada en el paño central.
  box(service.width, service.top, 0.075, service.x, service.top / 2, z - 0.025, steel, true);
  for (let i = 0; i < 12; i++) box(0.025, service.top - 0.13, 0.025,
    service.x - service.width / 2 + 0.07 + i * (service.width - 0.14) / 11, service.top / 2, z - 0.08, louver);
  for (const side of [-1, 1]) box(0.07, service.top + 0.10, 0.17, service.x + side * service.width / 2, service.top / 2, z - 0.04, steel);
  box(service.width + 0.15, 0.08, 0.17, service.x, service.top + 0.025, z - 0.04, steel);
  box(0.025, 0.20, 0.06, service.x - 0.43, 1.05, z - 0.10, dark);
  box(service.width + 0.22, 0.06, 0.50, service.x, 0.03, z - 0.16, sill, true);

  // Pantalla continua de lamas HORIZONTALES, separada del muro.
  const screenZ = z - detail.screen.offset, screenH = detail.screen.top - detail.screen.bottom;
  const blades = Math.round(screenH / detail.screen.pitch);
  for (let i = 0; i < blades; i++) {
    const slat = box(annex.rect.size[0] - 0.35, 0.085, 0.26, 0,
      detail.screen.bottom + (i + 0.5) * screenH / blades, screenZ, louver);
    slat.rotation.x = -0.30;
  }
  for (const y of [detail.screen.bottom, detail.screen.top])
    box(annex.rect.size[0] - 0.28, 0.075, 0.12, 0, y, screenZ - 0.07, steel);
  const gaps = [{ center: [service.x, z], width: service.width }].map(d =>
    [d.center[0] - d.width / 2 - 0.09, d.center[0] + d.width / 2 + 0.09] as const);
  for (const y of [0.53, 2.57]) for (const [a, b] of spans(-half + 0.12, half - 0.12, gaps))
    box(b - a, 0.045, 0.065, (a + b) / 2, y, screenZ - 0.11, steel);
  for (let i = 0; i <= 12; i++) {
    const x = -half + 0.18 + i * (annex.rect.size[0] - 0.36) / 12;
    if (gaps.some(([a, b]) => x > a - 0.08 && x < b + 0.08)) continue;
    box(0.060, 5.85, 0.075, x, 2.925, screenZ - 0.08, steel, true);
    box(0.19, 0.035, 0.19, x, 0.025, screenZ - 0.08, steel);
    for (const side of [-1, 1]) box(0.028, 0.018, 0.028, x + side * 0.065, 0.052, screenZ - 0.08, louver);
    beam(v3(x, detail.screen.top, screenZ), v3(x, 6.40, z - 0.11), 0.025, steel);
    box(0.17, 0.15, 0.075, x, 6.40, z - 0.11, steel);
  }

  const acCase = new T.MeshStandardMaterial({ color: "#c7c8b9", roughness: 0.82 });
  const fan = new T.MeshStandardMaterial({ color: "#4b514b", roughness: 0.7 });
  detail.airConditioners.forEach(({ x, y }) => {
    box(1.08, 0.63, 0.38, x, y, z - 0.28, acCase);
    const rim = pole(0.22, 0.035, x - 0.18, y, z - 0.49, steel); rim.rotation.x = Math.PI / 2;
    const disk = pole(0.195, 0.04, x - 0.18, y, z - 0.515, dark); disk.rotation.x = Math.PI / 2;
    for (let j = 0; j < 5; j++) {
      const angle = j / 5 * Math.PI * 2;
      const blade = box(0.18, 0.055, 0.015, x - 0.18 + Math.cos(angle) * 0.08,
        y + Math.sin(angle) * 0.08, z - 0.54, fan); blade.rotation.z = angle + 0.35;
    }
    for (let j = 0; j < 9; j++) box(0.014, 0.45, 0.025, x + 0.19 + j * 0.027, y, z - 0.49, steel);
    for (let j = -3; j <= 3; j++) {
      const offset = j * 0.05, halfChord = Math.sqrt(0.20 ** 2 - offset ** 2);
      box(halfChord * 2, 0.008, 0.012, x - 0.18, y + offset, z - 0.558, acCase);
    }
    for (const side of [-1, 1]) {
      const at = x + side * 0.41;
      beam(v3(at, y - 0.33, z - 0.07), v3(at, y - 0.33, z - 0.46), 0.018, steel);
      beam(v3(at, y - 0.60, z - 0.07), v3(at, y - 0.33, z - 0.46), 0.016, steel);
    }
  });
  // Huellas suaves de lluvia y condensación bajo los equipos.
  const stainCanvas = document.createElement("canvas"); stainCanvas.width = 128; stainCanvas.height = 256;
  const stainCtx = stainCanvas.getContext("2d")!;
  for (let i = 0; i < 150; i++) {
    const n = Math.sin(i * 17.31) * 43758.5453, r = n - Math.floor(n);
    stainCtx.fillStyle = `rgba(63,55,38,${0.018 + r * 0.035})`;
    stainCtx.fillRect(18 + r * 85, r * 100, 1 + r * 7, 70 + r * 150);
  }
  const stainMap = new T.CanvasTexture(stainCanvas); stainMap.colorSpace = T.SRGBColorSpace;
  const stainMaterial = new T.MeshStandardMaterial({ map: stainMap, transparent: true, depthWrite: false,
    roughness: 1, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const x of [10.4, 4.1, -7.3]) {
    const stain = new T.Mesh(new T.PlaneGeometry(1.9, 1.35), stainMaterial);
    stain.position.set(x, 2.90, z - 0.104); stain.rotation.y = Math.PI; layers.visual.add(stain);
  }
  // Bajadas, canalizaciones y pequeñas cajas de los equipos.
  for (const x of [10.98, 4.68, -6.72, -12.38]) {
    pole(0.017, 2.95, x, 1.56, z - 0.14, acCase);
    box(0.13, 0.18, 0.08, x, 2.55, z - 0.16, steel);
  }
  for (const x of [-0.5, 10.98]) {
    box(0.29, 0.25, 0.12, x, 2.76, z - 0.18, acCase);
    box(0.16, 0.13, 0.025, x, 2.76, z - 0.25, fan);
  }
  const lens = new T.MeshStandardMaterial({ color: "#c3d0cd", emissive: "#afc0ba", emissiveIntensity: 0.12, roughness: 0.45 });
  for (const x of [-12.6, -6.7, 0.4, 6.1, 12.3]) {
    pole(0.018, 0.75, x, 6.06, z - 0.12, steel);
    box(0.56, 0.32, 0.15, x, 6.52, z - 0.19, steel);
    box(0.43, 0.21, 0.025, x, 6.49, z - 0.28, lens);
  }
  for (const side of [-1, 1]) {
    slopedWall(side * (half - 0.10), z, z + 2.65, height + 0.95, height, height - 0.05, wall);
    beam(v3(side * (half - 0.10), height + 0.96, z), v3(side * (half - 0.10), height + 0.02, z + 2.65), 0.025, sill);
  }
  pole(0.025, 1.45, -0.15, height + 0.55, z + 0.9, steel);
  for (const x of [-2.5, 2.5]) beam(v3(-0.15, height + 1.25, z + 0.9), v3(x, height + 0.08, z + 0.9), 0.004, steel);

  // Cantero lineal, vereda angosta y plantas de hojas en roseta, interrumpidos en las puertas.
  const soil = new T.MeshStandardMaterial({ color: "#706148", roughness: 1 });
  const bedGaps = gaps.map(([a, b]) => [a - 0.22, b + 0.22] as const);
  for (const [a, b] of spans(-half, half, bedGaps)) {
    box(b - a, 0.035, 0.68, (a + b) / 2, 0.015, z - 0.49, soil);
    box(b - a, 0.065, 0.075, (a + b) / 2, 0.055, z - 0.86, sill, true);
  }
  box(annex.rect.size[0], 0.06, 0.48, 0, 0.025, z - 1.12, sill, true);
  const bladePoints: number[] = [], bladeIndices: number[] = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7, w = Math.sin(t * Math.PI) * 0.045;
    for (const side of [-1, 1]) bladePoints.push(side * w, Math.sin(t * Math.PI * 0.8) * 0.46, t * 0.55);
    if (i < 7) { const k = i * 2; bladeIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const leafGeometry = new T.BufferGeometry(); leafGeometry.setAttribute("position", new T.Float32BufferAttribute(bladePoints, 3));
  leafGeometry.setIndex(bladeIndices); leafGeometry.computeVertexNormals();
  const greens = ["#64765d", "#9ba58a", "#3d5a47"].map(color => new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 0.95 }));
  for (const x of [13.4, 10.1, 7.1, 4.4, -0.8, -4.2, -7.9, -13.8]) for (let j = 0; j < 18; j++) {
    const leaf = new T.Mesh(leafGeometry, greens[j % greens.length]);
    leaf.position.set(x, 0.045, z - 0.48); leaf.rotation.y = j * Math.PI * 2 / 18;
    const size = 0.72 + ((j * 7) % 11) * 0.035; leaf.scale.setScalar(size); layers.visual.add(leaf);
  }
  // Papelera azul con bastidor, ubicada sobre la vereda y fuera del paso.
  const binX = -7.0, binZ = z - 1.05;
  box(0.45, 0.67, 0.36, binX, 0.46, binZ, m.blue, true);
  box(0.44, 0.07, 0.36, binX, 0.83, binZ, steel);
  box(0.29, 0.08, 0.025, binX, 0.76, binZ - 0.19, dark);
  for (const side of [-1, 1]) pole(0.015, 0.94, binX + side * 0.27, 0.47, binZ, steel);
  // Árbol pequeño del cantero frente al extremo de acceso, con copa de hojas finas.
  const treeX = -8.8, treeZ = z - 0.70;
  const bark = new T.MeshStandardMaterial({ color: "#696551", roughness: 1 });
  pole(0.075, 2.8, treeX, 1.40, treeZ, bark, true);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    beam(v3(treeX, 1.7, treeZ), v3(treeX + Math.cos(angle) * 0.75, 3.1 + (i % 2) * 0.35,
      treeZ + Math.sin(angle) * 0.65), 0.028, bark);
  }
  const treeLeaf = new T.BufferGeometry();
  treeLeaf.setAttribute("position", new T.Float32BufferAttribute([
    -.5,0,0, -.16,0,-.22, .30,0,-.18, .5,0,0, .30,0,.18, -.16,0,.22, 0,.06,0,
  ],3));
  treeLeaf.setIndex([6,0,5,6,5,4,6,4,3,6,3,2,6,2,1,6,1,0]); treeLeaf.computeVertexNormals();
  const treeLeaves = new T.InstancedMesh(treeLeaf,
    new T.MeshStandardMaterial({ color: "#ffffff", side: T.DoubleSide, roughness: .92 }), 6500);
  treeLeaves.name = "Árbol del cantero del LED"; treeLeaves.userData.keep = true;
  treeLeaves.castShadow = treeLeaves.receiveShadow = true;
  const dummy = new T.Object3D(), tint = new T.Color();
  const noise = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  for (let i = 0; i < treeLeaves.count; i++) {
    const angle = noise(i + 1) * Math.PI * 2, radius = Math.sqrt(noise(i + 9)) * 1.25;
    const level = noise(i + 54);
    dummy.position.set(treeX + Math.cos(angle) * radius * Math.sqrt(Math.max(.015, 1 - (level * 2 - 1) ** 2)) * 1.30,
      2.25 + level * 2.8, treeZ + Math.sin(angle) * radius * Math.sqrt(Math.max(.015, 1 - (level * 2 - 1) ** 2)) * 0.90);
    dummy.rotation.set(noise(i + 25) * 2.8, angle, noise(i + 42) * 2.5);
    const size = .075 + noise(i + 97) * .08; dummy.scale.setScalar(size); dummy.updateMatrix();
    treeLeaves.setMatrixAt(i, dummy.matrix);
    tint.setHSL(.24 + noise(i + 127) * .07, .35 + noise(i + 131) * .25, .24 + noise(i + 138) * .16, T.SRGBColorSpace);
    treeLeaves.setColorAt(i, tint);
  }
  treeLeaves.instanceMatrix.needsUpdate = true; treeLeaves.computeBoundingSphere(); layers.visual.add(treeLeaves);

  const potGeometry = new T.CylinderGeometry(.18, .12, .27, 12);
  const terracotta = new T.MeshStandardMaterial({ color: "#9b674b", roughness: .95 });
  for (const x of [-13.1, -9.8]) {
    const pot = new T.Mesh(potGeometry, terracotta); pot.position.set(x, .185, z - .64); layers.visual.add(pot);
    pole(.155, .02, x, .315, z - .64, soil);
    for (let j = 0; j < 9; j++) {
      const leaf = new T.Mesh(leafGeometry, greens[j % 3]);
      leaf.position.set(x, .32, z - .64); leaf.rotation.y = j * Math.PI * 2 / 9; leaf.scale.setScalar(.65); layers.visual.add(leaf);
    }
  }

}
