import * as T from "three";
export type SphereContact = { normal: T.Vector3; depth: number } | false;
export type SphereWorld = (sphere: T.Sphere) => SphereContact;
const anatomy = [
  [0, 0.89, 0, 0.15],
  [0, 1.11, 0, 0.18],
  [0, 1.49, 0, 0.14],
  [-0.24, 1.33, 0, 0.075],
  [-0.24, 1.06, 0, 0.065],
  [-0.24, 0.81, 0, 0.065],
  [0.24, 1.33, 0, 0.075],
  [0.24, 1.06, 0, 0.065],
  [0.24, 0.81, 0, 0.065],
  [-0.095, 0.82, 0, 0.09],
  [-0.095, 0.44, 0, 0.075],
  [-0.095, 0.08, -0.05, 0.09],
  [0.095, 0.82, 0, 0.09],
  [0.095, 0.44, 0, 0.075],
  [0.095, 0.08, -0.05, 0.09],
] as const;
const links = [
  [0, 1],
  [1, 2],
  [1, 3],
  [1, 6],
  [3, 6],
  [0, 3],
  [0, 6],
  [2, 3],
  [2, 6],
  [3, 4],
  [4, 5],
  [6, 7],
  [7, 8],
  [0, 9],
  [0, 12],
  [9, 12],
  [1, 9],
  [1, 12],
  [9, 10],
  [10, 11],
  [12, 13],
  [13, 14],
];
export const ragdollRig = [
  ["Pelvis", 0, 1, 1],
  ["Spine", 1, 2, 1],
  ["Head", 2, -1, 1],
  ["UpperArmL", 3, 4, -1],
  ["ForearmL", 4, 5, -1],
  ["HandL", 5, -1, -1],
  ["UpperArmR", 6, 7, -1],
  ["ForearmR", 7, 8, -1],
  ["HandR", 8, -1, -1],
  ["ThighL", 9, 10, -1],
  ["ShinL", 10, 11, -1],
  ["FootL", 11, -1, -1],
  ["ThighR", 12, 13, -1],
  ["ShinR", 13, 14, -1],
  ["FootR", 14, -1, -1],
] as const;
/** Partículas Verlet, enlaces articulares y contactos esféricos con los sólidos reales. */
export class Ragdoll {
  readonly particles: {
    position: T.Vector3;
    previous: T.Vector3;
    radius: number;
  }[];
  private constraints: { a: number; b: number; length: number }[];
  private sphere = new T.Sphere();
  private delta = new T.Vector3();
  private velocity = new T.Vector3();
  private accumulator = 0;
  private clock = 0;
  private lastImpact = -1;
  constructor(
    position: T.Vector3,
    readonly yaw: number,
    private world: SphereWorld,
    private impact: (strength: number) => void = () => {},
  ) {
    const rotation = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(0, 1, 0),
      yaw,
    );
    this.particles = anatomy.map(([x, y, z, radius], i) => {
      const point = new T.Vector3(x, y, z)
        .applyQuaternion(rotation)
        .add(position);
      const velocity = new T.Vector3(
        ((i % 3) - 1) * 0.18,
        i === 2 ? 0.3 : 0,
        -1.7,
      ).applyQuaternion(rotation);
      return {
        position: point,
        previous: point.clone().addScaledVector(velocity, -1 / 120),
        radius,
      };
    });
    this.constraints = links.map(([a, b]) => ({
      a,
      b,
      length: this.particles[a].position.distanceTo(this.particles[b].position),
    }));
  }
  get center() {
    return this.particles[0].position;
  }
  impulse(direction: "forward" | "back" | "left" | "right" | "up") {
    const impulse = new T.Vector3(
      direction === "left" ? -1 : direction === "right" ? 1 : 0,
      direction === "up" ? 2.1 : 0.18,
      direction === "forward" ? -1 : direction === "back" ? 1 : 0,
    )
      .applyAxisAngle(T.Object3D.DEFAULT_UP, this.yaw)
      .multiplyScalar(1 / 120);
    for (const p of this.particles) p.previous.sub(impulse);
  }
  update(dt: number) {
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator >= 1 / 120) {
      this.step(1 / 120);
      this.accumulator -= 1 / 120;
    }
  }
  private step(dt: number) {
    this.clock += dt;
    for (const p of this.particles) {
      this.velocity.subVectors(p.position, p.previous).multiplyScalar(0.993);
      p.previous.copy(p.position);
      p.position.add(this.velocity);
      p.position.y -= 18 * dt * dt;
    }
    let impact = 0;
    for (let iteration = 0; iteration < 7; iteration++) {
      for (const c of this.constraints) {
        const a = this.particles[c.a],
          b = this.particles[c.b];
        this.delta.subVectors(b.position, a.position);
        const distance = this.delta.length();
        if (distance < 0.00001) continue;
        this.delta.multiplyScalar(((distance - c.length) / distance) * 0.5);
        a.position.add(this.delta);
        b.position.sub(this.delta);
      }
      for (const p of this.particles) {
        this.sphere.center.copy(p.position);
        this.sphere.radius = p.radius;
        const hit = this.world(this.sphere);
        if (!hit) continue;
        this.velocity.subVectors(p.position, p.previous);
        const normalSpeed = this.velocity.dot(hit.normal);
        impact = Math.max(impact, -normalSpeed / dt);
        p.position.addScaledVector(hit.normal, hit.depth + 0.0001);
        // Fricción tangencial y restitución leve; no inyecta energía al resolver penetraciones.
        if (normalSpeed < 0)
          this.velocity.addScaledVector(hit.normal, -normalSpeed * 1.12);
        this.velocity.multiplyScalar(hit.normal.y > 0.4 ? 0.76 : 0.92);
        p.previous.copy(p.position).sub(this.velocity);
      }
    }
    if (impact > 1.25 && this.clock - this.lastImpact > 0.2) {
      this.lastImpact = this.clock;
      this.impact(impact);
    }
  }
}
