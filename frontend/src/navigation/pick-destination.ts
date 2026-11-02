import * as T from "three";

/** Busca apoyo cerca del punto tocado, sin sustituirlo por un destino del catálogo. */
export function pickDestination(ray: T.Raycaster, world: T.Object3D,
  canStand: (feet: T.Vector3) => boolean): T.Vector3 | null {
  world.updateWorldMatrix(true, true);
  const hit = ray.intersectObject(world, true)[0];
  if (!hit) return null;
  const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld);
  const center = hit.point.clone();
  // En fachadas se busca piso por fuera del muro, del lado visible.
  if (normal && Math.abs(normal.y) < 0.6) center.addScaledVector(normal, 0.4);
  const down = new T.Raycaster(undefined, new T.Vector3(0, -1, 0), 0, 80);
  for (const radius of [0, 0.45, 0.9, 1.35, 1.8, 2.4]) {
    for (let i = 0; i < (radius === 0 ? 1 : 16); i++) {
      const angle = i * Math.PI / 8;
      down.ray.origin.set(center.x + Math.cos(angle) * radius, hit.point.y + 0.4,
        center.z + Math.sin(angle) * radius);
      for (const floor of down.intersectObject(world, true)) {
        const up = floor.face?.normal.clone().transformDirection(floor.object.matrixWorld);
        if (!up || up.y < 0.65) continue;
        const feet = floor.point.clone().add(new T.Vector3(0, 0.04, 0));
        if (canStand(feet)) return feet;
      }
    }
  }
  return null;
}

export function pointerOnCanvas(x: number, y: number,
  bounds: { left: number; top: number; width: number; height: number }): T.Vector2 {
  return new T.Vector2((x - bounds.left) / bounds.width * 2 - 1,
    -(y - bounds.top) / bounds.height * 2 + 1);
}
