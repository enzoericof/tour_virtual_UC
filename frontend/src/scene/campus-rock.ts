import * as T from "three";

export const campusRockDepth = 133;

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

/** Pared rocosa bajo el césped, con un remate redondeado y asimétrico. */
export function createCampusRock(edge: number[][], groundLevel: number) {
  const outline = edge.flatMap(([x, z], i) => {
    const [nextX, nextZ] = edge[(i + 1) % edge.length];
    const steps = Math.ceil(Math.hypot(nextX - x, nextZ - z) / 1.4);
    return Array.from({ length: steps }, (_, step) => [
      T.MathUtils.lerp(x, nextX, step / steps), T.MathUtils.lerp(z, nextZ, step / steps),
    ]);
  });
  const centerX = (Math.min(...edge.map(([x]) => x)) + Math.max(...edge.map(([x]) => x))) / 2;
  const centerZ = (Math.min(...edge.map(([, z]) => z)) + Math.max(...edge.map(([, z]) => z))) / 2;
  const profile = [[0, 1], [2, 0.997], [11, 0.962], [23, 0.911], [35, 0.838], [49, 0.746],
    [65, 0.644], [80, 0.545], [94, 0.467], [108, 0.379], [118, 0.295], [126, 0.215],
    [131, 0.136], [campusRockDepth, 0.068]];
  const layers = profile.slice(1).flatMap(([depth, scale], i) => {
    const [prevDepth, prevScale] = profile[i];
    const steps = Math.ceil((depth - prevDepth) / 2.4);
    return Array.from({ length: steps }, (_, step) => [
      T.MathUtils.lerp(prevDepth, depth, step / steps), T.MathUtils.lerp(prevScale, scale, step / steps),
    ]);
  });
  layers.push(profile.at(-1)!);
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const limestone = new T.Color("#c8bfaa"), slate = new T.Color("#6a6860");
  const moss = new T.Color("#617444"), soil = new T.Color("#777450"), color = new T.Color();
  const coolStone = new T.Color("#899c9b");
  const count = outline.length;
  for (const [layer, [depth, scale]] of layers.entries()) {
    for (let i = 0; i < count; i++) {
      const [x, z] = outline[i];
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
      const ledge = rockNoise(x * 0.071, depth * 0.17 + z * 0.04, z * 0.071) - 0.5;
      const cleft = Math.pow(Math.max(0, Math.cos((angle + drift) * 3 + 1.1)), 7) * Math.sin(Math.PI * taper);
      const rim = scale * (1 + relief * (cliff * 0.22 + ribs * 0.085 + ledge * 0.065 + chips * 0.022 - cleft * 0.1));
      const y = groundLevel - depth + relief * (cliff * 4 + chips * 1.5 - bend * Math.cos(angle * 3 + 0.5) * 2);
      const px = centerX + rx * rim - bend * 15;
      const pz = centerZ + rz * rim + bend * 7;
      positions.push(px, y, pz);

      const mineral = rockNoise(px * 0.34, depth * 0.24, pz * 0.34);
      const fault = T.MathUtils.smoothstep(0.49 + cliff * 0.34 + ribs * 0.35 + ledge * 0.21 + mineral * 0.24, 0.35, 0.81);
      color.copy(limestone).lerp(slate, 0.13 + fault * 0.73);
      const patch = rockNoise(px * 0.055 + 25, depth * 0.059, pz * 0.055);
      const growth = T.MathUtils.smoothstep(patch + mineral * 0.16, 0.54, 0.8)
        * (1 - T.MathUtils.smoothstep(taper, 0.24, 0.73));
      color.lerp(moss, growth * 0.78);
      color.lerp(coolStone, T.MathUtils.smoothstep(taper, 0.59, 1) * 0.29);
      if (depth < 4) color.lerp(soil, (1 - depth / 4) * 0.9);
      colors.push(color.r, color.g, color.b);

      if (layer === 0) continue;
      const next = (i + 1) % count, a = (layer - 1) * count + i, b = (layer - 1) * count + next;
      indices.push(a, b, a + count, b, b + count, a + count);
    }
  }

  // Cierra la cara inferior redondeada.
  const firstBottom = (layers.length - 1) * count;
  const bottom = outline.map((_, i) => {
    const at = (firstBottom + i) * 3;
    return new T.Vector2(positions[at], positions[at + 2]);
  });
  for (const [a, b, c] of T.ShapeUtils.triangulateShape(bottom, [])) {
    const ab = bottom[b].clone().sub(bottom[a]), ac = bottom[c].clone().sub(bottom[a]);
    if (ab.cross(ac) > 0) indices.push(firstBottom + a, firstBottom + b, firstBottom + c);
    else indices.push(firstBottom + a, firstBottom + c, firstBottom + b);
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1,
    emissive: "#62645c", emissiveIntensity: 0.25 }));
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
    [0, -1, 1, 83, 30, 0.5], [-24, 2, -13, 52, 15, 0.34],
    [15, 5, -19, 61, 15, 0.39], [22, -6, 8, 52, 14, 0.3],
    [-19, -5, 21, 54, 14, 0.35], [0, -12, -9, 62, 16, 0.31],
  ];
  for (const [x, y, z, width, height, opacity] of layers) {
    const sprite = new T.Sprite(new T.SpriteMaterial({ map, color: "#dcf5ff", opacity,
      transparent: true, depthWrite: false, toneMapped: false }));
    sprite.position.set(center.x - 15 + x, bounds.min.y + size.y * 0.035 + y, center.z + 7 + z);
    sprite.scale.set(width, height, 1);
    group.add(sprite);
  }
  return group;
}
