/**
 * Esquema de las colocaciones del editor de mapa 3D.
 *
 * Una colocación recuerda **qué** modelo del catálogo se usó y **dónde** va. No
 * guarda la URL: Vite renombra cada `.glb` con un hash distinto en cada
 * compilación, de modo que una dirección guardada ayer deja de existir hoy. El
 * nombre del archivo (`model`) se resuelve al cargar y funciona igual en
 * `npm run dev`, en el sitio publicado y en el equipo de cada compañero.
 *
 * El mapa compartido vive en `src/data/editor-placements.json`; el editor
 * trabaja sobre un borrador en `localStorage` que recién se comparte cuando se
 * publica. Este módulo no usa Three.js ni servicios del navegador para poder
 * probarse con `node --test`.
 */

export type Placement = {
  id: string;
  name: string;
  /** Nombre del archivo dentro de `frontend/editor-models/`, por ejemplo `sala_manfred_stark.glb`. */
  model: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

const MODEL_FILE = /^[^/\\]+\.(glb|gltf)$/i;

/** Nombre de archivo glTF a partir de un nombre suelto o de una URL, o `null` si no lo es. */
export function modelFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.split(/[\\/]/).pop()?.trim() ?? "";
  return MODEL_FILE.test(name) ? name : null;
}

/** Nombre visible de un modelo: el archivo sin la extensión. */
export function modelLabel(file: string): string {
  return file.replace(/\.(glb|gltf)$/i, "");
}

/**
 * Quita el hash que Vite agrega al nombre de un recurso (`modelo-1a2B3c4D.glb`).
 *
 * El editor anterior guardaba la URL final del modelo. En un build esa URL
 * incluye el hash de esa compilación, que cambia en la siguiente. Al volver al
 * nombre del archivo, la colocación sigue siendo válida.
 */
export function stripAssetHash(file: string): string | null {
  const match = /^(.*?)-[A-Za-z0-9_-]{8,10}(\.glb|\.gltf)$/i.exec(file);
  return match ? `${match[1]}${match[2]}` : null;
}

const isTriple = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => typeof n === "number" && Number.isFinite(n));

const triple = (value: unknown) => (value as [number, number, number]).slice() as [number, number, number];

/**
 * Lee una colocación de un valor externo. Acepta el formato anterior, que
 * guardaba la URL del modelo en `url`, y la convierte al nombre del archivo.
 */
function readPlacement(value: unknown): Placement | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const rawModel = modelFileName(item.model) ?? modelFileName(item.url);
  if (!rawModel) return null;
  const model = stripAssetHash(rawModel) ?? rawModel;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;
  if (!isTriple(item.position) || !isTriple(item.rotation) || !isTriple(item.scale)) return null;
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : modelLabel(model);
  return {
    id,
    name,
    model,
    position: triple(item.position),
    rotation: triple(item.rotation),
    scale: triple(item.scale),
  };
}

/**
 * Valida un valor externo (JSON importado, mapa publicado o borrador guardado)
 * y devuelve solo las colocaciones utilizables, sin identificadores repetidos.
 */
export function sanitizePlacements(value: unknown): Placement[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: Placement[] = [];
  for (const entry of value) {
    const placement = readPlacement(entry);
    if (!placement || seen.has(placement.id)) continue;
    seen.add(placement.id);
    items.push(placement);
  }
  return items;
}

/** Copia independiente de una lista de colocaciones, para no modificar el mapa publicado. */
export function clonePlacements(items: readonly Placement[]): Placement[] {
  return items.map((item) => ({ ...item, position: [...item.position], rotation: [...item.rotation], scale: [...item.scale] }));
}

/** Texto del mapa listo para guardar como `src/data/editor-placements.json`. */
export function serializePlacements(items: readonly Placement[]): string {
  const map = items.map(({ id, name, model, position, rotation, scale }) => ({ id, name, model, position, rotation, scale }));
  return `${JSON.stringify(map, null, 2)}\n`;
}

/** Identificador único de una colocación nueva. */
export function newPlacementId(now: number = Date.now(), random: () => number = Math.random): string {
  return `p-${now.toString(36)}-${random().toString(36).slice(2, 7)}`;
}
