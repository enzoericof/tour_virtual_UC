import "./style.css";
import type { TourEngine } from "./scene/engine";
import { mountCampusContent } from "./ui/campus-content";
import { mountCommunity } from "./ui/community";
import { mountTourControls } from "./ui/tour-controls";
import { mountTourShell } from "./ui/tour-shell";
import { enterCampus } from "./ui/welcome";

const initialSession = await enterCampus(document.querySelector<HTMLElement>("#app")!);
let engine: TourEngine | undefined;
const shell = mountTourShell(() => engine?.pause());
const loading = document.createElement("div");
loading.className = "tour-panel scene-loading";
loading.setAttribute("role", "status");
loading.textContent = "Preparando tu visita…";
document.querySelector("#app")!.append(loading);
const toolbar = document.querySelector<HTMLElement>("#tour-toolbar")!;
toolbar.inert = true;
// Mostrar el estado de carga antes de construir el escenario.
await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const content = mountCampusContent(shell, () => community.getUser(), place => tour.visit(place));
const tour = mountTourControls(shell, content.select);
engine = tour.engine;
const community = mountCommunity(shell, engine, content.managePanels, initialSession);
loading.remove();
toolbar.inert = false;

// La propiedad es de solo lectura y permite comprobar la escena desde el navegador.
Object.defineProperty(window, "tourDiagnostics", {
  get: () => ({
    scene: tour.engine?.location,
    position: tour.engine?.position.toArray(),
    drawCalls: tour.engine?.renderer.info.render.calls,
    triangles: tour.engine?.renderer.info.render.triangles,
    online: community.isOnline(),
  }),
});
