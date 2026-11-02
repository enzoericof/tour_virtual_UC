import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCampus } from "./campus";
import { Walker } from "../navigation/walker";
import { places, type Place } from "../data/places";
import { campusCenter, facultyToWorld } from "../data/campus-geometry";
import { facultyVisitTargets } from "../data/faculty-blueprint";
export class TourEngine {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(52, 1, 0.08, 2600);
  readonly renderer: T.WebGLRenderer;
  readonly orbit: OrbitControls;
  readonly walker: Walker;
  readonly campus = createCampus();
  private sun = new T.DirectionalLight(0xfff2d6, 2.4);
  private hemi = new T.HemisphereLight(0xdbeaf4, 0xb1ada0, 1.7);
  private previous = performance.now();
  private frame = 0;
  private current = "campus";
  private spawn = new T.Vector3(...places.find((p) => p.id === "acceso")!.position);
  /** Punto al que mira el visitante al aparecer en `spawn`. */
  private gaze = this.lookTarget("acceso", this.spawn);
  private canvas: HTMLCanvasElement;
  onMode = (_mode: string) => {};
  onLocation = (_place: Place | null) => {};
  onStats = (_fps: number) => {};
  onError = (_message: string) => {};
  constructor(container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute("aria-label", "Escenario 3D del campus");
    container.append(this.canvas);
    // Cielo envolvente sin descargas; el horizonte comparte color con la bruma.
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const skyContext = skyCanvas.getContext("2d")!;
    const skyGradient = skyContext.createLinearGradient(0, 0, 0, 256);
    skyGradient.addColorStop(0, "#68a9df");
    skyGradient.addColorStop(0.48, "#c7e0ed");
    skyGradient.addColorStop(1, "#c7e0ed");
    skyContext.fillStyle = skyGradient;
    skyContext.fillRect(0, 0, 16, 256);
    const sky = new T.CanvasTexture(skyCanvas);
    sky.colorSpace = T.SRGBColorSpace;
    sky.mapping = T.EquirectangularReflectionMapping;
    this.scene.background = sky;
    this.scene.fog = new T.Fog("#c7e0ed", 450, 1900);
    this.sun.position.set(-240, 500, 240);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -450,
      right: 450,
      top: 450,
      bottom: -450,
      near: 0.5,
      far: 1300,
    });
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun, this.hemi, this.campus.group);
    this.orbit = new OrbitControls(this.camera, this.canvas);
    this.orbit.rotateSpeed = 1.5;
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.48;
    this.orbit.minDistance = 4;
    this.orbit.maxDistance = 650;
    this.orbit.target.set(campusCenter[0], 0, campusCenter[1]);
    this.camera.position.set(campusCenter[0] + 480, 640, campusCenter[1] + 760);
    this.orbit.update();
    this.walker = new Walker(this.camera, this.canvas);
    this.walker.setWorld(this.campus.colliders);
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
    this.canvas.addEventListener("dblclick", () => {
      if (!this.walker.enabled) this.startWalking();
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
    const dt = Math.min((now - this.previous) / 1000, 0.05);
    this.previous = now;
    this.walker.update(dt);
    if (this.orbit.enabled) this.orbit.update();
    // Far views need depth precision for ground, paving and grass surfaces.
    const near = this.orbit.enabled && this.current === "campus"
      ? T.MathUtils.clamp(this.orbit.getDistance() / 150, 0.08, 8) : 0.08;
    if (Math.abs(this.camera.near - near) > 0.01) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.camera);
    this.frame++;
    if (this.frame % 45 === 0) {
      this.onStats(Math.round(1 / Math.max(0.001, dt)));
      if (this.walker.active) this.onLocation(this.nearest());
    }
  };
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
    const target = facultyVisitTargets[placeId];
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
    this.walker.pause();
    this.walker.enabled = false;
    this.orbit.enabled = true;
    this.campus.setDetail(true);
    this.orbit.maxDistance = 650;
    // Una sola vista general, compartida por el inicio y el regreso del recorrido.
    const focus = new T.Vector3(...facultyToWorld([-5, 6, -1]));
    this.orbit.target.copy(focus);
    this.camera.position.copy(focus).add(new T.Vector3(-27, 24, -62));
    this.orbit.update();
    this.onMode("overview");
  }
  pause() {
    this.walker.pause();
  }
  async go(place?: Place) {
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
  quality(high: boolean) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.8 : 1));
    this.renderer.shadowMap.enabled = high;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }
  get position() {
    return this.camera.position;
  }
  get location() {
    return this.current;
  }
}
