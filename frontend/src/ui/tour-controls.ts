import { campusName, campusZoneAt } from "../data/campus-zones";
import { places, type Place } from "../data/places";
import type { CampusTheme } from "../scene/campus-sky";
import { TourEngine, type TourMode } from "../scene/engine";
import { element, escapeHtml } from "./dom";
import { icon } from "./icons";
import { openTourHelp } from "./tour-help";
import { mountPlaceInformation } from "./place-information";
import type { TourShell } from "./tour-shell";

const themeKey = "cyt-theme";
const hudPanels = { "tour-options": "more-btn", "tour-account": "account-btn" } as const;
type HudPanel = keyof typeof hudPanels;
const panelIds = Object.keys(hudPanels) as HudPanel[];

export function mountTourControls(shell: TourShell, selectPlace: (place: Place | null) => void) {
  const { closeDialog, dialog, hideToast, openDialog, toast } = shell;
  let theme: CampusTheme = "light";
  try {
    if (localStorage.getItem(themeKey) === "dark") theme = "dark";
  } catch {
    // El visor también funciona cuando el navegador bloquea el almacenamiento local.
  }
  let engine: TourEngine | undefined;
  let currentMode: TourMode = "overview";
  let activeHudPanel: HudPanel | null = null;
  let zoneCandidate = "";
  let zoneCandidateSince = 0;
  let locationTimer = 0;
  const heading = element("#campus-heading");
  const zone = element("#campus-zone");
  const zoneDetail = element("#campus-zone-detail");

  function visit(place: Place) {
    if (!engine) return;
    closeDialog();
    setHudPanel(null);
    selectPlace(place);
    engine.go(place);
    element("#begin").focus();
  }

  function setHudPanel(panel: HudPanel | null, restoreFocus = false) {
    const previous = activeHudPanel;
    activeHudPanel = panel;
    for (const id of panelIds) {
      element("#" + id).classList.toggle("hidden", panel !== id);
      element("#" + hudPanels[id]).setAttribute("aria-expanded", String(panel === id));
    }
    if (panel) {
      const buttons = [...element("#" + panel).querySelectorAll("button")];
      buttons.find(button => button.getClientRects().length)?.focus();
    } else if (restoreFocus && previous) {
      element("#" + hudPanels[previous]).focus();
    }
  }

  dialog.addEventListener("toggle", () => {
    if (dialog.open) setHudPanel(null);
  });

  function showLocation() {
    heading.classList.add("is-visible");
    window.clearTimeout(locationTimer);
    locationTimer = window.setTimeout(() => heading.classList.remove("is-visible"), 4000);
  }

  function setLocation(name: string, detail = "Campus Santa Librada") {
    if (zone.textContent === name && zoneDetail.textContent === detail) return;
    zone.textContent = name;
    zoneDetail.textContent = detail;
    showLocation();
  }

  function syncLocation(now: number, immediate = false) {
    if (!engine) return;
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
    const button = element<HTMLButtonElement>("#theme-btn");
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon(dark ? "sun" : "moon");
  }

  function onMode(mode: TourMode) {
    const changed = mode !== currentMode;
    currentMode = mode;
    const walking = mode === "walking";
    const paused = mode === "paused";
    if (walking || paused) document.body.classList.remove("ui-compact");
    document.body.classList.toggle("in-tour", walking || paused);
    document.body.classList.toggle("is-walking", walking);
    element("#pause-tour").classList.toggle("hidden", !walking);
    element("#pause-label").classList.toggle("hidden", !paused);
    element("#tour-toolbar").classList.toggle("hidden", walking);
    element("#overview").classList.toggle("hidden", !paused);
    element("#begin span").textContent = paused ? "Continuar" : "Recorrer";
    if (mode === "overview") setLocation(campusName);
    else syncLocation(performance.now(), true);
    if (walking) {
      setHudPanel(null);
      hideToast();
    }
    if (paused && changed) {
      queueMicrotask(() => {
        if (currentMode === "paused" && !activeHudPanel && !dialog.open) element("#begin").focus();
      });
    }
  }

  syncTheme();
  try {
    engine = new TourEngine(element("#viewport"), theme);
    mountPlaceInformation(shell, engine);
    engine.onMode = onMode;
    engine.onVisitPosition = syncLocation;
    engine.overview();
    showLocation();
    engine.onError = toast;
  } catch (e) {
    console.error("No se pudo iniciar la vista 3D", e);
    openDialog(
      `<h2>No se pudo iniciar la vista 3D</h2><p>Recargá la página. Si el problema continúa, revisá el detalle del error y la consola del navegador.</p><p>${escapeHtml((e as Error).message)}</p>`,
    );
  }
  element("#begin").onclick = () => {
    if (currentMode === "overview") visit(places[0]);
    else setHudPanel(null);
    engine?.startWalking();
  };
  element("#pause-tour").onclick = () => engine?.pause();
  element("#overview").onclick = resetOverview;
  function resetOverview() {
    engine?.overview();
    selectPlace(null);
    setHudPanel(null);
    element("#begin").focus();
  }
  for (const id of panelIds) {
    element("#" + hudPanels[id]).onclick = () => setHudPanel(activeHudPanel === id ? null : id);
  }
  document.addEventListener("pointerdown", event => {
    if (!activeHudPanel || !(event.target instanceof Element) || dialog.open) return;
    if (event.target.closest(`#${activeHudPanel}, #tour-toolbar`)) return;
    setHudPanel(null);
    if (event.target.closest("#viewport")) event.stopPropagation();
  }, { capture: true });
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (dialog.open || currentMode === "walking") return;
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

  element("#theme-btn").onclick = () => {
    theme = theme === "light" ? "dark" : "light";
    engine?.setTheme(theme);
    syncTheme();
    try {
      localStorage.setItem(themeKey, theme);
    } catch {
      // La preferencia sigue activa durante esta visita.
    }
  };
  const fullscreenButton = element<HTMLButtonElement>("#fullscreen-btn");
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

  element("#help").onclick = () => {
    setHudPanel(null, true);
    openTourHelp(shell);
  };

  return { engine, visit };
}
