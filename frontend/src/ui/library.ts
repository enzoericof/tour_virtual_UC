import { api, safeUrl, type User, type Work } from "../services/api";
import { element, escapeHtml } from "./dom";
import { icon } from "./icons";
import type { TourShell } from "./tour-shell";

export function createLibrary(
  { openDialog, isDialogContent, toast }: TourShell,
  getUser: () => User | null,
  openAccount: () => void,
) {
  async function library() {
    openDialog(
      `<span class="eyebrow">HECHO EN LA FACULTAD</span><h2>Biblioteca de trabajos</h2><p class="subtle">Ideas, proyectos y conocimiento compartido por la comunidad.</p><div id="works-list"><p>Cargando trabajos…</p></div><div id="work-form-wrap"></div>`,
    );
    const list = element("#works-list");
    const formWrap = element("#work-form-wrap");
    try {
      const works = await api<Work[]>("/works");
      if (!isDialogContent(list)) return;
      const user = getUser();
      list.innerHTML = works.length
        ? works
            .map(
              (w) =>
                `<article class="work-card"><span class="eyebrow">${escapeHtml(w.author)}</span><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.description)}</p>${safeUrl(w.url) ? `<a href="${escapeHtml(safeUrl(w.url)!)}" target="_blank" rel="noopener noreferrer">Abrir trabajo ↗</a>` : ""}${user?.id === w.ownerId ? `<button class="text-btn" data-edit-work="${w.id}">Editar</button><button class="text-btn" data-delete="${w.id}">Eliminar mi trabajo</button>` : ""}</article>`,
            )
            .join("")
        : '<div class="empty-state">' +
          icon("book") +
          "<h3>Las próximas ideas empiezan con ustedes.</h3><p>Todavía no hay trabajos publicados.</p></div>";
      list.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(
        (b) =>
          (b.onclick = async () => {
            try {
              await api("/works/" + b.dataset.delete, { method: "DELETE" });
              if (isDialogContent(list)) void library();
            } catch (e) {
              toast((e as Error).message);
            }
          }),
      );
      list
        .querySelectorAll<HTMLButtonElement>("[data-edit-work]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              editWork(works.find((w) => w.id === Number(b.dataset.editWork))!)),
        );
      if (user) {
        formWrap.innerHTML =
          `<h3>Publicar un trabajo</h3><form id="work-form"><label>Título<input name="title" required maxlength="140"></label><label>Descripción<textarea name="description" required maxlength="2000"></textarea></label><label>Enlace al documento, presentación o video<input name="url" type="url" required maxlength="2048" placeholder="https://…"></label><button class="primary">Publicar trabajo ${icon("arrow")}</button><p class="form-error" role="alert"></p></form>`;
        const form = element<HTMLFormElement>("#work-form");
        form.onsubmit = async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form));
          try {
            await api("/works", { method: "POST", body: JSON.stringify(data) });
            toast("Tu trabajo está publicado.");
            if (isDialogContent(form)) void library();
          } catch (e) {
            form.querySelector(".form-error")!.textContent = (e as Error).message;
          }
        };
      } else {
        formWrap.innerHTML =
          '<button id="library-login" class="primary">Ingresar para publicar</button>';
        element("#library-login").onclick = openAccount;
      }
    } catch {
      if (!isDialogContent(list)) return;
      list.innerHTML =
        '<div class="empty-state"><h3>La biblioteca no está conectada.</h3><p>Iniciá el servicio de contenidos para consultar y publicar trabajos. El recorrido 3D sigue disponible.</p></div>';
    }
  }

  function editWork(work: Work) {
    openDialog(
      `<span class="eyebrow">MI TRABAJO</span><h2>Actualizar publicación</h2><form id="edit-work-form"><label>Título<input name="title" required maxlength="140" value="${escapeHtml(work.title)}"></label><label>Descripción<textarea name="description" required maxlength="2000">${escapeHtml(work.description)}</textarea></label><label>Enlace<input name="url" type="url" required maxlength="2048" value="${escapeHtml(work.url)}"></label><button class="primary">Guardar cambios</button><p class="form-error" role="alert"></p></form>`,
    );
    const form = element<HTMLFormElement>("#edit-work-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api("/works/" + work.id, {
          method: "PUT",
          body: JSON.stringify(
            Object.fromEntries(new FormData(form)),
          ),
        });
        toast("Trabajo actualizado.");
        if (isDialogContent(form)) void library();
      } catch (e) {
        form.querySelector(".form-error")!.textContent = (e as Error).message;
      }
    };
  }

  return library;
}
