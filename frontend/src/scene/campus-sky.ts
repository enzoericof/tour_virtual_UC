import * as T from "three";

/** Textura envolvente generada una vez. Las nubes continúan al cruzar la unión del cielo. */
export function makeCampusSky() {
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
    const red = 71 + upper * 105 + lower * 33;
    const green = 153 + upper * 59 + lower * 20;
    const blue = 214 + upper * 29 + lower * 7;
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
      const alpha = T.MathUtils.smoothstep(density + clouds, 0.63, 0.82)
        * T.MathUtils.smoothstep(v, 0.06, 0.18) * (1 - T.MathUtils.smoothstep(v, 0.82, 0.96));
      const highlight = T.MathUtils.smoothstep(density + clouds, 0.7, 0.9);
      const at = (y * width + x) * 4;
      image.data[at] = T.MathUtils.lerp(red, 221 + 34 * highlight, alpha);
      image.data[at + 1] = T.MathUtils.lerp(green, 235 + 20 * highlight, alpha);
      image.data[at + 2] = T.MathUtils.lerp(blue, 244 + 11 * highlight, alpha);
      image.data[at + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const sky = new T.CanvasTexture(canvas);
  sky.colorSpace = T.SRGBColorSpace;
  sky.mapping = T.EquirectangularReflectionMapping;
  return sky;
}
