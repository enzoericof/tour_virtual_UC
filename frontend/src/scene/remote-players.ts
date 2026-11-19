import * as T from "three";
import { occupiedSeat, type Seat } from "./seating";
import type { Player } from "../services/presence";
import type { SocialAction } from "../services/social";
import type { SphereWorld } from "./ragdoll";
import { Avatar } from "./avatar";

export class RemotePlayers {
  seats: Seat[] = [];
  players: Player[] = [];
  world: SphereWorld = () => false;
  now = () => Date.now();
  onImpact = (_player: Player, _force: number) => {};
  private avatars = new Map<string, Avatar>();
  private actions = new Map<string, SocialAction>();
  constructor(
    private scene: T.Scene,
    private clock = () => performance.now(),
  ) {}
  receive(players: Player[]) {
    this.players = players;
    const visible = new Set(players.map((p) => p.id));
    for (const [id, avatar] of this.avatars)
      if (!visible.has(id)) {
        avatar.remove();
        this.avatars.delete(id);
      }
    for (const p of players) {
      let avatar = this.avatars.get(p.id);
      if (avatar) avatar.receive(p, this.clock());
      else {
        avatar = new Avatar(p.id, p, this.clock());
        this.avatars.set(p.id, avatar);
        this.scene.add(avatar.group);
      }
      const action = [...this.actions.values()].find(
        (a) => (a.from === p.id || a.to === p.id) && a.expiresAt > this.now(),
      );
      if (action)
        avatar.setAction(action, this.world, this.now(), (force) =>
          this.onImpact(p, force),
        );
    }
  }
  action(action: SocialAction) {
    if (action.status === "active") {
      const actors = [action.from, action.to].filter(Boolean);
      const replaced = [...this.actions.values()].filter(
        (a) =>
          a.id !== action.id &&
          (actors.includes(a.from) || actors.includes(a.to)),
      );
      if (replaced.some((a) => a.startedAt > action.startedAt)) return;
      for (const previous of replaced) {
        this.actions.delete(previous.id);
        for (const avatar of this.avatars.values())
          if (avatar.actionId === previous.id)
            avatar.setAction(null, this.world, this.now());
      }
      this.actions.set(action.id, action);
    } else this.actions.delete(action.id);
    for (const id of [action.from, action.to]) {
      if (!id) continue;
      const avatar = this.avatars.get(id);
      if (action.status !== "active" && avatar?.actionId !== action.id)
        continue;
      const player = this.players.find((p) => p.id === id);
      this.avatars
        .get(id)
        ?.setAction(
          action.status === "active" ? action : null,
          this.world,
          this.now(),
          (force) => {
            if (player) this.onImpact(player, force);
          },
        );
    }
  }
  impulse(id: string, direction: "forward" | "back" | "left" | "right" | "up") {
    const action = this.actions.get(id);
    if (action) this.avatars.get(action.from)?.impulse(direction);
  }
  clearActions() {
    this.actions.clear();
    for (const avatar of this.avatars.values())
      avatar.setAction(null, this.world, this.now());
  }
  update(dt: number) {
    const now = this.clock();
    for (const [id, action] of this.actions)
      if (action.expiresAt <= this.now()) this.actions.delete(id);
    for (const p of this.players)
      this.avatars
        .get(p.id)
        ?.update(dt, now, Boolean(occupiedSeat(this.seats, p)), this.now());
  }
}
