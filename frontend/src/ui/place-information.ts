import type { PlaceInformation } from "../data/place-information";
import type { TourEngine } from "../scene/engine";
import { element, escapeHtml } from "./dom";
import type { TourShell } from "./tour-shell";

export function openPlaceInformation(shell: TourShell, information: PlaceInformation, resume: () => void) {
  shell.openDialog(
    `<article class="place-information">
      <span class="eyebrow">${escapeHtml(information.label)}</span>
      <h2 id="place-information-title">${escapeHtml(information.title)}</h2>
      <p class="subtle">${escapeHtml(information.context)}</p>
      <p class="information-dedication">${escapeHtml(information.dedication)}</p>
      ${information.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      <footer class="information-source"><span class="subtle">Fuente</span><a href="${escapeHtml(information.source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(information.source.label)}</a></footer>
      <div class="actions"><button type="button" class="primary" id="continue-information">Continuar recorrido</button></div>
    </article>`,
    "place-information-title",
  );
  element("#continue-information").onclick = () => {
    shell.closeDialog();
    resume();
  };
}

export function mountPlaceInformation(shell: TourShell, engine: TourEngine) {
  engine.onInformation = information => openPlaceInformation(shell, information, () => engine.startWalking());
}
