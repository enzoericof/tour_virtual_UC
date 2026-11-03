import "./style.css";
import { TourEngine } from "./scene/engine";
import { places, photoUrl, statusLabel, type Place } from "./data/places";
import { icon } from "./ui/icons";
import {
  api,
  login,
  logout,
  safeUrl,
  type User,
  type Work,
  type Panel,
} from "./services/api";
import { CampusChat } from "./services/chat";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
$("#app").innerHTML = `
 <main id="viewport"></main>
 <div class="game-pointer" aria-hidden="true"></div>
 <header class="topbar"><button class="brand" id="home" aria-label="Volver al campus"><span class="brand-mark">UC<span>✦</span></span><span><strong>Ciencias y Tecnología</strong><small>Campus Santa Librada</small></span></button><nav aria-label="Principal"><button aria-label="Explorar" id="spaces-btn" aria-expanded="false" aria-controls="explorer">${icon("map")}<span>Explorar</span></button><button aria-label="Caminar" id="begin">${icon("walk")}<span>Caminar</span></button><button aria-label="Biblioteca" id="library-btn">${icon("book")}<span>Biblioteca</span></button><button aria-label="Comunidad" id="chat-btn">${icon("chat")}<span>Comunidad</span></button><button aria-label="Menú" id="menu-btn" class="menu-btn" aria-expanded="false" aria-controls="menu-panel">${icon("menu")}<span>Menú</span><kbd>M</kbd></button></nav><button aria-label="Cuenta" id="account-btn" class="account">${icon("user")}<span>Ingresar</span></button></header>
 <div class="menu-panel hidden" id="menu-panel" role="region" aria-label="Herramientas"><button class="secondary restore" id="restore-panels">Mostrar paneles <kbd>M</kbd></button></div>
 <aside class="explorer collapsed" id="explorer" aria-label="Espacios de la facultad"><div class="section-top"><div><h2>Espacios</h2></div><button class="icon-btn" id="close-explorer" aria-label="Cerrar espacios">${icon("close")}</button></div><label class="search">${icon("search")}<input id="search" placeholder="Buscar un espacio…" aria-label="Buscar un espacio"></label><div class="filters"><button data-filter="all" class="selected">Todos</button><button data-filter="outside">Exteriores</button></div><div id="place-list" class="place-list"></div></aside>
 <div class="tools"><button id="overview" class="icon-btn" title="Restablecer vista" aria-label="Restablecer vista">${icon("cube")}</button><button id="quality" class="icon-btn" title="Cambiar calidad gráfica" aria-label="Cambiar calidad gráfica">${icon("sun")}</button><button id="fullscreen" class="icon-btn" title="Pantalla completa" aria-label="Pantalla completa">${icon("expand")}</button><button id="help" class="icon-btn" title="Ayuda" aria-label="Ayuda">${icon("help")}</button></div>
 <button id="pause-tour" class="pause-tour hidden" aria-label="ESC · Pausar recorrido"><kbd>ESC</kbd> Pausar</button>
 <section id="walk-prompt" class="pause-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="pause-title">
  <div class="pause-card"><span class="eyebrow">TU RECORRIDO</span><h2 id="pause-title">En pausa</h2>
  <button class="primary pause-resume" id="resume">${icon("walk")} Continuar recorrido</button>
  <div class="pause-options">
   <button data-pause-action="spaces-btn">${icon("map")} Explorar espacios</button>
   <button data-pause-action="library-btn">${icon("book")} Biblioteca</button>
   <button data-pause-action="chat-btn">${icon("chat")} Comunidad</button>
   <button data-pause-action="account-btn">${icon("user")} Mi cuenta</button>
   <button id="pause-place">${icon("help")} Información de este lugar</button>
   <button data-pause-action="quality">${icon("sun")} Calidad gráfica</button>
   <button data-pause-action="fullscreen">${icon("expand")} Pantalla completa</button>
   <button data-pause-action="help">${icon("help")} Ayuda</button>
  </div><button class="text-btn pause-overview" id="inspect">${icon("cube")} Volver a la vista general</button></div>
 </section>
 <dialog id="dialog"><button class="icon-btn dialog-close" aria-label="Cerrar">${icon("close")}</button><div id="dialog-content"></div></dialog>
 <div id="toast" role="status" class="toast hidden"></div>
`;
let engine: TourEngine;
let currentMode = "overview";
let user: User | null = null;
let selected: Place | null = null;
let filter = "all";
let online = false;
let highQuality = true;
let toastTimer = 0;
const chat = new CampusChat();
// M alterna las herramientas; los espacios solo se abren desde Explorar.
const floating = [".tools"].map((selector) => {
  const element = $(selector), mark = document.createComment(selector);
  element.before(mark);
  return { element, mark };
});
function setMenu(open: boolean) {
  $("#menu-panel").classList.toggle("hidden", !open);
  $("#menu-btn").setAttribute("aria-expanded", String(open));
}
function setCompact(compact: boolean) {
  document.body.classList.toggle("ui-compact", compact);
  if (compact) {
    setExplorer(false);
    for (const { element } of floating) $("#menu-panel").insertBefore(element, $("#restore-panels"));
  } else {
    for (const { element, mark } of floating) mark.after(element);
    setMenu(false);
  }
}
const compact = () => document.body.classList.contains("ui-compact");
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => $("#toast").classList.add("hidden"),
    6500,
  );
}
function openDialog(html: string) {
  engine?.pause();
  setMenu(false);
  $("#dialog-content").innerHTML = html;
  const d = $<HTMLDialogElement>("#dialog");
  if (!d.open) d.showModal();
  syncPauseMenu();
}
function closeDialog() {
  $<HTMLDialogElement>("#dialog").close();
}
$("#dialog").addEventListener("close", syncPauseMenu);
$(".dialog-close").onclick = closeDialog;
$<HTMLDialogElement>("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) closeDialog();
});
function renderPlaces() {
  const query = $<HTMLInputElement>("#search").value.toLowerCase();
  const shown = places.filter(
    (p) =>
      (p.name + " " + p.floor).toLowerCase().includes(query) &&
      (filter === "all" ||
        (filter === "outside" &&
          ["patio", "jardin", "estacionamiento", "plaza"].includes(p.id))),
  );
  $("#place-list").innerHTML = shown.length
    ? shown
        .map(
          (p) =>
            `<button class="place-card ${selected?.id === p.id ? "chosen" : ""}" data-place="${p.id}">${p.photo ? `<img src="${photoUrl(p.photo)}" alt="" loading="lazy">` : `<span class="place-placeholder" aria-hidden="true">${icon("cube")}</span>`}<span class="place-copy"><small>${escape(p.floor)}</small><strong>${escape(p.name)}</strong><span class="tag ${p.status}">${p.status === "pending" ? statusLabel[p.status] : ""}</span></span><span class="place-arrow">↗</span></button>`,
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
    `<div class="place-detail">${p.photo ? `<img class="detail-hero" src="${photoUrl(p.photo)}" alt="${escape(p.name)}">` : ""}<div class="detail-body"><span class="eyebrow">${escape(p.category)} · ${statusLabel[p.status]}</span><h2>${escape(p.name)}</h2><p class="subtle">${escape(p.floor)}</p><p>${escape(p.description)}</p><div class="actions"><button class="primary" id="visit-place">Ir a este espacio ${icon("arrow")}</button></div><div class="photo-strip">${p.photos.map((id) => `<button data-photo="${id}" aria-label="Ampliar fotografía ${id}"><img src="${photoUrl(id)}" alt="Referencia de ${escape(p.name)}" loading="lazy"></button>`).join("")}</div><div id="info-panels"><p class="subtle">Cargando panel informativo…</p></div></div></div>`,
  );
  $("#visit-place").onclick = () => visit(p);
  document.querySelectorAll<HTMLButtonElement>("[data-photo]").forEach(
    (b) =>
      (b.onclick = () => {
        openDialog(
          `<img class="full-photo" src="${photoUrl(b.dataset.photo!)}" alt="${escape(p.name)}"><button id="back-place" class="secondary">Volver a ${escape(p.name)}</button>`,
        );
        $("#back-place").onclick = () => showPlace(p);
      }),
  );
  void loadPanels(p);
}
async function loadPanels(p: Place) {
  try {
    const panels = await api<Panel[]>(
      "/panels?placeId=" + encodeURIComponent(p.id),
    );
    if (!$("#info-panels")) return;
    $("#info-panels").innerHTML =
      panels
        .map(
          (panel) =>
            `<article class="info-panel"><span class="eyebrow">PANEL INFORMATIVO</span><h3>${escape(panel.title)}</h3><p>${escape(panel.body)}</p>${panel.url && safeUrl(panel.url) ? `<a href="${escape(safeUrl(panel.url)!)}" target="_blank" rel="noopener noreferrer">Más información ↗</a>` : ""}${user?.role === "ADMIN" ? `<button class="text-btn" data-edit-panel="${panel.id}">Editar panel</button>` : ""}</article>`,
        )
        .join("") ||
      '<p class="subtle">Todavía no hay paneles publicados para este espacio.</p>';
    document
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
    if ($("#info-panels"))
      $("#info-panels").innerHTML =
        '<p class="subtle">Paneles no disponibles: el servicio de contenidos no está conectado. Podés seguir explorando.</p>';
  }
}
function editPanel(p: Place, panel: Panel) {
  openDialog(
    `<span class="eyebrow">ADMINISTRACIÓN</span><h2>Editar panel</h2><form id="panel-form"><label>Título<input name="title" required maxlength="140" value="${escape(panel.title)}"></label><label>Contenido<textarea name="body" required maxlength="5000">${escape(panel.body)}</textarea></label><label>Enlace opcional<input name="url" type="url" value="${escape(panel.url ?? "")}"></label><button class="primary">Guardar cambios</button><p class="form-error" role="alert"></p></form>`,
  );
  $<HTMLFormElement>("#panel-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    try {
      const data = Object.fromEntries(new FormData(form));
      await api("/panels/" + panel.id, {
        method: "PUT",
        body: JSON.stringify({ ...data, placeId: p.id }),
      });
      toast("Panel actualizado.");
      showPlace(p);
    } catch (e) {
      $(".form-error").textContent = (e as Error).message;
    }
  };
}
async function visit(p?: Place) {
  closeDialog();
  setExplorer(false);
  selected = p ?? null;
  await engine.go(p);
  renderPlaces();
}
function syncPauseMenu() {
  const dialogOpen = $<HTMLDialogElement>("#dialog").open;
  const exploring = !$("#explorer").classList.contains("collapsed");
  $("#walk-prompt").classList.toggle("hidden", currentMode !== "paused" || dialogOpen || exploring);
}
function onMode(mode: string) {
  currentMode = mode;
  const walking = mode === "walking";
  document.body.classList.toggle("in-tour", walking || mode === "paused");
  document.body.classList.toggle("is-walking", walking);
  document.body.classList.toggle("is-paused", mode === "paused");
  $("#pause-tour").classList.toggle("hidden", !walking);
  if (walking) { setMenu(false); setExplorer(false); $("#toast").classList.add("hidden"); }
  const nearby = engine?.nearest();
  $<HTMLButtonElement>("#pause-place").disabled = !nearby;
  syncPauseMenu();
  if (mode === "paused") queueMicrotask(() => {
    if (!$("#walk-prompt").classList.contains("hidden")) $("#resume").focus();
  });
}
try {
  engine = new TourEngine($("#viewport"));
  engine.onMode = onMode;
  engine.overview();
  engine.onError = toast;
} catch (e) {
  openDialog(
    `<h2>No se pudo iniciar la vista 3D</h2><p>Probá un navegador con WebGL y aceleración gráfica habilitada.</p><p>${escape((e as Error).message)}</p>`,
  );
}
$("#begin").onclick = async () => {
  await visit(places[0]);
  engine.startWalking();
};
$("#resume").onclick = () => {
  closeDialog();
  engine.startWalking();
};
$("#pause-tour").onclick = () => engine.pause();
$("#pause-place").onclick = () => { const place = engine.nearest(); if (place) showPlace(place); };
document.querySelectorAll<HTMLButtonElement>("[data-pause-action]").forEach((button) => {
  button.onclick = () => $<HTMLButtonElement>("#" + button.dataset.pauseAction!).click();
});
$("#inspect").onclick = resetOverview;
$("#overview").onclick = resetOverview;
function resetOverview() {
  engine.overview();
  selected = null;
  renderPlaces();
  setExplorer(false);
}
$("#menu-btn").onclick = () => setMenu($("#menu-panel").classList.contains("hidden"));
$("#restore-panels").onclick = () => setCompact(false);
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest("input, textarea, select, [contenteditable]") || $<HTMLDialogElement>("#dialog").open) return;
  if (e.code === "Escape") { setMenu(false); setExplorer(false); }
  if (e.code === "KeyM" && currentMode === "overview") setCompact(!compact());
});
document.addEventListener("pointerdown", (e) => {
  if (!(e.target instanceof Element && e.target.closest("#menu-panel, #menu-btn"))) setMenu(false);
});
function setExplorer(open: boolean) {
  $("#explorer").classList.toggle("collapsed", !open);
  $("#spaces-btn").classList.toggle("active", open);
  $("#spaces-btn").setAttribute("aria-expanded", String(open));
  syncPauseMenu();
}
$("#home").onclick = () => { setCompact(false); setExplorer(false); resetOverview(); };
$("#spaces-btn").onclick = () => {
  engine.pause();
  setExplorer($("#explorer").classList.contains("collapsed"));
};
$("#close-explorer").onclick = () => setExplorer(false);
$<HTMLInputElement>("#search").oninput = renderPlaces;
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
$("#quality").onclick = () => {
  highQuality = !highQuality;
  engine.quality(highQuality);
  toast(
    highQuality
      ? "Calidad alta: sombras activadas."
      : "Modo fluido: menor resolución y sombras desactivadas.",
  );
};
$("#fullscreen").onclick = () => {
  void (
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen()
  ).catch(() =>
    toast("La pantalla completa no está disponible en esta vista."),
  );
};
$("#help").onclick = () =>
  openDialog(
    `<span class="eyebrow">TU VISITA, A TU RITMO</span><h2>Cómo recorrer el campus</h2><div class="help-grid"><kbd>W A S D</kbd><p>Caminar. También podés usar las flechas.</p><kbd>Mouse</kbd><p>Mirar alrededor. En vista general, arrastrar y acercar con la rueda.</p><kbd>Shift</kbd><p>Caminar más rápido.</p><kbd>Espacio</kbd><p>Saltar para superar pequeños desniveles.</p><kbd>Esc</kbd><p>Pausar y abrir las opciones del recorrido.</p><kbd>M</kbd><p>Ocultar o mostrar las herramientas en la vista general.</p></div><p class="subtle">El sector de CyT es una reconstrucción aproximada. Se recomienda teclado y mouse para caminar; en pantallas táctiles podés inspeccionar modelos y fotografías.</p><p class="subtle">Base geográfica: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>.</p>`,
  );
function account() {
  if (user) {
    openDialog(
      `<span class="eyebrow">MI CUENTA</span><h2>Hola, ${escape(user.name)}</h2><p>${escape(user.email)}</p><p class="subtle">${user.role === "ADMIN" ? "Administrador de contenidos" : "Miembro de la comunidad"}</p><button class="primary" id="my-works">Mis trabajos</button>${user.role === "ADMIN" ? '<button class="secondary" id="manage-panels">Administrar paneles</button>' : ""}<button class="text-btn" id="logout">Cerrar sesión</button>`,
    );
    $("#my-works").onclick = () => void library();
    if ($("#manage-panels"))
      $("#manage-panels").onclick = () => void managePanels();
    $("#logout").onclick = async () => {
      try {
        await logout();
        user = null;
        await chat.disconnect();
        updateAccount();
        closeDialog();
        toast("Sesión cerrada.");
      } catch (e) {
        toast((e as Error).message);
      }
    };
    return;
  }
  openDialog(
    `<span class="eyebrow">COMUNIDAD UC</span><h2>Nos encontramos acá.</h2><p class="subtle">Ingresá para compartir trabajos y conversar con otros visitantes.</p><div class="auth-tabs"><button id="login-tab" class="selected">Ingresar</button><button id="register-tab">Crear cuenta</button></div><form id="auth-form"><label id="name-label" class="hidden">Nombre<input name="name" maxlength="80" autocomplete="name"></label><label>Correo electrónico<input name="email" type="email" required autocomplete="email" maxlength="180"></label><label>Contraseña<input name="password" type="password" required minlength="10" maxlength="72" autocomplete="current-password"><small>Al menos 10 caracteres.</small></label><button class="primary" id="auth-submit">Ingresar ${icon("arrow")}</button><p class="form-error" role="alert"></p></form>`,
  );
  let register = false;
  $("#register-tab").onclick = () => {
    register = true;
    $("#name-label").classList.remove("hidden");
    $<HTMLInputElement>("[name=name]").required = true;
    $("#auth-submit").textContent = "Crear mi cuenta";
    $("#register-tab").classList.add("selected");
    $("#login-tab").classList.remove("selected");
  };
  $("#login-tab").onclick = () => account();
  $<HTMLFormElement>("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form)) as Record<
      string,
      string
    >;
    const button = $<HTMLButtonElement>("#auth-submit");
    button.disabled = true;
    try {
      if (register)
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(data),
        });
      user = await login(data.email, data.password);
      online = true;
      updateAccount();
      closeDialog();
      toast(`Bienvenido, ${user.name}.`);
    } catch (e) {
      $(".form-error").textContent = (e as Error).message;
    } finally {
      button.disabled = false;
    }
  };
}
function updateAccount() {
  $("#account-btn span").textContent = user?.name ?? "Ingresar";
}
$("#account-btn").onclick = account;
async function library() {
  openDialog(
    `<span class="eyebrow">HECHO EN LA FACULTAD</span><h2>Biblioteca de trabajos</h2><p class="subtle">Ideas, proyectos y conocimiento compartido por la comunidad.</p><div id="works-list"><p>Cargando trabajos…</p></div><div id="work-form-wrap"></div>`,
  );
  try {
    const works = await api<Work[]>("/works");
    $("#works-list").innerHTML = works.length
      ? works
          .map(
            (w) =>
              `<article class="work-card"><span class="eyebrow">${escape(w.author)}</span><h3>${escape(w.title)}</h3><p>${escape(w.description)}</p>${safeUrl(w.url) ? `<a href="${escape(safeUrl(w.url)!)}" target="_blank" rel="noopener noreferrer">Abrir trabajo ↗</a>` : ""}${user?.id === w.ownerId ? `<button class="text-btn" data-edit-work="${w.id}">Editar</button><button class="text-btn" data-delete="${w.id}">Eliminar mi trabajo</button>` : ""}</article>`,
          )
          .join("")
      : '<div class="empty-state">' +
        icon("book") +
        "<h3>Las próximas ideas empiezan con ustedes.</h3><p>Todavía no hay trabajos publicados.</p></div>";
    document.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await api("/works/" + b.dataset.delete, { method: "DELETE" });
            void library();
          } catch (e) {
            toast((e as Error).message);
          }
        }),
    );
    document
      .querySelectorAll<HTMLButtonElement>("[data-edit-work]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            editWork(works.find((w) => w.id === Number(b.dataset.editWork))!)),
      );
    if (user) {
      $("#work-form-wrap").innerHTML =
        `<h3>Publicar un trabajo</h3><form id="work-form"><label>Título<input name="title" required maxlength="140"></label><label>Descripción<textarea name="description" required maxlength="2000"></textarea></label><label>Enlace al documento, presentación o video<input name="url" type="url" required maxlength="2048" placeholder="https://…"></label><button class="primary">Publicar trabajo ${icon("arrow")}</button><p class="form-error" role="alert"></p></form>`;
      $<HTMLFormElement>("#work-form").onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.currentTarget as HTMLFormElement),
        );
        try {
          await api("/works", { method: "POST", body: JSON.stringify(data) });
          toast("Tu trabajo está publicado.");
          void library();
        } catch (e) {
          $(".form-error").textContent = (e as Error).message;
        }
      };
    } else {
      $("#work-form-wrap").innerHTML =
        '<button id="library-login" class="primary">Ingresar para publicar</button>';
      $("#library-login").onclick = account;
    }
  } catch {
    $("#works-list").innerHTML =
      '<div class="empty-state"><h3>La biblioteca no está conectada.</h3><p>Iniciá el servicio de contenidos para consultar y publicar trabajos. El recorrido 3D sigue disponible.</p></div>';
  }
}
$("#library-btn").onclick = () => void library();
$("#chat-btn").onclick = () => {
  if (!user) {
    account();
    return;
  }
  openDialog(
    `<span class="eyebrow">COMUNIDAD EN VIVO</span><h2>Una charla en el campus</h2><p id="chat-status" class="subtle">Conectando…</p><div id="messages" class="messages" role="log" aria-live="polite"><p class="subtle">Los mensajes se comparten con quienes están conectados. No se guarda historial.</p></div><form id="chat-form" class="chat-form"><input name="message" aria-label="Mensaje" placeholder="Escribí un mensaje…" maxlength="500" required autocomplete="off"><button class="primary" aria-label="Enviar mensaje">${icon("arrow")}</button></form>`,
  );
  void chat
    .connect(
      (m) => {
        const log = $("#messages");
        if (!log) return;
        const div = document.createElement("article");
        div.className = "chat-message";
        const name = document.createElement("strong");
        name.textContent = m.name;
        const text = document.createElement("p");
        text.textContent = m.text;
        div.append(name, text);
        log.append(div);
        while (log.childElementCount > 100) log.firstElementChild?.remove();
        log.scrollTop = log.scrollHeight;
      },
      (s) => {
        if ($("#chat-status")) $("#chat-status").textContent = s;
      },
    )
    .catch((e) => {
      if ($("#chat-status"))
        $("#chat-status").textContent = (e as Error).message;
    });
  $<HTMLFormElement>("#chat-form").onsubmit = (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("[name=message]");
    try {
      chat.send(input.value.trim());
      input.value = "";
    } catch (e) {
      toast((e as Error).message);
    }
  };
};
function editWork(work: Work) {
  openDialog(
    `<span class="eyebrow">MI TRABAJO</span><h2>Actualizar publicación</h2><form id="edit-work-form"><label>Título<input name="title" required maxlength="140" value="${escape(work.title)}"></label><label>Descripción<textarea name="description" required maxlength="2000">${escape(work.description)}</textarea></label><label>Enlace<input name="url" type="url" required maxlength="2048" value="${escape(work.url)}"></label><button class="primary">Guardar cambios</button><p class="form-error" role="alert"></p></form>`,
  );
  $<HTMLFormElement>("#edit-work-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/works/" + work.id, {
        method: "PUT",
        body: JSON.stringify(
          Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)),
        ),
      });
      toast("Trabajo actualizado.");
      void library();
    } catch (e) {
      $(".form-error").textContent = (e as Error).message;
    }
  };
}
async function managePanels() {
  openDialog(
    '<span class="eyebrow">ADMINISTRACIÓN</span><h2>Paneles del campus</h2><div id="admin-panels">Cargando…</div>',
  );
  try {
    const panels = await api<Panel[]>("/panels");
    $("#admin-panels").innerHTML =
      panels
        .map(
          (p) =>
            `<article class="work-card"><small>${escape(p.placeId)}</small><h3>${escape(p.title)}</h3><button class="secondary" data-manage="${p.id}">Editar</button><button class="text-btn" data-remove-panel="${p.id}">Eliminar panel</button></article>`,
        )
        .join("") +
      '<button class="primary" id="add-panel">Crear panel</button>';
    $("#add-panel").onclick = () => panelEditor();
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
            void managePanels();
          } catch (e) {
            toast((e as Error).message);
          }
        }),
    );
  } catch (e) {
    $("#admin-panels").textContent = (e as Error).message;
  }
}
function panelEditor(panel?: Panel) {
  openDialog(
    `<span class="eyebrow">CONTENIDO DEL CAMPUS</span><h2>${panel ? "Editar" : "Crear"} panel</h2><form id="admin-panel-form"><label>Espacio<select name="placeId">${places.map((p) => `<option value="${p.id}" ${p.id === panel?.placeId ? "selected" : ""}>${escape(p.name)}</option>`).join("")}</select></label><label>Título<input name="title" required maxlength="140" value="${escape(panel?.title ?? "")}"></label><label>Contenido<textarea name="body" required maxlength="5000">${escape(panel?.body ?? "")}</textarea></label><label>Enlace opcional<input name="url" type="url" maxlength="2048" value="${escape(panel?.url ?? "")}"></label><button class="primary">Guardar panel</button><p class="form-error" role="alert"></p></form>`,
  );
  $<HTMLFormElement>("#admin-panel-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/panels" + (panel ? "/" + panel.id : ""), {
        method: panel ? "PUT" : "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)),
        ),
      });
      toast("Panel guardado.");
      void managePanels();
    } catch (e) {
      $(".form-error").textContent = (e as Error).message;
    }
  };
}
if (matchMedia("(max-width:760px)").matches) $("#explorer").classList.add("collapsed");
renderPlaces();
void api<User>("/auth/me")
  .then((u) => {
    user = u;
    online = true;
    updateAccount();
  })
  .catch(() => {});
void api("/health")
  .then(() => {
    online = true;
  })
  .catch(() => {
    online = false;
  });
// Small read-only diagnostics make build and integration checks reproducible.
Object.defineProperty(window, "tourDiagnostics", {
  get: () => ({
    scene: engine?.location,
    position: engine?.position.toArray(),
    drawCalls: engine?.renderer.info.render.calls,
    triangles: engine?.renderer.info.render.triangles,
    online,
  }),
});
