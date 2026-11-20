import { campusName } from "../data/campus-zones";
import { element } from "./dom";
import { icon } from "./icons";

export function mountTourShell(pauseTour: () => void) {
  element("#app").innerHTML = `
   <main id="viewport"></main>
   <div class="game-pointer" aria-hidden="true"></div>
   <header id="campus-heading" class="campus-heading">
    <img class="campus-shield" src="/assets/logo-uc-sapientia.png" width="44" height="44" alt="Universidad Católica">
    <div id="campus-location" class="campus-location" aria-live="polite" aria-atomic="true">
     <h1 id="campus-zone">${campusName}</h1>
     <small id="campus-zone-detail">Campus Santa Librada</small>
    </div>
   </header>
   <div class="tour-guidance">
    <button id="pause-tour" class="pause-tour hidden" aria-label="Pausar recorrido"><kbd>Esc</kbd><span>Pausar</span></button>
    <p id="pause-label" class="pause-status hidden" role="status">${icon("pause")}<span>Recorrido en pausa</span></p>
   </div>
   <nav id="tour-toolbar" class="tour-toolbar" aria-label="Controles del recorrido">
    <button id="route-btn" class="tour-start" type="button" aria-controls="tour-route" aria-expanded="false">${icon("walk")}<span>Recorrido</span></button>
    <div class="tour-utilities">
     <button id="more-btn" class="tour-menu" type="button" title="Menú" aria-label="Menú" aria-controls="tour-options" aria-expanded="false">${icon("menu")}<span>Menú</span></button>
    </div>
    <button id="account-btn" class="tour-menu" title="Menú de cuenta" aria-controls="tour-account" aria-expanded="false">${icon("user")}<span>Perfil</span></button>
   </nav>
   <aside class="explorer tour-panel collapsed" id="explorer" aria-label="Espacios de la facultad"><div class="section-top"><div><h2>Espacios</h2></div><button class="icon-btn" id="close-explorer" aria-label="Cerrar espacios">${icon("close")}</button></div><label class="search">${icon("search")}<input id="search" placeholder="Buscar un espacio…" aria-label="Buscar un espacio"></label><div class="filters"><button data-filter="all" class="selected">Todos</button><button data-filter="outside">Exteriores</button></div><div id="place-list" class="place-list"></div></aside>
   <section id="tour-route" class="tour-popover tour-panel hidden" aria-label="Opciones del recorrido">
    <button id="begin" type="button">${icon("walk")}<span>Recorrer campus</span></button>
    <button id="overview" type="button">${icon("cube")}<span>Vista 3D</span></button>
   </section>
   <section id="tour-options" class="tour-popover tour-panel hidden" aria-label="Menú del recorrido">
    <button id="theme-btn" type="button" title="Modo oscuro" aria-label="Modo oscuro">${icon("moon")}<span>Modo oscuro</span></button>
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

  const dialog = element<HTMLDialogElement>("#dialog");
  const dialogContent = element("#dialog-content");
  const notice = element("#toast");
  let toastTimer = 0;

  function toast(message: string) {
    notice.textContent = message;
    notice.classList.remove("hidden");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hideToast, 6500);
  }

  function hideToast() {
    notice.classList.add("hidden");
  }

  function openDialog(html: string, titleId?: string) {
    pauseTour();
    dialogContent.innerHTML = html;
    if (titleId) dialog.setAttribute("aria-labelledby", titleId);
    else dialog.removeAttribute("aria-labelledby");
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog() {
    dialog.close();
  }

  element(".dialog-close").onclick = closeDialog;
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });

  function isDialogContent(node: Node) {
    return dialog.open && dialogContent.contains(node);
  }

  return { dialog, openDialog, closeDialog, isDialogContent, toast, hideToast };
}

export type TourShell = ReturnType<typeof mountTourShell>;
