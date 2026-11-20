import { api } from "./api";

export type Work = {
  id: number;
  titulo: string;
  descripcion: string;
  usuarioId: number;
  materiaId: number;
  materiaNombre: string;
  fechaPublicacion: string;
  fechaActualizacion: string;
};
type WorkPage = {
  contenido: Work[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
};
export type Subject = { id: number; nombre: string; carreras: number[] };
export type WorkInput = { titulo: string; descripcion: string; materiaId: number };
export type WorkScope = "mine" | "all";

export function listWorks(scope: WorkScope, pagina: number) {
  const path = scope === "mine" ? "/trabajos/mis-trabajos" : "/trabajos";
  return api<WorkPage>(`${path}?pagina=${pagina}&tamano=20`);
}
export function listSubjects() {
  return api<Subject[]>("/materias");
}
export function saveWork(data: WorkInput, id?: number) {
  return api<Work>(id === undefined ? "/trabajos" : `/trabajos/${id}`, {
    method: id === undefined ? "POST" : "PUT",
    body: JSON.stringify(data),
  });
}
export function deleteWork(id: number) {
  return api<void>(`/trabajos/${id}`, { method: "DELETE" });
}
