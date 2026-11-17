import * as T from "three";

const storageKey = "cyt-scene-removals-v1";
const bodies = new WeakMap<T.Object3D, T.Object3D>();
export function registerSceneObject(mesh: T.Mesh, label: string, body?: T.Object3D) {
  const { x, y, z } = mesh.scale;
  // Mantener seleccionables soportes verticales; el resto conserva el agrupado por material.
  if (!(y > 1 && x >= 0.1 && z >= 0.1 && y > Math.max(x, z) * 2)) return;
  mesh.userData.removalLabel = label;
  if (body) bodies.set(mesh, body);
}
export function createSceneRemovals(root: T.Object3D) {
  let removed = new Set<string>();
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (Array.isArray(value)) removed = new Set(value.filter((x): x is string => typeof x === "string"));
  } catch { /* Sin preferencias guardadas. */ }
  const entries = new Map<T.Object3D, { key: string; parent: T.Object3D; body?: T.Object3D; bodyParent?: T.Object3D | null }>();
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof T.Mesh) || !object.userData.removalLabel || !object.parent) return;
    // La huella depende de la geometría y transformación, no del orden de creación ni UUID aleatorios.
    const key = JSON.stringify([object.geometry.type, object.matrixWorld.elements.map(n => Number(n.toFixed(5)))]);
    const body = bodies.get(object);
    entries.set(object, { key, parent: object.parent, body, bodyParent: body?.parent });
  });
  for (const [object, entry] of entries) if (removed.has(entry.key)) {
    object.removeFromParent(); entry.body?.removeFromParent();
  }
  function save() { localStorage.setItem(storageKey, JSON.stringify([...removed])); }
  return {
    remove(object: T.Object3D) {
      const entry = entries.get(object);
      if (!entry) return false;
      removed.add(entry.key);
      try { save(); } catch { removed.delete(entry.key); return false; }
      object.removeFromParent(); entry.body?.removeFromParent();
      return true;
    },
    restore() {
      localStorage.removeItem(storageKey);
      for (const [object, entry] of entries) if (removed.has(entry.key)) {
        entry.parent.add(object);
        if (entry.body && entry.bodyParent) entry.bodyParent.add(entry.body);
      }
      removed.clear();
    },
  };
}
