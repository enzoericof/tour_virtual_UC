import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import "./editor.css";
import { TourEngine } from "../scene/engine";
import { currentUser, type User } from "../services/api";
import { findModel, normalizePlacement, paletteModels } from "./model-catalog";
import {
  clonePlacements,
  newPlacementId,
  sanitizePlacements,
  serializePlacements,
  type Placement,
} from "./placements-schema";
import {
  clearDraft,
  loadPlacementsInto,
  publishedPlacements,
  readDraft,
  writeDraft,
} from "../scene/editor-placements";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

async function canEdit(): Promise<{ allowed: boolean; local: boolean; user: User | null }> {
  // `?local=1` permite probar sin backend. Es una puerta local del editor
  // experimental; el visor principal sigue sin exponer herramientas de edición.
  if (new URLSearchParams(location.search).has("local")) {
    return { allowed: true, local: true, user: null };
  }
  try {
    const user = await currentUser();
    return { allowed: user.role === "ADMIN", local: false, user };
  } catch {
    return { allowed: false, local: false, user: null };
  }
}

function renderGate() {
  $("#editor-app").innerHTML = `
    <div id="editor-gate">
      <div class="gate-card">
        <h1>Editor de mapa 3D</h1>
        <p>Solo los administradores pueden tocar el mapa 3D. Iniciá sesión con una cuenta de administrador en el visor y volvé a esta página.</p>
        <a href="/">Abrir el visor</a>
        <div class="dev-note">Prueba local sin backend: agregá <code>?local=1</code> a la dirección de esta página.</div>
      </div>
    </div>`;
}

function renderApp(localMode: boolean) {
  $("#editor-app").innerHTML = `
    <div id="editor-viewport"></div>
    <div id="editor-tour-tools" class="hidden">
      <button id="editor-resume" title="Recorrer" aria-label="Recorrer">Recorrer</button>
      <button id="editor-overview" title="Vista General" aria-label="Vista General">Vista General</button>
    </div>
    <aside id="editor-panel" aria-label="Editor de mapa 3D">
      <header class="editor-header">
        <h1>Editor de mapa 3D</h1>
        <p>Arrastrá un modelo al campus y soltalo donde quieras. El borrador queda en este navegador hasta que publiques el mapa.</p>
        <span class="editor-badge">${localMode ? "Modo local · sin backend" : "Solo administradores"}</span>
        <span class="editor-badge draft hidden" id="draft-badge">Borrador sin publicar</span>
      </header>
      <section class="editor-section"><h2>Modelos (${paletteModels.length})</h2></section>
      <div class="editor-scroll">
        <div class="palette" id="palette">${paletteHtml()}</div>
        <section class="editor-section"><h2>Colocados</h2></section>
        <div class="placed-list" id="placed-list"></div>
      </div>
      <div class="editor-tools">
        <button class="btn-primary" id="publish-map">Publicar mapa</button>
        <button class="btn-ghost" id="discard-draft">Descartar borrador</button>
        <div class="editor-tools-row">
          <button class="btn-ghost" id="export-json">Exportar JSON</button>
          <button class="btn-ghost" id="import-json">Importar JSON</button>
        </div>
        <input type="file" id="import-file" accept="application/json" hidden />
        <button class="btn-danger" id="delete-mode" aria-pressed="false">Eliminar objetos: desactivado</button>
        <button class="btn-danger" id="clear-all">Limpiar todo</button>
        <details class="editor-hints">
          <summary>Ayuda e instrucciones</summary>
          <p class="editor-hint">Publicar descarga <code>editor-placements.json</code>. Guardalo como <code>frontend/src/data/editor-placements.json</code> y hacé commit: recién entonces el mapa aparece para todos y en el sitio publicado.</p>
          <p class="editor-hint">Activá Eliminar objetos y hacé clic en un modelo colocado para quitarlo. Esc sale del modo. Solo se eliminan modelos agregados con el editor.</p>
        </details>
      </div>
    </aside>
    <div id="editor-toast" class="hidden" role="status"></div>`;
  initEditor();
}

function paletteHtml() {
  if (!paletteModels.length) {
    return '<p class="palette-empty">No hay modelos todavía. Exportá archivos .glb o .gltf desde Blender y dejálos en <code>frontend/editor-models/</code>.</p>';
  }
  return paletteModels
    .map(
      (model) => `
        <button class="model-card" draggable="true" data-model="${escapeHtml(model.id)}" title="Arrastrar ${escapeHtml(model.name)}">
          <span class="model-icon">◧</span>
          <span><strong>${escapeHtml(model.name)}</strong><small>${escapeHtml(model.file)}</small></span>
        </button>`,
    )
    .join("");
}

function toast(message: string) {
  const el = $("#editor-toast");
  el.textContent = message;
  el.classList.remove("hidden");
  window.setTimeout(() => el.classList.add("hidden"), 6500);
}

function initEditor() {
  const viewport = $("#editor-viewport");
  // El editor carga su propio borrador; el motor no debe leer el mapa publicado.
  const engine = new TourEngine(viewport, "light", { placements: false });
  const tourTools = $("#editor-tour-tools");
  const resumeButton = $("#editor-resume");
  const overviewButton = $("#editor-overview");
  resumeButton.onclick = () => engine.startWalking();
  overviewButton.onclick = () => engine.overview();
  engine.onMode = (mode) => {
    tourTools.classList.toggle("hidden", mode === "overview");
    resumeButton.classList.toggle("hidden", mode !== "paused");
  };
  engine.overview();

  let deleting = false;
  const deleteButton = $<HTMLButtonElement>("#delete-mode");
  function setDeleting(value: boolean) {
    deleting = value;
    if (value) engine.overview();
    deleteButton.setAttribute("aria-pressed", String(value));
    deleteButton.textContent = `Eliminar objetos: ${value ? "activado" : "desactivado"}`;
    engine.renderer.domElement.style.cursor = value ? "crosshair" : "";
  }
  deleteButton.onclick = () => setDeleting(!deleting);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setDeleting(false);
  });

  const loader = new GLTFLoader();
  // El borrador local manda; sin borrador se parte del mapa publicado.
  const savedDraft = readDraft();
  let hasDraft = savedDraft !== null;
  // Los datos del editor anterior guardaban la URL con el hash de esa compilación:
  // se vuelve al nombre del archivo para que la colocación siga siendo válida.
  let placements: Placement[] = (savedDraft ?? clonePlacements(publishedPlacements)).map(normalizePlacement);

  const ghost = new T.Mesh(
    new T.RingGeometry(0.55, 0.8, 40).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({
      color: 0x16b4dc,
      transparent: true,
      opacity: 0.85,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  ghost.visible = false;
  engine.scene.add(ghost);

  function groundPoint(clientX: number, clientY: number): T.Vector3 | null {
    const bounds = engine.renderer.domElement.getBoundingClientRect();
    const pointer = new T.Vector2(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    const ray = new T.Raycaster();
    ray.setFromCamera(pointer, engine.camera);
    const hits = ray.intersectObject(engine.campus.colliders, true);
    if (!hits.length) return null;
    const hit = hits[0];
    const normal = hit.face?.normal
      .clone()
      .transformDirection(hit.object.matrixWorld);
    if (normal && normal.y > 0.55) {
      return hit.point.clone().add(new T.Vector3(0, 0.02, 0));
    }
    const down = new T.Raycaster(
      new T.Vector3(hit.point.x, hit.point.y + 0.5, hit.point.z),
      new T.Vector3(0, -1, 0),
      0,
      90,
    );
    for (const floor of down.intersectObject(engine.campus.colliders, true)) {
      const up = floor.face?.normal
        .clone()
        .transformDirection(floor.object.matrixWorld);
      if (up && up.y > 0.65) {
        return floor.point.clone().add(new T.Vector3(0, 0.02, 0));
      }
    }
    return null;
  }

  async function placeModel(modelId: string, clientX: number, clientY: number) {
    const model = paletteModels.find((item) => item.id === modelId);
    const ground = groundPoint(clientX, clientY);
    if (!model) {
      toast("No se encontró ese modelo.");
      return;
    }
    if (!ground) {
      toast("No hay una superficie donde soltar el modelo.");
      return;
    }
    toast(`Cargando ${model.name}…`);
    try {
      const gltf = await loader.loadAsync(model.url);
      const object = gltf.scene;
      const box = new T.Box3().setFromObject(object);
      if (box.isEmpty()) throw new Error("El modelo no tiene geometría.");
      const position = new T.Vector3(
        ground.x,
        ground.y - box.min.y,
        ground.z,
      );
      object.position.copy(position);
      object.rotation.set(0, 0, 0);
      object.scale.set(1, 1, 1);
      const placementId = newPlacementId();
      object.userData.editorPlacementId = placementId;
      object.traverse((child) => {
        if ((child as T.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      engine.editorPlacements.add(object);
      engine.refreshPlacementCollisions();
      placements.push({
        id: placementId,
        name: model.name,
        model: model.file,
        position: [position.x, position.y, position.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      });
      save();
      renderPlaced();
      toast(`${model.name} colocado.`);
    } catch (error) {
      console.warn(error);
      toast(`No se pudo cargar ${model.name}. Revisá el archivo.`);
    }
  }

  // El borrador vive en este navegador; recién «Publicar mapa» lo comparte.
  function save() {
    writeDraft(placements);
    hasDraft = true;
    renderDraftState();
  }

  function renderDraftState() {
    $("#draft-badge").classList.toggle("hidden", !hasDraft);
  }

  async function applyMap(items: Placement[]) {
    const { failed } = await loadPlacementsInto(engine.editorPlacements, items);
    engine.refreshPlacementCollisions();
    renderPlaced();
    if (failed.length) {
      toast(
        `No se pudieron cargar ${failed.length} modelo(s): ${failed.join("; ")}. Revisá que el archivo esté en frontend/editor-models/.`,
      );
    }
  }

  function download(text: string, fileName: string) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function findPlacedObject(id: string): T.Object3D | null {
    return (
      engine.editorPlacements.children.find(
        (child) => child.userData.editorPlacementId === id,
      ) ?? null
    );
  }

  function applyPlacementTransform(placement: Placement) {
    const object = findPlacedObject(placement.id);
    if (!object) return;
    object.position.set(...placement.position);
    object.rotation.set(...placement.rotation);
  }

  function renderPlaced() {
    const list = $("#placed-list");
    if (!placements.length) {
      list.innerHTML = '<p class="palette-empty">Todavía no colocaste modelos.</p>';
      return;
    }
    // El último modelo arrastrado queda arriba; el guardado conserva el orden en que se colocó.
    list.innerHTML = [...placements]
      .reverse()
      .map((placement) => {
        const [x, y, z] = placement.position;
        const [rx, ry, rz] = placement.rotation.map((n) =>
          T.MathUtils.radToDeg(n),
        );
        return `
          <div class="placed-card">
            <div class="placed-item">
              <span class="name">${escapeHtml(placement.name)}</span>
              <button class="delete-btn" data-delete="${escapeHtml(placement.id)}" title="Quitar ${escapeHtml(placement.name)}" aria-label="Quitar ${escapeHtml(placement.name)}">×</button>
            </div>
            <div class="placed-fields">
              <label>X<input data-placement="${escapeHtml(placement.id)}" data-field="pos-x" type="number" step="0.1" value="${x.toFixed(2)}"></label>
              <label>Y<input data-placement="${escapeHtml(placement.id)}" data-field="pos-y" type="number" step="0.1" value="${y.toFixed(2)}"></label>
              <label>Z<input data-placement="${escapeHtml(placement.id)}" data-field="pos-z" type="number" step="0.1" value="${z.toFixed(2)}"></label>
              <label>Rot X°<input data-placement="${escapeHtml(placement.id)}" data-field="rot-x" type="number" step="1" value="${rx.toFixed(1)}"></label>
              <label>Rot Y°<input data-placement="${escapeHtml(placement.id)}" data-field="rot-y" type="number" step="1" value="${ry.toFixed(1)}"></label>
              <label>Rot Z°<input data-placement="${escapeHtml(placement.id)}" data-field="rot-z" type="number" step="1" value="${rz.toFixed(1)}"></label>
            </div>
          </div>`;
      })
      .join("");

    list
      .querySelectorAll<HTMLButtonElement>("[data-delete]")
      .forEach(
        (button) => (button.onclick = () => removePlacement(button.dataset.delete!)),
      );

    list
      .querySelectorAll<HTMLInputElement>("[data-placement]")
      .forEach((input) => {
        input.addEventListener("input", () => {
          const id = input.dataset.placement!;
          const placement = placements.find((item) => item.id === id);
          if (!placement) return;
          const value = Number(input.value);
          if (!Number.isFinite(value)) return;
          const field = input.dataset.field!;
          if (field === "pos-x") placement.position[0] = value;
          else if (field === "pos-y") placement.position[1] = value;
          else if (field === "pos-z") placement.position[2] = value;
          else if (field === "rot-x")
            placement.rotation[0] = T.MathUtils.degToRad(value);
          else if (field === "rot-y")
            placement.rotation[1] = T.MathUtils.degToRad(value);
          else if (field === "rot-z")
            placement.rotation[2] = T.MathUtils.degToRad(value);
          applyPlacementTransform(placement);
          save();
        });
      });
  }

  function removePlacement(id: string) {
    placements = placements.filter((placement) => placement.id !== id);
    save();
    for (const child of [...engine.editorPlacements.children]) {
      if (child.userData.editorPlacementId === id) {
        engine.editorPlacements.remove(child);
        const geometries = new Set<T.BufferGeometry>();
        const materials = new Set<T.Material>();
        const textures = new Set<T.Texture>();
        child.traverse((node) => {
          if (!(node instanceof T.Mesh)) return;
          geometries.add(node.geometry);
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            materials.add(material);
            for (const value of Object.values(material)) {
              if (value instanceof T.Texture) textures.add(value);
            }
          }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        textures.forEach((texture) => texture.dispose());
      }
    }
    engine.refreshPlacementCollisions();
    renderPlaced();
    toast("Modelo quitado.");
  }

  const canvas = engine.renderer.domElement;
  let deletePress: { x: number; y: number; id: number } | null = null;
  // Captura antes que los controles del recorrido para no entrar a caminar al borrar.
  canvas.addEventListener("pointerdown", (event) => {
    if (!deleting) return;
    event.stopImmediatePropagation();
    if (event.button === 0 && event.isPrimary) {
      deletePress = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }
  }, true);
  canvas.addEventListener("pointercancel", () => { deletePress = null; });
  canvas.addEventListener("pointerup", (event) => {
    if (!deleting) return;
    event.stopImmediatePropagation();
    const press = deletePress;
    deletePress = null;
    if (!press || press.id !== event.pointerId ||
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
    const bounds = canvas.getBoundingClientRect();
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1,
    ), engine.camera);
    const hit = ray.intersectObject(engine.editorPlacements, true)[0];
    const obstruction = ray.intersectObject(engine.campus.colliders, true)[0];
    if (!hit || (obstruction && obstruction.distance + 0.02 < hit.distance)) {
      toast("Hacé clic sobre un modelo colocado con el editor.");
      return;
    }
    let object: T.Object3D | null = hit.object;
    while (object && !object.userData.editorPlacementId) object = object.parent;
    if (object) removePlacement(object.userData.editorPlacementId as string);
  }, true);
  for (const card of document.querySelectorAll<HTMLButtonElement>(".model-card")) {
    card.addEventListener("dragstart", (event) => {
      const id = card.dataset.model;
      if (!id || !event.dataTransfer) return;
      event.dataTransfer.setData("application/x-cyt-model", id);
      event.dataTransfer.effectAllowed = "copy";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  }

  canvas.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    const point = groundPoint(event.clientX, event.clientY);
    ghost.visible = Boolean(point);
    if (point) {
      ghost.position.copy(point);
      ghost.position.y += 0.02;
    }
  });
  canvas.addEventListener("dragleave", () => {
    ghost.visible = false;
  });
  canvas.addEventListener("drop", (event) => {
    event.preventDefault();
    ghost.visible = false;
    const id = event.dataTransfer?.getData("application/x-cyt-model") ?? "";
    if (id) void placeModel(id, event.clientX, event.clientY);
  });

  $("#publish-map").onclick = async () => {
    const missing = placements.filter((placement) => !findModel(placement.model));
    if (missing.length) {
      toast(
        `Faltan ${missing.length} archivo(s) en frontend/editor-models/: ${[...new Set(missing.map((item) => item.model))].join(", ")}. Publicá igual solo si los agregás.`,
      );
    }
    const jsonText = serializePlacements(placements);
    let savedDirectly = false;
    try {
      const res = await fetch("/api/editor-placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonText,
      });
      if (res.ok) {
        savedDirectly = true;
      }
    } catch {
      // Sin servidor de desarrollo con endpoint directo; se ofrece descarga.
    }

    if (savedDirectly) {
      clearDraft();
      hasDraft = false;
      renderDraftState();
      toast(
        "¡Mapa publicado y guardado en frontend/src/data/editor-placements.json! Hacé commit y push para que aparezca en la nube y para tus compañeros.",
      );
    } else {
      download(jsonText, "editor-placements.json");
      toast(
        "Guardá el archivo descargado como frontend/src/data/editor-placements.json y hacé commit: recién entonces el mapa aparece para todos y en el sitio publicado.",
      );
    }
  };
  $("#export-json").onclick = () => {
    download(serializePlacements(placements), "editor-mapa-cyt.json");
  };
  $("#import-json").onclick = () => $("#import-file").click();
  $("#import-file").addEventListener("change", () => {
    const file = $<HTMLInputElement>("#import-file").files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      try {
        const valid = sanitizePlacements(JSON.parse(text));
        placements = valid;
        save();
        void applyMap(placements);
        toast(`Importados ${valid.length} modelos como borrador.`);
      } catch (error) {
        toast(`No se pudo importar: ${(error as Error).message}`);
      }
    });
  });
  $("#clear-all").onclick = () => {
    if (!placements.length) {
      toast("No hay modelos para limpiar.");
      return;
    }
    if (!window.confirm("¿Quitar todos los modelos colocados del borrador?")) return;
    placements = [];
    save();
    void applyMap(placements);
    toast("Borrador vacío. Publicá el mapa para aplicarlo a todos.");
  };
  $("#discard-draft").onclick = () => {
    if (!hasDraft) {
      toast("No hay borrador: ya ves el mapa publicado.");
      return;
    }
    if (!window.confirm("¿Descartar el borrador y volver al mapa publicado?")) return;
    clearDraft();
    hasDraft = false;
    placements = clonePlacements(publishedPlacements);
    renderDraftState();
    void applyMap(placements);
    toast("Borrador descartado: se muestra el mapa publicado.");
  };

  renderDraftState();
  void applyMap(placements);
}

void (async () => {
  const access = await canEdit();
  if (access.allowed) renderApp(access.local);
  else renderGate();
})();
