import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import publishedMap from "../data/editor-placements.json";
import { modelUrl } from "../editor/model-catalog";
import { sanitizePlacements, type Placement } from "../editor/placements-schema";

/**
 * Colocaciones del editor de mapa 3D.
 *
 * El editor experimental (`frontend/editor/`) arma el mapa y el visor principal
 * solo lo lee: no ofrece ninguna herramienta para editarlo, de modo que un
 * usuario normal puede ver el mapa pero no tocarlo.
 *
 * Hay dos copias de la misma lista:
 *
 * - **Publicada:** `src/data/editor-placements.json`, versionada en Git. Es lo
 *   que ven todos los visitantes, incluidos el sitio desplegado y los equipos de
 *   los compañeros, porque viaja con el código.
 * - **Borrador:** `localStorage` del navegador donde se está editando. Solo lo ve
 *   quien edita y se comparte al reemplazar el archivo publicado desde el editor
 *   con «Publicar mapa». Antes el borrador era lo único que existía, así que los
 *   modelos colocados no llegaban a los demás.
 *
 * Las colocaciones guardan el nombre del archivo del modelo y no su URL: Vite
 * renombra cada `.glb` con un hash distinto en cada compilación.
 */

/** Clave del borrador local. Se conserva la del editor anterior para poder migrarlo. */
export const DRAFT_STORAGE_KEY = "cyt-editor-placements";

/** Colocaciones publicadas: el mapa que ven todos los visitantes. */
export const publishedPlacements: Placement[] = sanitizePlacements(publishedMap);

/** Borrador guardado en este navegador, o `null` si todavía no hay uno. */
export function readDraft(): Placement[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return sanitizePlacements(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDraft(items: readonly Placement[]): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("No se pudo guardar el borrador del editor 3D.", error);
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible; no hay nada que limpiar.
  }
}

export type PlacementLoad = {
  /** Colocaciones que se cargaron en la escena. */
  loaded: Placement[];
  /** Modelos que no se pudieron cargar, con el nombre del archivo y el motivo. */
  failed: string[];
};

/**
 * Carga las colocaciones dentro de `group` y devuelve las que fallaron.
 *
 * Un modelo que no existe en el catálogo o que no se puede leer se informa al
 * llamador: antes se descartaba con un `console.warn`, así que desaparecía de la
 * escena sin que nadie se enterara.
 */
export async function loadPlacementsInto(
  group: T.Group,
  items: readonly Placement[] = publishedPlacements,
): Promise<PlacementLoad> {
  group.clear();
  const loader = new GLTFLoader();
  const loaded: Placement[] = [];
  const failed: string[] = [];
  await Promise.all(
    items.map(async (item) => {
      const url = modelUrl(item.model);
      if (!url) {
        failed.push(`${item.model} (no está en frontend/editor-models/)`);
        return;
      }
      try {
        const gltf = await loader.loadAsync(url);
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
        loaded.push(item);
      } catch (error) {
        failed.push(`${item.model} (${(error as Error).message})`);
      }
    }),
  );
  group.updateMatrixWorld(true);
  if (failed.length) {
    console.warn("Modelos del mapa 3D que no se pudieron cargar:", failed.join("; "));
  }
  return { loaded, failed };
}
