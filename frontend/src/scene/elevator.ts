import * as T from "three";

export interface ElevatorButton {
  mesh: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
  destination: number | null;
}

export interface ElevatorDoor {
  mesh: T.Mesh;
  closedX: number;
  offset: number;
}

export interface ElevatorStop {
  buttons: ElevatorButton[];
  doors: ElevatorDoor[];
  barrier: T.Mesh;
  floor: T.Mesh;
  directionDisplay: T.Mesh;
  floorDisplay: T.Mesh;
}

export interface ElevatorModel {
  stops: ElevatorStop[];
  car: T.Group;
  carDoors: ElevatorDoor[];
  carButtons: ElevatorButton[];
  directionLabels: Record<"idle" | "up" | "down", T.Material>;
  floorLabels: T.Material[];
}

/** Estado local de una sola cabina. Las llamadas esperan su turno, incluso durante un viaje. */
export class ElevatorMotion {
  floor = 0;
  height = 0;
  opening = 0;
  private phase: "idle" | "opening" | "open" | "closing" | "moving" = "idle";
  private elapsed = 0;
  private queue: number[] = [];
  private destination = 0;
  private duration = 1;

  constructor(private floorHeight: number) {}

  get moving() { return this.phase === "moving"; }

  get direction() {
    if (!this.moving) return "idle";
    return this.destination > this.floor ? "up" : "down";
  }

  get displayedFloor() { return Math.round(this.height / this.floorHeight); }

  request(floor: number, fromCabin = false) {
    if (!this.moving && floor === this.floor) {
      this.phase = this.opening >= 1 ? "open" : "opening";
      this.elapsed = 0;
      return;
    }
    if ((this.moving && floor === this.destination) || this.queue.includes(floor)) return;
    this.queue.push(floor);
    if (fromCabin && this.phase !== "idle" && !this.moving) this.phase = "closing";
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
        this.opening = Math.min(1, this.opening + dt / 0.65);
        if (this.opening === 1) {
          this.phase = "open";
          this.elapsed = 0;
        }
        break;
      case "open":
        this.elapsed += dt;
        if (this.elapsed >= 10) this.phase = "closing";
        break;
      case "closing":
        this.opening = Math.max(0, this.opening - dt / 0.65);
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
          this.phase = "opening";
        }
        break;
      }
    }
  }
}

/** Acero cepillado con vetas horizontales y variación suave en altura. */
export function brushedSteel() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < canvas.height; y++) {
    const tone = Math.round(157 + Math.sin(y * 0.035) * 17 + Math.sin(y * 2.41) * 5);
    ctx.fillStyle = `rgb(${tone + 4},${tone},${tone - 6})`;
    ctx.fillRect(0, y, 128, 1);
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({ map, metalness: 0.42, roughness: 0.39 });
}

export function elevatorLabel(text: string, color = "#f1f0e9", background = "#323435") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = color;
  ctx.font = "bold 62px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 66);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({ map, roughness: 0.58 });
}
