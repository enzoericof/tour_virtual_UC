import { element } from "./dom";
import { icon } from "./icons";
import type { TourShell } from "./tour-shell";

export function openTourHelp({ openDialog }: TourShell) {
  const touch = matchMedia("(pointer: coarse)").matches;
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
          <dt><kbd>E</kbd></dt><dd>Interactuar con quien mirás de cerca. Sin otro visitante, abrir gestos; junto a un asiento, sentarte o levantarte.</dd>
          <dt><kbd>Enter</kbd></dt><dd>Abrir el chat y su historial. Enviar con Enter; con el campo vacío, volver al recorrido.</dd>
          <dt><kbd>WASD</kbd> / <kbd>Espacio</kbd> al caerte</dt><dd>Dar impulsos al cuerpo. Se levanta automáticamente.</dd>
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
  const tabs = Array.from(element(".help-tabs").querySelectorAll<HTMLButtonElement>("[role=tab]"));
  function selectHelpTab(active: HTMLButtonElement) {
    for (const tab of tabs) {
      const selected = tab === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      element("#" + tab.getAttribute("aria-controls")).hidden = !selected;
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
}
