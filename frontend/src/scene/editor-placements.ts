import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Colocaciones del editor de mapa 3D.
 *
 * El editor experimental (fuera de Git) guarda acá los modelos que un
 * administrador arrastra sobre el campus. El visor principal solo los lee:
 * no ofrece ninguna herramienta para editarlos, de modo que un usuario normal
 * puede ver el mapa pero no tocarlo.
 *
 * Los datos viven en localStorage del navegador que ejecutó el editor; si no
 * hay datos o los modelos no existen, el visor arranca igual sin cambios.
 */

export const PLACEMENTS_STORAGE_KEY = "cyt-editor-placements";

export type Placement = {
  id: string;
  name: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

const isTriple = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => typeof n === "number" && Number.isFinite(n));

function isPlacement(value: unknown): value is Placement {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.url === "string" &&
    isTriple(item.position) &&
    isTriple(item.rotation) &&
    isTriple(item.scale)
  );
}

/** Valida un valor externo (JSON importado) y devuelve solo colocaciones válidas. */
export function sanitizePlacements(value: unknown): Placement[] {
  return Array.isArray(value) ? value.filter(isPlacement) : [];
}

export function readPlacements(): Placement[] {
  try {
    const raw = localStorage.getItem(PLACEMENTS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizePlacements(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writePlacements(items: Placement[]): void {
  try {
    localStorage.setItem(PLACEMENTS_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("No se pudo guardar la disposición del editor 3D.", error);
  }
}

export function clearPlacements(): void {
  try {
    localStorage.removeItem(PLACEMENTS_STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible; no hay nada que limpiar.
  }
}

/** Carga los modelos guardados dentro de `group` y devuelve los que se pudieron leer. */
export async function loadPlacementsInto(group: T.Group): Promise<Placement[]> {
  const items = readPlacements();
  group.clear();
  const loader = new GLTFLoader();
  await Promise.all(
    items.map(async (item) => {
      try {
        const gltf = await loader.loadAsync(item.url);
        const model = gltf.scene;
        model.position.set(...item.position);
        model.rotation.set(...item.rotation);
        model.scale.set(...item.scale);
        model.userData.editorPlacementId = item.id;
        model.traverse((child) => {
          if ((child as T.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        group.add(model);
      } catch (error) {
        console.warn(
          `No se pudo cargar el modelo "${item.name}" (${item.url}).`,
          error,
        );
      }
    }),
  );
  group.updateMatrixWorld(true);
  return items;
}
