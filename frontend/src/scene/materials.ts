import * as T from "three";
let seed = 1361;
export function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function texture(kind: "tile" | "grass" | "concrete") {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  if (kind === "tile") {
    // Baldosas claras de las aulas (fotos IMG_5635, IMG_5653); 0,4 m por pieza.
    g.fillStyle = "#c9c4b8";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#a59f93";
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

/** Texturas derivadas del escaneo del pasillo del tercer piso (scripts/extract-scan-textures.py).
 * Cada valor es el tamaño real, en metros, que cubre una repetición; debe coincidir con
 * frontend/public/assets/textures/textures.json (lo comprueba npm test). */
export const scanTextures = {
  ladrillo: [1.08, 1.184],
  "granito-franja": [1.286, 1.286],
  granito: [0.9, 0.9],
  hormigon: [2.0, 0.983],
  lamas: [2.0, 0.96],
  "chapa-cubierta": [0.6, 0.42],
} as const;

const loader = new T.TextureLoader();
function scanMaterial(name: keyof typeof scanTextures, options: T.MeshStandardMaterialParameters = {},
  tile: readonly number[] = scanTextures[name]) {
  const map = loader.load(`/assets/textures/${name}.webp`);
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  const material = new T.MeshStandardMaterial({ map, ...options });
  // Las piezas calculan sus coordenadas de textura en metros con este tamaño.
  material.userData.tile = tile;
  return material;
}
/** Materiales con mosaico procedural: se reparten en metros igual que los del escaneo. */
function tiled(map: T.Texture, tile: readonly number[], options: T.MeshStandardMaterialParameters = {}) {
  const material = new T.MeshStandardMaterial({ map, ...options });
  material.userData.tile = tile;
  return material;
}

export function makeMaterials() {
  return {
    brick: scanMaterial("ladrillo", { roughness: 0.95 }),
    concrete: scanMaterial("hormigon", { roughness: 0.92 }),
    // Franjas cada cuarto de módulo (5 m / 4), como en el escaneo (5,14 m / 4).
    galleryFloor: scanMaterial("granito-franja", { roughness: 0.55 }, [1.25, 1.25]),
    granite: scanMaterial("granito", { roughness: 0.6 }),
    louver: scanMaterial("lamas", { roughness: 0.65, metalness: 0.15, side: T.DoubleSide }),
    roofUnder: scanMaterial("chapa-cubierta", { roughness: 0.85 }),
    tile: tiled(texture("tile"), [1.6, 1.6], { roughness: 0.7 }),
    stone: tiled(texture("concrete"), [4, 4], { roughness: 0.95 }),
    grass: tiled(texture("grass"), [4, 4], { roughness: 1 }),
    plaster: new T.MeshStandardMaterial({ color: "#e6e2d6", roughness: 0.92 }),
    metal: new T.MeshStandardMaterial({
      color: "#4f6370",
      roughness: 0.5,
      metalness: 0.5,
    }),
    steel: new T.MeshStandardMaterial({ color: "#6d808c", roughness: 0.45, metalness: 0.6 }),
    canopy: new T.MeshStandardMaterial({
      color: "#5f7384",
      roughness: 0.55,
      metalness: 0.35,
      side: T.DoubleSide,
    }),
    roof: new T.MeshStandardMaterial({
      color: "#a7ada6",
      roughness: 0.68,
      metalness: 0.2,
    }),
    glass: new T.MeshStandardMaterial({
      color: "#62868a",
      metalness: 0.2,
      roughness: 0.15,
      transparent: true,
      opacity: 0.45,
    }),
    wood: new T.MeshStandardMaterial({ color: "#b4532f", roughness: 0.8 }),
    bark: new T.MeshStandardMaterial({ color: "#594b39", roughness: 1 }),
    leaves: [0x536b36, 0x617942, 0x788c4c, 0x405d35].map(
      (color) => new T.MeshStandardMaterial({ color, roughness: 1 }),
    ),
    asphalt: new T.MeshStandardMaterial({ color: "#81847c", roughness: 1 }),
    blue: new T.MeshStandardMaterial({ color: "#2b5d8c", roughness: 0.6, metalness: 0.3 }),
    white: new T.MeshStandardMaterial({ color: "#ece9da", roughness: 0.9 }),
  };
}
