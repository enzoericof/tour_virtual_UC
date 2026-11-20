import * as T from "three";

/** Cabina OTIS de 8 personas / 630 kg (placa de la botonera): 1,1 × 1,4 m, proporción que confirma
 * la guarda de granito del piso enderezado. Alto interior estimado. */
export const CABIN = { width: 1.1, depth: 1.4, height: 2.25 } as const;
/** Vano libre de la puerta y sus montantes, medidos sobre la foto enderezada del frente de planta baja
 * (puerta de 2 m de alto estimada; el ancho sale de la proporción de la foto). Puerta telescópica de
 * dos hojas que se recogen hacia +x, del lado del armario de maniobra. */
export const DOOR = { width: 0.82, height: 2, jambLeft: 0.29, jambRight: 0.205, header: 0.226 } as const;
/** Tiempos: recorrido de las puertas (grabación «Ascensor abriendose»: del arranque al golpe de tope),
 * pausa entre la llegada y la apertura (gong) y espera con las puertas abiertas. */
export const DOOR_TIME = 2.3;
export const ARRIVAL_PAUSE = 0.6;
export const OPEN_TIME = 10;

export interface ElevatorButton {
  mesh: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
  /** Piso de destino; null: el piso donde está el botón (o, en la cabina, abrir las puertas). */
  destination: number | null;
  /** Botón de cerrar puertas de la botonera. */
  action?: "close";
}

/** Hoja corrediza: `offset` es su recorrido en x al abrirse por completo. */
export interface ElevatorDoor {
  mesh: T.Object3D;
  closedX: number;
  offset: number;
}

export interface ElevatorStop {
  buttons: ElevatorButton[];
  doors: ElevatorDoor[];
  barrier: T.Mesh;
  /** Piso, paredes y techo de la cabina en este nivel: solo bloquean con la cabina detenida aquí. */
  floor: T.Mesh;
  directionDisplay: T.Mesh;
  floorDisplay: T.Mesh;
}

export interface ElevatorModel {
  stops: ElevatorStop[];
  car: T.Group;
  carDoors: ElevatorDoor[];
  carButtons: ElevatorButton[];
  /** Indicador de la botonera de la cabina. */
  cabinDisplay: { direction: T.Mesh; floor: T.Mesh };
  directionLabels: Record<"idle" | "up" | "down", T.Material>;
  floorLabels: T.Material[];
}

export type ElevatorState = "idle" | "opening" | "open" | "closing" | "moving" | "arriving";

/** Estado local de una sola cabina. Las llamadas esperan su turno, incluso durante un viaje. */
export class ElevatorMotion {
  floor = 0;
  height = 0;
  opening = 0;
  private phase: ElevatorState = "idle";
  private elapsed = 0;
  private queue: number[] = [];
  private destination = 0;
  private duration = 1;

  constructor(private floorHeight: number) {}

  get state() { return this.phase; }

  get moving() { return this.phase === "moving"; }

  get direction() {
    if (!this.moving) return "idle";
    return this.destination > this.floor ? "up" : "down";
  }

  get displayedFloor() { return Math.round(this.height / this.floorHeight); }

  request(floor: number, fromCabin = false) {
    if (!this.moving && floor === this.floor) {
      if (this.phase === "arriving") return;
      this.phase = this.opening >= 1 ? "open" : "opening";
      this.elapsed = 0;
      return;
    }
    if ((this.moving && floor === this.destination) || this.queue.includes(floor)) return;
    this.queue.push(floor);
    if (fromCabin && this.phase !== "idle" && !this.moving && this.phase !== "arriving") this.phase = "closing";
  }

  /** Botón de cerrar: adelanta el cierre si las puertas están abiertas o abriéndose. */
  close() {
    if (this.phase === "open" || this.phase === "opening") this.phase = "closing";
  }

  update(dt: number) {
    switch (this.phase) {
      case "idle": {
        const next = this.queue.shift();
        if (next === undefined) return;
        this.destination = next;
        if (next === this.floor) {
          this.phase = "opening";
        } else {
          this.elapsed = 0;
          this.duration = 1.1 + Math.abs(next - this.floor) * this.floorHeight / 1.7;
          this.phase = "moving";
        }
        break;
      }
      case "opening":
        this.opening = Math.min(1, this.opening + dt / DOOR_TIME);
        if (this.opening === 1) {
          this.phase = "open";
          this.elapsed = 0;
        }
        break;
      case "open":
        this.elapsed += dt;
        if (this.elapsed >= OPEN_TIME) this.phase = "closing";
        break;
      case "closing":
        this.opening = Math.max(0, this.opening - dt / DOOR_TIME);
        if (this.opening === 0) this.phase = "idle";
        break;
      case "moving": {
        this.elapsed += dt;
        const t = Math.min(1, this.elapsed / this.duration);
        // Quintic smoothstep: arranque y frenado graduales.
        const progress = t * t * t * (10 + t * (-15 + 6 * t));
        this.height = T.MathUtils.lerp(this.floor, this.destination, progress) * this.floorHeight;
        if (t === 1) {
          this.floor = this.destination;
          this.phase = "arriving";
          this.elapsed = 0;
        }
        break;
      }
      case "arriving":
        this.elapsed += dt;
        if (this.elapsed >= ARRIVAL_PAUSE) this.phase = "opening";
        break;
    }
  }
}

function canvasTexture(canvas: HTMLCanvasElement) {
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return map;
}

/** Segmentos encendidos (a-g) de cada carácter del indicador. La B de «PB» se ve como un 8, igual
 * que en el indicador real de planta baja. */
const SEGMENTS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg",
  "7": "abc", "8": "abcdefg", "9": "abcdfg", P: "abefg", B: "abcdefg",
};

/** Indicador de siete segmentos rojos sobre vidrio oscuro, como los de OTIS de la cabina y del palier. */
export function segmentDisplay(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#120606";
  ctx.fillRect(0, 0, 128, 64);
  const chars = [...text];
  const w = 30, h = 48, gap = 12, stroke = 6;
  let x = (128 - (chars.length * w + (chars.length - 1) * gap)) / 2;
  const y = 8;
  for (const char of chars) {
    const on = SEGMENTS[char] ?? "";
    const bars: Record<string, [number, number, number, number]> = {
      a: [x + 3, y, w - 6, stroke], g: [x + 3, y + h / 2 - stroke / 2, w - 6, stroke], d: [x + 3, y + h - stroke, w - 6, stroke],
      f: [x, y + 3, stroke, h / 2 - 4], b: [x + w - stroke, y + 3, stroke, h / 2 - 4],
      e: [x, y + h / 2 + 1, stroke, h / 2 - 4], c: [x + w - stroke, y + h / 2 + 1, stroke, h / 2 - 4],
    };
    for (const [name, [bx, by, bw, bh]] of Object.entries(bars)) {
      ctx.fillStyle = on.includes(name) ? "#ff3a2c" : "#2a0d0b";
      ctx.fillRect(bx, by, bw, bh);
    }
    x += w + gap;
  }
  return new T.MeshBasicMaterial({ map: canvasTexture(canvas), toneMapped: false });
}

/** Flecha de dirección roja (triángulo con su base), apagada cuando la cabina está quieta. */
export function arrowDisplay(direction: "idle" | "up" | "down") {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#120606";
  ctx.fillRect(0, 0, 64, 96);
  ctx.fillStyle = direction === "idle" ? "#2a0d0b" : "#ff3a2c";
  const flip = direction === "down" ? -1 : 1;
  const cy = 48, tip = cy - flip * 34, base = cy + flip * 6, tail = cy + flip * 34;
  ctx.beginPath();
  ctx.moveTo(32, tip);
  ctx.lineTo(56, base);
  ctx.lineTo(8, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(22, Math.min(base, tail), 20, Math.abs(tail - base));
  return new T.MeshBasicMaterial({ map: canvasTexture(canvas), toneMapped: false });
}

/** Cara de un pulsador redondo de acero con su leyenda. */
export function buttonFace(text: string, ring = "#9b9f9f") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#4b4f50";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9cccb";
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2e2f";
  ctx.font = `bold ${text.length > 1 ? 44 : 58}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 67);
  return new T.MeshStandardMaterial({ map: canvasTexture(canvas), metalness: 0.35, roughness: 0.4 });
}
