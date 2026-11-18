import type { TourEngine } from "./scene/engine";
import { mountCampusContent } from "./ui/campus-content";
import { mountCommunity } from "./ui/community";
import { mountTourControls } from "./ui/tour-controls";
import { mountTourShell } from "./ui/tour-shell";
import type { RegisteredSession } from "./services/session";
import type { CampusPresence } from "./services/presence";
import { monitorVisit, rememberVisitEnd } from "./services/visit-lifecycle";
import { paintLoading, showVisitLoading } from "./ui/visit-loading";

export async function startTour(initialSession: RegisteredSession, presence: CampusPresence) {
  if (!initialSession.user || !initialSession.online) throw new Error("Iniciá sesión para entrar al campus.");
  let engine: TourEngine | undefined;
  const shell = mountTourShell(() => engine?.pause());
  const loading = showVisitLoading(document.querySelector<HTMLElement>("#app")!, "Preparando el campus 3D…");
  const toolbar = document.querySelector<HTMLElement>("#tour-toolbar")!;
  toolbar.inert = true;
  await paintLoading();
  const content = mountCampusContent(shell, () => community.getUser(), place => tour.visit(place));
  const tour = mountTourControls(shell, content.select);
  engine = tour.engine;
  const community = mountCommunity(shell, engine, content.managePanels, initialSession, presence);
  await paintLoading();
  loading.hide();
  toolbar.inert = false;

  monitorVisit(reason => {
    community.endVisit();
    if (reason === "idle") {
      rememberVisitEnd();
      location.reload();
    }
  });
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
}
