import "./style.css";
import type { TourEngine } from "./scene/engine";
import { mountCampusContent } from "./ui/campus-content";
import { mountCommunity } from "./ui/community";
import { mountTourControls } from "./ui/tour-controls";
import { mountTourShell } from "./ui/tour-shell";

let engine: TourEngine | undefined;
const shell = mountTourShell(() => engine?.pause());
const content = mountCampusContent(shell, () => community.getUser(), place => tour.visit(place));
const tour = mountTourControls(shell, content.select);
engine = tour.engine;
const community = mountCommunity(shell, engine, content.managePanels);

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
