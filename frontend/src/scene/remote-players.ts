import { occupiedSeat, type Seat } from "./seating";
import * as T from "three";
import { skins } from "../data/skins";
import type { Player } from "../services/presence";
import { MotionBuffer } from "./motion-buffer";

const cube = new T.BoxGeometry(1, 1, 1);
const head = new T.SphereGeometry(0.126, 12, 8);
const skinTone = new T.MeshStandardMaterial({ color: 0xc39371, roughness: 0.86 });
const shoes = new T.MeshStandardMaterial({ color: 0x272829, roughness: 0.84 });

class Avatar {
  readonly group = new T.Group();
  private shirt = new T.MeshStandardMaterial();
  private pants = new T.MeshStandardMaterial();
  private hair = new T.MeshStandardMaterial();
  private limbs: T.Object3D[] = [];
  private label: T.Sprite;
  private step = 0;
  private target = new T.Vector3();
  private yaw = 0;
  private walking = false;
  private sitting = false;
  private knees: T.Group[] = [];
  private motion = new MotionBuffer();

  constructor(player: Player, private seats: Seat[], now: number) {
    const piece = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material,
        at: [number, number, number], size: [number, number, number]) => {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...size);
      parent.add(mesh);
    };
    piece(this.group, cube, this.shirt, [0, 1.13, 0], [0.37, 0.48, 0.22]);
    piece(this.group, head, skinTone, [0, 1.51, 0], [1, 1.12, 1]);
    piece(this.group, head, this.hair, [0, 1.58, 0.028], [1.02, 0.67, 1.04]);
    for (const x of [-0.05, 0.05]) piece(this.group, cube, shoes, [x, 1.535, -0.115], [0.02, 0.026, 0.019]);
    for (const side of [-1, 1]) {
      const arm = new T.Group(), leg = new T.Group();
      arm.position.set(side * 0.24, 1.31, 0);
      leg.position.set(side * 0.105, 0.91, 0);
      piece(arm, cube, this.shirt, [0, -0.11, 0], [0.13, 0.25, 0.15]);
      piece(arm, cube, skinTone, [0, -0.33, 0], [0.095, 0.24, 0.1]);
      piece(leg, cube, this.pants, [0, -0.2, 0], [0.155, 0.4, 0.16]);
      const knee = new T.Group(); knee.position.y = -0.4; leg.add(knee); this.knees.push(knee);
      piece(knee, cube, this.pants, [0, -0.2, 0], [0.15, 0.4, 0.16]);
      piece(knee, cube, shoes, [0, -0.45, -0.044], [0.16, 0.12, 0.25]);
      this.group.add(arm, leg);
      this.limbs.push(arm, leg);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#142822d9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "600 31px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.name, 192, 33, 350);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    this.label = new T.Sprite(new T.SpriteMaterial({ map, depthWrite: false }));
    this.label.scale.set(1.65, 0.275, 1);
    this.label.position.y = 1.92;
    this.group.add(this.label);
    this.receive(player, now);
    this.group.position.copy(this.target);
    this.group.rotation.y = this.yaw;
  }

  receive(player: Player, now: number) {
    this.motion.receive(player, now);
    const skin = skins[player.skin] ?? skins.azul;
    this.shirt.color.setHex(skin.color);
    this.pants.color.setHex(skin.pants);
    this.hair.color.setHex(skin.hair);
    this.target.set(player.x, player.y, player.z);
    this.yaw = player.yaw;
    this.sitting = Boolean(occupiedSeat(this.seats, player));
    this.walking = player.walking && !this.sitting;
  }

  update(dt: number, now: number) {
    const blend = 1 - Math.exp(-15 * dt);
    const pose = this.motion.sample(now);
    this.walking = pose.walking && !this.sitting;
    this.target.set(pose.x, pose.y, pose.z);
    this.yaw = pose.yaw;
    if (this.group.position.distanceToSquared(this.target) > 25) this.group.position.copy(this.target);
    else this.group.position.lerp(this.target, blend);
    const turn = this.yaw - this.group.rotation.y;
    this.group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * blend;
    this.step += dt * 11;
    for (const [i, limb] of this.limbs.entries()) {
      const angle = this.sitting ? (i % 2 ? Math.PI / 2 : Math.PI / 5) : this.walking ? Math.sin(this.step) * 0.55 * (i === 0 || i === 3 ? 1 : -1) : 0;
      limb.rotation.x = T.MathUtils.lerp(limb.rotation.x, angle, blend);
    }
    for (const knee of this.knees) knee.rotation.x = T.MathUtils.lerp(knee.rotation.x, this.sitting ? -Math.PI / 2 : 0, blend);
  }

  remove() {
    this.group.removeFromParent();
    for (const material of [this.shirt, this.pants, this.hair]) material.dispose();
    this.label.material.map?.dispose();
    this.label.material.dispose();
  }
}

export class RemotePlayers {
  seats: Seat[] = [];
  private avatars = new Map<string, Avatar>();

  constructor(private scene: T.Scene, private clock = () => performance.now()) {}

  receive(players: Player[]) {
    const visible = new Set(players.map(player => player.id));
    for (const [id, avatar] of this.avatars) {
      if (visible.has(id)) continue;
      avatar.remove();
      this.avatars.delete(id);
    }
    for (const player of players) {
      const avatar = this.avatars.get(player.id);
      if (avatar) avatar.receive(player, this.clock());
      else {
        const created = new Avatar(player, this.seats, this.clock());
        this.avatars.set(player.id, created);
        this.scene.add(created.group);
      }
    }
  }

  update(dt: number) {
    const now = this.clock();
    for (const avatar of this.avatars.values()) avatar.update(dt, now);
  }
}
