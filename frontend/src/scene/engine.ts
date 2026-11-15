import * as T from "three";
import { RemotePlayers } from "./remote-players";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ElevatorMotion, type ElevatorButton, type ElevatorDoor } from "./elevator";
import { createCampus } from "./campus";
import { loadPlacementsInto } from "./editor-placements";
import { campusRockDepth } from "./campus-rock";
import { makeCampusSky, type CampusTheme } from "./campus-sky";
import { Walker } from "../navigation/walker";
import { pickDestination, pointerOnCanvas } from "../navigation/pick-destination";
import { places, type Place } from "../data/places";
import { campusBounds, facultyToWorld, insidePolygon, layout } from "../data/campus-geometry";
import { facultyVisitTargets, FLOOR_HEIGHT } from "../data/faculty-blueprint";
import { annexVisitTargets } from "../data/faculty-annexes";

export type TourMode = "overview" | "walking" | "paused";

export class TourEngine {
  readonly scene = new T.Scene();
  readonly remotePlayers = new RemotePlayers(this.scene);
  private playerDirection = new T.Vector3();
  readonly camera = new T.PerspectiveCamera(52, 1, 0.08, 1900);
  readonly renderer: T.WebGLRenderer;
  readonly orbit: OrbitControls;
  readonly walker: Walker;
  readonly campus = createCampus();
  /** Modelos colocados con el editor 3D (solo lectura para el visitante normal). */
  readonly editorPlacements = new T.Group();
  private sun = new T.DirectionalLight(0xfff2d6, 2.4);
  private hemi = new T.HemisphereLight(0xdbeaf4, 0xb1ada0, 1.7);
  private readonly skies: Partial<Record<CampusTheme, T.CanvasTexture>> = {};
  private previous = performance.now();
  private frame = 0;
  private nextVisitPosition = 0;
  private current = "campus";
  private spawn = new T.Vector3(...places.find((p) => p.id === "acceso")!.position);
  /** Punto al que mira el visitante al aparecer en `spawn`. */
  private gaze = this.lookTarget("acceso", this.spawn);
  private canvas: HTMLCanvasElement;
  private elevatorRay = new T.Raycaster();
  private elevatorCenter = new T.Vector2();
  private elevatorFocus: ElevatorButton | null = null;
  private elevator = new ElevatorMotion(FLOOR_HEIGHT);
  private elevatorPassenger = false;
  private cabinPoint = new T.Vector3();
  onMode = (_mode: TourMode) => {};
  onLocation = (_place: Place | null) => {};
  onVisitPosition = (_now: number) => {};
  onStats = (_fps: number) => {};
  onError = (_message: string) => {};
  constructor(container: HTMLElement, theme: CampusTheme = "light") {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      reversedDepthBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute("aria-label", "Escenario 3D del campus");
    container.append(this.canvas);
    this.setTheme(theme);
    this.sun.position.set(-240, 500, 240);
    this.editorPlacements.name = "Colocaciones del editor 3D";
    this.scene.add(this.sun, this.hemi, this.campus.group, this.editorPlacements);
    void loadPlacementsInto(this.editorPlacements);
    this.orbit = new OrbitControls(this.camera, this.canvas);
    this.orbit.rotateSpeed = 1.5;
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.48;
    this.orbit.minDistance = 4;
    this.orbit.maxDistance = 650;
    this.walker = new Walker(this.camera, this.canvas);
    this.walker.onCaptureError = (message) => this.onError(message);
    this.walker.setWorld(this.campus.colliders);
    this.walker.addBarrier(this.campus.boundary, () => true);
    for (const [floor, stop] of this.campus.elevator.stops.entries()) {
      this.walker.addBarrier(stop.barrier, () =>
        this.elevator.moving || this.elevator.floor !== floor || this.elevator.opening < 0.97);
      this.walker.addBarrier(stop.floor, () => !this.elevator.moving && this.elevator.floor === floor);
    }
    this.canvas.addEventListener("click", (event) => {
      if (event.button === 0 && this.walker.active) this.useElevator();
    });
    this.walker.onLockChange = (locked) => {
      this.orbit.enabled = !locked && !this.walker.enabled;
      this.onMode(
        locked ? "walking" : this.walker.enabled ? "paused" : "overview",
      );
    };
    this.walker.onInteract = () => {
      const p = this.nearest();
      if (p) this.onLocation(p);
    };
    window.addEventListener("resize", () => this.resize(container));
    this.resize(container);
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.onError(
        "El navegador perdió el contexto gráfico. Recargá la página para continuar.",
      );
    });
    let press: { x: number; y: number; id: number; time: number; dragged: boolean } | null = null;
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !event.isPrimary || this.walker.enabled) return;
      press = { x: event.clientX, y: event.clientY, id: event.pointerId, time: performance.now(), dragged: false };
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) press.dragged = true;
    });
    this.canvas.addEventListener("pointercancel", () => { press = null; });
    this.canvas.addEventListener("pointerup", (event) => {
      const start = press; press = null;
      if (!start || start.id !== event.pointerId || start.dragged || this.walker.enabled
        || performance.now() - start.time > 700
        || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
      const ray = new T.Raycaster();
      ray.far = this.camera.far;
      ray.setFromCamera(pointerOnCanvas(event.clientX, event.clientY, this.canvas.getBoundingClientRect()), this.camera);
      const destination = pickDestination(ray, this.campus.colliders,
        (feet) => insidePolygon([feet.x, feet.z], layout.boundary) && this.walker.canStandAt(feet));
      if (!destination) return;
      const direction = this.camera.getWorldDirection(new T.Vector3()); direction.y = 0;
      if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
      this.spawn.copy(destination);
      this.gaze.copy(destination).addScaledVector(direction.normalize(), 8); this.gaze.y += 1.5;
      this.campus.setDetail(true);
      this.orbit.enabled = false;
      this.walker.teleport(destination);
      this.camera.lookAt(this.gaze);
      this.walker.enabled = true;
      this.walker.walk();
    });
    this.animate();
  }
  private resize(container: HTMLElement) {
    const { width, height } = container.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  private animate = () => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const elapsed = (now - this.previous) / 1000;
    const dt = Math.min(elapsed, 0.05);
    this.previous = now;
    if (!this.elevatorPassenger) this.walker.update(dt);
    this.updateElevator(elapsed);
    if (this.orbit.enabled) this.orbit.update();
    // Far views need depth precision for ground, paving and grass surfaces.
    const near = this.orbit.enabled && this.current === "campus"
      ? T.MathUtils.clamp(this.orbit.getDistance() / 150, 0.08, 8) : 0.08;
    if (Math.abs(this.camera.near - near) > 0.01) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
    this.remotePlayers.update(dt);
    this.renderer.render(this.scene, this.camera);
    if (this.walker.enabled && now >= this.nextVisitPosition) {
      this.nextVisitPosition = now + 100;
      this.onVisitPosition(now);
    }
    this.frame++;
    if (this.frame % 45 === 0) {
      this.onStats(Math.round(1 / Math.max(0.001, dt)));
      if (this.walker.active) this.onLocation(this.nearest());
    }
  };
  private insideElevator() {
    const point = this.campus.elevator.car.worldToLocal(this.cabinPoint.copy(this.camera.position));
    return Math.abs(point.x) < 1.05 && point.z > -1.19 && point.z < 1.11 && point.y > 0.7 && point.y < 2.33;
  }
  private elevatorTarget() {
    if (!this.walker.active) return null;
    this.camera.updateMatrixWorld();
    this.elevatorRay.setFromCamera(this.elevatorCenter, this.camera);
    this.elevatorRay.far = 2.6;
    const { carButtons, stops } = this.campus.elevator;
    const inside = this.insideElevator();
    const floor = Math.round((this.camera.position.y - 1.5) / FLOOR_HEIGHT);
    const buttons = inside ? carButtons : stops[floor]?.buttons;
    if (!buttons || (inside && this.elevator.moving)) return null;
    for (const button of buttons) {
      const hit = this.elevatorRay.intersectObject(button.mesh, false)[0];
      if (hit && !this.walker.obstructs(this.elevatorRay.ray, hit.distance)) return { floor, button, inside };
    }
    return null;
  }
  private useElevator() {
    const target = this.elevatorTarget();
    if (target) this.elevator.request(target.button.destination ?? target.floor, target.inside);
  }
  private updateElevator(dt: number) {
    const { car, carDoors, stops, directionLabels, floorLabels } = this.campus.elevator;
    const wasMoving = this.elevator.moving;
    const previousHeight = this.elevator.height;
    this.elevator.update(dt);
    if (!wasMoving && this.elevator.moving) {
      this.elevatorPassenger = this.walker.enabled && this.insideElevator();
    }
    if (car.position.y !== this.elevator.height) {
      car.position.y = this.elevator.height;
      car.updateWorldMatrix(true, true);
    }
    if (this.elevatorPassenger) {
      this.walker.moveWithPlatform(this.elevator.height - previousHeight);
      if (!this.elevator.moving) this.elevatorPassenger = false;
    }
    const slide = (doors: ElevatorDoor[], opening: number) => {
      for (const door of doors) door.mesh.position.x = door.closedX + door.offset * opening;
    };
    slide(carDoors, this.elevator.opening);
    const directionMaterial = directionLabels[this.elevator.direction];
    const floorMaterial = floorLabels[this.elevator.displayedFloor];
    for (const [floor, stop] of stops.entries()) {
      stop.directionDisplay.material = directionMaterial;
      stop.floorDisplay.material = floorMaterial;
      slide(stop.doors, floor === this.elevator.floor ? this.elevator.opening : 0);
    }
    const next = this.elevatorTarget()?.button ?? null;
    if (next === this.elevatorFocus) return;
    this.elevatorFocus?.mesh.material.emissive.setHex(0);
    next?.mesh.material.emissive.setHex(0x93702b);
    this.elevatorFocus = next;
  }
  nearest() {
    let best: Place | null = null;
    let distance = 5;
    for (const p of places) {
      const d = this.camera.position.distanceTo(
        new T.Vector3(...p.position).add(new T.Vector3(0, 1.5, 0)),
      );
      if (d < distance) {
        distance = d;
        best = p;
      }
    }
    return best;
  }
  private lookTarget(placeId: string, spawn: T.Vector3) {
    const target = facultyVisitTargets[placeId] ?? annexVisitTargets[placeId];
    return target ? new T.Vector3(...facultyToWorld(target)) : spawn.clone().add(new T.Vector3(-8, 1.5, -3));
  }
  startWalking() {
    if (this.current === "campus") this.campus.setDetail(true);
    if (!this.walker.enabled) {
      this.walker.teleport(this.spawn);
      this.camera.lookAt(this.gaze);
    }
    this.orbit.enabled = false;
    this.walker.walk();
  }
  overview() {
    this.elevatorPassenger = false;
    this.walker.pause();
    this.walker.enabled = false;
    this.orbit.enabled = true;
    this.campus.setDetail(true);
    this.orbit.maxDistance = 650;
    const focus = new T.Vector3((campusBounds.minX + campusBounds.maxX) / 2, -campusRockDepth * 0.25,
      (campusBounds.minZ + campusBounds.maxZ) / 2);
    const view = new T.Vector3(-0.44, 0.73, -1).normalize();
    const vertical = T.MathUtils.degToRad(this.camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect);
    // Encadra el contorno completo en el tamaño actual de la ventana.
    const right = new T.Vector3().crossVectors(this.camera.up, view).normalize();
    const up = new T.Vector3().crossVectors(view, right);
    const offset = new T.Vector3();
    let distance = 0;
    for (const [x, z] of layout.boundary) {
      offset.set(x, 8, z).sub(focus);
      const extent = Math.max(Math.abs(offset.dot(right)) / Math.tan(horizontal),
        Math.abs(offset.dot(up)) / Math.tan(vertical));
      distance = Math.max(distance, offset.dot(view) + extent);
    }
    offset.set(-15, -campusRockDepth - 25 - focus.y, 7);
    distance = Math.max(distance, offset.dot(view) + Math.abs(offset.dot(up)) / Math.tan(vertical));
    this.orbit.target.copy(focus);
    this.camera.position.copy(focus).addScaledVector(view, distance * 1.13);
    this.orbit.update();
    this.onMode("overview");
  }
  pause() {
    this.walker.pause();
  }
  go(place?: Place) {
    this.elevatorPassenger = false;
    this.pause();
    this.walker.enabled = false;
    this.orbit.enabled = false;
    this.campus.setDetail(true);
    this.spawn = new T.Vector3(...(place ?? places.find((p) => p.id === "acceso")!).position);
    this.gaze = this.lookTarget(place?.id ?? "acceso", this.spawn);
    if (place) {
      this.walker.teleport(this.spawn);
      this.walker.enabled = true;
      this.camera.lookAt(this.gaze);
      this.onMode("paused");
    } else this.overview();
  }
  setTheme(theme: CampusTheme) {
    const dark = theme === "dark";
    this.scene.background = this.skies[theme] ??= makeCampusSky(theme);
    this.scene.fog = new T.Fog(dark ? "#141d36" : "#c7e0ed", 450, 1900);
    this.sun.color.setHex(dark ? 0xdbe5ff : 0xfff2d6);
    this.sun.intensity = dark ? 1.45 : 2.4;
    this.hemi.color.setHex(dark ? 0xb1c6f2 : 0xdbeaf4);
    this.hemi.groundColor.setHex(dark ? 0x868bab : 0xb1ada0);
    this.hemi.intensity = dark ? 1.5 : 1.7;
  }
  quality(high: boolean) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.8 : 1));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }
  playerPose() {
    if (!this.walker.enabled) return null;
    const { x, y, z } = this.camera.position;
    this.camera.getWorldDirection(this.playerDirection);
    return { x, y: y - 1.5, z, yaw: Math.atan2(-this.playerDirection.x, -this.playerDirection.z) };
  }
  get position() {
    return this.camera.position;
  }
  get location() {
    return this.current;
  }
}
