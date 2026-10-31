import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCampus } from "./campus";
import { Walker } from "../navigation/walker";
import { places, type Place } from "../data/places";
import { campusBounds, campusCenter, facultyToWorld } from "../data/campus-geometry";
import { facultyVisitTargets } from "../data/faculty-blueprint";
export type CampusView = "campus" | "plan" | "faculty" | "faculty-plan";
export class TourEngine {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(52, 1, 0.08, 2600);
  readonly renderer: T.WebGLRenderer;
  readonly orbit: OrbitControls;
  readonly walker: Walker;
  readonly campus = createCampus();
  private scan: T.Group | null = null;
  private loading = 0;
  private sun = new T.DirectionalLight(0xfff2d6, 2.4);
  private hemi = new T.HemisphereLight(0xdbeaf4, 0xb1ada0, 1.7);
  private previous = performance.now();
  private frame = 0;
  private current = "campus";
  private spawn = new T.Vector3(...places.find((p) => p.id === "acceso")!.position);
  private canvas: HTMLCanvasElement;
  onProgress = (_text: string, _percent: number) => {};
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
    this.scene.background = new T.Color("#d4e2e3");
    this.scene.fog = new T.Fog("#d4e2e3", 1200, 2500);
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
    if (this.current !== "campus")
      return places.find((p) => p.scan === this.current) ?? null;
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
  startWalking() {
    if (this.current === "campus") this.campus.setDetail(true);
    if (!this.walker.enabled) {
      this.walker.teleport(this.spawn);
      this.camera.lookAt(this.spawn.clone().add(new T.Vector3(-10, 1.5, -2)));
    }
    this.orbit.enabled = false;
    this.walker.walk();
  }
  overview(mode: CampusView = "campus") {
    this.walker.pause();
    this.walker.enabled = false;
    this.orbit.enabled = true;
    if (this.current === "campus") {
      this.campus.setDetail(mode === "faculty" || mode === "faculty-plan");
      this.orbit.maxDistance = 650;
      if (mode === "faculty-plan") {
        const focus = new T.Vector3(...facultyToWorld([22, 0, 9]));
        this.orbit.target.copy(focus);
        this.camera.position.copy(focus).add(new T.Vector3(0, 190, 0.01));
      } else if (mode === "faculty") {
        const focus = new T.Vector3(...facultyToWorld([0, 1, 10]));
        this.orbit.target.copy(focus);
        this.camera.position.copy(focus).add(new T.Vector3(-100, 66, 0));
      } else {
        this.orbit.target.set(campusCenter[0], 0, campusCenter[1]);
        const span = Math.max(campusBounds.maxZ - campusBounds.minZ, (campusBounds.maxX - campusBounds.minX) / this.camera.aspect);
        const fit = span / (2 * Math.tan(T.MathUtils.degToRad(this.camera.fov / 2))) * 1.5;
        if (mode === "plan") {
          // Leave room above the campus for the persistent view controls.
          const focusZ = campusCenter[1] - span * 0.08;
          this.orbit.target.z = focusZ;
          this.camera.position.set(campusCenter[0], fit, focusZ + 0.01);
        } else this.camera.position.copy(this.orbit.target).add(new T.Vector3(fit * 0.40, fit * 0.54, fit * 0.63));
      }
    } else if (this.scan) {
      const b = new T.Box3().setFromObject(this.scan),
        size = b.getSize(new T.Vector3()),
        center = b.getCenter(new T.Vector3());
      this.orbit.target.copy(center);
      const d = Math.max(size.x, size.z) * 0.8;
      this.camera.position
        .copy(center)
        .add(new T.Vector3(d * 0.75, d * 0.65, d));
      this.orbit.maxDistance = 160;
    }
    this.orbit.update();
    this.onMode("overview");
  }
  pause() {
    this.walker.pause();
  }
  async go(place?: Place) {
    const request = ++this.loading;
    this.onProgress("", 1);
    this.pause();
    this.walker.enabled = false;
    this.orbit.enabled = false;
    if (!place?.scan) {
      this.disposeScan();
      this.current = "campus";
      this.campus.group.visible = true;
      this.sun.visible = this.hemi.visible = true;
      this.scene.background = new T.Color("#d4e2e3");
      this.scene.fog = new T.Fog("#d4e2e3", 1200, 2500);
      this.campus.setDetail(Boolean(place));
      this.walker.setWorld(this.campus.colliders);
      this.spawn = place
        ? new T.Vector3(...place.position).add(new T.Vector3(0, 0.15, 0))
        : new T.Vector3(...places.find((p) => p.id === "acceso")!.position);
      if (place) {
        this.walker.teleport(this.spawn);
        this.walker.enabled = true;
        const target = facultyVisitTargets[place.id];
        this.camera.lookAt(target ? new T.Vector3(...facultyToWorld(target)) : this.spawn.clone().add(new T.Vector3(-8, 1.5, -3)));
        this.onMode("paused");
      } else this.overview();
      return;
    }
    this.onProgress(`Cargando ${place.name.toLowerCase()}…`, 0);
    try {
      const gltf = await new GLTFLoader().loadAsync(
        `/assets/scans/${place.scan}.glb`,
        (e) => {
          if (request === this.loading)
            this.onProgress(
              `Cargando ${place.name.toLowerCase()}…`,
              e.total ? e.loaded / e.total : 0.3,
            );
        },
      );
      if (request !== this.loading) {
        this.disposeObject(gltf.scene);
        return;
      }
      this.disposeScan();
      this.scan = gltf.scene;
      this.scan.traverse((o) => {
        if (o instanceof T.Mesh) {
          const old = Array.isArray(o.material) ? o.material[0] : o.material;
          const mat = new T.MeshBasicMaterial({
            map: old.map,
            side: T.DoubleSide,
          });
          o.material = mat;
          old.dispose();
          o.frustumCulled = true;
        }
      });
      this.scan.updateMatrixWorld(true);
      this.scene.add(this.scan);
      this.campus.group.visible = false;
      this.sun.visible = this.hemi.visible = false;
      this.scene.background = new T.Color("#b7c7cd");
      this.scene.fog = null;
      this.current = place.scan;
      this.onProgress("Preparando colisiones y recorrido…", 0.96);
      await new Promise((r) => setTimeout(r, 30));
      if (request !== this.loading) return;
      this.walker.setWorld(this.scan);
      this.spawn = this.walker.findSpawn(this.scan);
      this.walker.teleport(this.spawn);
      this.camera.lookAt(
        this.spawn
          .clone()
          .add(
            new T.Vector3(
              place.scan === "pasillo-p3" ? -10 : 0,
              1.5,
              place.scan === "pasillo-p3" ? 0 : 8,
            ),
          ),
      );
      this.walker.enabled = true;
      this.onProgress("", 1);
      this.onMode("paused");
    } catch (error) {
      if (request !== this.loading) return;
      this.onProgress("", 1);
      this.onError(
        `No se pudo cargar el escaneo. Verificá que los archivos de recursos estén instalados. ${error instanceof Error ? error.message : ""}`,
      );
      await this.go();
    }
  }
  private disposeObject(root: T.Object3D) {
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) {
          if ("map" in m && (m as T.MeshBasicMaterial).map)
            (m as T.MeshBasicMaterial).map!.dispose();
          m.dispose();
        }
      }
    });
  }
  private disposeScan() {
    if (!this.scan) return;
    this.scene.remove(this.scan);
    this.disposeObject(this.scan);
    this.scan = null;
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
