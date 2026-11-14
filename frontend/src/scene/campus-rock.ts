import * as T from "three";

export const campusRockDepth = 154;
const rockTipOffset = new T.Vector2(-15, 7);

function rockNoise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const tx = T.MathUtils.smoothstep(x - ix, 0, 1);
  const ty = T.MathUtils.smoothstep(y - iy, 0, 1);
  const tz = T.MathUtils.smoothstep(z - iz, 0, 1);
  const lattice = (a: number, b: number, c: number) => {
    const n = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 982451653);
    const hash = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
  };
  const plane = (c: number) => T.MathUtils.lerp(
    T.MathUtils.lerp(lattice(ix, iy, c), lattice(ix + 1, iy, c), tx),
    T.MathUtils.lerp(lattice(ix, iy + 1, c), lattice(ix + 1, iy + 1, c), tx), ty);
  return T.MathUtils.lerp(plane(iz), plane(iz + 1), tz);
}

/** Corte rocoso de la isla, con estratos erosionados y un remate asimétrico. */
export function createCampusRock(edge: number[][], groundLevel: number) {
  const outline = edge.flatMap(([x, z], i) => {
    const [nextX, nextZ] = edge[(i + 1) % edge.length];
    const steps = Math.ceil(Math.hypot(nextX - x, nextZ - z) / 1.4);
    return Array.from({ length: steps }, (_, step) => [
      T.MathUtils.lerp(x, nextX, step / steps), T.MathUtils.lerp(z, nextZ, step / steps),
    ]);
  });
  const distances = [0];
  for (let i = 0; i < outline.length; i++) {
    const [x, z] = outline[i], [nextX, nextZ] = outline[(i + 1) % outline.length];
    distances.push(distances[i] + Math.hypot(nextX - x, nextZ - z));
  }
  const perimeter = distances[outline.length];
  const textureRepeats = Math.round(perimeter / 53);
  const centerX = (Math.min(...edge.map(([x]) => x)) + Math.max(...edge.map(([x]) => x))) / 2;
  const centerZ = (Math.min(...edge.map(([, z]) => z)) + Math.max(...edge.map(([, z]) => z))) / 2;
  const profile = [[0, 1], [3, 0.992], [15, 0.959], [24, 0.907], [33, 0.845], [43, 0.826],
    [56, 0.719], [69, 0.651], [80, 0.618], [97, 0.475], [111, 0.424], [123, 0.315],
    [136, 0.236], [146, 0.174], [152, 0.111], [campusRockDepth, 0.065]];
  const layers = profile.slice(1).flatMap(([depth, scale], i) => {
    const [prevDepth, prevScale] = profile[i];
    const steps = Math.ceil((depth - prevDepth) / 2.4);
    return Array.from({ length: steps }, (_, step) => [
      T.MathUtils.lerp(prevDepth, depth, step / steps), T.MathUtils.lerp(prevScale, scale, step / steps),
    ]);
  });
  layers.push(profile.at(-1)!);
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
  const limestone = new T.Color("#eee5d6"), slate = new T.Color("#a89e92");
  const moss = new T.Color("#829476"), soil = new T.Color("#a29470"), color = new T.Color();
  const coolStone = new T.Color("#b5bfc3");
  const count = outline.length;
  const stride = count + 1;
  for (const [layer, [depth, scale]] of layers.entries()) {
    for (let i = 0; i <= count; i++) {
      const [x, z] = outline[i % count];
      const rx = x - centerX, rz = z - centerZ;
      const angle = Math.atan2(rz, rx);
      const taper = depth / campusRockDepth;
      const relief = T.MathUtils.smoothstep(depth, 0, 16);
      const bend = T.MathUtils.smoothstep(taper, 0.18, 1);
      // Las fracturas longitudinales se curvan en torno a la roca con la profundidad.
      const drift = (rockNoise(x * 0.024, depth * 0.015, z * 0.024) - 0.5) * 0.29;
      const cliff = rockNoise(x * 0.041, depth * 0.026, z * 0.041) - 0.5;
      const ribs = rockNoise(x * 0.16 + drift * 4, depth * 0.032, z * 0.16) - 0.5;
      const chips = rockNoise(x * 0.39, depth * 0.23, z * 0.39) - 0.5;
      const bed = depth + rx * 0.06 + rz * 0.045 + cliff * 9;
      const seam = Math.pow(Math.max(0, Math.cos(bed * 0.47)), 6);
      const ledge = rockNoise(x * 0.071, bed * 0.13, z * 0.071) - 0.5;
      const cleft = Math.pow(Math.max(0, Math.cos((angle + drift) * 4 + 1.1)), 9) * Math.sin(Math.PI * taper);
      const rim = scale * (1 + relief * (cliff * 0.24 + ribs * 0.12 + ledge * 0.08 + chips * 0.025 - seam * 0.04 - cleft * 0.13));
      const y = groundLevel - depth + relief * (cliff * 4 + chips * 1.5 - bend * Math.cos(angle * 3 + 0.5) * 2);
      const px = centerX + rx * rim + bend * rockTipOffset.x;
      const pz = centerZ + rz * rim + bend * rockTipOffset.y;
      positions.push(px, y, pz);
      uvs.push(distances[i] / perimeter * textureRepeats + depth * 0.003, (y - groundLevel) / 42);

      const mineral = rockNoise(px * 0.34, depth * 0.24, pz * 0.34);
      const fault = T.MathUtils.smoothstep(0.45 + cliff * 0.29 + ribs * 0.25 + ledge * 0.24 + mineral * 0.19, 0.32, 0.74);
      color.copy(limestone).lerp(slate, 0.1 + fault * 0.55 + seam * 0.22);
      const patch = rockNoise(px * 0.055 + 25, depth * 0.059, pz * 0.055);
      const growth = T.MathUtils.smoothstep(patch + mineral * 0.16, 0.54, 0.8)
        * (1 - T.MathUtils.smoothstep(taper, 0.24, 0.73));
      color.lerp(moss, growth * 0.58);
      color.lerp(coolStone, T.MathUtils.smoothstep(taper, 0.51, 1) * 0.42);
      if (depth < 4) color.lerp(soil, (1 - depth / 4) * 0.9);
      colors.push(color.r, color.g, color.b);

      if (layer === 0 || i === count) continue;
      const a = (layer - 1) * stride + i, b = a + 1;
      indices.push(a, b, a + stride, b, b + stride, a + stride);
    }
  }

  // Cierra la cara inferior redondeada.
  const firstBottom = (layers.length - 1) * stride;
  const firstCap = positions.length / 3;
  const bottom = outline.map((_, i) => {
    const at = (firstBottom + i) * 3;
    const [x, y, z] = positions.slice(at, at + 3);
    positions.push(x, y, z);
    colors.push(...colors.slice(at, at + 3));
    uvs.push(x / 42, z / 42);
    return new T.Vector2(x, z);
  });
  for (const [a, b, c] of T.ShapeUtils.triangulateShape(bottom, [])) {
    const ab = bottom[b].clone().sub(bottom[a]), ac = bottom[c].clone().sub(bottom[a]);
    if (ab.cross(ac) > 0) indices.push(firstCap + a, firstCap + b, firstCap + c);
    else indices.push(firstCap + a, firstCap + c, firstCap + b);
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const { normal } = geometry.attributes;
  const averaged = new T.Vector3(), other = new T.Vector3();
  // Los extremos UV usan vértices duplicados, con la misma normal en la unión.
  for (let layer = 0; layer < layers.length; layer++) {
    const start = layer * stride, end = start + count;
    averaged.fromBufferAttribute(normal, start).add(other.fromBufferAttribute(normal, end)).normalize();
    for (const i of [start, end]) normal.setXYZ(i, averaged.x, averaged.y, averaged.z);
  }
  const loader = new T.TextureLoader();
  const map = loader.load("/assets/textures/campus-rock-color.webp");
  const normalMap = loader.load("/assets/textures/campus-rock-normal.webp");
  map.colorSpace = T.SRGBColorSpace;
  for (const texture of [map, normalMap]) {
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.anisotropy = 8;
  }
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({
    map, normalMap, normalScale: new T.Vector2(0.72, 0.72), vertexColors: true, roughness: 0.93,
    emissiveMap: map, emissive: "#b3bdc7", emissiveIntensity: 0.4,
  }));
  mesh.name = "Base rocosa de CyT";
  return mesh;
}

export function createRockMist(rock: T.Mesh) {
  const group = new T.Group();
  group.name = "Bruma de la base";
  rock.geometry.computeBoundingBox();
  const bounds = rock.geometry.boundingBox!;
  const center = bounds.getCenter(new T.Vector3());
  const size = bounds.getSize(new T.Vector3());
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const falloff = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  falloff.addColorStop(0, "rgba(255,255,255,0.85)");
  falloff.addColorStop(0.38, "rgba(255,255,255,0.52)");
  falloff.addColorStop(0.74, "rgba(255,255,255,0.13)");
  falloff.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, 128, 128);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;

  const layers = [
    [0, -1, 1, 83, 24, 0.3], [-24, 2, -13, 52, 15, 0.23],
    [15, 5, -19, 61, 15, 0.25], [22, -6, 8, 52, 14, 0.18],
    [-19, -5, 21, 54, 14, 0.22], [0, -12, -9, 62, 16, 0.18],
  ];
  for (const [x, y, z, width, height, opacity] of layers) {
    const sprite = new T.Sprite(new T.SpriteMaterial({ map, color: "#dcf5ff", opacity,
      transparent: true, depthWrite: false, toneMapped: false }));
    sprite.position.set(center.x + rockTipOffset.x + x, bounds.min.y + size.y * 0.035 + y, center.z + rockTipOffset.y + z);
    sprite.scale.set(width, height, 1);
    group.add(sprite);
  }
  return group;
}
