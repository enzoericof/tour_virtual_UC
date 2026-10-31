import * as T from "three";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
export class Walker {
  readonly controls: PointerLockControls;
  readonly body = new Capsule(
    new T.Vector3(0, 0.32, 0),
    new T.Vector3(0, 1.5, 0),
    0.28,
  );
  private world = new Octree();
  private velocity = new T.Vector3();
  private keys = new Set<string>();
  private ground = false;
  private spawn = new T.Vector3();
  enabled = false;
  fallback = false;
  onLockChange = (_locked: boolean) => {};
  onInteract = () => {};
  get active() {
    return this.controls.isLocked || this.fallback;
  }
  constructor(
    readonly camera: T.PerspectiveCamera,
    private canvas: HTMLElement,
  ) {
    this.controls = new PointerLockControls(camera, canvas);
    this.controls.pointerSpeed = 0.75;
    this.controls.addEventListener("lock", () => {
      this.enabled = true;
      this.onLockChange(true);
    });
    this.controls.addEventListener("unlock", () => {
      this.keys.clear();
      this.onLockChange(false);
    });
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      if (e.code === "Escape") {
        this.pause();
        return;
      }
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
        ].includes(e.code)
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (e.code === "KeyE") this.onInteract();
    });
    let dragging = false;
    canvas.addEventListener("pointerdown", (e) => {
      if (this.fallback) {
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener("pointerup", () => (dragging = false));
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging || !this.fallback) return;
      const rotation = new T.Euler().setFromQuaternion(
        camera.quaternion,
        "YXZ",
      );
      rotation.y -= e.movementX * 0.002;
      rotation.x = T.MathUtils.clamp(
        rotation.x - e.movementY * 0.002,
        -1.45,
        1.45,
      );
      camera.quaternion.setFromEuler(rotation);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.pause());
  }
  setWorld(object: T.Object3D) {
    this.world.clear();
    this.world.fromGraphNode(object);
  }
  teleport(feet: T.Vector3) {
    this.spawn.copy(feet);
    this.body.start.copy(feet).add(new T.Vector3(0, 0.3, 0));
    this.body.end.copy(feet).add(new T.Vector3(0, 1.5, 0));
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.body.end);
  }
  findSpawn(mesh: T.Object3D, preferred = new T.Vector3()): T.Vector3 {
    const ray = new T.Raycaster();
    const candidate = new T.Vector3();
    for (let ring = 0; ring < 12; ring++)
      for (let k = 0; k < (ring === 0 ? 1 : 16); k++) {
        const a = (k * Math.PI) / 8;
        candidate.set(
          preferred.x + Math.cos(a) * ring * 0.4,
          1.35,
          preferred.z + Math.sin(a) * ring * 0.4,
        );
        ray.set(candidate, new T.Vector3(0, -1, 0));
        ray.far = 2.5;
        const hit = ray.intersectObject(mesh, true)[0];
        if (!hit || hit.point.y > 0.45 || hit.point.y < -0.65) continue;
        const feet = hit.point.clone().add(new T.Vector3(0, 0.06, 0));
        const test = new Capsule(
          feet.clone().add(new T.Vector3(0, 0.34, 0)),
          feet.clone().add(new T.Vector3(0, 1.5, 0)),
          0.28,
        );
        if (!this.world.capsuleIntersect(test)) return feet;
      }
    return preferred.clone().setY(0.15);
  }
  walk() {
    this.enabled = true;
    try {
      const result = this.canvas.requestPointerLock();
      if (result)
        result.catch(() => {
          this.fallback = true;
          this.onLockChange(true);
        });
    } catch {
      this.fallback = true;
      this.onLockChange(true);
    }
  }
  pause() {
    const wasFallback = this.fallback;
    this.fallback = false;
    this.controls.unlock();
    this.keys.clear();
    this.velocity.set(0, 0, 0);
    if (wasFallback) this.onLockChange(false);
  }
  update(dt: number) {
    if (!this.enabled || !this.active) return;
    const forward = new T.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const side = forward.clone().cross(this.camera.up).normalize();
    const direction = new T.Vector3();
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp"))
      direction.add(forward);
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown"))
      direction.sub(forward);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight"))
      direction.add(side);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft"))
      direction.sub(side);
    direction.normalize();
    const speed = this.keys.has("ShiftLeft") ? 4.8 : 2.6;
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const delta = dt / steps;
      this.velocity.x = direction.x * speed;
      this.velocity.z = direction.z * speed;
      this.velocity.y -= 18 * delta;
      if (this.ground && this.keys.has("Space")) {
        this.velocity.y = 5;
        this.ground = false;
        this.keys.delete("Space");
      }
      this.body.translate(this.velocity.clone().multiplyScalar(delta));
      this.ground = false;
      for (let j = 0; j < 3; j++) {
        const result = this.world.capsuleIntersect(this.body);
        if (!result) break;
        this.body.translate(result.normal.clone().multiplyScalar(result.depth));
        if (result.normal.y > 0.4) {
          this.ground = true;
          this.velocity.y = Math.max(0, this.velocity.y);
        } else
          this.velocity.addScaledVector(
            result.normal,
            -result.normal.dot(this.velocity),
          );
      }
    }
    if (this.body.end.y < -8) this.teleport(this.spawn);
    this.camera.position.copy(this.body.end);
  }
}
