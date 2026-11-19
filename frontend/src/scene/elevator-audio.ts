import * as T from "three";
import { CABIN, type ElevatorMotion, type ElevatorState } from "./elevator";

/** Grabaciones del ascensor (19/11/2026), recortadas y normalizadas por
 * scripts/prepare-elevator-assets.py. El zumbido trae un margen de 0,1 s a cada lado del bucle. */
const SOUNDS = {
  doors: "/assets/ascensor/puertas.mp3",
  chime: "/assets/ascensor/llegada.mp3",
  travel: "/assets/ascensor/viaje.mp3",
} as const;
type Sound = keyof typeof SOUNDS;
const NAMES = Object.keys(SOUNDS) as Sound[];
const TRAVEL_LOOP = { start: 0.1, end: 7.1 };
const VOLUME: Record<Sound, number> = { doors: 0.85, chime: 0.9, travel: 0.6 };
/** Lugar de cada fuente en la cabina (origen en el centro del piso): puertas y gong en el frente;
 * el motor, arriba. */
const PLACE: Record<Sound, readonly [number, number, number]> = {
  doors: [-0.15, 1.2, -CABIN.depth / 2], chime: [-0.15, 2.1, -CABIN.depth / 2], travel: [0, 2.4, 0],
};
/** Velocidad máxima de la cabina (m/s): 1,7 m/s de media con arranque y frenado suaves. */
const TOP_SPEED = 3.2;

type Channel = { gain: GainNode; panner: PannerNode; buffer?: AudioBuffer; voice?: AudioBufferSourceNode };

/** Sonidos del ascensor ubicados en la cabina: puertas al abrir y cerrar, gong al llegar y zumbido del
 * motor durante el viaje, más fuerte y agudo con la velocidad. Usa Web Audio directamente: el contexto
 * se crea con el primer gesto del visitante y las grabaciones se descargan recién entonces. */
export class ElevatorAudio {
  private context: AudioContext | null = null;
  private channels = {} as Record<Sound, Channel>;
  private previous: ElevatorState = "idle";
  private lastHeight = 0;
  private point = new T.Vector3();
  private forward = new T.Vector3();
  private up = new T.Vector3();
  private turn = new T.Quaternion();

  constructor(private camera: T.Camera, private car: T.Object3D) {}

  /** Llamar desde un gesto del visitante (clic o tecla): crea o reanuda el contexto de audio. */
  unlock() {
    if (!this.context) {
      if (typeof AudioContext === "undefined") return;
      this.create(new AudioContext());
    }
    if (this.context!.state === "suspended") void this.context!.resume().catch(() => {});
  }

  update(motion: ElevatorMotion, dt: number) {
    const state = motion.state;
    const speed = dt > 0 ? Math.min(1, Math.abs(motion.height - this.lastHeight) / dt / TOP_SPEED) : 0;
    this.lastHeight = motion.height;
    if (state !== this.previous) {
      if (state === "moving") this.startTravel();
      if (this.previous === "moving") this.stop("travel", 0.35);
      if (state === "arriving") this.play("chime");
      if (state === "opening" || state === "closing") this.play("doors");
      this.previous = state;
    }
    const context = this.context;
    if (!context || context.state !== "running") return;
    this.follow(context);
    const travel = this.channels.travel.voice;
    if (state === "moving" && travel) {
      this.channels.travel.gain.gain.setTargetAtTime(VOLUME.travel * (0.35 + 0.65 * speed), context.currentTime, 0.12);
      travel.playbackRate.setTargetAtTime(0.9 + 0.12 * speed, context.currentTime, 0.12);
    }
  }

  dispose() {
    for (const name of NAMES) this.stop(name, 0);
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  private create(context: AudioContext) {
    this.context = context;
    for (const name of NAMES) {
      const gain = context.createGain();
      const panner = context.createPanner();
      panner.panningModel = "equalpower";
      panner.distanceModel = "inverse";
      panner.refDistance = 1.5;
      panner.rolloffFactor = 2.2;
      gain.gain.value = VOLUME[name];
      gain.connect(panner).connect(context.destination);
      const channel: Channel = { gain, panner };
      this.channels[name] = channel;
      void fetch(SOUNDS[name])
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          channel.buffer = buffer;
          if (name === "travel" && this.previous === "moving") this.startTravel();
        })
        .catch(() => console.warn(`No se pudo cargar el sonido del ascensor ${SOUNDS[name]}`));
    }
  }

  /** Lleva el oyente a la cámara y cada fuente a su lugar en la cabina, sin crear objetos. */
  private follow(context: AudioContext) {
    const { listener } = context;
    this.camera.getWorldPosition(this.point);
    this.camera.getWorldQuaternion(this.turn);
    const f = this.forward.set(0, 0, -1).applyQuaternion(this.turn);
    const u = this.up.set(0, 1, 0).applyQuaternion(this.turn);
    const p = this.point;
    if (listener.positionX) {
      listener.positionX.value = p.x; listener.positionY.value = p.y; listener.positionZ.value = p.z;
      listener.forwardX.value = f.x; listener.forwardY.value = f.y; listener.forwardZ.value = f.z;
      listener.upX.value = u.x; listener.upY.value = u.y; listener.upZ.value = u.z;
    } else {
      // Navegadores sin los parámetros de posición (Safari anterior a 14.1).
      listener.setPosition(p.x, p.y, p.z);
      listener.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
    }
    for (const name of NAMES) {
      const { panner } = this.channels[name];
      const [x, y, z] = PLACE[name];
      this.car.localToWorld(p.set(x, y, z));
      if (panner.positionX) {
        panner.positionX.value = p.x; panner.positionY.value = p.y; panner.positionZ.value = p.z;
      } else panner.setPosition(p.x, p.y, p.z);
    }
  }

  private voice(name: Sound, loop = false) {
    const context = this.context, channel = this.channels[name];
    if (!context || !channel?.buffer) return null;
    this.stop(name, 0);
    const source = context.createBufferSource();
    source.buffer = channel.buffer;
    source.loop = loop;
    if (loop) {
      source.loopStart = TRAVEL_LOOP.start;
      source.loopEnd = TRAVEL_LOOP.end;
    }
    source.connect(channel.gain);
    source.onended = () => {
      source.disconnect();
      if (channel.voice === source) channel.voice = undefined;
    };
    channel.voice = source;
    return source;
  }

  private play(name: "doors" | "chime") {
    const source = this.voice(name);
    if (!source) return;
    const gain = this.channels[name].gain.gain, now = this.context!.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(VOLUME[name], now);
    source.start(now);
  }

  private startTravel() {
    const source = this.voice("travel", true);
    if (!source) return;
    const gain = this.channels.travel.gain.gain, now = this.context!.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    gain.setTargetAtTime(VOLUME.travel * 0.35, now, 0.08);
    source.playbackRate.value = 0.9;
    source.start(now, TRAVEL_LOOP.start);
  }

  /** Apaga una fuente con un fundido de `time` segundos (0: en el acto). */
  private stop(name: Sound, time: number) {
    const context = this.context, channel = this.channels[name];
    const source = channel?.voice;
    if (!context || !source) return;
    channel.voice = undefined;
    const now = context.currentTime;
    if (time > 0) {
      channel.gain.gain.cancelScheduledValues(now);
      channel.gain.gain.setTargetAtTime(0, now, time / 3);
    }
    source.stop(now + time * 1.5);
  }
}
