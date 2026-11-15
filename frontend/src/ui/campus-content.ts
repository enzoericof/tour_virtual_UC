import { places, photoUrl, statusLabel, type Place } from "../data/places";
import { api, safeUrl, type Panel, type User } from "../services/api";
import { element, escapeHtml } from "./dom";
import { icon } from "./icons";
import type { TourShell } from "./tour-shell";

export function mountCampusContent(
  { openDialog, isDialogContent, toast }: TourShell,
  getUser: () => User | null,
  visit: (place: Place) => void,
) {
  let selected: Place | null = null;
  let filter = "all";

  function renderPlaces() {
    const searchable = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const query = searchable(element<HTMLInputElement>("#search").value.trim());
    const shown = places.filter(
      (p) =>
        searchable(p.name + " " + p.floor).includes(query) &&
        (filter === "all" ||
          (filter === "outside" &&
            ["patio", "jardin", "plaza", "plaza-abierta"].includes(p.id))),
    );
    element("#place-list").innerHTML = shown.length
      ? shown
          .map(
            (p) =>
              `<button class="place-card ${selected?.id === p.id ? "chosen" : ""}" data-place="${p.id}">${p.photo ? `<img src="${photoUrl(p.photo)}" alt="" loading="lazy">` : `<span class="place-placeholder" aria-hidden="true">${icon("cube")}</span>`}<span class="place-copy"><small>${escapeHtml(p.floor)}</small><strong>${escapeHtml(p.name)}</strong><span class="tag ${p.status}">${p.status === "pending" ? statusLabel[p.status] : ""}</span></span><span class="place-arrow">↗</span></button>`,
          )
          .join("")
      : '<p class="empty">No encontramos ese espacio. Probá con otro nombre.</p>';
    document
      .querySelectorAll<HTMLButtonElement>("[data-place]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            showPlace(places.find((p) => p.id === b.dataset.place)!)),
      );
  }
  function showPlace(p: Place) {
    selected = p;
    renderPlaces();
    openDialog(
      `<div class="place-detail">${p.photo ? `<img class="detail-hero" src="${photoUrl(p.photo)}" alt="${escapeHtml(p.name)}">` : ""}<div class="detail-body"><span class="eyebrow">${escapeHtml(p.category)} · ${statusLabel[p.status]}</span><h2>${escapeHtml(p.name)}</h2><p class="subtle">${escapeHtml(p.floor)}</p><p>${escapeHtml(p.description)}</p><div class="actions"><button class="primary" id="visit-place">Ir a ${escapeHtml(p.name)} ${icon("arrow")}</button></div><div class="photo-strip">${p.photos.map((id) => `<button data-photo="${id}" aria-label="Ampliar fotografía ${id}"><img src="${photoUrl(id)}" alt="Referencia de ${escapeHtml(p.name)}" loading="lazy"></button>`).join("")}</div><div id="info-panels"><p class="subtle">Cargando panel informativo…</p></div></div></div>`,
    );
    element("#visit-place").onclick = () => visit(p);
    document.querySelectorAll<HTMLButtonElement>("[data-photo]").forEach(
      (b) =>
        (b.onclick = () => {
          openDialog(
            `<img class="full-photo" src="${photoUrl(b.dataset.photo!)}" alt="${escapeHtml(p.name)}"><button id="back-place" class="secondary">Volver a ${escapeHtml(p.name)}</button>`,
          );
          element("#back-place").onclick = () => showPlace(p);
        }),
    );
    void loadPanels(p, element("#info-panels"));
  }
  async function loadPanels(p: Place, list: HTMLElement) {
    try {
      const panels = await api<Panel[]>(
        "/panels?placeId=" + encodeURIComponent(p.id),
      );
      if (!isDialogContent(list)) return;
      list.innerHTML =
        panels
          .map(
            (panel) =>
              `<article class="info-panel"><span class="eyebrow">PANEL INFORMATIVO</span><h3>${escapeHtml(panel.title)}</h3><p>${escapeHtml(panel.body)}</p>${panel.url && safeUrl(panel.url) ? `<a href="${escapeHtml(safeUrl(panel.url)!)}" target="_blank" rel="noopener noreferrer">Más información ↗</a>` : ""}${getUser()?.role === "ADMIN" ? `<button class="text-btn" data-edit-panel="${panel.id}">Editar panel</button>` : ""}</article>`,
          )
          .join("") ||
        '<p class="subtle">Todavía no hay paneles publicados para este espacio.</p>';
      list
        .querySelectorAll<HTMLButtonElement>("[data-edit-panel]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              editPanel(
                p,
                panels.find((v) => v.id === Number(b.dataset.editPanel))!,
              )),
        );
    } catch {
      if (isDialogContent(list))
        list.innerHTML =
          '<p class="subtle">Paneles no disponibles: el servicio de contenidos no está conectado. Podés seguir explorando.</p>';
    }
  }
  function editPanel(p: Place, panel: Panel) {
    openDialog(
      `<span class="eyebrow">ADMINISTRACIÓN</span><h2>Editar panel</h2><form id="panel-form"><label>Título<input name="title" required maxlength="140" value="${escapeHtml(panel.title)}"></label><label>Contenido<textarea name="body" required maxlength="5000">${escapeHtml(panel.body)}</textarea></label><label>Enlace opcional<input name="url" type="url" value="${escapeHtml(panel.url ?? "")}"></label><button class="primary">Guardar cambios</button><p class="form-error" role="alert"></p></form>`,
    );
    element<HTMLFormElement>("#panel-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      try {
        const data = Object.fromEntries(new FormData(form));
        await api("/panels/" + panel.id, {
          method: "PUT",
          body: JSON.stringify({ ...data, placeId: p.id }),
        });
        toast("Panel actualizado.");
        if (isDialogContent(form)) showPlace(p);
      } catch (e) {
        form.querySelector(".form-error")!.textContent = (e as Error).message;
      }
    };
  }

  async function managePanels() {
    openDialog(
      '<span class="eyebrow">ADMINISTRACIÓN</span><h2>Paneles del campus</h2><div id="admin-panels">Cargando…</div>',
    );
    const list = element("#admin-panels");
    try {
      const panels = await api<Panel[]>("/panels");
      if (!isDialogContent(list)) return;
      list.innerHTML =
        panels
          .map(
            (p) =>
              `<article class="work-card"><small>${escapeHtml(p.placeId)}</small><h3>${escapeHtml(p.title)}</h3><button class="secondary" data-manage="${p.id}">Editar</button><button class="text-btn" data-remove-panel="${p.id}">Eliminar panel</button></article>`,
          )
          .join("") +
        '<button class="primary" id="add-panel">Crear panel</button>';
      element("#add-panel").onclick = () => panelEditor();
      document
        .querySelectorAll<HTMLButtonElement>("[data-manage]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              panelEditor(panels.find((p) => p.id === Number(b.dataset.manage)))),
        );
      document.querySelectorAll<HTMLButtonElement>("[data-remove-panel]").forEach(
        (b) =>
          (b.onclick = async () => {
            try {
              await api("/panels/" + b.dataset.removePanel, { method: "DELETE" });
              if (isDialogContent(list)) void managePanels();
            } catch (e) {
              toast((e as Error).message);
            }
          }),
      );
    } catch (e) {
      if (isDialogContent(list)) list.textContent = (e as Error).message;
    }
  }
  function panelEditor(panel?: Panel) {
    openDialog(
      `<span class="eyebrow">CONTENIDO DEL CAMPUS</span><h2>${panel ? "Editar" : "Crear"} panel</h2><form id="admin-panel-form"><label>Espacio<select name="placeId">${places.map((p) => `<option value="${p.id}" ${p.id === panel?.placeId ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}</select></label><label>Título<input name="title" required maxlength="140" value="${escapeHtml(panel?.title ?? "")}"></label><label>Contenido<textarea name="body" required maxlength="5000">${escapeHtml(panel?.body ?? "")}</textarea></label><label>Enlace opcional<input name="url" type="url" maxlength="2048" value="${escapeHtml(panel?.url ?? "")}"></label><button class="primary">Guardar panel</button><p class="form-error" role="alert"></p></form>`,
    );
    const form = element<HTMLFormElement>("#admin-panel-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api("/panels" + (panel ? "/" + panel.id : ""), {
          method: panel ? "PUT" : "POST",
          body: JSON.stringify(
            Object.fromEntries(new FormData(form)),
          ),
        });
        toast("Panel guardado.");
        if (isDialogContent(form)) void managePanels();
      } catch (e) {
        form.querySelector(".form-error")!.textContent = (e as Error).message;
      }
    };
  }

  element("#close-explorer").onclick = () => element("#explorer").classList.add("collapsed");
  element<HTMLInputElement>("#search").oninput = renderPlaces;
  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter!;
        document
          .querySelectorAll("[data-filter]")
          .forEach((el) => el.classList.toggle("selected", el === b));
        renderPlaces();
      }),
  );

  function select(place: Place | null) {
    selected = place;
    renderPlaces();
  }

  renderPlaces();
  return { select, managePanels };
}
