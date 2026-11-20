import * as T from "three";
import { laboratoryOutbuildings as layout } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";

/** Volumen rojizo del rincón y depósito independiente: solo exteriores fotografiados. */
export function addLaboratoryOutbuildings(builder: FacultyBuilder, brick: T.MeshStandardMaterial) {
  const { box, frame, layers, m } = builder;
  const render = new T.MeshStandardMaterial({ color: "#ae674e", roughness: 0.95 });
  const terracotta = new T.MeshStandardMaterial({ color: "#bd7c60", roughness: 0.9 });
  const shade = new T.MeshStandardMaterial({ color: "#171e20", roughness: 1 });
  const grille = new T.MeshStandardMaterial({ color: "#adb1ad", roughness: 0.7 });

  frame(layout.corner, () => {
    layers.visual.name = "Volumen rojizo del rincón de Civil";
    const [w, d] = layout.corner.size, h = layout.corner.height, z = -d / 2;
    // Caja cerrada: la celosía y la persiana son ventilaciones, no accesos peatonales.
    box(w, h, d, 0, h / 2, 0, render, true);
    box(w + 0.18, 0.09, d + 0.18, 0, h + 0.045, 0, terracotta, true);
    const openingWidth = w - 0.28, bottom = 0.46, top = 1.02;
    box(openingWidth, top - bottom, 0.018, 0, (bottom + top) / 2, z - 0.012, shade);
    // Retícula de ladrillos calados con fondo retraído y barrotes finos delante.
    for (let row = 0; row <= 3; row++)
      box(openingWidth + 0.06, 0.045, 0.10, 0, bottom + row * (top - bottom) / 3, z - 0.055, terracotta);
    for (let col = 0; col <= 10; col++)
      box(0.045, top - bottom, 0.10, -openingWidth / 2 + col * openingWidth / 10,
        (bottom + top) / 2, z - 0.055, terracotta);
    for (let col = 0; col <= 10; col++)
      box(0.014, top - bottom + 0.10, 0.018, -openingWidth / 2 + col * openingWidth / 10,
        (bottom + top) / 2, z - 0.12, render);
    // La abertura lateral mira al espacio libre del rincón (lado -x).
    frame({ center: [-w / 2 - 0.012, 0], size: [d, 0.1], angle: -Math.PI / 2 }, () => {
      const width = 0.62, height = 1.38, y = 0.12 + height / 2;
      box(width, height, 0.02, 0, y, 0, shade);
      for (const side of [-1, 1]) box(0.055, height + 0.08, 0.11, side * width / 2, y, -0.045, terracotta);
      for (const at of [0.12, 0.12 + height]) box(width, 0.055, 0.11, 0, at, -0.045, terracotta);
      for (let i = 0; i < 15; i++) box(width - 0.06, 0.075, 0.045, 0,
        0.17 + i * (height - 0.1) / 14, -0.065, terracotta, false, { pitch: -0.4 });
    });
  });

  frame(layout.depot, () => {
    layers.visual.name = "Depósito rectangular con dos respiraderos";
    const [w, d] = layout.depot.size, { height: h, ventY, ventSpacing, ventRadius: r } = layout.depot;
    const z = -d / 2;
    box(w, 0.12, d, 0, 0, 0, m.concrete, true);
    box(w, h, 0.18, 0, h / 2, d / 2 - 0.09, brick, true);
    for (const side of [-1, 1]) box(0.18, h, d, side * (w / 2 - 0.09), h / 2, 0, brick, true);
    box(w + 0.08, 0.10, d + 0.08, 0, h + 0.05, 0, brick, true);

    // Paño frontal con dos huecos circulares reales, sin discos pegados al ladrillo.
    const wall = new T.Shape();
    wall.moveTo(-w / 2, 0); wall.lineTo(w / 2, 0); wall.lineTo(w / 2, h);
    wall.lineTo(-w / 2, h); wall.closePath();
    for (const side of [-1, 1]) {
      const hole = new T.Path(); hole.absarc(side * ventSpacing / 2, ventY, r, 0, Math.PI * 2, true);
      wall.holes.push(hole);
    }
    const geo = new T.ExtrudeGeometry(wall, { depth: 0.18, bevelEnabled: false, curveSegments: 32 });
    const tile = brick.userData.tile as number[];
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile[0], p.getY(i) / tile[1]);
    const facade = new T.Mesh(geo, brick); facade.position.z = z;
    facade.castShadow = facade.receiveShadow = true; layers.visual.add(facade);
    const solid = new T.Mesh(geo); solid.position.z = z; layers.solid.add(solid);
    const ringGeo = new T.TorusGeometry(r + 0.032, 0.032, 8, 32);
    const diskGeo = new T.CircleGeometry(r, 32);
    const hubGeo = new T.CircleGeometry(0.072, 20);
    for (const side of [-1, 1]) {
      const x = side * ventSpacing / 2;
      const ring = new T.Mesh(ringGeo, terracotta); ring.position.set(x, ventY, z - 0.015);
      ring.castShadow = ring.receiveShadow = true; layers.visual.add(ring);
      const recess = new T.Mesh(diskGeo, shade); recess.rotation.y = Math.PI;
      recess.position.set(x, ventY, z + 0.14); layers.visual.add(recess);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const spoke = box(0.155, 0.045, 0.025, x + Math.cos(angle) * 0.14,
          ventY + Math.sin(angle) * 0.14, z + 0.015, grille);
        spoke.rotation.z = angle;
      }
      const hub = new T.Mesh(hubGeo, shade); hub.rotation.y = Math.PI;
      hub.position.set(x, ventY, z - 0.005); layers.visual.add(hub);
    }
  });
}
