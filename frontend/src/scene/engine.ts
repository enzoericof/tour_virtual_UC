import { CampusCats } from "./campus-cats";
import { collectSeats, occupiedSeat, type Seat } from "./seating";
import type { Player } from "../services/presence";
import * as T from "three";
import { RemotePlayers } from "./remote-players";
import { SocialPerformance } from './social-performance';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CABIN, ElevatorMotion, type ElevatorButton, type ElevatorDoor } from "./elevator";
import { ElevatorAudio } from "./elevator-audio";
import { createCampus } from "./campus";
import { EntranceDoors } from "./entrance-doors";
import { loadPlacementsInto } from "./editor-placements";
import { campusRockDepth } from "./campus-rock";
import { makeCampusSky, type CampusTheme } from "./campus-sky";
import { Walker } from "../navigation/walker";
import { pickDestination, pointerOnCanvas } from "../navigation/pick-destination";
import { places, type Place } from "../data/places";
import { nearbyInformation, type PlaceInformation } from "../data/place-information";
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
  readonly social: SocialPerformance;
  onSocialMenu = (_player: Player | null) => {};
  onInformation = (_information: PlaceInformation) => {};
  private readonly informationRay = new T.Ray();
  readonly campus = createCampus();
  readonly cats: CampusCats;
  private readonly entranceDoors = new EntranceDoors(this.campus.group);
  /** Modelos colocados con el editor 3D (solo lectura para el visitante normal). */
  readonly editorPlacements = new T.Group();
  readonly seats = collectSeats(this.campus.group);
  private seated: Seat | null = null;
  private seatReturn = new T.Vector3();
  private occupied = new Set<string>();
  private nextSeatHint = 0;
  private seatHint = document.createElement("div");
  private sun = new T.DirectionalLight(0xfff2d6, 2.4);
  private hemi = new T.HemisphereLight(0xdbeaf4, 0xb1ada0, 1.7);
  private fill = new T.DirectionalLight(0x9fc2ff, 0);
  private ambient = new T.AmbientLight(0x33465c, 0);
  private readonly sunSprite: T.Sprite;
  private readonly moonSprite: T.Sprite;
  private enhancedLighting = false;
  private lightingTheme: CampusTheme = "light";
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
  private elevatorAudio = new ElevatorAudio(this.camera, this.campus.elevator.car);
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
    this.sun.position.set(-240, 500, 240);
    this.fill.position.set(240, 240, -240);
    const celestialDirection = this.sun.position.clone().normalize();
    this.sunSprite = this.makeCelestialSprite("#fffbe8", "#ffe08a", "#ff9b3d", 180);
    this.moonSprite = this.makeCelestialSprite("#ffffff", "#e6f0ff", "#7fa8e0", 140);
    this.sunSprite.position.copy(celestialDirection).multiplyScalar(1600);
    this.moonSprite.position.copy(celestialDirection).multiplyScalar(1600);
    this.setTheme(theme);
    this.editorPlacements.name = "Colocaciones del editor 3D";
    this.scene.add(this.sun, this.hemi, this.fill, this.ambient, this.sunSprite, this.moonSprite, this.campus.group, this.editorPlacements);
    this.orbit = new OrbitControls(this.camera, this.canvas);
    this.orbit.rotateSpeed = 1.5;
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.48;
    this.orbit.minDistance = 4;
    this.orbit.maxDistance = 650;
    this.walker = new Walker(this.camera, this.canvas);
    this.walker.onCaptureError = (message) => this.onError(message);
    this.walker.setWorld(this.campus.colliders);
    this.social = new SocialPerformance(this.scene,this.camera,this.walker,this.remotePlayers,
      ()=>Boolean(this.seated)||this.elevatorPassenger||this.insideElevator(),message=>this.onError(message));
    this.cats = new CampusCats(this.walker.collisionWorld,Math.random,sphere=>this.walker.blocksDynamicSphere(sphere));
    this.scene.add(this.cats.group);
    this.entranceDoors.register(this.walker);
    this.walker.addBarrier(this.campus.boundary, () => true);
    for (const [floor, stop] of this.campus.elevator.stops.entries()) {
      this.walker.addBarrier(stop.barrier, () =>
        this.elevator.moving || this.elevator.floor !== floor || this.elevator.opening < 0.97);
      this.walker.addBarrier(stop.floor, () => !this.elevator.moving && this.elevator.floor === floor);
    }
    this.canvas.addEventListener("click", (event) => {
      if (event.button !== 0) return;
      this.elevatorAudio.unlock();
      if (this.walker.active) this.useElevator();
    });
    this.walker.onLockChange = (locked) => {
      if (!locked) this.seatHint.textContent = "";
      this.orbit.enabled = !locked && !this.walker.enabled;
      this.onMode(
        locked ? "walking" : this.walker.enabled ? "paused" : "overview",
      );
    };
    this.remotePlayers.seats = this.seats;
    this.seatHint.className = "seat-hint";
    this.seatHint.setAttribute("role", "status");
    container.append(this.seatHint);
    window.addEventListener("keydown", event => this.interactionKey(event));
    this.walker.onInteract = () => {
      const p = this.nearest();
      if (p) this.onLocation(p);
    };
    void loadPlacementsInto(this.editorPlacements).then(() => {
      this.walker.setEditorWorld(this.editorPlacements);
    });
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
      this.elevatorAudio.unlock();
      this.walker.teleport(destination);
      this.camera.lookAt(this.gaze);
      this.walker.enabled = true;
      this.walker.walk();
    });
    this.animate();
  }
  private interactionKey(event: KeyboardEvent) {
    if (!["KeyE", "KeyG", "KeyI"].includes(event.code) || event.repeat || event.ctrlKey || event.metaKey || event.altKey
      || event.isComposing || !this.walker.active || this.social.busy) return;
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable],dialog")) return;
    event.preventDefault();
    if (event.code === "KeyI") {
      const point = this.nearInformation();
      if (point) this.onInformation(point.information);
    } else if (event.code === "KeyG") {
      this.onSocialMenu(this.nearPlayer());
    } else if (this.seated) {
      this.leaveSeat();
    } else {
      this.sit();
    }
  }
  private nearInformation() {
    if (!this.walker.active || this.social.busy || this.elevatorPassenger) return null;
    const { x, y, z } = this.camera.position;
    const point = nearbyInformation(x, y, z);
    if (!point) return null;
    const [px, , pz] = point.place.position;
    this.informationRay.origin.copy(this.camera.position);
    this.informationRay.direction.set(px - x, 0, pz - z);
    const distance = this.informationRay.direction.length();
    if (distance > 0.01) {
      this.informationRay.direction.multiplyScalar(1 / distance);
      if (this.walker.obstructs(this.informationRay, distance)) return null;
    }
    return point;
  }
  private nearSeat() {
    if (this.seated || this.elevatorPassenger) return null;
    let best: Seat | null = null, distance = 1.65;
    const direction = this.camera.getWorldDirection(new T.Vector3());
    for (const seat of this.seats) {
      if (this.occupied.has(seat.id)) continue;
      const delta = seat.point.clone().sub(this.camera.position);
      if (Math.abs(delta.y + 1.05) > 0.8) continue;
      const d = Math.hypot(delta.x, delta.z);
      delta.y = 0;
      if (d >= distance || direction.dot(delta.normalize()) < 0.15) continue;
      // La línea a la altura de los ojos evita sentarse atravesando paredes.
      const target = seat.point.clone(); target.y = this.camera.position.y;
      const ray = new T.Ray(this.camera.position.clone(), target.sub(this.camera.position).normalize());
      if (this.walker.obstructs(ray, d)) continue;
      best = seat; distance = d;
    }
    return best;
  }
  sit() {
    const seat = this.nearSeat();
    if (!seat) return;
    this.seatReturn.copy(this.walker.body.end).add(new T.Vector3(0, -1.5, 0));
    this.seated = seat;
    this.camera.position.copy(seat.point).add(new T.Vector3(0, 0.75, 0));
    this.camera.lookAt(this.camera.position.clone().add(seat.forward));
  }
  private leaveSeat() {
    if (!this.seated) return;
    this.seated = null;
    this.walker.teleport(this.seatReturn);
  }
  /** El desempate por id evita que dos clientes con la misma instantánea conserven una plaza. */
  receiveSeating(players: Player[], self?: string) {
    this.social.setSelf(players.find(p=>p.id===self)??null);
    this.occupied.clear();
    for (const player of players) {
      if (player.id === self) continue;
      const seat = occupiedSeat(this.seats, player);
      if (!seat) continue;
      this.occupied.add(seat.id);
      if (this.seated?.id === seat.id && self && player.id < self) {
        this.leaveSeat();
        this.onError("Otro visitante ocupó ese lugar. Elegí otro asiento.");
      }
    }
  }
  /** Selección por mira y distancia, con oclusión por los sólidos del escenario. */
  private nearPlayer():Player|null {
    if(!this.walker.active)return null;
    const origin=this.walker.body.end;
    const direction=new T.Vector3();this.camera.getWorldDirection(direction);
    let best:Player|null=null, nearest=1.9;
    for(const player of this.remotePlayers.players){
      const feetY=origin.y-1.5;
      if(Math.abs(player.y-feetY)>=.65)continue;
      const target=new T.Vector3(player.x,player.y+1.3,player.z),delta=target.sub(origin),distance=delta.length();
      if(distance>=nearest||distance<.3)continue;
      const ray=new T.Ray(origin.clone(),delta.normalize());
      if(direction.dot(ray.direction)<.9||this.walker.obstructs(ray,distance))continue;
      nearest=distance;best=player;
    }
    return best;
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
    this.entranceDoors.update(dt,this.camera.position,this.walker.enabled);
    this.previous = now;
    if (!this.elevatorPassenger && !this.seated) this.walker.update(dt);
    if (now >= this.nextSeatHint) {
      this.nextSeatHint = now + 100;
      const available = this.walker.active ? this.nearSeat() : null;
      const information = this.nearInformation();
      const seatText = this.seated ? 'E · Levantarse' : available ? 'E · Sentarse' : '';
      const hint = !this.walker.active ? '' : this.social.busy ? 'Interacción en curso · Esc para pausar'
        : [information ? `I · Conocer la historia de ${information.place.name}` : '', seatText].filter(Boolean).join('\n');
      if (this.seatHint.textContent !== hint) this.seatHint.textContent = hint;
    }
    this.updateElevator(elapsed);
    this.social.update(dt);
    if (this.orbit.enabled) this.orbit.update();
    // Far views need depth precision for ground, paving and grass surfaces.
    const near = this.orbit.enabled && this.current === "campus"
      ? T.MathUtils.clamp(this.orbit.getDistance() / 150, 0.08, 8) : 0.08;
    if (Math.abs(this.camera.near - near) > 0.01) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
    const flightFar=Math.max(1900,this.camera.position.y+1500);
    if(Math.abs(this.camera.far-flightFar)>1){this.camera.far=flightFar;this.camera.updateProjectionMatrix();}
    this.cats.update(dt);
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
  /** Ojos dentro de la cabina o en su umbral (origen de la cabina: centro de su piso). */
  private insideElevator() {
    const point = this.campus.elevator.car.worldToLocal(this.cabinPoint.copy(this.camera.position));
    return Math.abs(point.x) < CABIN.width / 2 && point.z > -CABIN.depth / 2 - 0.3 && point.z < CABIN.depth / 2
      && point.y > 0.7 && point.y < CABIN.height + 0.1;
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
    if (!target) return;
    if (target.button.action === "close") this.elevator.close();
    else this.elevator.request(target.button.destination ?? target.floor, target.inside);
  }
  private updateElevator(dt: number) {
    const { car, carDoors, stops, directionLabels, floorLabels, cabinDisplay } = this.campus.elevator;
    const wasMoving = this.elevator.moving;
    const previousHeight = this.elevator.height;
    this.elevator.update(dt);
    this.elevatorAudio.update(this.elevator, dt);
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
    cabinDisplay.direction.material = directionMaterial;
    cabinDisplay.floor.material = floorMaterial;
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
    this.social.audio.unlock();
    if (this.current === "campus") this.campus.setDetail(true);
    if (!this.walker.enabled) {
      this.walker.teleport(this.spawn);
      this.camera.lookAt(this.gaze);
    }
    this.orbit.enabled = false;
    this.elevatorAudio.unlock();
    this.walker.walk();
  }
  overview() {
    if(this.social.busy)this.social.clear();
    this.leaveSeat();
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
    if(this.social.busy)this.social.clear();
    this.elevatorPassenger = false;
    this.pause();
    this.walker.enabled = false;
    this.orbit.enabled = false;
    this.campus.setDetail(true);
    this.leaveSeat();
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
    this.lightingTheme = theme;
    const dark = theme === "dark";
    this.scene.background = this.skies[theme] ??= makeCampusSky(theme);
    this.scene.fog = new T.Fog(dark ? "#141d36" : "#c7e0ed", 450, 1900);
    this.sunSprite.visible = !dark;
    this.moonSprite.visible = dark;
    this.applyLighting();
  }
  /** Luz cálida de alto rango con sombras suaves, relleno frío y exposición de cine. */
  setEnhancedLighting(enabled: boolean) {
    this.enhancedLighting = enabled;
    this.renderer.shadowMap.enabled = enabled;
    if (enabled) {
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      // La luz mira al origen; un cuadrado generoso cubre todo el sector sin
      // depender de la orientación de la cámara de sombras.
      const corners = [
        [campusBounds.minX, campusBounds.minZ],
        [campusBounds.minX, campusBounds.maxZ],
        [campusBounds.maxX, campusBounds.minZ],
        [campusBounds.maxX, campusBounds.maxZ],
      ] as const;
      const half = Math.max(...corners.map(([x, z]) => Math.hypot(x, z))) + 12;
      this.sun.shadow.camera.left = -half;
      this.sun.shadow.camera.right = half;
      this.sun.shadow.camera.top = half;
      this.sun.shadow.camera.bottom = -half;
      this.sun.shadow.camera.near = 100;
      this.sun.shadow.camera.far = 1300;
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.02;
      this.sun.shadow.camera.updateProjectionMatrix();
      this.renderer.toneMappingExposure = 1.05;
    } else {
      this.sun.castShadow = false;
      this.renderer.toneMappingExposure = 0.96;
    }
    this.applyLighting();
  }
  private applyLighting() {
    const dark = this.lightingTheme === "dark";
    this.sun.color.setHex(dark ? 0xdbe5ff : 0xfff2d6);
    this.hemi.color.setHex(dark ? 0xb1c6f2 : 0xdbeaf4);
    this.hemi.groundColor.setHex(dark ? 0x868bab : 0xb1ada0);
    this.sun.intensity = this.enhancedLighting
      ? (dark ? 1.9 : 3.0)
      : (dark ? 1.45 : 2.4);
    this.hemi.intensity = this.enhancedLighting
      ? (dark ? 1.8 : 2.1)
      : (dark ? 1.5 : 1.7);
    this.fill.intensity = this.enhancedLighting ? (dark ? 0.7 : 0.85) : 0;
    this.ambient.intensity = this.enhancedLighting ? (dark ? 0.3 : 0.35) : 0;
  }
  private celestialTexture(inner: string, middle: string, halo: string) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.18, middle);
    gradient.addColorStop(0.42, halo);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }
  private makeCelestialSprite(inner: string, middle: string, halo: string, scale: number) {
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map: this.celestialTexture(inner, middle, halo),
      transparent: true,
      depthWrite: false,
      fog: false,
    }));
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 1;
    return sprite;
  }
  quality(high: boolean) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.8 : 1));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }
  /** Reconstruye las colisiones de los modelos colocados con el editor 3D. */
  refreshPlacementCollisions() {
    this.walker.setEditorWorld(this.editorPlacements);
  }
  playerPose() {
    if (!this.walker.enabled) return null;
    const socialPose=this.social.pose();if(socialPose)return socialPose;
    const { x, y, z } = this.camera.position;
    if (this.seated) this.playerDirection.copy(this.seated.forward);
    else this.camera.getWorldDirection(this.playerDirection);
    return { jetpacking: !this.seated && !this.elevatorPassenger && this.walker.jetpacking, x, y: this.seated ? this.seated.point.y - 0.9 : y - 1.5, z, yaw: Math.atan2(-this.playerDirection.x, -this.playerDirection.z) };
  }
  get position() {
    return this.camera.position;
  }
  get location() {
    return this.current;
  }
}
