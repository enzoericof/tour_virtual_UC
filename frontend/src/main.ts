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
import { mapPercent, campusBounds } from "./data/campus-geometry";
import { drawCampusMap } from "./ui/campus-map";
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
 <main id="viewport"></main><div class="vignette"></div>
 <header class="topbar"><button class="brand" id="home" aria-label="Volver al campus"><span class="brand-mark">UC<span>✦</span></span><span><strong>Campus Santa Librada</strong><small>FACULTAD DE CIENCIAS Y TECNOLOGÍA</small></span></button><nav aria-label="Principal"><button id="spaces-btn" class="active">${icon("map")}<span>Explorar</span></button><button id="library-btn">${icon("book")}<span>Biblioteca</span></button><button id="chat-btn">${icon("chat")}<span>Comunidad</span></button></nav><button id="account-btn" class="account">${icon("user")}<span>Ingresar</span></button></header>
 <section class="intro" id="intro"><div class="eyebrow"><span class="dot"></span> TU FACULTAD, DESDE OTRA PERSPECTIVA</div><h1>Un campus.<br>Muchas <em>historias.</em></h1><p>Recorré sus pasillos, descubrí sus espacios<br>y encontrate con la comunidad.</p><button class="primary" id="begin">Comenzar recorrido ${icon("arrow")}</button><div class="intro-note">${icon("walk")} Primera persona <span>·</span> Exploración libre</div></section>
 <aside class="explorer" id="explorer"><div class="section-top"><div><span class="eyebrow">DESCUBRÍ EL CAMPUS</span><h2>Elegí tu próximo lugar</h2></div><button class="icon-btn" id="close-explorer" aria-label="Cerrar espacios">${icon("close")}</button></div><label class="search">${icon("search")}<input id="search" placeholder="Buscar un espacio…" aria-label="Buscar un espacio"></label><div class="filters"><button data-filter="all" class="selected">Todos</button><button data-filter="scan">Escaneos 3D <span>3</span></button><button data-filter="outside">Exteriores</button></div><div id="place-list" class="place-list"></div><div class="explorer-foot">${icon("layers")} Primera versión · referencias reales</div></aside>
 <div class="location-chip" id="location-chip">${icon("pin")}<div><strong id="location-name">Campus Santa Librada</strong><span id="location-floor">Vista general · distribución aproximada</span></div></div>
 <div class="view-switcher" role="group" aria-label="Vistas del campus"><button data-view="campus" aria-pressed="true">Campus completo</button><button data-view="plan" aria-pressed="false">Vista de planta</button><button data-view="faculty" aria-pressed="false">Mi facultad</button></div>
 <div class="tools"><button id="overview" class="icon-btn" title="Vista general" aria-label="Vista general">${icon("cube")}</button><button id="map-btn" class="icon-btn" title="Mapa del campus" aria-label="Mapa del campus">${icon("map")}</button><button id="quality" class="icon-btn" title="Cambiar calidad gráfica" aria-label="Cambiar calidad gráfica">${icon("sun")}</button><button id="fullscreen" class="icon-btn" title="Pantalla completa" aria-label="Pantalla completa">${icon("expand")}</button><button id="help" class="icon-btn" title="Ayuda" aria-label="Ayuda">${icon("help")}</button></div>
 <div class="bottom-bar"><span class="edition">UC <i>/</i> TOUR VIRTUAL <span>2026</span></span><div class="control-hint" id="control-hint">Arrastrá para girar <span>·</span> Rueda para acercarte</div><span class="performance"><i></i><span id="fps">—</span> FPS</span></div>
 <div class="walk-prompt hidden" id="walk-prompt"><span id="walk-prompt-text">Listo para explorar</span><button class="primary" id="resume">${icon("walk")} Entrar al recorrido</button><small>W A S D para moverte · Mouse para mirar · Esc para salir</small><button class="text-btn" id="inspect">Ver modelo completo</button></div>
 <div id="crosshair" class="hidden">+</div><button id="interaction" class="interaction hidden"></button>
 <div class="loading hidden" id="loading"><div class="loading-card"><span class="eyebrow">PREPARANDO TU VISITA</span><h2 id="loading-text">Cargando espacio…</h2><div class="progress"><div id="progress"></div></div><p>Las texturas y los detalles reales están en camino.</p></div></div>
 <dialog id="dialog"><button class="icon-btn dialog-close" aria-label="Cerrar">${icon("close")}</button><div id="dialog-content"></div></dialog>
 <div id="toast" role="status" class="toast hidden"></div>
`;
let engine: TourEngine;
let user: User | null = null;
let selected: Place | null = null;
let filter = "all";
let online = false;
let highQuality = true;
let toastTimer = 0;
const chat = new CampusChat();
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
  $("#dialog-content").innerHTML = html;
  const d = $<HTMLDialogElement>("#dialog");
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
  const query = $<HTMLInputElement>("#search").value.toLowerCase();
  const shown = places.filter(
    (p) =>
      (p.name + " " + p.floor).toLowerCase().includes(query) &&
      (filter === "all" ||
        (filter === "scan" && p.scan) ||
        (filter === "outside" &&
          ["patio", "jardin", "estacionamiento", "plaza"].includes(p.id))),
  );
  $("#place-list").innerHTML = shown.length
    ? shown
        .map(
          (p) =>
            `<button class="place-card ${selected?.id === p.id ? "chosen" : ""}" data-place="${p.id}"><img src="${photoUrl(p.photo)}" alt="" loading="lazy"><span class="place-copy"><small>${escape(p.floor)}</small><strong>${escape(p.name)}</strong><span class="tag ${p.status}">${p.scan ? icon("cube") : ""}${statusLabel[p.status]}</span></span><span class="place-arrow">↗</span></button>`,
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
    `<div class="place-detail"><img class="detail-hero" src="${photoUrl(p.photo)}" alt="${escape(p.name)}"><div class="detail-body"><span class="eyebrow">${escape(p.category)} · ${statusLabel[p.status]}</span><h2>${escape(p.name)}</h2><p class="subtle">${escape(p.floor)}</p><p>${escape(p.description)}</p><div class="actions"><button class="primary" id="visit-place">${p.scan ? "Entrar al escaneo" : "Ir a este espacio"} ${icon("arrow")}</button>${p.scan ? '<button class="secondary" id="place-campus">Ubicar en el campus</button>' : ""}</div><div class="photo-strip">${p.photos.map((id) => `<button data-photo="${id}" aria-label="Ampliar fotografía ${id}"><img src="${photoUrl(id)}" alt="Referencia de ${escape(p.name)}" loading="lazy"></button>`).join("")}</div><div id="info-panels"><p class="subtle">Cargando panel informativo…</p></div></div></div>`,
  );
  $("#visit-place").onclick = () => visit(p);
  if (p.scan)
    $("#place-campus").onclick = () => visit({ ...p, scan: undefined });
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
  $("#intro").classList.add("hidden");
  $("#explorer").classList.add("collapsed");
  selected = p ?? null;
  $("#location-name").textContent = p?.name ?? "Campus Santa Librada";
  $("#location-floor").textContent = p
    ? `${p.floor} · ${statusLabel[p.status]}`
    : "Vista general · distribución aproximada";
  await engine.go(p);
  if (!p) document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === "campus")));
  renderPlaces();
}
function onMode(mode: string) {
  const walking = mode === "walking";
  document.body.classList.toggle("in-tour", walking || mode === "paused");
  $("#crosshair").classList.toggle("hidden", !walking);
  $("#walk-prompt").classList.toggle("hidden", mode !== "paused");
  $(".topbar").classList.toggle("muted", walking);
  $("#control-hint").innerHTML = walking
    ? `<kbd>W A S D</kbd> Moverte <span>·</span> ${engine.walker.fallback ? "Arrastrá para mirar" : "Mouse para mirar"} <span>·</span> <kbd>Esc</kbd> Menú`
    : mode === "paused"
      ? "Recorrido en pausa · retomá cuando quieras"
      : "Arrastrá para girar <span>·</span> Rueda para acercarte";
  if (!walking) $("#interaction").classList.add("hidden");
}
try {
  engine = new TourEngine($("#viewport"));
  engine.onMode = onMode;
  engine.onProgress = (text, percent) => {
    $("#loading").classList.toggle("hidden", !text);
    $("#loading-text").textContent = text;
    $("#progress").style.width = `${Math.round(percent * 100)}%`;
  };
  engine.onStats = (fps) => ($("#fps").textContent = String(fps));
  engine.onError = toast;
  engine.onLocation = (p) => {
    const b = $("#interaction");
    b.classList.toggle("hidden", !p || !engine.walker.active);
    if (p) {
      b.innerHTML = `<kbd>E</kbd> ${escape(p.name)}`;
      b.onclick = () => showPlace(p);
    }
  };
  engine.walker.onInteract = () => {
    const p = engine.nearest();
    if (p) showPlace(p);
  };
} catch (e) {
  openDialog(
    `<h2>No se pudo iniciar la vista 3D</h2><p>Probá un navegador con WebGL y aceleración gráfica habilitada.</p><p>${escape((e as Error).message)}</p>`,
  );
}
$("#begin").onclick = async () => {
  await visit(places[0]);
};
$("#resume").onclick = () => {
  closeDialog();
  engine.startWalking();
};
$("#inspect").onclick = () => {
  if (engine.location === "campus") void setCampusView("faculty");
  else {
    engine.overview();
    document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  }
};
$("#overview").onclick = () => {
  void setCampusView("campus");
};
async function setCampusView(mode: "campus" | "plan" | "faculty") {
  if (engine.location !== "campus") await engine.go();
  engine.overview(mode);
  selected = null;
  renderPlaces();
  $("#intro").classList.add("hidden");
  $("#explorer").classList.add("collapsed");
  $("#location-name").textContent = mode === "faculty" ? "Ciencias y Tecnología" : "Campus Santa Librada";
  $("#location-floor").textContent = mode === "faculty" ? "Recorrido de la facultad · por validar" : mode === "plan" ? "Vista de planta · norte hacia arriba" : "Campus completo · base cartográfica";
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === mode)));
}
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => {
  b.onclick = () => { void setCampusView(b.dataset.view as "campus" | "plan" | "faculty"); };
});
$("#home").onclick = () => {
  void visit();
  $("#intro").classList.remove("hidden");
  $("#explorer").classList.remove("collapsed");
};
$("#spaces-btn").onclick = () => {
  engine.pause();
  $("#explorer").classList.toggle("collapsed");
};
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
    `<span class="eyebrow">TU VISITA, A TU RITMO</span><h2>Cómo recorrer el campus</h2><div class="help-grid"><kbd>W A S D</kbd><p>Caminar. También podés usar las flechas.</p><kbd>Mouse</kbd><p>Mirar alrededor. En vista general, arrastrar y acercar con la rueda.</p><kbd>Shift</kbd><p>Caminar más rápido.</p><kbd>Espacio</kbd><p>Saltar para superar pequeños desniveles.</p><kbd>E</kbd><p>Abrir información del espacio cercano.</p><kbd>Esc</kbd><p>Soltar el cursor y volver al menú.</p></div><p class="subtle">El campus general es una reconstrucción aproximada. Los tres espacios con la etiqueta “Escaneo real” usan tus capturas de Scaniverse. Se recomienda teclado y mouse para caminar; en pantallas táctiles podés inspeccionar modelos y fotografías.</p>`,
  );
$("#map-btn").onclick = () => {
  openDialog(
    `<span class="eyebrow">ORIENTATE EN EL CAMPUS</span><h2>El campus y tu facultad</h2><p class="subtle">Distribución general de Santa Librada. Los puntos numerados corresponden al recorrido de Ciencias y Tecnología.</p><div class="campus-map geographic-map" style="--map-ratio:${(campusBounds.maxX - campusBounds.minX) / (campusBounds.maxZ - campusBounds.minZ)}"><canvas id="geographic-map" aria-label="Plano del campus con Ciencias y Tecnología destacada"></canvas>${places
      .filter(
        (p) =>
          !["piso-1", "piso-2", "aula-p3", "banos", "pasillo-p3"].includes(
            p.id,
          ),
      )
      .map(
        (p, i) =>
          `<button class="map-pin" data-map="${p.id}" style="left:${mapPercent(p.position).left}%;top:${mapPercent(p.position).top}%" title="${escape(p.name)}">${i + 1}</button>`,
      )
      .join("")}</div><div class="map-legend">${places
      .filter(
        (p) =>
          !["piso-1", "piso-2", "aula-p3", "banos", "pasillo-p3"].includes(
            p.id,
          ),
      )
      .map(
        (p, i) =>
          `<button data-map="${p.id}"><span>${i + 1}</span>${escape(p.name)}</button>`,
      )
      .join("")}</div><p class="map-credit">Base: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · Ubicaciones internas por validar.</p>`,
  );
  drawCampusMap($<HTMLCanvasElement>("#geographic-map"));
  document
    .querySelectorAll<HTMLButtonElement>("[data-map]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          showPlace(places.find((p) => p.id === b.dataset.map)!)),
    );
};
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
