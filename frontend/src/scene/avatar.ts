import {createJetpack} from "./jetpack";
import * as T from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { avatarColor } from "../data/skins";
import type { Player } from "../services/presence";
import type { SocialAction } from "../services/social";
import { MotionBuffer } from "./motion-buffer";
import { Ragdoll, ragdollRig, type SphereWorld } from "./ragdoll";

let asset: Promise<GLTF> | undefined;
const sphere = new T.SphereGeometry(1, 12, 8);
const box = new T.BoxGeometry(1, 1, 1);
const fallbackSkin = new T.MeshStandardMaterial({
  color: 0xb98665,
  roughness: 0.8,
});
const fallbackPants = new T.MeshStandardMaterial({
  color: 0x243043,
  roughness: 0.8,
});
const axis = new T.Vector3(0, 1, 0);
const clips: Record<string, string> = {
  "high-five": "HighFive",
  "hold-hands": "HoldHandsJump",
  ok: "OK",
  peace: "Peace",
  ragdoll: "Fall",
};
export function actionAnchor(action: SocialAction, id: string) {
  const p = id === action.from ? action.fromPose : action.toPose!;
  if (!action.toPose)
    return { position: new T.Vector3(p.x, p.y, p.z), yaw: p.yaw };
  const a = action.fromPose,
    b = action.toPose;
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length = Math.hypot(dx, dz) || 1;
  const sign = id === action.from ? -1 : 1,
    spacing = action.kind === "high-five" ? 0.4 : 0.46;
  return {
    position: new T.Vector3(
      (a.x + b.x) / 2 + ((sign * dx) / length) * spacing,
      p.y,
      (a.z + b.z) / 2 + ((sign * dz) / length) * spacing,
    ),
    yaw: Math.atan2(sign * dx, sign * dz),
  };
}

export class Avatar {
  readonly group = new T.Group();
  readonly visual = new T.Group();
  private motion = new MotionBuffer();
  private jetpack = createJetpack();
  private shirt = new T.MeshStandardMaterial({ roughness: 0.78 });
  private materials: T.Material[] = [this.shirt];
  private nodes = new Map<string, T.Object3D>();
  private rest = new Map<
    T.Object3D,
    { position: T.Vector3; quaternion: T.Quaternion }
  >();
  private mixer?: T.AnimationMixer;
  private animations: T.AnimationClip[] = [];
  private currentClip = "";
  private removed = false;
  private label?: T.Sprite;
  private action: SocialAction | null = null;
  ragdoll: Ragdoll | null = null;
  private target = new T.Vector3();
  private temp = new T.Vector3();
  private direction = new T.Vector3();
  private shoulder = new T.Vector3();
  private elbow = new T.Vector3();
  private targetHand = new T.Vector3();
  private quaternion = new T.Quaternion();
  private yaw = 0;
  private elapsed = 0;
  private pendingAge = 0;
  private sitting = false;
  get actionId() {
    return this.action?.id;
  }
  private skin: Player["skin"];
  constructor(
    readonly id: string,
    player: Player,
    now: number,
    showLabel = true,
  ) {
    this.skin = player.skin;
    this.group.add(this.visual);
    this.fallback();
    this.nodes.get("Spine")!.add(this.jetpack.group);
    this.captureRest();
    if (showLabel) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#14222bdd";
      ctx.fillRect(0, 0, 512, 64);
      ctx.fillStyle = "#fff";
      ctx.font = "600 28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.name, 256, 33, 490);
      const map = new T.CanvasTexture(canvas);
      map.colorSpace = T.SRGBColorSpace;
      this.label = new T.Sprite(
        new T.SpriteMaterial({
          map,
          depthWrite: false,
          sizeAttenuation: false,
        }),
      );
      this.label.scale.set(0.27, 0.034, 1);
      this.label.position.y = 1.92;
      this.group.add(this.label);
    }
    this.receive(player, now);
    this.group.position.copy(this.target);
    this.group.rotation.y = this.yaw;
    if (
      typeof window !== "undefined" &&
      typeof document.createElementNS === "function"
    ) {
      asset ??= new GLTFLoader().loadAsync("/assets/avatar/campus-person.glb");
      void asset
        .then((gltf) => {
          if (this.removed) return;
          this.visual.clear();
          this.nodes.clear();
          const model = gltf.scene.clone(true);
          model.traverse((o) => {
            this.nodes.set(o.name, o);
            if (o instanceof T.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              const material = o.material as T.MeshStandardMaterial;
              if (material.name === "UserShirt") o.material = this.shirt;
            }
          });
          this.visual.add(model);
          (this.nodes.get("Spine")??this.visual).add(this.jetpack.group);
          this.captureRest();
          this.mixer = new T.AnimationMixer(model);
          this.animations = gltf.animations;
          this.currentClip = "";
        })
        .catch((error) =>
          console.warn("No se pudo cargar el avatar de Blender", error),
        );
    }
  }
  private captureRest() {
    this.rest.clear();
    for (const node of this.nodes.values())
      this.rest.set(node, {
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
      });
  }
  private resetPose() {
    this.mixer?.stopAllAction();
    this.currentClip = "";
    for (const [node, rest] of this.rest) {
      node.position.copy(rest.position);
      node.quaternion.copy(rest.quaternion);
    }
  }
  private fallback() {
    const node = (name: string, parent: T.Object3D, at: number[]) => {
      const group = new T.Group();
      group.name = name;
      group.position.set(at[0], at[1], at[2]);
      parent.add(group);
      this.nodes.set(name, group);
      return group;
    };
    const mesh = (
      parent: T.Object3D,
      size: number[],
      at: number[],
      material: T.Material,
      round = false,
    ) => {
      const piece = new T.Mesh(round ? sphere : box, material);
      piece.scale.set(size[0], size[1], size[2]);
      piece.position.set(at[0], at[1], at[2]);
      parent.add(piece);
    };
    const pelvis = node("Pelvis", this.visual, [0, 0.89, 0]),
      spine = node("Spine", pelvis, [0, 0.22, 0]);
    mesh(spine, [0.38, 0.45, 0.23], [0, 0.06, 0], this.shirt);
    const head = node("Head", spine, [0, 0.38, 0]);
    mesh(head, [0.125, 0.155, 0.12], [0, 0.04, 0], fallbackSkin, true);
    for (const [suffix, sign] of [
      ["L", -1],
      ["R", 1],
    ] as const) {
      const arm = node("UpperArm" + suffix, spine, [sign * 0.24, 0.22, 0]);
      mesh(arm, [0.115, 0.26, 0.13], [0, -0.13, 0], this.shirt);
      const fore = node("Forearm" + suffix, arm, [0, -0.27, 0]);
      mesh(fore, [0.09, 0.25, 0.1], [0, -0.125, 0], fallbackSkin);
      const hand = node("Hand" + suffix, fore, [0, -0.25, 0]);
      mesh(hand, [0.09, 0.1, 0.05], [0, -0.04, 0], fallbackSkin);
      const leg = node("Thigh" + suffix, pelvis, [sign * 0.095, -0.07, 0]);
      mesh(leg, [0.15, 0.38, 0.17], [0, -0.19, 0], fallbackPants);
      const shin = node("Shin" + suffix, leg, [0, -0.38, 0]);
      mesh(shin, [0.13, 0.36, 0.15], [0, -0.18, 0], fallbackPants);
      const foot = node("Foot" + suffix, shin, [0, -0.36, 0]);
      mesh(foot, [0.16, 0.11, 0.27], [0, -0.03, -0.05], fallbackPants);
    }
  }
  receive(player: Player, now: number) {
    this.motion.receive(player, now);
    this.skin = player.skin;
    this.shirt.color.set(avatarColor(this.skin));
    this.target.set(player.x, player.y, player.z);
    this.yaw = player.yaw;
  }
  setAction(
    action: SocialAction | null,
    world: SphereWorld,
    now: number,
    impact?: (force: number) => void,
  ) {
    if (action?.id === this.action?.id) return;
    this.resetPose();
    this.action = action;
    this.ragdoll = null;
    this.currentClip = "";
    if (action) {
      const anchor = actionAnchor(action, this.id);
      this.group.position.copy(anchor.position);
      this.group.rotation.y = anchor.yaw;
      if (action.kind === "ragdoll") {
        this.ragdoll = new Ragdoll(
          anchor.position,
          anchor.yaw,
          world,
          (force) => {
            if (!this.pendingAge) impact?.(force);
          },
        );
        this.pendingAge = Math.max(
          0,
          Math.min(6.5, (now - action.startedAt) / 1000),
        );
      }
    }
  }
  impulse(direction: "forward" | "back" | "left" | "right" | "up") {
    this.ragdoll?.impulse(direction);
  }
  private animate(clip: string, time: number, loop: boolean) {
    if (!this.mixer) return;
    if (clip !== this.currentClip) {
      this.resetPose();
      this.currentClip = clip;
      const animation = this.animations.find((c) => c.name === clip);
      if (animation) {
        const action = this.mixer.clipAction(animation);
        action.setLoop(loop ? T.LoopRepeat : T.LoopOnce, loop ? Infinity : 1);
        action.clampWhenFinished = !loop;
        action.play();
      }
    }
    this.mixer.setTime(time);
  }
  update(dt: number, now: number, sitting = false, wallNow = Date.now()) {
    this.elapsed += dt;
    const flight=this.motion.sample(now).jetpacking && !this.action && !sitting;
    this.jetpack.update(Boolean(flight),this.elapsed);
    if (sitting !== this.sitting) {
      this.sitting = sitting;
      this.resetPose();
    }
    if (this.action && wallNow >= this.action.expiresAt) {
      this.action = null;
      this.ragdoll = null;
      this.resetPose();
    }
    if (this.action) {
      this.animate(
        clips[this.action.kind],
        Math.max(0, (wallNow - this.action.startedAt) / 1000),
        false,
      );
      if (this.action.kind === "high-five" && this.id === this.action.to) {
        for (const part of ["UpperArm", "Forearm", "Hand"]) {
          const right = this.nodes.get(part + "R"),
            left = this.nodes.get(part + "L");
          if (!right || !left) continue;
          left.quaternion.set(
            right.quaternion.x,
            -right.quaternion.y,
            -right.quaternion.z,
            right.quaternion.w,
          );
          const rest = this.rest.get(right);
          if (rest) right.quaternion.copy(rest.quaternion);
        }
      }
      if (this.ragdoll) {
        if (this.pendingAge) {
          for (let age = 0; age < this.pendingAge; age += 0.05)
            this.ragdoll.update(Math.min(0.05, this.pendingAge - age));
          this.pendingAge = 0;
        }
        this.ragdoll.update(dt);
        this.applyRagdoll();
      } else if (this.action.toPose) this.pairedHands(this.action, wallNow);
    } else {
      const pose = this.motion.sample(now),
        blend = 1 - Math.exp(-15 * dt);
      this.target.set(pose.x, pose.y, pose.z);
      this.yaw = pose.yaw;
      if (this.group.position.distanceToSquared(this.target) > 25)
        this.group.position.copy(this.target);
      else this.group.position.lerp(this.target, blend);
      const turn = this.yaw - this.group.rotation.y;
      this.group.rotation.y +=
        Math.atan2(Math.sin(turn), Math.cos(turn)) * blend;
      this.animate(
        pose.walking && !sitting ? "Walk" : "Idle",
        this.elapsed,
        true,
      );
      if (!this.mixer)
        for (const [name, node] of this.nodes) {
          if (name.startsWith("UpperArm") || name.startsWith("Thigh"))
            node.rotation.x = pose.walking
              ? Math.sin(this.elapsed * 11) *
                0.5 *
                (name.endsWith("L") ? 1 : -1)
              : 0;
        }
      if (sitting)
        for (const suffix of ["L", "R"]) {
          const thigh = this.nodes.get("Thigh" + suffix),
            shin = this.nodes.get("Shin" + suffix);
          if (thigh) thigh.rotation.x = Math.PI / 2;
          if (shin) shin.rotation.x = -Math.PI / 2;
        }
    }
    if (this.label) {
      if (this.ragdoll)
        this.label.position
          .copy(this.group.worldToLocal(this.temp.copy(this.ragdoll.center)))
          .addScaledVector(axis, 0.7);
      else this.label.position.set(0, 1.92, 0);
    }
  }
  private orient(
    node: T.Object3D,
    position: T.Vector3,
    target: T.Vector3,
    sign: number,
  ) {
    node.parent!.updateWorldMatrix(true, false);
    node.position.copy(node.parent!.worldToLocal(this.temp.copy(position)));
    node.parent!.getWorldQuaternion(this.quaternion).invert();
    this.direction
      .subVectors(target, position)
      .normalize()
      .applyQuaternion(this.quaternion);
    node.quaternion.setFromUnitVectors(
      this.temp.set(0, sign, 0),
      this.direction,
    );
    node.updateWorldMatrix(false, true);
  }
  private applyRagdoll() {
    const particles = this.ragdoll!.particles;
    for (const [name, point, next, sign] of ragdollRig) {
      const node = this.nodes.get(name);
      if (!node) continue;
      const position = particles[point].position;
      if (next >= 0)
        this.orient(node, position, particles[next].position, sign);
      else {
        node.parent!.updateWorldMatrix(true, false);
        node.position.copy(node.parent!.worldToLocal(this.temp.copy(position)));
      }
    }
  }
  private pairedHands(action: SocialAction, now: number) {
    const age = (now - action.startedAt) / 1000;
    if (age < 0.45 || age > (action.expiresAt - action.startedAt) / 1000 - 0.45)
      return;
    const a = action.fromPose,
      b = action.toPose!,
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz) || 1;
    this.group.updateWorldMatrix(true, true);
    const pelvis = this.nodes.get("Pelvis");
    const jump = pelvis ? pelvis.position.y - 0.89 : 0;
    const offsets = action.kind === "high-five" ? [-0.22] : [-0.22, 0.22];
    for (const offset of offsets) {
      const suffix = (
        action.kind === "high-five"
          ? this.id === action.from
          : offset < 0 === (this.id === action.from)
      )
        ? "R"
        : "L";
      this.targetHand.set(
        (a.x + b.x) / 2 + (dz / len) * offset,
        (a.y + b.y) / 2 + (action.kind === "high-five" ? 1.54 : 1.1) + jump,
        (a.z + b.z) / 2 - (dx / len) * offset,
      );
      this.armTo(suffix, this.targetHand);
    }
  }
  private armTo(suffix: string, target: T.Vector3) {
    const arm = this.nodes.get("UpperArm" + suffix),
      fore = this.nodes.get("Forearm" + suffix),
      hand = this.nodes.get("Hand" + suffix);
    if (!arm || !fore || !hand) return;
    arm.getWorldPosition(this.shoulder);
    this.direction.subVectors(target, this.shoulder);
    const distance = Math.min(0.515, this.direction.length());
    this.direction.normalize();
    this.targetHand
      .copy(this.shoulder)
      .addScaledVector(this.direction, distance);
    this.elbow.copy(this.shoulder).lerp(this.targetHand, 0.5);
    this.elbow.y -= Math.sqrt(
      Math.max(0, 0.26 * 0.26 - (distance * distance) / 4),
    );
    this.orient(arm, this.shoulder, this.elbow, -1);
    this.orient(fore, this.elbow, this.targetHand, -1);
    hand.rotation.set(0, 0, 0);
  }
  remove() {
    this.removed = true;
    this.jetpack.dispose();
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.visual.children[0]);
    this.group.removeFromParent();
    for (const mat of this.materials) mat.dispose();
    this.label?.material.map?.dispose();
    this.label?.material.dispose();
  }
}
