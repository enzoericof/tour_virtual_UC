import * as T from "three";

/** Pintura, hollín y revoque de la parrilla; texturas propias, sin recursos externos. */
export function gardenMaterial(kind: "paint" | "soot" | "render" | "bark" | "earth", color: string) {
  let seed = 18271;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const g = canvas.getContext("2d")!;
  g.fillStyle = color; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9500; i++) {
    const x = random() * 512, y = random() * 512;
    g.fillStyle = random() > 0.48 ? "#f1e4c522" : "#110d0b26";
    g.fillRect(x, y, 0.5 + random() * 2.1, kind === "bark" ? 8 + random() * 65 : 0.5 + random() * 2.8);
  }
  if (kind === "paint" || kind === "soot" || kind === "render") {
    for (let i = 0; i < 95; i++) {
      const x = random() * 512, y = random() * 512;
      g.strokeStyle = kind === "paint" ? "#a4744650" : "#2a221c38";
      g.lineWidth = 0.6 + random() * 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 8, y + 8 + random() * 100); g.stroke();
    }
  }
  if (kind === "soot") {
    const stain = g.createLinearGradient(0, 0, 0, 512);
    stain.addColorStop(0, "#050505b0"); stain.addColorStop(.35, "#15130f50"); stain.addColorStop(1, "#00000000");
    g.fillStyle = stain; g.fillRect(0, 0, 512, 512);
  }
  if (kind === "bark") {
    for (let i = 0; i < 90; i++) {
      const x = random() * 512;
      g.strokeStyle = i % 3 ? "#271f1990" : "#a0997960"; g.lineWidth = 1 + random() * 4;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= 512; y += 16) g.lineTo(x + Math.sin(y * .025 + i) * 6, y);
      g.stroke();
    }
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  return new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: kind === "bark" ? .055 : .014,
    roughness: kind === "paint" ? .68 : .97, metalness: kind === "paint" ? .32 : 0 });
}
