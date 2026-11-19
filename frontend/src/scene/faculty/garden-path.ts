import * as T from "three";
import { facultyBlueprint as plan, type Vec2, type Rect } from "../../data/faculty-blueprint";
import { coveredWalkSurface } from "../../data/cantina-terrain";
import type { FacultyBuilder } from "./builder";

/** Hormigón gastado con piezas circulares, inspirado en las fotos del jardín. */
export function makeGardenPaving() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 896;
  const ctx = canvas.getContext("2d")!;
  const relief = document.createElement("canvas"); relief.width = 1024; relief.height = 896;
  const reliefCtx = relief.getContext("2d")!;
  reliefCtx.fillStyle = "#555"; reliefCtx.fillRect(0, 0, 1024, 896);
  const noise = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  ctx.fillStyle = "#8a847c"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Ocho piezas por 1,60 m, juntas estrechas y contornos levemente irregulares.
  for (let row = -1; row <= 8; row++) for (let col = -1; col <= 8; col++) {
    const seed = (row + 10) * 71 + col, shade = Math.round(128 + noise(seed) * 15);
    const x = col * 128 + (row % 2) * 64, y = row * 112;
    const gradient = ctx.createRadialGradient(x - 15, y - 18, 8, x, y, 66);
    gradient.addColorStop(0, `rgb(${shade + 5},${shade + 1},${shade - 3})`);
    gradient.addColorStop(0.92, `rgb(${shade},${shade - 4},${shade - 8})`);
    gradient.addColorStop(1, `rgb(${shade - 13},${shade - 17},${shade - 21})`);
    ctx.fillStyle = gradient; ctx.strokeStyle = "rgba(90,83,75,.26)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); reliefCtx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const angle = k / 24 * Math.PI * 2, r = 65 + (noise(seed * 29 + k % 24) - 0.5) * 4;
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      if (k === 0) { ctx.moveTo(px, py); reliefCtx.moveTo(px, py); }
      else { ctx.lineTo(px, py); reliefCtx.lineTo(px, py); }
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    reliefCtx.closePath(); reliefCtx.fillStyle = "#aaa"; reliefCtx.fill();
    reliefCtx.lineWidth = 3; reliefCtx.strokeStyle = "#666"; reliefCtx.stroke();
    // Desconchones pequeños y poros en las piezas, sin contornos de dibujo perfectos.
    for (let chip = 0; chip < 6; chip++) {
      const angle = noise(seed * 41 + chip) * Math.PI * 2;
      const px = x + Math.cos(angle) * 62, py = y + Math.sin(angle) * 62;
      ctx.fillStyle = "rgba(85,78,69,.22)";
      ctx.beginPath(); ctx.arc(px, py, 1 + noise(seed + chip) * 3, 0, Math.PI * 2); ctx.fill();
      reliefCtx.fillStyle = "#777";
      reliefCtx.beginPath(); reliefCtx.arc(px, py, 2, 0, Math.PI * 2); reliefCtx.fill();
    }
  }
  // Tierra, humedad y desgaste de distinto tamaño evitan un patrón de discos nuevos.
  for (let i = 0; i < 180; i++) {
    const x = noise(i + 220) * 1024, y = noise(i + 754) * 896, r = 8 + noise(i + 119) * 62;
    const stain = ctx.createRadialGradient(x, y, 1, x, y, r);
    stain.addColorStop(0, i % 3 ? "rgba(76,65,54,.16)" : "rgba(213,207,193,.12)");
    stain.addColorStop(1, "rgba(100,90,80,0)");
    ctx.fillStyle = stain; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Grano del hormigón; color y relieve comparten textura.
  for (let i = 0; i < 32000; i++) {
    ctx.fillStyle = i % 2 ? "rgba(58,51,45,.07)" : "rgba(232,226,215,.10)";
    const size = 0.5 + noise(i + 8) * 2;
    const x = noise(i + 18) * 1024, y = noise(i + 46) * 896;
    ctx.fillRect(x, y, size, size);
    reliefCtx.fillStyle = i % 2 ? "rgba(0,0,0,.15)" : "rgba(255,255,255,.15)";
    reliefCtx.fillRect(x, y, size, size);
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  const bump = new T.CanvasTexture(relief); bump.colorSpace = T.NoColorSpace;
  bump.wrapS = bump.wrapT = T.RepeatWrapping; bump.anisotropy = 8;
  const material = new T.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.025, roughness: 1 });
  material.userData.tile = [1.6, 1.4];
  return material;
}

/** Ejes compartidos en las esquinas: ambos lados usan el mismo inglete. */
export function pathSampler(points: readonly Vec2[]) {
  const lengths = points.slice(1).map((b, i) => Math.hypot(b[0] - points[i][0], b[1] - points[i][1]));
  const directions = lengths.map((length, i): Vec2 => [(points[i + 1][0] - points[i][0]) / length,
    (points[i + 1][1] - points[i][1]) / length]);
  const normals = points.map((_, i): Vec2 => {
    const a = directions[Math.max(0, i - 1)], b = directions[Math.min(i, directions.length - 1)];
    const divisor = Math.max(0.5, 1 + a[0] * b[0] + a[1] * b[1]);
    return [-(a[1] + b[1]) / divisor, (a[0] + b[0]) / divisor];
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const corners: number[] = []; let offset = 0;
  for (let i = 1; i < points.length - 1; i++) {
    offset += lengths[i - 1];
    if (directions[i - 1][0] * directions[i][0] + directions[i - 1][1] * directions[i][1] < 0.98) corners.push(offset);
  }
  return { total, corners, at(distance: number, side = 0): Vec2 {
    let along = T.MathUtils.clamp(distance, 0, total), segment = 0;
    while (segment < lengths.length - 1 && along > lengths[segment]) along -= lengths[segment++];
    const t = along / lengths[segment], a = points[segment], b = points[segment + 1];
    return [T.MathUtils.lerp(a[0], b[0], t) + T.MathUtils.lerp(normals[segment][0], normals[segment + 1][0], t) * side,
      T.MathUtils.lerp(a[1], b[1], t) + T.MathUtils.lerp(normals[segment][1], normals[segment + 1][1], t) * side];
  } };
}
export const gardenJunctionReach = 2.4;
type WalkJunction = {
  at: number; points: readonly Vec2[]; width?: number; label?: string;
  height?: (point: Vec2) => number; ground?: (point: Vec2) => number;
};
export type WalkOptions = {
  width?: number; finishedHeight?: boolean; name?: string; junctionAt?: number;
  junctionBranch?: { points: readonly Vec2[]; ground: (point: Vec2) => number };
  junctions?: WalkJunction[]; startDistance?: number;
  pavingJoin?: { rect: Rect; minX: number; maxX: number; frontZ: (x: number) => number };
};

/** Tramos independientes: pequeños quiebres, bordes ondulados y juntas con tierra visible. */
export function addSegmentedGardenPath(
  builder: FacultyBuilder, points: readonly Vec2[], surfaceHeight: (point: Vec2) => number,
  material: T.MeshStandardMaterial,
  options: WalkOptions = {},
) {
  const width = options.width ?? 1.6;
  const junctions: WalkJunction[] = [...(options.junctions ?? [])];
  if (options.junctionAt !== undefined && options.junctionBranch)
    junctions.push({ at: options.junctionAt, ...options.junctionBranch, label: "LED" });
  const edgeMaterial = builder.m.concrete.clone(); edgeMaterial.color.set("#8e877c");
  const [walkStart, walkEnd] = plan.coveredWalk;
  const wx = walkEnd[0] - walkStart[0], wz = walkEnd[1] - walkStart[1];
  const walkLength = Math.hypot(wx, wz);
  const normal: Vec2 = [-wz / walkLength, wx / walkLength];
  const outward = Math.sign((points[1][0] - points[0][0]) * normal[0] + (points[1][1] - points[0][1]) * normal[1]);
  const edgeDistance = (point: Vec2) => outward * ((point[0] - walkStart[0]) * normal[0]
    + (point[1] - walkStart[1]) * normal[1]) - coveredWalkSurface.width / 2;
  function topHeight(point: Vec2, distance: number) {
    if (options.finishedHeight) return surfaceHeight(point);
    const t = T.MathUtils.clamp(((point[0] - walkStart[0]) * wx + (point[1] - walkStart[1]) * wz) / (wx * wx + wz * wz), 0, 1);
    const joinHeight = plan.plazaGallery.smallSteps.bottom * (1 - t) + coveredWalkSurface.endHeight * t
      + 3 * coveredWalkSurface.controlLift * t * (1 - t);
    // El arranque empalma enrasado con el caminero bajo carpa; luego aflora la losa.
    const blend = T.MathUtils.smoothstep(distance, 1.2, 3.5);
    return T.MathUtils.lerp(joinHeight, surfaceHeight(point) + 0.10, blend);
  }
  const { total, at, corners } = pathSampler(points);
  const group = new T.Group(); group.name = options.name ?? "Caminero segmentado del LED";
  builder.layers.visual.add(group);
  let distance = options.startDistance ?? 0, index = 0;
  while (distance < total - 0.05) {
    let length = Math.min(1.8 + 0.18 * Math.sin(index * 1.7), total - distance);
    // En el encuentro lateral se conserva una losa entera para recibir el ramal.
    for (const junction of junctions)
      if (Math.abs(distance + length - junction.at) < 1.3)
        length = Math.min(junction.at + 1.3 - distance, total - distance);
    for (const corner of corners)
      if (Math.abs(distance + length - corner) < 1.35)
        length = Math.min(corner + 1.35 - distance, total - distance);
    const start = distance === 0 ? 0 : distance + 0.055;
    const end = distance + length >= total ? total : distance + length - 0.055;
    const run = end - start, half = width / 2 - 0.01 + 0.025 * Math.sin(index * 2.3);
    const border: T.Vector2[] = [];
    const scallop = (n: number) => 0.025 * Math.cos(n / 0.2 * Math.PI * 2);
    // La planta se define en (ancho, largo); las juntas transversales quedan abiertas.
    for (let k = 0; k <= 20; k++) {
      const x = -half + 2 * half * k / 20;
      border.push(new T.Vector2(x, 0.025 + scallop(x)));
    }
    for (let k = 1; k <= 24; k++) {
      const y = run * k / 24;
      border.push(new T.Vector2(half + scallop(y), y));
    }
    for (let k = 1; k <= 20; k++) {
      const x = half - 2 * half * k / 20;
      border.push(new T.Vector2(x, run - 0.025 - scallop(x)));
    }
    for (let k = 1; k < 24; k++) {
      const y = run * (1 - k / 24);
      border.push(new T.Vector2(-half - scallop(y), y));
    }
    // El ramal termina exactamente en el borde de la senda bajo carpa.
    // El recorte evita que las tapas de las dos losas se superpongan.
    let clipped: T.Vector2[] = border;
    if (!options.finishedHeight) {
      clipped = [];
      for (let i = 0; i < border.length; i++) {
        const a = border[(i + border.length - 1) % border.length], b = border[i];
        const da = edgeDistance(at(start + a.y, a.x)), db = edgeDistance(at(start + b.y, b.x));
        if ((da >= 0) !== (db >= 0)) clipped.push(a.clone().lerp(b, da / (da - db)));
        if (db >= 0) clipped.push(b);
      }
    }
    const junction = junctions.find(j => start < j.at && end > j.at);
    const isJunction = !!junction;
    if (isJunction) {
      // Una sola pieza en T: elimina el solapamiento entre el corredor y el ramal.
      const center = at(junction!.at), next = at(junction!.at + 0.01);
      const tangent = new T.Vector2(next[0] - center[0], next[1] - center[1]).normalize();
      const normal = new T.Vector2(-tangent.y, tangent.x);
      const origin = junction.points[0], target = junction.points[1];
      const branch = new T.Vector2(target[0] - origin[0], target[1] - origin[1]).normalize();
      const across = new T.Vector2(-branch.y, branch.x), sign = Math.sign(branch.dot(normal));
      const dx = branch.dot(normal) * sign, dy = branch.dot(tangent);
      const nx = across.dot(normal) * sign, ny = across.dot(tangent), halfBranch = (junction!.width ?? 1.6) / 2;
      const ends = [-1, 1].map(edge => {
        const t = (width / 2 - edge * nx * halfBranch) / dx;
        return { join: dy * t + edge * ny * halfBranch,
          outer: [dx * gardenJunctionReach + edge * nx * halfBranch,
            dy * gardenJunctionReach + edge * ny * halfBranch] as Vec2 };
      }).sort((a, b) => a.join - b.join);
      const along = junction!.at - start;
      clipped = [[-width / 2, 0], [width / 2, 0],
        [width / 2, along + ends[0].join], [ends[0].outer[0], along + ends[0].outer[1]],
        [ends[1].outer[0], along + ends[1].outer[1]], [width / 2, along + ends[1].join],
        [width / 2, run], [-width / 2, run]].map(([x, y]) => new T.Vector2(x * sign, y));
    }
    if (clipped.length < 3) { distance += length; index++; continue; }
    let parts = [clipped];
    if(options.pavingJoin) {
      const join=options.pavingJoin, c=Math.cos(join.rect.angle),s=Math.sin(join.rect.angle);
      const local=(p:T.Vector2)=>{
        const q=at(start+p.y,p.x),dx=q[0]-join.rect.center[0],dz=q[1]-join.rect.center[1];
        return new T.Vector2(dx*c+dz*s,-dx*s+dz*c);
      };
      const clip=(poly:T.Vector2[],signed:(p:T.Vector2)=>number)=>{
        const result:T.Vector2[]=[];
        for(let i=0;i<poly.length;i++) {
          const a=poly[(i+poly.length-1)%poly.length],b=poly[i],da=signed(local(a)),db=signed(local(b));
          if((da>=0)!==(db>=0))result.push(a.clone().lerp(b,da/(da-db)));
          if(db>=0)result.push(b);
        }
        return result;
      };
      const middle=clip(clip(clipped,p=>p.x-join.minX),p=>join.maxX-p.x);
      parts=[clip(clipped,p=>join.minX-p.x),clip(clipped,p=>p.x-join.maxX),
        clip(middle,p=>join.frontZ(p.x)-p.y)].filter(p=>p.length>=3);
    }
    for(const part of parts) {
    const geometry = new T.ExtrudeGeometry(new T.Shape(part), { depth: 1, bevelEnabled: false });
    const normals = geometry.attributes.normal;
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const side = positions.getX(i), along = positions.getY(i), layer = positions.getZ(i);
      const point = at(start + along, side);
      let top = topHeight(point, start + along);
      if (isJunction && Math.abs(side) > width / 2 + 1e-5) {
        const a = junction!.points[0], b = junction!.points[1];
        const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
        const branchDistance = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length;
        const blend = T.MathUtils.smoothstep(branchDistance, 1.2, 3.5);
        top = junction!.height ? junction!.height(point)
          : T.MathUtils.lerp(surfaceHeight(point), junction!.ground!(point) + 0.1, blend);
      }
      const bottom = Math.min(surfaceHeight(point) - 0.05, top - 0.14);
      const isCap = Math.abs(normals.getZ(i)) > 0.5;
      positions.setXYZ(i, point[0], T.MathUtils.lerp(bottom, top, layer), point[1]);
      if (isCap) uv.setXY(i, point[0] / 1.6, point[1] / 1.4);
      else uv.setXY(i, (side + along) / 0.65, T.MathUtils.lerp(bottom, top, layer) / 0.65);
    }
    geometry.computeVertexNormals();
    const slab = new T.Mesh(geometry, [material, edgeMaterial]); slab.receiveShadow = true; slab.castShadow = true;
    group.add(slab);
    const body = new T.Mesh(geometry);
    if (options.finishedHeight) body.userData.segmentedWalk = group.name;
    if (isJunction) body.userData.walkJunction = junction!.label ?? true;
    if (!options.finishedHeight) body.userData.gardenSlab = true;
    builder.layers.solid.add(body);
    }
    distance += length; index++;
  }
}
