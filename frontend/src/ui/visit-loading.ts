/** Capa animada que permanece durante validación, descarga y construcción del 3D. */
export function showVisitLoading(root: HTMLElement, message: string) {
  const layer = document.createElement("div");
  layer.className = "visit-loading";
  layer.innerHTML = `<section class="tour-panel loading-card" role="status" aria-live="polite">
    <img src="/assets/logo-uc-sapientia.png" width="44" height="44" alt="Universidad Católica">
    <div class="loading-orbit" aria-hidden="true"></div>
    <h2>Entrando al campus</h2><p class="loading-message"></p>
    <div class="loading-track" aria-hidden="true"><span></span></div>
  </section>`;
  const label = layer.querySelector<HTMLElement>(".loading-message")!;
  label.textContent = message;
  root.append(layer);
  root.setAttribute("aria-busy", "true");
  return {
    setMessage(text: string) { label.textContent = text; },
    hide() { layer.remove(); root.removeAttribute("aria-busy"); },
  };
}

export function paintLoading() {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
