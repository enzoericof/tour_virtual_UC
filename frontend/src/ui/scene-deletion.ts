import * as T from "three";
import type { TourEngine } from "../scene/engine";
import type { TourShell } from "./tour-shell";

export function mountSceneDeletion(engine: TourEngine, shell: TourShell, closeOptions: () => void) {
  const button = document.querySelector<HTMLButtonElement>("#remove-scene-object")!;
  const canvas = engine.renderer.domElement;
  let active = false;
  let press: { x: number; y: number; id: number } | null = null;
  function setActive(value: boolean) {
    active = value;
    press = null;
    if (value) engine.pause();
    button.textContent = value ? "Salir de eliminar objetos" : "Eliminar objeto";
    button.setAttribute("aria-pressed", String(value));
    canvas.style.cursor = value ? "crosshair" : "";
  }
  button.onclick = () => {
    setActive(!active);
    closeOptions();
    if (active) shell.toast("Hacé clic sobre el objeto que querés eliminar. Esc cancela.");
  };
  window.addEventListener("keydown", event => { if (event.key === "Escape") setActive(false); });
  canvas.addEventListener("pointerdown", event => {
    if (!active) return;
    event.stopImmediatePropagation();
    if (event.button === 0 && event.isPrimary) press = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, true);
  canvas.addEventListener("pointercancel", () => { press = null; });
  canvas.addEventListener("pointerup", event => {
    if (!active) return;
    event.stopImmediatePropagation();
    const start = press; press = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const bounds = canvas.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1), engine.camera);
    const hit = ray.intersectObjects([engine.campus.group, engine.editorPlacements], true)
      .find(hit => { let node: T.Object3D | null = hit.object; while (node) { if (!node.visible) return false; node = node.parent; } return true; });
    if (!hit?.object.userData.removalLabel) {
      shell.toast("Este elemento no admite borrado desde el escenario."); return;
    }
    const object = hit.object;
    const outline = new T.BoxHelper(object, 0xffaa00);
    engine.scene.add(outline);
    setActive(false);
    shell.openDialog('<h2 id="delete-title">¿Eliminar este objeto?</h2><p>El objeto marcado se quitará también de las colisiones. El cambio se guarda solo en este navegador.</p><button id="confirm-scene-delete">Eliminar</button> <button id="cancel-scene-delete">Cancelar</button>', "delete-title");
    const clean = () => { outline.removeFromParent(); outline.geometry.dispose(); (outline.material as T.Material).dispose(); };
    shell.dialog.addEventListener("close", clean, { once: true });
    document.querySelector<HTMLButtonElement>("#cancel-scene-delete")!.onclick = () => shell.closeDialog();
    document.querySelector<HTMLButtonElement>("#confirm-scene-delete")!.onclick = () => {
      if (engine.campus.removals.remove(object)) {
        engine.walker.setWorld(engine.campus.colliders);
        shell.toast("Objeto eliminado. Podés recuperarlo desde Más opciones.");
      } else shell.toast("No se pudo guardar el borrado.");
      shell.closeDialog();
    };
  }, true);
  document.querySelector<HTMLButtonElement>("#restore-scene-objects")!.onclick = () => {
    setActive(false);
    try {
      engine.campus.removals.restore();
      engine.walker.setWorld(engine.campus.colliders);
      shell.toast("Objetos del escenario restaurados.");
    } catch { shell.toast("No se pudo restaurar el escenario."); }
  };
}
