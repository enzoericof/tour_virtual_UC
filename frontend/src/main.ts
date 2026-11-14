import "./style.css";
import { TourEngine } from "./scene/engine";
import type { CampusTheme } from "./scene/campus-sky";
import { places, photoUrl, statusLabel, type Place } from "./data/places";
import { icon } from "./ui/icons";
import {
  api,
  currentUser,
  login,
  logout,
  safeUrl,
  type User,
  type Work,
  type Panel,
} from "./services/api";
import { CampusPresence } from "./services/presence";
import { skinIds, skins, type Skin } from "./data/skins";
import { CampusChat } from "./services/chat";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const themeKey = "cyt-theme";
let theme: CampusTheme = "light";
try {
  if (localStorage.getItem(themeKey) === "dark") theme = "dark";
} catch {
  // El visor también funciona cuando el navegador bloquea el almacenamiento local.
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const campusBrand = `<div class="brand"><img class="brand-mark" src="/assets/logo-uc-sapientia.png" width="40" height="40" alt="Universidad Católica"><span><strong>Ciencias y Tecnología</strong><small>Campus Santa Librada</small></span></div>`;
$("#app").innerHTML = `
 <main id="viewport"></main>
 <div class="game-pointer" aria-hidden="true"></div>
 <header class="topbar tour-panel">
  ${campusBrand}
  <nav class="tools tour-actions" aria-label="Controles de la vista general">
   <button id="begin" title="Recorrer" aria-label="Recorrer">${icon("walk")}<span>Recorrer</span></button>
   <button id="overview" title="Vista General" aria-label="Vista General">${icon("cube")}<span>Vista General</span></button>
   <button id="theme">${icon("moon")}<span>Modo Noche</span></button>
   <button id="fullscreen" title="Pantalla Completa" aria-label="Pantalla Completa" aria-pressed="false">${icon("expand")}<span>Pantalla Completa</span></button>
   <button id="help" title="Ayuda" aria-label="Ayuda">${icon("help")}<span>Ayuda</span></button>
  </nav>
  <button id="account-btn" class="account" title="Perfil" aria-label="Perfil">${icon("user")}<span>Perfil</span></button>
 </header>
 <aside class="explorer tour-panel collapsed" id="explorer" aria-label="Espacios de la facultad"><div class="section-top"><div><h2>Espacios</h2></div><button class="icon-btn" id="close-explorer" aria-label="Cerrar espacios">${icon("close")}</button></div><label class="search">${icon("search")}<input id="search" placeholder="Buscar un espacio…" aria-label="Buscar un espacio"></label><div class="filters"><button data-filter="all" class="selected">Todos</button><button data-filter="outside">Exteriores</button></div><div id="place-list" class="place-list"></div></aside>
 <button id="pause-tour" class="pause-tour hidden" aria-label="ESC · Pausar recorrido"><kbd>ESC</kbd> Pausar</button>
 <section id="walk-prompt" class="pause-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="pause-title">
  <div class="pause-card tour-panel">
   ${campusBrand}
   <h2 id="pause-title">En pausa</h2>
   <div class="pause-options tour-actions">
    <button id="resume">${icon("walk")} Recorrer</button>
    <button id="inspect">${icon("cube")} Vista General</button>
    <button data-pause-action="theme">${icon("moon")}<span>Modo Noche</span></button>
    <button data-pause-action="fullscreen" aria-pressed="false">${icon("expand")} Pantalla Completa</button>
    <button data-pause-action="help">${icon("help")} Ayuda</button>
    <button data-pause-action="account-btn">${icon("user")} Perfil</button>
   </div>
  </div>
 </section>
 <dialog id="dialog" class="tour-panel"><button class="icon-btn dialog-close" aria-label="Cerrar">${icon("close")}</button><div id="dialog-content"></div></dialog>
 <div id="toast" role="status" class="toast hidden"></div>
`;
let engine: TourEngine;
let currentMode = "overview";
let user: User | null = null;
let selected: Place | null = null;
let filter = "all";
let online = false;
let toastTimer = 0;
const chat = new CampusChat();
let presenceStatus = "Sin sesión";
const presence = new CampusPresence(
  () => engine?.playerPose() ?? null,
  players => engine?.remotePlayers.receive(players),
  status => {
    presenceStatus = status;
    const label = document.querySelector("#presence-status");
    if (label) label.textContent = status;
  },
);
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => $("#toast").classList.add("hidden"),
    6500,
  );
}
function openDialog(html: string, titleId?: string) {
  engine?.pause();
  $("#dialog-content").innerHTML = html;
  const d = $<HTMLDialogElement>("#dialog");
  if (titleId) d.setAttribute("aria-labelledby", titleId);
  else d.removeAttribute("aria-labelledby");
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
          ["patio", "jardin", "plaza"].includes(p.id))),
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
function syncTheme() {
  const dark = theme === "dark";
  const label = dark ? "Modo Día" : "Modo Noche";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#102346" : "#f8fbff");
  for (const button of document.querySelectorAll<HTMLButtonElement>('#theme, [data-pause-action="theme"]')) {
    button.setAttribute("aria-label", label);
    button.title = label;
    button.querySelector("span")!.textContent = label;
    const glyph = button.querySelector("svg");
    if (glyph) glyph.outerHTML = icon(dark ? "sun" : "moon");
  }
}
function onMode(mode: string) {
  currentMode = mode;
  const walking = mode === "walking";
  document.body.classList.toggle("in-tour", walking || mode === "paused");
  document.body.classList.toggle("is-walking", walking);
  document.body.classList.toggle("is-paused", mode === "paused");
  $("#pause-tour").classList.toggle("hidden", !walking);
  if (walking) { setExplorer(false); $("#toast").classList.add("hidden"); }
  syncPauseMenu();
  if (mode === "paused") queueMicrotask(() => {
    if (!$("#walk-prompt").classList.contains("hidden")) $("#resume").focus();
  });
}
syncTheme();
try {
  engine = new TourEngine($("#viewport"), theme);
  engine.onMode = onMode;
  engine.overview();
  engine.onError = toast;
} catch (e) {
  console.error("No se pudo iniciar la vista 3D", e);
  openDialog(
    `<h2>No se pudo iniciar la vista 3D</h2><p>Recargá la página. Si el problema continúa, revisá el detalle del error y la consola del navegador.</p><p>${escape((e as Error).message)}</p>`,
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
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest("input, textarea, select, [contenteditable]") || $<HTMLDialogElement>("#dialog").open) return;
  if (e.code === "Escape") setExplorer(false);
  if (e.code === "KeyM" && currentMode === "overview") {
    const hidden = document.body.classList.toggle("ui-compact");
    if (hidden) setExplorer(false);
  }
});
function setExplorer(open: boolean) {
  $("#explorer").classList.toggle("collapsed", !open);
  syncPauseMenu();
}
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
$("#theme").onclick = () => {
  theme = theme === "light" ? "dark" : "light";
  engine.setTheme(theme);
  syncTheme();
  try {
    localStorage.setItem(themeKey, theme);
  } catch {
    // La preferencia sigue activa durante esta visita.
  }
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
document.addEventListener("fullscreenchange", () => {
  const active = Boolean(document.fullscreenElement);
  for (const button of document.querySelectorAll<HTMLButtonElement>('#fullscreen, [data-pause-action="fullscreen"]')) {
    button.setAttribute("aria-pressed", String(active));
    button.title = active ? "Salir de pantalla completa" : "Pantalla Completa";
  }
});
$("#help").onclick = () =>
  openDialog(
    `<div class="tour-help">
      <header><h2 id="help-title">${icon("help")} Ayuda del recorrido</h2></header>
      <div class="tour-help-body">
        <section>
          <h3>Vista General</h3>
          <p>Hacé clic en un punto del campus para empezar ahí. Arrastrá para girar y usá la rueda para acercarte o alejarte.</p>
        </section>
        <section>
          <h3>Durante el recorrido</h3>
          <dl class="help-grid">
            <dt>Moverte</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o las flechas</dd>
            <dt>Mirar alrededor</dt><dd>Mové el mouse</dd>
            <dt>Ir más rápido</dt><dd>Mantené <kbd>Shift izq.</kbd></dd>
            <dt>Saltar</dt><dd><kbd>Espacio</kbd></dd>
            <dt>Pausar</dt><dd><kbd>Esc</kbd></dd>
          </dl>
          <p>Para usar el ascensor, apuntá al botón y hacé clic cuando se resalte.</p>
        </section>
        <footer><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></footer>
      </div>
    </div>`,
    "help-title",
  );
function account() {
  if (user) {
    openDialog(
      `<span class="eyebrow">MI CUENTA</span><h2>Hola, ${escape(user.name)}</h2><p>${escape(user.email)}</p><p class="subtle">${user.role === "ADMIN" ? "Administrador de contenidos" : "Miembro de la comunidad"}</p><p class="subtle" id="presence-status">${escape(presenceStatus)}</p><form id="skin-form"><label>Apariencia<select name="skin">${skinIds.map(id => `<option value="${id}" ${id === user?.skin ? "selected" : ""}>${skins[id].name}</option>`).join("")}</select></label><button class="secondary">Guardar apariencia</button><p class="form-error" role="alert"></p></form><button class="primary" id="my-works">Mis trabajos</button><button class="secondary" id="community-chat">Chat del campus</button>${user.role === "ADMIN" ? '<button class="secondary" id="manage-panels">Administrar paneles</button>' : ""}<button class="text-btn" id="logout">Cerrar sesión</button>`,
    );
    $<HTMLFormElement>("#skin-form").onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const skin = new FormData(form).get("skin") as Skin;
      const button = form.querySelector("button")!;
      button.disabled = true;
      try {
        await api("/auth/skin", { method: "PUT", body: JSON.stringify({ skin }) });
        if (user) user.skin = skin;
        toast("Apariencia guardada.");
      } catch (error) {
        form.querySelector(".form-error")!.textContent = (error as Error).message;
      } finally {
        button.disabled = false;
      }
    };
    $("#my-works").onclick = () => void library();
    $("#community-chat").onclick = openChat;
    if ($("#manage-panels"))
      $("#manage-panels").onclick = () => void managePanels();
    $("#logout").onclick = async () => {
      try {
        await logout();
        user = null;
        updateAccount();
        await chat.disconnect();
        closeDialog();
        toast("Sesión cerrada.");
      } catch (e) {
        toast((e as Error).message);
      }
    };
    return;
  }
  openDialog(
    `<span class="eyebrow">COMUNIDAD UC</span><h2>Nos encontramos acá.</h2><p class="subtle">Ingresá para recorrer el campus con otros visitantes y elegir tu apariencia.</p><div class="auth-tabs"><button id="login-tab" class="selected">Ingresar</button><button id="register-tab">Crear cuenta</button></div><form id="auth-form"><fieldset id="register-fields" class="hidden" disabled><label>Nombre<input name="name" maxlength="100" autocomplete="given-name" required></label><label>Apellido<input name="surname" maxlength="100" autocomplete="family-name" required></label><label>Carrera<select name="career" required><option value="1">Ingeniería Informática</option><option value="2">Ingeniería Electrónica</option></select></label></fieldset><label>Correo electrónico<input name="email" type="email" required autocomplete="email" maxlength="150"></label><label>Contraseña<input name="password" type="password" required maxlength="72" autocomplete="current-password"></label><button class="primary" id="auth-submit">Ingresar ${icon("arrow")}</button><p class="form-error" role="alert"></p></form><button class="text-btn" id="account-library">Biblioteca de trabajos</button>`,
  );
  $("#account-library").onclick = () => void library();
  let register = false;
  $("#register-tab").onclick = () => {
    register = true;
    const fields = $<HTMLFieldSetElement>("#register-fields");
    fields.classList.remove("hidden");
    fields.disabled = false;
    $<HTMLInputElement>("[name=password]").minLength = 8;
    $<HTMLInputElement>("[name=password]").autocomplete = "new-password";
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
        await api("/auth/registro", {
          method: "POST",
          body: JSON.stringify({ nombre: data.name, apellido: data.surname, correo: data.email, password: data.password, carrera: Number(data.career) }),
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
  if (user) presence.start();
  else presence.stop();
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
function openChat() {
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
}
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
void currentUser()
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
