import modelDates from "virtual:editor-model-dates";
import { modelLabel, modelFileName, stripAssetHash, type Placement } from "./placements-schema";
import { sortModelsNewestFirst } from "./model-order";

/**
 * Catálogo único de modelos del editor de mapa 3D.
 *
 * La carpeta `frontend/editor-models/` está versionada en Git: Vite descubre los
 * `.glb` y `.gltf` al compilar y entrega la URL de cada archivo para esa
 * compilación. El editor arma la paleta con este catálogo y el visor resuelve
 * las colocaciones del mapa publicado por nombre de archivo, así que una misma
 * colocación funciona en desarrollo, en el sitio publicado y en cada equipo.
 *
 * El último modelo agregado aparece primero; la fecha sale de
 * `virtual:editor-model-dates` (`vite.config.ts`).
 */

// La carpeta `frontend/editor-models/` está fuera de `src`; Vite la publica como
// recurso con hash y `?url` entrega la dirección final de esta compilación.
const modelModules = import.meta.glob(
  ["/editor-models/*.glb", "/editor-models/*.gltf"],
  { query: "?url", import: "default", eager: true },
) as Record<string, string>;

export type PaletteModel = {
  /** Ruta de origen del archivo, por ejemplo `/editor-models/sala_manfred_stark.glb`. */
  id: string;
  /** Nombre visible, sin extensión. */
  name: string;
  /** URL con hash de esta compilación. */
  url: string;
  /** Nombre del archivo, que es lo que guarda una colocación. */
  file: string;
};

const entries: PaletteModel[] = [];
for (const [path, url] of Object.entries(modelModules)) {
  const file = modelFileName(path);
  if (file) entries.push({ id: path, name: modelLabel(file), url, file });
}

/** Modelos del catálogo, del más nuevo al más antiguo. */
export const paletteModels: PaletteModel[] = sortModelsNewestFirst(entries, modelDates);

const urlsByFile = new Map(paletteModels.map((model) => [model.file.toLowerCase(), model.url]));

/**
 * URL de esta compilación para un modelo del catálogo, o `null` si el archivo no
 * existe. Acepta también el nombre con el hash de otra compilación para migrar
 * las colocaciones que guardó la versión anterior del editor.
 */
export function modelUrl(file: string): string | null {
  const direct = urlsByFile.get(file.toLowerCase());
  if (direct) return direct;
  const stripped = stripAssetHash(file);
  return stripped ? urlsByFile.get(stripped.toLowerCase()) ?? null : null;
}

/** Modelo del catálogo que corresponde a un nombre de archivo. */
export function findModel(file: string): PaletteModel | null {
  const wanted = file.toLowerCase();
  const stripped = stripAssetHash(file)?.toLowerCase();
  return (
    paletteModels.find((model) => {
      const candidate = model.file.toLowerCase();
      return candidate === wanted || (stripped ? candidate === stripped : false);
    }) ?? null
  );
}

/** Colocación con el nombre de archivo canónico del catálogo, si el modelo existe. */
export function normalizePlacement(placement: Placement): Placement {
  const known = findModel(placement.model);
  return known && known.file !== placement.model ? { ...placement, model: known.file } : placement;
}
