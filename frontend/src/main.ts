import "./style.css";
import { TourEngine } from "./scene/engine";
import type { CampusTheme } from "./scene/campus-sky";
import { places, photoUrl, statusLabel, type Place } from "./data/places";
import { campusName, campusZoneAt } from "./data/campus-zones";
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
$("#app").innerHTML = `
 <main id="viewport"></main>
 <div class="game-pointer" aria-hidden="true"></div>
 <header class="campus-heading">
  <div id="campus-location" class="campus-location" aria-live="polite" aria-atomic="true">
   <small id="campus-zone-detail">Campus Santa Librada</small>
   <h1 id="campus-zone">${campusName}</h1>
  </div>
  <img src="/assets/logo-uc-sapientia.png" width="44" height="44" alt="Universidad Católica">
 </header>
 <div class="tour-guidance">
  <button id="pause-tour" class="pause-tour hidden" aria-label="Pausar recorrido"><kbd>Esc</kbd> Pausar</button>
  <p id="pause-label" class="hidden">En pausa</p>
 </div>
 <nav id="tour-toolbar" class="tour-toolbar" aria-label="Controles del recorrido">
  <button id="begin" class="tour-start">${icon("walk")}<span>Recorrer</span></button>
  <button id="overview" class="hidden" title="Vista general" aria-label="Vista general">${icon("cube")}<span>Vista general</span></button>
  <button id="theme-btn" class="tour-icon" type="button" title="Modo oscuro" aria-label="Modo oscuro">${icon("moon")}</button>
  <button id="more-btn" class="tour-icon" title="Más opciones" aria-label="Más opciones" aria-controls="tour-options" aria-expanded="false">${icon("menu")}</button>
  <button id="account-btn" class="tour-menu" title="Menú de cuenta" aria-controls="tour-account" aria-expanded="false">${icon("user")}<span>Menú</span></button>
 </nav>
 <aside class="explorer tour-panel collapsed" id="explorer" aria-label="Espacios de la facultad"><div class="section-top"><div><h2>Espacios</h2></div><button class="icon-btn" id="close-explorer" aria-label="Cerrar espacios">${icon("close")}</button></div><label class="search">${icon("search")}<input id="search" placeholder="Buscar un espacio…" aria-label="Buscar un espacio"></label><div class="filters"><button data-filter="all" class="selected">Todos</button><button data-filter="outside">Exteriores</button></div><div id="place-list" class="place-list"></div></aside>
 <section id="tour-options" class="tour-popover tour-panel hidden" aria-label="Más opciones">
  <button id="recenter">${icon("cube")} Recentrar cámara</button>
  <button type="button" id="fullscreen-btn" aria-pressed="false">${icon("expand")}<span>Pantalla completa</span></button>
  <button id="help">${icon("help")} Ayuda</button>
 </section>
 <section id="tour-account" class="tour-popover tour-panel hidden" aria-label="Menú de cuenta">
  <button id="account-details">${icon("user")} <span>Ingresar o crear cuenta</span></button>
  <button id="account-works">${icon("book")} <span>Biblioteca de trabajos</span></button>
  <button id="account-chat" class="hidden">${icon("chat")} Chat del campus</button>
  <button id="account-panels" class="hidden">${icon("layers")} Administrar paneles</button>
 </section>
 <dialog id="dialog" class="tour-panel"><button class="icon-btn dialog-close" aria-label="Cerrar">${icon("close")}</button><div id="dialog-content"></div></dialog>
 <div id="toast" role="status" class="toast hidden"></div>
`;
let engine: TourEngine;
let currentMode = "overview";
const hudPanels = { "tour-options": "more-btn", "tour-account": "account-btn" } as const;
type HudPanel = keyof typeof hudPanels;
let activeHudPanel: HudPanel | null = null;
let zoneCandidate = "";
let zoneCandidateSince = 0;
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
}
function closeDialog() {
  $<HTMLDialogElement>("#dialog").close();
}
$(".dialog-close").onclick = closeDialog;
$<HTMLDialogElement>("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) closeDialog();
});
function renderPlaces() {
  const searchable = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const query = searchable($<HTMLInputElement>("#search").value.trim());
  const shown = places.filter(
    (p) =>
      searchable(p.name + " " + p.floor).includes(query) &&
      (filter === "all" ||
        (filter === "outside" &&
          ["patio", "jardin", "plaza", "plaza-abierta"].includes(p.id))),
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
    `<div class="place-detail">${p.photo ? `<img class="detail-hero" src="${photoUrl(p.photo)}" alt="${escape(p.name)}">` : ""}<div class="detail-body"><span class="eyebrow">${escape(p.category)} · ${statusLabel[p.status]}</span><h2>${escape(p.name)}</h2><p class="subtle">${escape(p.floor)}</p><p>${escape(p.description)}</p><div class="actions"><button class="primary" id="visit-place">Ir a ${escape(p.name)} ${icon("arrow")}</button></div><div class="photo-strip">${p.photos.map((id) => `<button data-photo="${id}" aria-label="Ampliar fotografía ${id}"><img src="${photoUrl(id)}" alt="Referencia de ${escape(p.name)}" loading="lazy"></button>`).join("")}</div><div id="info-panels"><p class="subtle">Cargando panel informativo…</p></div></div></div>`,
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
function visit(p: Place) {
  closeDialog();
  setHudPanel(null);
  selected = p;
  engine.go(p);
  renderPlaces();
  $("#begin").focus();
}
function setHudPanel(panel: HudPanel | null, restoreFocus = false) {
  const previous = activeHudPanel;
  activeHudPanel = panel;
  for (const id of Object.keys(hudPanels) as HudPanel[]) {
    $("#" + id).classList.toggle("hidden", panel !== id);
    $("#" + hudPanels[id]).setAttribute("aria-expanded", String(panel === id));
  }
  if (panel) Array.from($("#" + panel).querySelectorAll("button")).find(button => button.getClientRects().length)?.focus();
  else if (restoreFocus && previous) $("#" + hudPanels[previous]).focus();
}
function setLocation(name: string, detail = "Campus Santa Librada") {
  if ($("#campus-zone").textContent === name && $("#campus-zone-detail").textContent === detail) return;
  $("#campus-zone").textContent = name;
  $("#campus-zone-detail").textContent = detail;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $("#campus-location").getAnimations().forEach(animation => animation.cancel());
    $("#campus-location").animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 240 });
  }
}
function syncLocation(now: number, immediate = false) {
  const { x, y, z } = engine.position;
  const { name, detail } = campusZoneAt(x, y - 1.5, z);
  const candidate = `${name}\n${detail}`;
  if (candidate !== zoneCandidate) {
    zoneCandidate = candidate;
    zoneCandidateSince = now;
  }
  if (immediate || now - zoneCandidateSince >= 300) setLocation(name, detail);
}
function syncTheme() {
  const dark = theme === "dark";
  const label = dark ? "Modo claro" : "Modo oscuro";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#102346" : "#f8fbff");
  const button = $<HTMLButtonElement>("#theme-btn");
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon(dark ? "sun" : "moon");
}
function onMode(mode: string) {
  const changed = mode !== currentMode;
  currentMode = mode;
  const walking = mode === "walking";
  const paused = mode === "paused";
  if (walking || paused) document.body.classList.remove("ui-compact");
  document.body.classList.toggle("in-tour", walking || paused);
  document.body.classList.toggle("is-walking", walking);
  $("#pause-tour").classList.toggle("hidden", !walking);
  $("#pause-label").classList.toggle("hidden", !paused);
  $("#tour-toolbar").classList.toggle("hidden", walking);
  $("#overview").classList.toggle("hidden", !paused);
  $("#recenter").classList.toggle("hidden", mode !== "overview");
  $("#begin span").textContent = paused ? "Continuar" : "Recorrer";
  if (mode === "overview") setLocation(campusName);
  else syncLocation(performance.now(), true);
  if (walking) { setHudPanel(null); $("#toast").classList.add("hidden"); }
  if (paused && changed) queueMicrotask(() => {
    if (currentMode === "paused" && !activeHudPanel && !$<HTMLDialogElement>("#dialog").open) $("#begin").focus();
  });
}
syncTheme();
try {
  engine = new TourEngine($("#viewport"), theme);
  engine.onMode = onMode;
  engine.onVisitPosition = syncLocation;
  engine.overview();
  engine.onError = toast;
} catch (e) {
  console.error("No se pudo iniciar la vista 3D", e);
  openDialog(
    `<h2>No se pudo iniciar la vista 3D</h2><p>Recargá la página. Si el problema continúa, revisá el detalle del error y la consola del navegador.</p><p>${escape((e as Error).message)}</p>`,
  );
}
$("#begin").onclick = () => {
  if (currentMode === "overview") visit(places[0]);
  else setHudPanel(null);
  engine.startWalking();
};
$("#pause-tour").onclick = () => engine.pause();
$("#overview").onclick = $("#recenter").onclick = resetOverview;
function resetOverview() {
  engine.overview();
  selected = null;
  renderPlaces();
  setHudPanel(null);
  $("#begin").focus();
}
for (const [id, button] of Object.entries(hudPanels)) {
  $("#" + button).onclick = () => setHudPanel(activeHudPanel === id ? null : id as HudPanel);
}
document.addEventListener("pointerdown", event => {
  if (!activeHudPanel || !(event.target instanceof Element) || $<HTMLDialogElement>("#dialog").open) return;
  if (event.target.closest(`#${activeHudPanel}, #tour-toolbar`)) return;
  setHudPanel(null);
  if (event.target.closest("#viewport")) event.stopPropagation();
}, { capture: true });
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if ($<HTMLDialogElement>("#dialog").open || currentMode === "walking") return;
  if (e.code === "Escape" && activeHudPanel) {
    setHudPanel(null, true);
    return;
  }
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest("input, textarea, select, [contenteditable]")) return;
  if (e.code === "KeyM" && currentMode === "overview") {
    const hidden = document.body.classList.toggle("ui-compact");
    if (hidden) setHudPanel(null);
  }
});
$("#close-explorer").onclick = () => $("#explorer").classList.add("collapsed");
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
$("#theme-btn").onclick = () => {
  theme = theme === "light" ? "dark" : "light";
  engine.setTheme(theme);
  syncTheme();
  try {
    localStorage.setItem(themeKey, theme);
  } catch {
    // La preferencia sigue activa durante esta visita.
  }
};
const fullscreenButton = $<HTMLButtonElement>("#fullscreen-btn");
fullscreenButton.onclick = () => {
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
  const label = active ? "Salir de pantalla completa" : "Pantalla completa";
  fullscreenButton.setAttribute("aria-pressed", String(active));
  fullscreenButton.querySelector("span")!.textContent = label;
});
$("#help").onclick = () => {
  const touch = matchMedia("(pointer: coarse)").matches;
  setHudPanel(null, true);
  openDialog(
    `<div class="tour-help">
      <h2 id="help-title">Controles</h2>
      <div class="help-tabs" role="tablist" aria-label="Dispositivo">
        <button type="button" id="help-desktop-tab" role="tab" aria-selected="${!touch}" aria-controls="help-desktop" tabindex="${touch ? -1 : 0}">${icon("keyboard")}<span>Teclado y mouse</span></button>
        <button type="button" id="help-touch-tab" role="tab" aria-selected="${touch}" aria-controls="help-touch" tabindex="${touch ? 0 : -1}">${icon("phone")}<span>Celular y tablet</span></button>
      </div>
      <section id="help-desktop" class="help-controls" role="tabpanel" aria-labelledby="help-desktop-tab" tabindex="0" ${touch ? "hidden" : ""}>
        <h3>Durante el recorrido</h3>
        <dl class="help-grid">
          <dt><kbd>WASD</kbd> o <kbd>Flechas</kbd></dt><dd>Moverte</dd>
          <dt><kbd>Mouse</kbd></dt><dd>Mirar alrededor</dd>
          <dt><kbd>Shift izq.</kbd></dt><dd>Caminar más rápido</dd>
          <dt><kbd>Espacio</kbd></dt><dd>Saltar</dd>
          <dt><kbd>Clic</kbd></dt><dd>Pulsar el botón resaltado del ascensor</dd>
          <dt><kbd>Esc</kbd></dt><dd>Pausar y liberar el cursor</dd>
        </dl>
        <h3>Vista general</h3>
        <dl class="help-grid">
          <dt><kbd>Arrastrar</kbd></dt><dd>Girar la cámara</dd>
          <dt><kbd>Rueda</kbd></dt><dd>Acercar o alejar</dd>
          <dt><kbd>Clic</kbd></dt><dd>Empezar en ese punto del campus</dd>
          <dt><kbd>M</kbd></dt><dd>Ocultar o mostrar la interfaz</dd>
        </dl>
      </section>
      <section id="help-touch" class="help-controls" role="tabpanel" aria-labelledby="help-touch-tab" tabindex="0" ${touch ? "" : "hidden"}>
        <h3>Vista general</h3>
        <dl class="help-grid">
          <dt><kbd>Arrastrar</kbd></dt><dd>Girar la cámara</dd>
          <dt><kbd>Pellizcar</kbd></dt><dd>Acercar o alejar</dd>
        </dl>
        <p>Para recorrer a pie, usá teclado y mouse.</p>
      </section>
      <footer><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></footer>
    </div>`,
    "help-title",
  );
  const tabs = Array.from($(".help-tabs").querySelectorAll<HTMLButtonElement>("[role=tab]"));
  function selectHelpTab(active: HTMLButtonElement) {
    for (const tab of tabs) {
      const selected = tab === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $("#" + tab.getAttribute("aria-controls")).hidden = !selected;
    }
    active.focus();
  }
  tabs.forEach((tab, i) => {
    tab.onclick = () => selectHelpTab(tab);
    tab.onkeydown = event => {
      const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1)
        : ["ArrowLeft", "ArrowRight"].includes(event.key) ? tabs[1 - i] : undefined;
      if (!next) return;
      event.preventDefault();
      selectHelpTab(next);
    };
  });
};
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
  $("#account-details span").textContent = user ? "Mi cuenta y apariencia" : "Ingresar o crear cuenta";
  $("#account-works span").textContent = user ? "Mis trabajos" : "Biblioteca de trabajos";
  $("#account-chat").classList.toggle("hidden", !user);
  $("#account-panels").classList.toggle("hidden", user?.role !== "ADMIN");
}
$("#account-details").onclick = account;
$("#account-works").onclick = () => void library();
$("#account-chat").onclick = openChat;
$("#account-panels").onclick = () => void managePanels();
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
