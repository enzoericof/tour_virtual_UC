/// <reference types="vite/client" />

declare module "virtual:editor-model-dates" {
  /** Fecha de modificación en milisegundos de cada modelo de `frontend/editor-models/`, por nombre de archivo. */
  const dates: Record<string, number>;
  export default dates;
}
