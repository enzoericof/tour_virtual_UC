export type VisitEnd = "idle" | "pagehide";
export const visitIdleMs = 15 * 60 * 1000;

type Options = {
  target?: EventTarget;
  document?: EventTarget & { visibilityState?: string };
  now?: () => number;
  every?: (check: () => void) => () => void;
};

/** La actividad del usuario mantiene el recorrido; los mensajes del servidor no. */
export function monitorVisit(onEnd: (reason: VisitEnd) => void, options: Options = {}) {
  const target = options.target ?? window;
  const page = options.document ?? document;
  const now = options.now ?? Date.now;
  const listeners = new AbortController();
  let deadline = now() + visitIdleMs;
  let ended = false;
  let cancelTimer = () => {};
  function dispose() { listeners.abort(); cancelTimer(); }
  function end(reason: VisitEnd) {
    if (ended) return;
    ended = true;
    dispose();
    onEnd(reason);
  }
  function check() { if (!ended && now() >= deadline) end("idle"); }
  function activity() {
    check(); // Volver después del plazo no resucita una visita caducada.
    if (!ended) deadline = now() + visitIdleMs;
  }
  const capture = { capture: true, passive: true, signal: listeners.signal };
  for (const event of ["pointerdown", "pointermove", "mousemove", "keydown", "wheel"]) {
    target.addEventListener(event, activity, capture);
  }
  target.addEventListener("focus", check, { signal: listeners.signal });
  page.addEventListener("visibilitychange", () => {
    if (page.visibilityState !== "hidden") check();
  }, { signal: listeners.signal });
  target.addEventListener("pagehide", () => end("pagehide"), { signal: listeners.signal });
  const every = options.every ?? (callback => {
    const timer = window.setInterval(callback, 1000);
    return () => window.clearInterval(timer);
  });
  cancelTimer = every(check);
  return { check, dispose, get ended() { return ended; } };
}

const reasonKey = "cyt-visit-end";
export function rememberVisitEnd(reason: "idle" | "full" = "idle") {
  try { sessionStorage.setItem(reasonKey, reason); } catch { /* El acceso sigue disponible sin almacenamiento. */ }
}
export function consumeVisitEnd(): string {
  try {
    const reason = sessionStorage.getItem(reasonKey);
    sessionStorage.removeItem(reasonKey);
    return reason === "idle" ? "El recorrido se cerró tras 15 minutos sin actividad."
      : reason === "full" ? "El recorrido está completo: hay 10 personas conectadas. Reintentá cuando se libere un lugar." : "";
  } catch { return ""; }
}
