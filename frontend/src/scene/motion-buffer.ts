import type { Player } from "../services/presence";

type Sample = Pick<Player, "x" | "y" | "z" | "yaw" | "walking"> & { time: number };
const axes = ["x", "y", "z"] as const;

/** Reproduce una pequeña historia temporal en vez de perseguir posiciones aisladas. */
export class MotionBuffer {
  private samples: Sample[] = [];
  private offset = Infinity;
  private interval = 100;
  private renderedAt = -Infinity;
  private delay = 130;
  private lastFrame = 0;
  readonly value = { x: 0, y: 0, z: 0, yaw: 0, walking: false };

  receive(player: Player, now: number) {
    const time = player.at || now;
    const last = this.samples.at(-1);
    if (last && time <= last.time) return; // Los snapshots repetidos no son movimientos nuevos.
    this.offset = Math.min(this.offset, now - time);
    if (last) {
      if (Math.hypot(player.x - last.x, player.y - last.y, player.z - last.z) > 5) {
        this.samples.length = 0; // Teletransporte: no atravesar paredes interpolando.
        this.renderedAt = -Infinity;
      } else if (time - last.time < 1000) {
        this.interval = this.interval * 0.5 + (time - last.time) * 0.5;
      }
    }
    this.samples.push({ x: player.x, y: player.y, z: player.z, yaw: player.yaw, walking: player.walking, time });
    if (this.samples.length > 20) this.samples.shift();
  }

  sample(now: number) {
    if (!this.samples.length) return this.value;
    const desired = Math.max(120, Math.min(450, this.interval * 1.3));
    const adjustment = Math.max(0, now - this.lastFrame) * 0.1;
    this.delay += Math.max(-adjustment, Math.min(adjustment, desired - this.delay));
    this.lastFrame = now;
    const time = Math.max(this.renderedAt, now - this.offset - this.delay);
    this.renderedAt = time;
    while (this.samples.length > 2 && this.samples[1].time <= time) this.samples.shift();
    const a = this.samples[0], b = this.samples[1];
    let from = a, to = a, alpha = 0;
    if (b) {
      from = a; to = b;
      alpha = Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
      if (time > b.time && b.walking) {
        // Predicción muy corta: ante una interrupción se detiene, no sigue cruzando el campus.
        alpha = 1 + Math.min(100, time - b.time) / (b.time - a.time);
      }
    }
    for (const key of axes) this.value[key] = from[key] + (to[key] - from[key]) * alpha;
    const turn = to.yaw - from.yaw;
    this.value.yaw = from.yaw + Math.atan2(Math.sin(turn), Math.cos(turn)) * Math.min(1, alpha);
    this.value.walking = (alpha < 1 ? from.walking : to.walking) && time <= to.time + 100;
    return this.value;
  }
}
