import type { Skin } from "../data/skins";

export type Pose = { x: number; y: number; z: number; yaw: number; walking: boolean };
export type Player = Pose & { id: string; name: string; skin: Skin };
type Snapshot = { self: string; players: Player[] };

export class CampusPresence {
  private socket: WebSocket | null = null;
  private reconnect = 0;
  private timer = 0;
  private lastPose: Pose | null = null;
  private running = false;
  private status = "";

  constructor(
    private pose: () => Omit<Pose, "walking"> | null,
    private onPlayers: (players: Player[]) => void,
    private onStatus: (status: string) => void,
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.connect();
    this.timer = window.setInterval(() => this.sendPose(), 100);
  }

  stop() {
    this.running = false;
    window.clearInterval(this.timer);
    window.clearTimeout(this.reconnect);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.lastPose = null;
    this.onPlayers([]);
    this.report("Sin sesión");
  }

  private report(status: string) {
    if (status === this.status) return;
    this.status = status;
    this.onStatus(status);
  }

  private connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/ws/presence`);
    this.socket = socket;
    this.report("Conectando…");
    socket.onopen = () => {
      if (this.socket === socket) this.sendPose();
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      const { self, players } = JSON.parse(event.data) as Snapshot;
      const others = players.filter(player => player.id !== self);
      this.onPlayers(others);
      this.report(others.length === 1 ? "1 visitante en el recorrido" : `${others.length} visitantes en el recorrido`);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.lastPose = null;
      this.onPlayers([]);
      const full = event.code === 4001;
      this.report(full ? "Recorrido completo (10 jugadores). Reintentando…" : "Reconectando…");
      if (this.running) this.reconnect = window.setTimeout(() => this.connect(), full ? 10000 : 2500);
    };
  }

  private sendPose() {
    const socket = this.socket;
    if (socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > 4096) return;
    const pose = this.pose();
    if (pose) {
      const prev = this.lastPose;
      const distance = prev ? Math.hypot(pose.x - prev.x, pose.z - prev.z) : 0;
      socket.send(JSON.stringify({ ...pose, walking: distance > 0.035 && distance < 2 }));
    } else {
      socket.send(this.lastPose ? "leave" : "ping");
    }
    this.lastPose = pose ? { ...pose, walking: false } : null;
  }
}
