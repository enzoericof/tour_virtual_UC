import * as T from "three";
import type { Walker } from "../navigation/walker";
import type { Player, Pose } from "../services/presence";
import type { SocialAction } from "../services/social";
import { Avatar, actionAnchor } from "./avatar";
import type { RemotePlayers } from "./remote-players";
import { SocialAudio } from "./social-audio";

export class SocialPerformance {
  readonly audio = new SocialAudio();
  private self: Player | null = null;
  private avatar: Avatar | null = null;
  private active: SocialAction | null = null;
  private original = new T.Vector3();
  private savedLook = new T.Quaternion();
  private focus = new T.Vector3();
  private offset = new T.Vector3();
  private ray = new T.Ray();
  private lastFoot = new T.Vector3();
  private steps = 0;
  now = () => Date.now();
  onCancel = (_id: string) => {};
  onImpulse = (_id: string, _direction: string) => {};
  constructor(
    private scene: T.Scene,
    private camera: T.PerspectiveCamera,
    private walker: Walker,
    private remote: RemotePlayers,
    private blocked: () => boolean,
    private error: (message: string) => void,
  ) {
    remote.world = (s) => walker.sphereCollision(s);
    remote.onImpact = (player, force) => {
      const distance = Math.hypot(
        camera.position.x - player.x,
        camera.position.z - player.z,
      );
      if (distance < 12)
        this.audio.play(
          "ragdoll-impact",
          Math.min(0.45, force * 0.035) * (1 - distance / 12),
          0.9,
        );
    };
    window.addEventListener("keydown", (event) => {
      if (!this.active || this.active.kind !== "ragdoll" || !walker.active)
        return;
      const direction = (
        {
          KeyW: "forward",
          KeyS: "back",
          KeyA: "left",
          KeyD: "right",
          Space: "up",
        } as const
      )[event.code as "KeyW"];
      if (direction) {
        event.preventDefault();
        this.onImpulse(this.active.id, direction);
      }
    });
  }
  get busy() {
    return !!this.active;
  }
  setSelf(player: Player | null) {
    this.self = player;
  }
  canPerform() {
    return !this.blocked() && !this.busy && this.walker.grounded;
  }
  action(action: SocialAction) {
    this.remote.action(action);
    if (
      !this.self ||
      (action.from !== this.self.id && action.to !== this.self.id)
    )
      return;
    if (action.status !== "active") {
      if (action.id === this.active?.id) this.finish();
      return;
    }
    if (action.id === this.active?.id) return;
    if (this.active && action.startedAt < this.active.startedAt) return;
    if (this.blocked() || !this.walker.enabled) {
      this.onCancel(action.id);
      return;
    }
    const anchor = actionAnchor(action, this.self.id);
    const feet = this.walker.body.end.clone().add(new T.Vector3(0, -1.5, 0));
    this.ray.origin.copy(this.camera.position);
    this.ray.direction.copy(anchor.position).sub(feet);
    const distance = this.ray.direction.length();
    this.ray.direction.normalize();
    if (
      !this.walker.canStandAt(anchor.position) ||
      (distance > 0.02 && this.walker.obstructs(this.ray, distance))
    ) {
      this.error(
        "No hay espacio para la interacción. Busquen un lugar despejado.",
      );
      this.onCancel(action.id);
      return;
    }
    this.finish();
    this.original.copy(feet);
    this.savedLook.copy(this.camera.quaternion);
    this.active = action;
    this.walker.frozen = true;
    this.walker.teleport(anchor.position);
    this.avatar = new Avatar(this.self.id, this.self, performance.now(), false);
    this.avatar.setAction(
      action,
      (s) => this.walker.sphereCollision(s),
      this.now(),
      (force) =>
        this.audio.play(
          "ragdoll-impact",
          Math.min(0.6, force * 0.045),
          0.85 + Math.min(0.3, force * 0.015),
        ),
    );
    this.scene.add(this.avatar.group);
  }
  impulse(id: string, direction: "forward" | "back" | "left" | "right" | "up") {
    this.remote.impulse(id, direction);
    if (this.active?.id === id) this.avatar?.impulse(direction);
  }
  update(dt: number) {
    const now = this.now();
    if (this.active && now >= this.active.expiresAt) this.finish();
    if (this.avatar && this.active) {
      this.avatar.update(dt, performance.now(), false, now);
      if (this.avatar.ragdoll) {
        this.focus.copy(this.avatar.ragdoll.center);
        this.focus.y += 0.35;
      } else {
        this.focus.copy(this.avatar.group.position);
        this.focus.y += 1.1;
      }
      this.offset
        .set(1.7, 1.05, 2.5)
        .applyAxisAngle(T.Object3D.DEFAULT_UP, this.avatar.group.rotation.y);
      const length = this.offset.length();
      this.ray.set(this.focus, this.offset.normalize());
      const clearance = Math.max(
        0.18,
        this.walker.rayDistance(this.ray, length) - 0.18,
      );
      this.camera.position
        .copy(this.focus)
        .addScaledVector(this.offset, clearance);
      this.camera.lookAt(this.focus);
    } else {
      const distance = this.walker.body.end.distanceTo(this.lastFoot);
      if (this.walker.active && this.walker.grounded && distance < 1)
        this.steps += distance;
      if (this.steps > 0.9) {
        this.steps = 0;
        this.audio.play("footsteps", 0.2, 0.95 + Math.random() * 0.1);
      }
    }
    this.lastFoot.copy(this.walker.body.end);
  }
  pose(): Pose | null {
    if (!this.active || !this.avatar) return null;
    const anchor = actionAnchor(this.active, this.self!.id);
    return {
      x: anchor.position.x,
      y: anchor.position.y,
      z: anchor.position.z,
      yaw: anchor.yaw,
      walking: false,
    };
  }
  finish() {
    if (!this.active) return;
    if (this.avatar?.ragdoll) {
      const center = this.avatar.ragdoll.center;
      let found = false;
      if (center.y > -7)
        for (let ring = 0; ring < 5 && !found; ring++)
          for (let i = 0; i < 8 && !found; i++) {
            this.ray.origin.set(
              center.x + Math.cos((i * Math.PI) / 4) * ring * 0.35,
              center.y + 1.8,
              center.z + Math.sin((i * Math.PI) / 4) * ring * 0.35,
            );
            this.ray.direction.set(0, -1, 0);
            const ground = this.walker.rayDistance(this.ray, 4);
            if (ground >= 4) continue;
            this.focus
              .copy(this.ray.origin)
              .addScaledVector(this.ray.direction, ground - 0.035);
            if (this.walker.canStandAt(this.focus)) {
              this.walker.teleport(this.focus);
              found = true;
            }
          }
      if (!found) this.walker.teleport(this.original);
    } else this.camera.position.copy(this.walker.body.end);
    this.camera.quaternion.copy(this.savedLook);
    this.walker.frozen = false;
    this.avatar?.remove();
    this.avatar = null;
    this.active = null;
  }
  clear() {
    this.finish();
    this.remote.clearActions();
  }
}
