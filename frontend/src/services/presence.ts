import type { Skin } from "../data/skins";

export type Pose = { x: number; y: number; z: number; yaw: number; walking: boolean };
export type Player = Pose & { id: string; name: string; skin: Skin; at?: number };
type Snapshot = { self: string; players: Player[]; admitted?: boolean };

export class AdmissionError extends Error {
  constructor(readonly reason: "full" | "connection" | "auth") {
    super(reason === "full" ? "El recorrido está completo. Hay 10 personas conectadas. Reintentá cuando se libere un lugar."
      : reason === "auth" ? "Tu cuenta necesita iniciar sesión nuevamente." : "No pudimos comprobar el cupo. Revisá tu conexión y volvé a intentar.");
  }
}

export class CampusPresence {
  private socket: WebSocket | null = null;
  private reconnect = 0;
  private timer = 0;
  private lastPose: Pose | null = null;
  private running = false;
  private status = "";
  private lastSent = 0;
  private admitted = false;
  private admission?: { resolve: () => void; reject: (error: Error) => void; timer: number };

  constructor(
    private pose: () => Omit<Pose, "walking"> | null,
    private onPlayers: (players: Player[]) => void,
    private onStatus: (status: string) => void,
    private onSeating: (players: Player[], self?: string) => void = () => {},
    private onDenied: (error: AdmissionError) => void = () => {},
  ) {}

  bind(pose: typeof this.pose, onPlayers: typeof this.onPlayers, onStatus: typeof this.onStatus, onSeating: typeof this.onSeating) {
    this.pose = pose; this.onPlayers = onPlayers; this.onStatus = onStatus; this.onSeating = onSeating;
    onStatus(this.status);
  }

  /** Espera la reserva de una de las diez plazas en el servidor. */
  admit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => this.stop(), 15000);
      this.admission = { resolve, reject, timer };
      this.start();
    });
  }

  private finishAdmission(error?: AdmissionError) {
    const pending = this.admission;
    if (!pending) return;
    this.admission = undefined;
    window.clearTimeout(pending.timer);
    if (error) pending.reject(error); else pending.resolve();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.connect();
    this.timer = window.setInterval(() => this.sendPose(), 100);
  }

  stop() {
    this.finishAdmission(new AdmissionError("connection"));
    this.running = false;
    this.admitted = false;
    window.clearInterval(this.timer);
    window.clearTimeout(this.reconnect);
    const socket = this.socket;
    this.socket = null;
    if (socket?.readyState === WebSocket.OPEN) {
      try { socket.send("leave"); } catch { /* El cierre también retira la presencia. */ }
    }
    socket?.close();
    this.lastPose = null;
    this.onPlayers([]);
    this.onSeating([]);
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
    this.admitted = false;
    this.report("Conectando…");
    socket.onopen = () => {
      if (this.socket === socket) socket.send("join");
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      let snapshot: Snapshot;
      try { snapshot = JSON.parse(event.data) as Snapshot; } catch { return; }
      if (snapshot.admitted === true) {
        this.admitted = true;
        this.finishAdmission();
        this.sendPose();
        return;
      }
      const { self, players } = snapshot;
      if (!Array.isArray(players)) return;
      this.onSeating(players, self);
      const others = players.filter(player => player.id !== self);
      this.onPlayers(others);
      this.report(others.length === 1 ? "1 visitante en el recorrido" : `${others.length} visitantes en el recorrido`);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.lastPose = null;
      this.onPlayers([]);
      this.onSeating([]);
      const full = event.code === 4001;
      if (full || event.code === 1008 || this.admission) {
        const initial = !!this.admission;
        const error = new AdmissionError(full ? "full" : event.code === 1008 ? "auth" : "connection");
        this.finishAdmission(error);
        this.stop();
        this.report(error.message);
        if (!initial) this.onDenied(error);
        return;
      }
      this.report("Reconectando.");
      if (this.running) this.reconnect = window.setTimeout(() => this.connect(), 2500);
    };
  }

  private sendPose() {
    const socket = this.socket;
    if (!this.admitted || socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > 4096) return;
    const pose = this.pose();
    if (pose) {
      const prev = this.lastPose;
      const distance = prev ? Math.hypot(pose.x - prev.x, pose.z - prev.z) : 0;
      const walking = distance > 0.035 && distance < 2;
      const next = { ...pose, walking };
      const changed = !prev || Math.abs(pose.x - prev.x) > 0.001 || Math.abs(pose.y - prev.y) > 0.001
        || Math.abs(pose.z - prev.z) > 0.001 || Math.abs(pose.yaw - prev.yaw) > 0.001 || walking !== prev.walking;
      if (!changed && Date.now() - this.lastSent < 5000) return;
      socket.send(changed ? JSON.stringify(next) : "ping");
      this.lastPose = next;
    } else {
      if (!this.lastPose && Date.now() - this.lastSent < 5000) return;
      socket.send(this.lastPose ? "hide" : "ping");
      this.lastPose = null;
    }
    this.lastSent = Date.now();
  }
}
