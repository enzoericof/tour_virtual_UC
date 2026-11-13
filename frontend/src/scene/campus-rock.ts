import * as T from "three";

export const campusRockDepth = 72;

/** Pared rocosa bajo el césped, con estratos y un remate irregular. */
export function createCampusRock(edge: number[][], groundLevel: number) {
  const outline = edge.flatMap(([x, z], i) => {
    const [nextX, nextZ] = edge[(i + 1) % edge.length];
    const steps = Math.ceil(Math.hypot(nextX - x, nextZ - z) / 2.6);
    return Array.from({ length: steps }, (_, step) => [
      T.MathUtils.lerp(x, nextX, step / steps), T.MathUtils.lerp(z, nextZ, step / steps),
    ]);
  });
  const centerX = (Math.min(...edge.map(([x]) => x)) + Math.max(...edge.map(([x]) => x))) / 2;
  const centerZ = (Math.min(...edge.map(([, z]) => z)) + Math.max(...edge.map(([, z]) => z))) / 2;
  const layers = [[0, 1], [0.9, 1.004], [3.2, 0.985], [7, 0.957], [11, 0.923],
    [16, 0.901], [22, 0.803], [29, 0.707], [36, 0.619], [43, 0.505], [49, 0.378],
    [55, 0.255], [61, 0.166], [67, 0.105], [campusRockDepth, 0.04]];
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const rock = new T.Color("#8f8777"), slate = new T.Color("#605d56");
  const moss = new T.Color("#526234"), soil = new T.Color("#646343"), color = new T.Color();
  const mistLight = new T.Color("#779aab");
  const count = outline.length;
  for (const [layer, [depth, scale]] of layers.entries()) {
    for (let i = 0; i < count; i++) {
      const [x, z] = outline[i];
      const wave = Math.sin(x * 0.17 + z * 0.13) * Math.cos(z * 0.23 - x * 0.075);
      const grain = Math.sin(x * 0.98 - z * 0.81 + layer * 1.4);
      const relief = Math.min(depth / 5, 1);
      const taper = depth / campusRockDepth;
      const ridge = Math.sin(x * 0.16 + z * 0.29) * 0.033;
      const rim = scale + (wave * 0.038 + grain * 0.012 + ridge) * relief * Math.sqrt(scale);
      const y = groundLevel - depth + (wave * 2.1 + grain * 0.74) * relief;
      positions.push(centerX + (x - centerX) * rim - taper * taper * 9,
        y, centerZ + (z - centerZ) * rim + taper * taper * 6);

      const stratum = 0.35 + 0.21 * Math.sin(layer * 1.7 + wave * 1.9) + 0.12 * grain;
      color.copy(rock).lerp(slate, stratum);
      const patch = Math.sin(x * 0.11 + z * 0.14) + Math.cos(z * 0.18 - layer * 0.52);
      color.lerp(moss, T.MathUtils.smoothstep(patch, 0.3, 1.65) * Math.max(0, 0.94 - depth / 48));
      color.lerp(mistLight, T.MathUtils.smoothstep(taper, 0.58, 1) * 0.38);
      if (layer < 2) color.lerp(soil, layer === 0 ? 0.9 : 0.55);
      colors.push(color.r, color.g, color.b);

      if (layer === 0) continue;
      const next = (i + 1) % count, a = (layer - 1) * count + i, b = (layer - 1) * count + next;
      indices.push(a, b, a + count, b, b + count, a + count);
    }
  }

  // La punta termina en una cara pequeña e irregular.
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
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
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
    sprite.position.set(center.x - 8 + x, bounds.min.y + size.y * 0.06 + y, center.z + 5 + z);
    sprite.scale.set(width, height, 1);
    group.add(sprite);
  }
  return group;
}
