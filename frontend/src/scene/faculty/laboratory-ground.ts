import * as T from "three";
import { laboratoryGroundDetails as detail } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";

/** Rejillas enrasadas, registros y plataforma del rincón, en el marco de Civil. */
export function addLaboratoryGround(builder: FacultyBuilder) {
  const { box, frame, layers, m } = builder;
  const iron = new T.MeshStandardMaterial({ color: "#424b4b", roughness: 0.8, metalness: 0.45 });
  const recess = new T.MeshStandardMaterial({ color: "#171e1d", roughness: 1 });
  const coverMaterial = new T.MeshStandardMaterial({ color: "#727672", roughness: 0.96 });
  const concrete = m.maquetasConcrete;

  function rim(w: number, d: number, material: T.Material) {
    for (const side of [-1, 1]) {
      box(0.035, 0.005, d, side * (w / 2 - 0.0175), 0.0035, 0, material);
      box(w - 0.07, 0.005, 0.035, 0, 0.0035, side * (d / 2 - 0.0175), material);
    }
  }
  for (const drain of detail.drains) frame({ ...drain, angle: 0 }, () => {
    layers.visual.name = "Rejilla del patio de Civil";
    const [w, d] = drain.size;
    // Fondo oscuro sobre el pavimento existente: no se abre un pozo en la navegación.
    box(w, 0.002, d, 0, 0.001, 0, recess);
    rim(w, d, iron);
    const count = Math.ceil((d - 0.07) / 0.045);
    for (let i = 1; i < count; i++)
      box(w - 0.07, 0.004, 0.012, 0, 0.004, -d / 2 + 0.035 + i * (d - 0.07) / count, iron);
    box(0.018, 0.004, d - 0.07, 0, 0.003, 0, iron);
    // Un único apoyo continuo evita que la cápsula tropiece con cada barra.
    // El collider copia solo la tapa completa; el fondo ya tiene colisión.
    const body = new T.Mesh(builder.unit);
    body.scale.set(w, 0.006, d); body.position.y = 0.003; layers.solid.add(body);
  }, drain.level);

  for (const cover of detail.covers) frame({ ...cover, angle: 0 }, () => {
    layers.visual.name = "Registro cerrado del patio de Civil";
    const [w, d] = cover.size;
    box(w, 0.002, d, 0, 0.001, 0, recess);
    rim(w, d, iron);
    box(w - 0.085, 0.005, d - 0.085, 0, 0.0035, 0, coverMaterial, true);
    for (const side of [-1, 1]) {
      // Tiradores embutidos, representados sin piezas que sobresalgan del piso.
      box(0.10, 0.001, 0.025, side * w * 0.25, 0.0065, 0, recess);
      box(0.075, 0.001, 0.009, side * w * 0.25, 0.007, 0, iron);
    }
  }, cover.level);

  const apron = detail.apron;
  frame({ ...apron, angle: 0 }, () => {
    layers.visual.name = "Plataforma de hormigón del rincón de Civil";
    const [w, d] = apron.size, vertices: number[] = [], indices: number[] = [];
    // Base enterrada, borde casi enrasado y bisel visible hacia la tapa de 12 cm.
    for (const [inset, y] of [[0, -0.06], [0, 0.008], [apron.bevel, apron.height]]) {
      for (const [x, z] of [[-w / 2 + inset, -d / 2 + inset], [-w / 2 + inset, d / 2 - inset],
        [w / 2 - inset, d / 2 - inset], [w / 2 - inset, -d / 2 + inset]]) vertices.push(x, y, z);
    }
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 4; i++) {
      const a = ring * 4 + i, b = ring * 4 + (i + 1) % 4;
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
    indices.push(8, 9, 10, 8, 10, 11, 0, 2, 1, 0, 3, 2);
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices);
    const [tw, td] = concrete.userData.tile as number[];
    const uv: number[] = [];
    for (let i = 0; i < vertices.length; i += 3) uv.push(vertices[i] / tw, vertices[i + 2] / td);
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, concrete); mesh.castShadow = mesh.receiveShadow = true; layers.visual.add(mesh);
    layers.solid.add(new T.Mesh(geo));
  });
}
