import "./style.css";
import { enterCampus } from "./ui/welcome";
import { AdmissionError, CampusPresence } from "./services/presence";
import { rememberVisitEnd } from "./services/visit-lifecycle";
import { showVisitLoading } from "./ui/visit-loading";

// Un documento restaurado desde la caché de navegación también inicia una visita nueva.
window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
const session = await enterCampus(document.querySelector<HTMLElement>("#app")!);
const root = document.querySelector<HTMLElement>("#app")!;
const presence = new CampusPresence(() => null, () => {}, () => {}, () => {}, error => {
  if (error.reason === "full") rememberVisitEnd("full");
  location.reload();
});
window.addEventListener("pagehide", () => presence.stop(), { once: true });
try {
  showVisitLoading(root, "Comprobando disponibilidad.");
  await presence.admit();
  const { startTour } = await import("./tour-runtime");
  await startTour(session, presence);
} catch (error) {
  presence.stop();
  console.error("No se pudo abrir el recorrido", error);
  document.body.classList.add("at-welcome");
  root.removeAttribute("aria-busy");
  const full = error instanceof AdmissionError && error.reason === "full";
  root.innerHTML = `<main class="welcome"><section class="welcome-card tour-panel"><img src="/assets/logo-uc-sapientia.png" width="44" height="44" alt="Universidad Católica"><h1>${full ? "Recorrido completo" : "No se pudo abrir el recorrido"}</h1><p id="entry-error" role="status"></p><button class="primary" id="retry-tour">Volver a intentar</button></section></main>`;
  root.querySelector("#entry-error")!.textContent = error instanceof AdmissionError ? error.message : "Revisá tu conexión y volvé a intentar.";
  document.querySelector<HTMLButtonElement>("#retry-tour")!.onclick = () => location.reload();
}
