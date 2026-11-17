import { registerSeats } from "../seating";
import * as T from "three";
import { facultyBlueprint as plan, PLAZA_LEVEL } from "../../data/faculty-blueprint";
import { friendshipMaterial } from "../friendship-materials";
import type { FacultyBuilder } from "./builder";

/** Seis conjuntos en dos filas, cada mesa con dos bancos largos. */
export function addCoveredPlazaSeating(builder: FacultyBuilder) {
  const { box, beam, v3, frame, layers } = builder;
  const iron = new T.MeshStandardMaterial({ color: "#202927", metalness: 0.65, roughness: 0.6 });
  const wood = new T.MeshStandardMaterial({ color: "#805036", roughness: 0.75 });
  // Respaldo abierto con rombos, sin una placa opaca detrás.
  function seat(width: number) {
    registerSeats(layers.visual, width);
    for (let i = 0; i < 5; i++) box(width, 0.045, 0.075, 0, 0.46, -0.19 + i * 0.095, wood);
    for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) {
      for (const z of [-0.19, 0.19])
        beam(v3(x, 0.03, z * 1.4), v3(x, 0.46, z), 0.028, iron);
      beam(v3(x, 0.46, -0.19), v3(x, 1.04, -0.29), 0.025, iron);
      beam(v3(x, 0.65, -0.25), v3(x, 0.65, 0.23), 0.025, iron);
      beam(v3(x, 0.46, 0.19), v3(x, 0.65, 0.23), 0.022, iron);
    }
    for (const y of [0.62, 1.02]) box(width, 0.065, 0.06, 0, y, -0.28, wood);
    const left = -width / 2 + 0.08, right = width / 2 - 0.08;
    for (let x = left - 0.35; x < right; x += 0.19) {
      for (const slope of [-1, 1]) {
        const x0 = slope > 0 ? x : x + 0.35, x1 = slope > 0 ? x + 0.35 : x;
        const t0 = Math.max(0, slope > 0 ? (left - x0) / 0.35 : (x0 - right) / 0.35);
        const t1 = Math.min(1, slope > 0 ? (right - x0) / 0.35 : (x0 - left) / 0.35);
        if (t1 > t0) beam(v3(x0 + (x1 - x0) * t0, 0.65 + 0.34 * t0, -0.28),
          v3(x0 + (x1 - x0) * t1, 0.65 + 0.34 * t1, -0.28), 0.012, iron);
      }
    }
    // Volumen simple de colisión, independiente del detalle ornamental.
    const collider = new T.Mesh(new T.BoxGeometry(width, 0.43, 0.44));
    collider.position.set(0, 0.235, 0); layers.solid.add(collider);
  }
  const blueSlats = friendshipMaterial("blue");
  function blueSeat() {
    const width = 1.58;
    registerSeats(layers.visual, width, 0, 0.44);
    for (let i = 0; i < 4; i++) box(width, 0.032, 0.093, 0, 0.44, -0.14 + i * 0.1, blueSlats);
    for (let i = 0; i < 4; i++) box(width, 0.074, 0.035, 0, 0.54 + i * 0.082, -0.17 - i * 0.025, blueSlats);
    for (const x of [-width / 2 + 0.075, width / 2 - 0.075]) {
      const curve = new T.CatmullRomCurve3([
        v3(x, 0.02, 0.27), v3(x, 0.14, 0.21), v3(x, 0.39, 0.21),
        v3(x, 0.44, 0.13), v3(x, 0.44, -0.16), v3(x, 0.78, -0.26),
      ]);
      const support = new T.Mesh(new T.TubeGeometry(curve, 16, 0.022, 6, false), iron);
      support.castShadow = true; layers.visual.add(support);
      beam(v3(x, 0.44, -0.15), v3(x, 0.018, -0.27), 0.024, iron);
    }
    const collider = new T.Mesh(new T.BoxGeometry(width, 0.8, 0.52));
    collider.position.set(0, 0.4, 0); layers.solid.add(collider);
  }
  frame(plan.coveredPlaza, () => {
    for (const { center, blue, sideChairs } of plan.coveredPlazaSeating) frame({ center, size: [1.9, 2.8], angle: 0 }, () => {
      for (const z of [-1, 1]) frame({ center: [0, z], size: [1.8, 0.55], angle: z < 0 ? 0 : Math.PI },
        () => blue ? blueSeat() : seat(1.8));
      if (sideChairs) for (const x of [-1.5, 1.5])
        frame({ center: [x, 0], size: [0.57, 0.55], angle: x < 0 ? -Math.PI / 2 : Math.PI / 2 }, () => seat(0.57));
      for (const x of [-0.65, 0.65]) for (const z of [-0.32, 0.32])
        beam(v3(x, 0.02, z), v3(x, 0.76, z), 0.03, iron);
      if (blue) {
        for (let i = 0; i < 6; i++) box(1.45, 0.045, 0.122, 0, 0.76, (i - 2.5) * 0.126, blueSlats);
        const collider = new T.Mesh(new T.BoxGeometry(1.45, 0.76, 0.76));
        collider.position.set(0, 0.38, 0); layers.solid.add(collider);
      } else {
        box(1.9, 0.06, 0.84, 0, 0.77, 0, wood, true);
        for (let x = -0.86; x <= 0.86; x += 0.09) box(0.027, 0.012, 0.75, x, 0.807, 0, iron);
        for (let z = -0.35; z <= 0.35; z += 0.09) box(1.76, 0.012, 0.027, 0, 0.81, z, iron);
      }
    });
  }, PLAZA_LEVEL + 0.025);
}
