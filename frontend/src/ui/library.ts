import { ApiError, type User } from "../services/api";
import { deleteWork, listSubjects, listWorks, saveWork, type Work, type WorkScope } from "../services/works";
import { element, escapeHtml } from "./dom";
import { icon } from "./icons";
import type { TourShell } from "./tour-shell";

export function createLibrary(
  { openDialog, isDialogContent, toast }: TourShell,
  getUser: () => User | null,
  openAccount: () => void,
) {
  function showError(container: HTMLElement, error: unknown, retry: () => void) {
    if (!isDialogContent(container)) return;
    const sessionExpired = error instanceof ApiError && error.status === 401;
    container.innerHTML = `<div class="empty-state" role="alert"><h3>${sessionExpired ? "Iniciá sesión para consultar la biblioteca." : "No se pudo cargar la biblioteca."}</h3><p></p><button class="secondary">${sessionExpired ? "Ir a mi cuenta" : "Reintentar"}</button></div>`;
    container.querySelector("p")!.textContent = error instanceof Error ? error.message : "Revisá la conexión e intentá nuevamente.";
    container.querySelector("button")!.onclick = sessionExpired ? openAccount : retry;
  }

  async function library(scope: WorkScope = "mine", pagina = 0): Promise<void> {
    openDialog(
      `<span class="eyebrow">HECHO EN LA FACULTAD</span><h2>Biblioteca de trabajos</h2><p class="subtle">Ideas, proyectos y conocimiento compartido por la comunidad.</p><div class="library-actions" aria-label="Mostrar trabajos"><button id="works-mine" class="${scope === "mine" ? "primary" : "secondary"}" aria-pressed="${scope === "mine"}">Mis trabajos</button><button id="works-all" class="${scope === "all" ? "primary" : "secondary"}" aria-pressed="${scope === "all"}">Todos los trabajos</button><button id="work-new" class="secondary">Publicar un trabajo</button></div><div id="works-list" aria-live="polite"><p>Cargando trabajos…</p></div>`,
    );
    const list = element("#works-list");
    element("#works-mine").onclick = () => void library("mine");
    element("#works-all").onclick = () => void library("all");
    element("#work-new").onclick = () => void editWork(scope, pagina);
    if (!getUser()) {
      showError(list, new ApiError("Necesitás una cuenta para ver los trabajos publicados.", 401), () => void library(scope, pagina));
      return;
    }
    try {
      const page = await listWorks(scope, pagina);
      if (!isDialogContent(list)) return;
      if (pagina > 0 && pagina >= page.totalPaginas) {
        return library(scope, Math.max(0, page.totalPaginas - 1));
      }
      const user = getUser();
      list.innerHTML = page.contenido.length
        ? page.contenido.map((work) => {
          const canEdit = user?.id === work.usuarioId || user?.role === "ADMIN";
          return `<article class="work-card"><span class="eyebrow">${escapeHtml(work.materiaNombre)}</span><h3>${escapeHtml(work.titulo)}</h3><p class="work-description">${escapeHtml(work.descripcion)}</p>${user?.id === work.usuarioId ? '<small class="subtle">Publicado por vos</small>' : ""}${canEdit ? `<div class="library-actions"><button class="text-btn" data-edit-work="${work.id}">Editar</button><button class="text-btn" data-delete-work="${work.id}">Eliminar</button></div>` : ""}</article>`;
        }).join("")
        : `<div class="empty-state">${icon("book")}<h3>${scope === "mine" ? "Todavía no publicaste trabajos." : "Todavía no hay trabajos publicados."}</h3><p>Compartí tu primer trabajo con la comunidad.</p></div>`;
      if (page.totalPaginas > 1) {
        list.insertAdjacentHTML("beforeend", `<nav class="library-actions" aria-label="Páginas de trabajos"><button class="secondary" id="works-prev" ${pagina === 0 ? "disabled" : ""}>Anterior</button><span>Página ${pagina + 1} de ${page.totalPaginas} · ${page.totalElementos} trabajos</span><button class="secondary" id="works-next" ${pagina + 1 >= page.totalPaginas ? "disabled" : ""}>Siguiente</button></nav>`);
        element("#works-prev").onclick = () => void library(scope, pagina - 1);
        element("#works-next").onclick = () => void library(scope, pagina + 1);
      }
      list.querySelectorAll<HTMLButtonElement>("[data-edit-work]").forEach((button) => {
        button.onclick = () => void editWork(scope, pagina, page.contenido.find((work) => work.id === Number(button.dataset.editWork))!);
      });
      list.querySelectorAll<HTMLButtonElement>("[data-delete-work]").forEach((button) => {
        button.onclick = async () => {
          button.disabled = true;
          try {
            await deleteWork(Number(button.dataset.deleteWork));
            if (isDialogContent(list)) {
              toast("Trabajo eliminado.");
              void library(scope, pagina);
            }
          } catch (error) {
            if (isDialogContent(list)) toast(error instanceof Error ? error.message : "No se pudo eliminar el trabajo.");
          } finally {
            button.disabled = false;
          }
        };
      });
    } catch (error) {
      showError(list, error, () => void library(scope, pagina));
    }
  }

  async function editWork(scope: WorkScope, pagina: number, work?: Work) {
    if (!getUser()) { openAccount(); return; }
    openDialog(`<span class="eyebrow">BIBLIOTECA</span><h2>${work ? "Actualizar publicación" : "Publicar un trabajo"}</h2><button id="works-back" class="text-btn">Volver a la biblioteca</button><div id="work-editor"><p>Cargando materias…</p></div>`);
    element("#works-back").onclick = () => void library(scope, pagina);
    const editor = element("#work-editor");
    try {
      const subjects = await listSubjects();
      if (!isDialogContent(editor)) return;
      if (!subjects.length) {
        editor.innerHTML = '<div class="empty-state"><p>No hay materias disponibles para tu cuenta.</p></div>';
        return;
      }
      editor.innerHTML = `<form id="work-form"><label>Título<input name="titulo" required maxlength="150" value="${escapeHtml(work?.titulo ?? "")}"></label><label>Descripción<textarea name="descripcion" required>${escapeHtml(work?.descripcion ?? "")}</textarea></label><label>Materia<select name="materiaId" required><option value="">Seleccioná una materia</option>${subjects.map((subject) => `<option value="${subject.id}" ${subject.id === work?.materiaId ? "selected" : ""}>${escapeHtml(subject.nombre)}</option>`).join("")}</select></label><button class="primary" type="submit">${work ? "Guardar cambios" : "Publicar trabajo"}</button><p class="form-error" role="alert"></p></form>`;
      const form = element<HTMLFormElement>("#work-form");
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      const errorText = form.querySelector<HTMLElement>(".form-error")!;
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (submit.disabled) return;
        const data = new FormData(form);
        submit.disabled = true;
        errorText.textContent = "";
        try {
          await saveWork({ titulo: String(data.get("titulo")).trim(), descripcion: String(data.get("descripcion")).trim(), materiaId: Number(data.get("materiaId")) }, work?.id);
          if (isDialogContent(form)) {
            toast(work ? "Trabajo actualizado." : "Tu trabajo está publicado.");
            void library(work ? scope : "mine", work ? pagina : 0);
          }
        } catch (error) {
          if (isDialogContent(form)) errorText.textContent = error instanceof Error ? error.message : "No se pudo guardar el trabajo.";
        } finally {
          submit.disabled = false;
        }
      };
    } catch (error) {
      showError(editor, error, () => void editWork(scope, pagina, work));
    }
  }

  return library;
}
