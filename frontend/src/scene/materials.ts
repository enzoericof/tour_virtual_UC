import * as T from "three";
let seed = 1361;
export function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function texture(kind: "brick" | "tile" | "grass" | "concrete") {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  if (kind === "brick") {
    g.fillStyle = "#b4a395";
    g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 16; y++)
      for (let x = -1; x < 9; x++) {
        const v = random();
        g.fillStyle = `hsl(${17 + v * 10} 42% ${42 + v * 15}%)`;
        g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28);
        g.fillStyle = "#ffffff0d";
        g.fillRect(x * 64 + (y % 2) * 32 + 4, y * 32 + 3, 56, 2);
      }
  } else if (kind === "tile") {
    g.fillStyle = "#a9776d";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#6f6963";
    g.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 512);
      g.moveTo(0, i);
      g.lineTo(512, i);
      g.stroke();
    }
  } else {
    g.fillStyle = kind === "grass" ? "#728052" : "#bab8aa";
    g.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 18000; i++) {
    g.fillStyle = random() > 0.5 ? "#ffffff0c" : "#0000000c";
    g.fillRect(
      random() * 512,
      random() * 512,
      kind === "grass" ? 2 : 1,
      kind === "grass" ? 5 : 1,
    );
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const brickMap = () => texture("brick");
export function makeMaterials() {
  return {
    brick: new T.MeshStandardMaterial({ map: brickMap(), roughness: 0.95 }),
    concrete: new T.MeshStandardMaterial({ color: "#e2dfd0", roughness: 0.9 }),
    tile: new T.MeshStandardMaterial({ map: texture("tile"), roughness: 0.74 }),
    stone: new T.MeshStandardMaterial({
      map: texture("concrete"),
      roughness: 0.95,
    }),
    grass: new T.MeshStandardMaterial({ map: texture("grass"), roughness: 1 }),
    metal: new T.MeshStandardMaterial({
      color: "#48606b",
      roughness: 0.56,
      metalness: 0.45,
    }),
    roof: new T.MeshStandardMaterial({
      color: "#a7ada6",
      roughness: 0.68,
      metalness: 0.2,
      side: T.DoubleSide,
    }),
    glass: new T.MeshStandardMaterial({
      color: "#62868a",
      metalness: 0.2,
      roughness: 0.15,
      transparent: true,
      opacity: 0.45,
    }),
    wood: new T.MeshStandardMaterial({ color: "#a54b35", roughness: 0.85 }),
    bark: new T.MeshStandardMaterial({ color: "#594b39", roughness: 1 }),
    leaves: [0x536b36, 0x617942, 0x788c4c, 0x405d35].map(
      (color) => new T.MeshStandardMaterial({ color, roughness: 1 }),
    ),
    asphalt: new T.MeshStandardMaterial({ color: "#81847c", roughness: 1 }),
    blue: new T.MeshStandardMaterial({ color: "#1a4263", roughness: 0.7 }),
    white: new T.MeshStandardMaterial({ color: "#ece9da", roughness: 0.9 }),
  };
}
