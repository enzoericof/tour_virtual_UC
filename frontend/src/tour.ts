import "./style.css";
import { enterCampus } from "./ui/welcome";

// Un documento restaurado desde la caché de navegación también inicia una visita nueva.
window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
const session = await enterCampus(document.querySelector<HTMLElement>("#app")!);
try {
  const { startTour } = await import("./tour-runtime");
  await startTour(session);
} catch (error) {
  console.error("No se pudo abrir el recorrido", error);
  document.body.classList.add("at-welcome");
  document.querySelector("#app")!.removeAttribute("aria-busy");
  document.querySelector<HTMLElement>("#app")!.innerHTML = `<main class="welcome"><section class="welcome-card tour-panel"><h1>No se pudo abrir el recorrido</h1><p>Revisá tu conexión y volvé a intentar.</p><button class="primary" id="retry-tour">Volver a intentar</button></section></main>`;
  document.querySelector<HTMLButtonElement>("#retry-tour")!.onclick = () => location.reload();
}
