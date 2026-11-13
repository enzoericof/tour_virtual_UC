import * as T from "three";

export type CampusTheme = "light" | "dark";

/** Fondo envolvente con ruido continuo en la unión del panorama. */
export function makeCampusSky(theme: CampusTheme = "light") {
  const space = theme === "dark";
  const canvas = document.createElement("canvas");
  const width = canvas.width = 1024, height = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(width, height);
  let seed = 4897;
  const octaves = Array.from({ length: 5 }, (_, i) => {
    const columns = 11 << i, rows = 16 << i;
    const cells = Float32Array.from({ length: columns * (rows + 1) }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    return { columns, rows, cells };
  });

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const upper = T.MathUtils.smoothstep(v, 0, 0.52);
    const lower = T.MathUtils.smoothstep(v, 0.52, 1);
    const red = space ? 7 + upper * 6 : 71 + upper * 105 + lower * 33;
    const green = space ? 10 + upper * 9 : 153 + upper * 59 + lower * 20;
    const blue = space ? 23 + upper * 16 : 214 + upper * 29 + lower * 7;
    const clouds = Math.max(0, 1 - Math.abs(v - 0.34) / 0.29) * 0.16 +
      Math.max(0, 1 - Math.abs(v - 0.68) / 0.21) * 0.22;

    for (let x = 0; x < width; x++) {
      let density = 0, weight = 0.56;
      for (const { columns, rows, cells } of octaves) {
        const sx = x * columns / width, sy = Math.min(y * rows / height, rows - 0.001);
        const i = Math.floor(sx), j = Math.floor(sy), next = (i + 1) % columns;
        const tx = T.MathUtils.smoothstep(sx - i, 0, 1), ty = T.MathUtils.smoothstep(sy - j, 0, 1);
        const a = T.MathUtils.lerp(cells[j * columns + i], cells[j * columns + next], tx);
        const b = T.MathUtils.lerp(cells[(j + 1) * columns + i], cells[(j + 1) * columns + next], tx);
        density += T.MathUtils.lerp(a, b, ty) * weight;
        weight *= 0.49;
      }
      const at = (y * width + x) * 4;
      if (space) {
        const bandCenter = 0.49 + 0.16 * Math.sin(x / width * Math.PI * 2 - 0.8);
        const band = 1 - T.MathUtils.smoothstep(Math.abs(v - bandCenter), 0.015, 0.23);
        const dust = band * T.MathUtils.smoothstep(density, 0.27, 0.75);
        image.data[at] = red + dust * 45;
        image.data[at + 1] = green + dust * 38;
        image.data[at + 2] = blue + dust * 78;
      } else {
        const alpha = T.MathUtils.smoothstep(density + clouds, 0.63, 0.82)
          * T.MathUtils.smoothstep(v, 0.06, 0.18) * (1 - T.MathUtils.smoothstep(v, 0.82, 0.96));
        const highlight = T.MathUtils.smoothstep(density + clouds, 0.7, 0.9);
        image.data[at] = T.MathUtils.lerp(red, 221 + 34 * highlight, alpha);
        image.data[at + 1] = T.MathUtils.lerp(green, 235 + 20 * highlight, alpha);
        image.data[at + 2] = T.MathUtils.lerp(blue, 244 + 11 * highlight, alpha);
      }
      image.data[at + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  let panorama = canvas;
  if (space) {
    panorama = document.createElement("canvas");
    const starWidth = panorama.width = width * 2, starHeight = panorama.height = height * 2;
    const stars = panorama.getContext("2d")!;
    stars.drawImage(canvas, 0, 0, starWidth, starHeight);
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 5000; i++) {
      const x = Math.floor(random() * starWidth);
      const y = Math.floor(Math.acos(1 - 2 * random()) / Math.PI * starHeight);
      const bright = random();
      const opacity = 0.22 + bright * 0.73;
      stars.fillStyle = bright > 0.98 ? `rgba(240,226,255,${opacity})` : `rgba(200,224,255,${opacity})`;
      stars.fillRect(x, y, 1, 1);
      if (bright > 0.95) {
        stars.fillStyle = "rgba(165,195,255,0.45)";
        stars.fillRect((x + starWidth - 1) % starWidth, y, 1, 1);
        stars.fillRect((x + 1) % starWidth, y, 1, 1);
        stars.fillRect(x, y - 1, 1, 1);
        stars.fillRect(x, y + 1, 1, 1);
      }
    }
  }
  const sky = new T.CanvasTexture(panorama);
  sky.colorSpace = T.SRGBColorSpace;
  sky.mapping = T.EquirectangularReflectionMapping;
  return sky;
}
