// Página de captura temporal para comparar el modelo con las fotos (no forma parte del producto).
import * as T from "three";
import { createCampus } from "./scene/campus";
import { makeCampusSky } from "./scene/campus-sky";
import { facultyToWorld } from "./data/campus-geometry";

const q = new URLSearchParams(location.search);
const n = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const width = n("w", 1200), height = n("h", 900);
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, reversedDepthBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.96;
// Barridos de cámaras: `shadows=0` omite el mapa de sombras (la composición es la misma) para
// revisar decenas de vistas por sesión con el renderizador por software.
if (q.get("shadows") === "0") renderer.shadowMap.enabled = false;
document.body.append(renderer.domElement);

const campus = createCampus();
campus.setDetail(true);
const scene = new T.Scene();
scene.background = makeCampusSky("light");
scene.add(campus.group);
const sun = new T.DirectionalLight(0xfff2d6, 2.4);
sun.position.set(-240, 500, 240);
const hemi = new T.HemisphereLight(0xdbeaf4, 0xb1ada0, 1.7);
scene.add(sun, hemi);

const camera = new T.PerspectiveCamera(n("fov", 62), width / height, 0.08, 1900);
const at = (key: string, d: number[]): [number, number, number] => {
  const [x, y, z] = (q.get(key) ?? d.join(",")).split(",").map(Number);
  return facultyToWorld([x, y, z]);
};
camera.position.set(...at("pos", [0, 1.5, 0]));
camera.lookAt(new T.Vector3(...at("target", [10, 1.5, 0])));

// Barrido de cámaras para comparar vistas: la escena se construye una sola vez y cada captura
// solo mueve la cámara (`setPose`), lo que permite revisar decenas de posiciones por sesión.
const window_ = window as unknown as {
  shotReady?: boolean; setPose?: (pos: number[], target: number[]) => void;
};
window_.setPose = (pos, target) => {
  camera.position.set(...facultyToWorld(pos as [number, number, number]));
  camera.lookAt(new T.Vector3(...facultyToWorld(target as [number, number, number])));
  window_.shotReady = false;
  renderer.render(scene, camera);
  window_.shotReady = true;
};

let frames = 0;
function loop() {
  renderer.render(scene, camera);
  if (++frames > 3) window_.shotReady = true;
  requestAnimationFrame(loop);
}
loop();
