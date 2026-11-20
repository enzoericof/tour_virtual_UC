import * as T from "three";
let seed = 1361;
export function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
/** Granito rosado ilustrado: áridos simples y franja recta, sin fotografía ni relieve. */
function galleryFinish(striped: boolean) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ac827b"; ctx.fillRect(0, 0, 256, 256);
  let state = 2931;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const tones = ["#bc9890", "#b38b82", "#98766f", "#c5a49a"];
  for (let i = 0; i < 150; i++) {
    const x = next() * 256, y = next() * 256, w = 1.2 + next() * 2.2, h = 0.9 + next() * 1.8;
    ctx.fillStyle = tones[i % tones.length];
    // Repetición continua, incluso para las pequeñas piezas que cruzan un borde.
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      ctx.beginPath(); ctx.moveTo(x + dx - w, y + dy);
      ctx.lineTo(x + dx - w * 0.2, y + dy - h);
      ctx.lineTo(x + dx + w, y + dy - h * 0.25);
      ctx.lineTo(x + dx + w * 0.4, y + dy + h);
      ctx.closePath(); ctx.fill();
    }
  }
  if (striped) {
    ctx.fillStyle = "#4c5053"; ctx.fillRect(118, 0, 20, 256);
    ctx.fillStyle = "#656366"; ctx.fillRect(118, 0, 1, 256); ctx.fillRect(137, 0, 1, 256);
  }
  const map = new T.CanvasTexture(canvas);
  map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  return tiled(map, striped ? [1.25, 1.25] : [0.9, 0.9], { roughness: 0.88, metalness: 0 });
}

function texture(kind: "tile" | "concrete") {
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
    g.fillStyle = "#bab8aa";
    g.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 18000; i++) {
    g.fillStyle = random() > 0.5 ? "#ffffff0c" : "#0000000c";
    g.fillRect(random() * 512, random() * 512, 1, 1);
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makeGrassMaterial() {
  const map = loader.load("/assets/textures/campus-grass-color.webp");
  const normalMap = loader.load("/assets/textures/campus-grass-normal.webp");
  map.colorSpace = T.SRGBColorSpace;
  for (const texture of [map, normalMap]) {
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 12;
  }
  const grass = tiled(map, [3.2, 3.2], { color: "#c0cdab", normalMap, normalScale: new T.Vector2(0.43, 0.43), roughness: 0.97 });
  grass.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 grassPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ngrassPosition = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 grassPosition;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        float grassTone = sin(grassPosition.x * 0.31 + cos(grassPosition.y * 0.22))
                        * cos(grassPosition.y * 0.25 + sin(grassPosition.x * 0.18));
        float grassPatch = sin(dot(grassPosition, vec2(0.78, -0.52))) * cos(dot(grassPosition, vec2(0.42, 0.83)));
        diffuseColor.rgb *= mix(vec3(0.77, 0.84, 0.73), vec3(1.13, 1.11, 1.04),
          0.5 + grassTone * 0.38 + grassPatch * 0.12);`);
  };
  return grass;
}

/** Adoquines de la explanada de cantina: referencia elevada aportada por Horacio.
 * Textura de 1,6 × 1,6 m, piezas de 40 × 20 cm, juntas finas y desgaste mate. */
function courtyardPaving() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const noise = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  ctx.fillStyle = "#77776b"; ctx.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
    const x = col * 256 + (row % 2) * 128, y = row * 128;
    const tone = Math.floor(151 + noise(row * 17 + col) * 25);
    ctx.fillStyle = `rgb(${tone},${tone - 1},${tone - 13})`;
    ctx.fillRect(x + 2, y + 2, 252, 124);
    ctx.strokeStyle = "#ddd6c344"; ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, 248, 120);
  }
  for (let i = 0; i < 65000; i++) {
    ctx.fillStyle = i % 2 ? "#302f2414" : "#fff9eb18";
    ctx.fillRect(noise(i + 1) * 1024, noise(i + 98001) * 1024, 1.5, 1.5);
  }
  const map = new T.CanvasTexture(canvas);
  map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  return tiled(map, [1.6, 1.6], { roughness: 0.98 });
}

/** Hormigón envejecido del patio de Maquetas, según fotos del 18/11/2026.
 * Paños grandes de tamaño estimado; textura propia, sin sombras de árboles incorporadas. */
function maquetasConcrete() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  let state = 181126;
  const rand = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = "#aaa597"; ctx.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const tone = Math.floor(163 + rand() * 12);
    ctx.fillStyle = `rgb(${tone + 5},${tone + 2},${tone - 9})`;
    ctx.fillRect(col * 512, row * 512, 512, 512);
  }
  // Manchas suaves y periódicas: los bordes de la textura continúan al repetirse.
  for (let i = 0; i < 100; i++) {
    const x = rand() * 1024, y = rand() * 1024, radius = 28 + rand() * 140;
    const dark = rand() > 0.45;
    for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) {
      const gradient = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
      gradient.addColorStop(0, dark ? "rgba(64,61,52,0.15)" : "rgba(237,230,209,0.19)");
      gradient.addColorStop(1, dark ? "rgba(64,61,52,0)" : "rgba(237,230,209,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
    }
  }
  // Árido fino y poros: variación superficial sin modificar el suelo transitable.
  for (let i = 0; i < 110000; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(247,240,217,0.24)" : "rgba(55,52,45,0.21)";
    ctx.fillRect(rand() * 1024, rand() * 1024, 0.6 + rand() * 1.6, 0.6 + rand() * 1.6);
  }
  for (const position of [0, 512, 1024]) {
    // Junta fina con bordes gastados, sin la retícula pequeña del pasillo de baldosas.
    for (const [width, color] of [[5, "rgba(67,63,53,0.12)"], [1.2, "rgba(65,61,52,0.42)"]] as const) {
      ctx.lineWidth = width; ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(position, 0); ctx.lineTo(position, 1024);
      ctx.moveTo(0, position); ctx.lineTo(1024, position); ctx.stroke();
    }
  }
  const map = new T.CanvasTexture(canvas);
  map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const material = tiled(map, [8, 6], { roughness: 0.98 });
  material.name = "Hormigón del patio de Maquetas";
  return material;
}

/** Grava gris del patio, con áridos irregulares de unos pocos centímetros. */
function courtyardGravel() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#686460"; ctx.fillRect(0, 0, 512, 512);
  const noise = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
  for (let i = 0; i < 9000; i++) {
    const x = noise(i * 4) * 512, y = noise(i * 4 + 1) * 512;
    const radius = 1 + noise(i * 4 + 2) * 3.2;
    const tone = 91 + Math.floor(noise(i * 4 + 3) * 75);
    ctx.fillStyle = `rgb(${tone},${tone - 2},${tone - 6})`;
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.lineTo(x, y - radius * 0.7);
    ctx.lineTo(x + radius, y - radius * 0.25);
    ctx.lineTo(x + radius * 0.5, y + radius * 0.7);
    ctx.fill();
  }
  const map = new T.CanvasTexture(canvas);
  map.wrapS = map.wrapT = T.RepeatWrapping; map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  return tiled(map, [1.8, 1.8], { roughness: 1 });
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

/** Acabados exclusivos del acceso: piedra clara y lona azul, sin alterar otros edificios. */
function accessFinish(fabric: boolean) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = fabric ? "#294d70" : "#b7b3a5"; ctx.fillRect(0, 0, 512, 512);
  let seed = 42;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 42000; i++) {
    ctx.fillStyle = random() > 0.5
      ? (fabric ? "rgba(255,255,240,0.15)" : "rgba(255,255,240,0.23)")
      : (fabric ? "rgba(55,53,45,0.12)" : "rgba(55,53,45,0.22)");
    ctx.fillRect(random() * 512, random() * 512, fabric ? 1 : 2, 1);
  }
  ctx.strokeStyle = fabric ? "rgba(50,48,44,0.05)" : "rgba(80,78,70,0.2)";
  ctx.lineWidth = 1;
  for (let n = 0; n < 512; n += fabric ? 4 : 256) {
    ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(512, n); ctx.stroke();
  }
  const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;
  return tiled(tex, fabric ? [1, 1] : [1.2, 1.2], {
    roughness: fabric ? 1 : 0.87, metalness: 0, side: fabric ? T.DoubleSide : T.FrontSide,
    emissive: fabric ? "#24384e" : "#000000", emissiveIntensity: 0.15,
  });
}

function accessLeaf() {
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2b4535"; ctx.fillRect(0,0,128,512);
  for (let y=0;y<512;y+=11) {
    ctx.fillStyle = y % 3 ? "#455e48" : "#5e7358";
    ctx.beginPath(); ctx.moveTo(0,y);
    for(let x=0;x<=128;x+=8) ctx.lineTo(x,y+Math.sin(x*.2+y)*3);
    for(let x=128;x>=0;x-=8) ctx.lineTo(x,y+5+Math.sin(x*.13+y)*3);
    ctx.fill();
  }
  for(let x=3;x<128;x+=7) {
    ctx.fillStyle = "rgba(180,196,142,.13)"; ctx.fillRect(x,0,1,512);
  }
  ctx.fillStyle = "#71805d";ctx.fillRect(0,0,2,512);ctx.fillRect(126,0,2,512);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  return new T.MeshStandardMaterial({map,roughness:1,side:T.DoubleSide});
}

export function makeMaterials(grass: T.MeshStandardMaterial) {
  return {
    courtyardPaving: courtyardPaving(),
    courtyardGravel: courtyardGravel(),
    maquetasConcrete: maquetasConcrete(),
    accessStone: accessFinish(false),
    awning: accessFinish(true),
    accessLeaf: accessLeaf(),
    brick: scanMaterial("ladrillo", { roughness: 0.95 }),
    concrete: scanMaterial("hormigon", { roughness: 0.92 }),
    // Franjas cada cuarto de módulo (5 m / 4), como en el escaneo (5,14 m / 4).
    galleryFloor: galleryFinish(true),
    granite: galleryFinish(false),
    louver: scanMaterial("lamas", { roughness: 0.65, metalness: 0.15, side: T.DoubleSide }),
    roofUnder: scanMaterial("chapa-cubierta", { roughness: 0.85 }),
    tile: tiled(texture("tile"), [1.6, 1.6], { roughness: 0.7 }),
    stone: tiled(texture("concrete"), [4, 4], { roughness: 0.95 }),
    grass,
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
    // Vidrio ciego: panel opaco y oscuro detrás de un paño vidriado, para que no
    // se vea el interior sin perder la lectura de ventana o de puerta.
    sealedGlass: new T.MeshStandardMaterial({
      color: "#1d2628",
      roughness: 0.28,
      metalness: 0.35,
    }),
    // Vidrio polarizado de las aulas: azul verdoso oscuro y sin transparencia, para que no se vea el interior.
    // Poca metalicidad: sin mapa de entorno, un metal oscuro se dibuja negro y parece un hueco.
    polarized: new T.MeshStandardMaterial({ name: "Vidrio polarizado", color: "#3a5964", metalness: 0.15, roughness: 0.14 }),
    wood: new T.MeshStandardMaterial({ color: "#b4532f", roughness: 0.8 }),
    bark: new T.MeshStandardMaterial({ color: "#594b39", roughness: 1 }),
    leaves: [0x536b36, 0x617942, 0x788c4c, 0x405d35].map(
      (color) => new T.MeshStandardMaterial({ color, roughness: 1 }),
    ),
    asphalt: new T.MeshStandardMaterial({ color: "#81847c", roughness: 1 }),
    blue: new T.MeshStandardMaterial({ color: "#2b5d8c", roughness: 0.6, metalness: 0.3 }),
    // Chapa pintada gris azulada de las puertas de las aulas (IMG_5639).
    door: new T.MeshStandardMaterial({ color: "#566d78", roughness: 0.55, metalness: 0.25 }),
    // Revoque crema de la caja del ascensor, visto desde el patio y la plaza (fotos del 02/11/2026).
    render: new T.MeshStandardMaterial({ color: "#d8cfae", roughness: 0.9 }),
    white: new T.MeshStandardMaterial({ color: "#ece9da", roughness: 0.9 }),
  };
}
