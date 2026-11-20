/**
 * Orden de la paleta de modelos del editor de mapa 3D.
 *
 * Los modelos se exportan desde Blender y se dejan en `frontend/editor-models/`
 * a medida que se crean. La paleta muestra primero el último agregado, así que
 * el orden sale de la fecha de modificación que entrega Vite (`vite.config.ts`)
 * y, cuando dos archivos coinciden, del nombre.
 */

export type PaletteModelEntry = { id: string; name: string };

const fileName = (id: string) => id.split("/").pop() ?? id;

/** Copia la lista con los modelos más nuevos primero; los que no tienen fecha van al final. */
export function sortModelsNewestFirst<T extends PaletteModelEntry>(
  models: readonly T[],
  dates: Readonly<Record<string, number>>,
): T[] {
  const modified = (model: T) => dates[fileName(model.id)] ?? 0;
  return [...models].sort(
    (a, b) =>
      modified(b) - modified(a) ||
      a.name.localeCompare(b.name, "es") ||
      a.id.localeCompare(b.id),
  );
}
