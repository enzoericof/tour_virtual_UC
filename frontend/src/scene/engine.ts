import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createCampus } from "./campus";
import { Walker } from "../navigation/walker";
import { places, type Place } from "../data/places";
export class TourEngine {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(52, 1, 0.08, 500);
  readonly renderer: T.WebGLRenderer;
  readonly orbit: OrbitControls;
  readonly walker: Walker;
  readonly campus = createCampus();
  private scan: T.Group | null = null;
  private loading = 0;
  private sun = new T.DirectionalLight(0xfff2d6, 3);
  private hemi = new T.HemisphereLight(0xdbeaf4, 0x80935d, 2.6);
  private previous = performance.now();
  private frame = 0;
  private current = "campus";
  private spawn = new T.Vector3(28, 0.1, 4);
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
    this.renderer.toneMappingExposure = 1.1;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute("aria-label", "Escenario 3D del campus");
    container.append(this.canvas);
    this.scene.background = new T.Color("#d4e2e3");
    this.scene.fog = new T.Fog("#d4e2e3", 100, 230);
    this.sun.position.set(-35, 65, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -65,
      right: 65,
      top: 65,
      bottom: -65,
      near: 0.5,
      far: 150,
    });
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.sun, this.hemi, this.campus.group);
    this.orbit = new OrbitControls(this.camera, this.canvas);
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.48;
    this.orbit.minDistance = 4;
    this.orbit.maxDistance = 150;
    this.orbit.target.set(2, 1, 10);
    this.camera.position.set(82, 65, 97);
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
    if (!this.walker.enabled) {
      this.walker.teleport(this.spawn);
      this.camera.lookAt(this.spawn.clone().add(new T.Vector3(-10, 1.5, -2)));
    }
    this.orbit.enabled = false;
    this.walker.walk();
  }
  overview() {
    this.walker.pause();
    this.walker.enabled = false;
    this.orbit.enabled = true;
    if (this.current === "campus") {
      this.camera.position.set(82, 65, 97);
      this.orbit.target.set(2, 1, 10);
      this.orbit.maxDistance = 150;
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
      this.scene.fog = new T.Fog("#d4e2e3", 100, 230);
      this.walker.setWorld(this.campus.colliders);
      this.spawn = place
        ? new T.Vector3(...place.position).add(new T.Vector3(0, 0.15, 0))
        : new T.Vector3(28, 0.1, 4);
      if (place) {
        this.walker.teleport(this.spawn);
        this.walker.enabled = true;
        this.camera.lookAt(this.spawn.clone().add(new T.Vector3(-8, 1.5, -3)));
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
