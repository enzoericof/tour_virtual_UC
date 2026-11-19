import type { TourEngine } from "../scene/engine";
import type { CampusPresence, Player } from "../services/presence";
import {
  gestureNames,
  recentMessages,
  type ChatMessage,
  type Gesture,
  type SocialAction,
} from "../services/social";
import type { TourShell } from "./tour-shell";
import { icon } from "./icons";
import "./social-hud.css";

export function mountSocialHud(
  engine: TourEngine,
  presence: CampusPresence,
  shell: TourShell,
  userId?: number,
) {
  const root = document.createElement("dialog");
  root.id = "campus-chat";
  root.className = "campus-chat tour-panel";
  root.setAttribute("aria-label", "Chat grupal del campus");
  root.innerHTML = `<header><div><strong>Chat del campus</strong><span class="chat-state">Chat grupal</span></div><button type="button" class="icon-btn chat-close" aria-label="Cerrar chat">${icon("close")}</button></header>
    <button type="button" class="chat-older hidden">Cargar mensajes anteriores</button>
    <div class="campus-chat-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
    <form class="campus-chat-form"><label class="sr-only" for="campus-message">Mensaje para todo el campus</label>
    <input id="campus-message" maxlength="500" autocomplete="off" placeholder="Escribí para todo el campus…" required autofocus>
    <button type="submit" class="primary">Enviar</button></form><p class="chat-feedback" role="status"></p>`;
  const choices = document.createElement("dialog");
  choices.className = "social-dialog tour-panel";
  choices.setAttribute("aria-labelledby", "social-title");
  choices.innerHTML =
    `<header class="social-header"><h2 id="social-title"></h2><button type="button" class="icon-btn social-close" aria-label="Cerrar gestos">${icon("close")}</button></header><p class="social-description"></p><div class="social-options"></div><button type="button" class="secondary social-dismiss">Volver al recorrido</button>`;
  const notice = document.createElement("div");
  notice.className = "social-pending hidden";
  notice.setAttribute("role", "status");
  document.querySelector("#app")!.append(root, choices, notice);
  const log = root.querySelector<HTMLDivElement>(".campus-chat-log")!;
  const form = root.querySelector<HTMLFormElement>("form")!,
    input = root.querySelector<HTMLInputElement>("input")!;
  const older = root.querySelector<HTMLButtonElement>(".chat-older")!,
    feedback = root.querySelector<HTMLParagraphElement>(".chat-feedback")!;
  const status = root.querySelector<HTMLSpanElement>(".chat-state")!,
    options = choices.querySelector<HTMLDivElement>(".social-options")!;
  const recent = new Map<string, ChatMessage>(),
    history = new Map<string, ChatMessage>();
  let expanded = false,
    historyPending = false,
    more = false,
    cursor: ChatMessage | undefined,
    pending: SocialAction | null = null;
  let sending: string | null = null,
    sendTimer = 0,
    historyTimer = 0;
  let impulseAt = 0,
    dialogAction = "";
  engine.social.now = () => presence.now();
  engine.remotePlayers.now = () => presence.now();
  function send(command: Record<string, unknown>) {
    try {
      presence.send(command);
      return true;
    } catch (e) {
      shell.toast((e as Error).message);
      return false;
    }
  }
  const rows = new Map<string, HTMLParagraphElement>();
  const timeFormat = new Intl.DateTimeFormat("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  });
  function render(keepTop = false) {
    const bottom = log.scrollHeight - log.clientHeight - log.scrollTop < 45,
      oldHeight = log.scrollHeight,
      oldTop = log.scrollTop;
    const visible = new Map(expanded ? history : []);
    for (const m of recentMessages(recent.values(), presence.now()))
      visible.set(m.id, m);
    const messages = [...visible.values()].sort(
      (a, b) => a.sentAt - b.sentAt || a.id.localeCompare(b.id),
    );
    for (const [id, row] of rows)
      if (!visible.has(id)) {
        row.remove();
        rows.delete(id);
      }
    log.querySelector(".chat-empty")?.remove();
    if (!messages.length) {
      const empty = document.createElement("p");
      empty.className = "chat-empty";
      empty.textContent = "Saludá a quienes están recorriendo el campus.";
      log.append(empty);
    }
    messages.forEach((m, index) => {
      let row = rows.get(m.id);
      if (!row) {
        row = document.createElement("p");
        row.className = "campus-chat-message";
        const time = document.createElement("time");
        time.dateTime = new Date(m.sentAt).toISOString();
        time.textContent = timeFormat.format(m.sentAt);
        const author = document.createElement("strong");
        author.textContent = m.name + ":";
        row.classList.toggle("chat-own", m.userId === userId);
        const text = document.createElement("span");
        text.textContent = m.text;
        row.append(time, author, text);
        rows.set(m.id, row);
      }
      if (log.children[index] !== row)
        log.insertBefore(row, log.children[index] ?? null);
    });
    if (keepTop) log.scrollTop = oldTop + log.scrollHeight - oldHeight;
    else if (bottom || !expanded) log.scrollTop = log.scrollHeight;
  }
  function loadHistory(before?: ChatMessage) {
    if (!expanded || historyPending) return;
    historyPending = send({
      type: "chat.history",
      ...(before ? { before: before.sentAt, beforeId: before.id } : {}),
    });
    older.disabled = historyPending;
    feedback.textContent = historyPending
      ? "Cargando historial…"
      : "No se pudo conectar al chat.";
    // El historial se consulta únicamente al abrir el chat o pedir otra página.
    if (historyPending) feedback.textContent = "Cargando historial…";
    window.clearTimeout(historyTimer);
    if (historyPending)
      historyTimer = window.setTimeout(() => {
        historyPending = false;
        older.disabled = false;
        feedback.textContent =
          "El historial tardó demasiado. Cerrá el chat y volvé a abrirlo.";
      }, 10000);
  }
  function closeChat() {
    expanded = false;
    historyPending = false;
    history.clear();
    cursor = undefined;
    more = false;
    window.clearTimeout(historyTimer);
    root.close();
    older.classList.add("hidden");
    document.body.classList.remove("social-open");
    feedback.textContent = "";
    render();
  }
  function openChat() {
    if (expanded || shell.dialog.open || choices.open) return;
    if (!engine.walker.enabled) {
      shell.toast("Iniciá el recorrido para usar el chat.");
      return;
    }
    engine.pause();
    expanded = true;
    history.clear();
    cursor = undefined;
    document.body.classList.add("social-open");
    root.showModal();
    render();
    input.focus();
    loadHistory();
  }
  function closeChoices(resume = false) {
    choices.close();
    dialogAction = "";
    document.body.classList.remove("social-open");
    if (resume && !shell.dialog.open) engine.startWalking();
  }
  function button(label: string, act: () => void) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = act;
    return b;
  }
  function menu(target: Player | null) {
    if (!engine.social.canPerform()) {
      shell.toast("Ponete de pie en un lugar estable para hacer un gesto.");
      return;
    }
    closeChat();
    engine.pause();
    options.replaceChildren();
    choices.querySelector("h2")!.textContent = target
      ? `Interactuar con ${target.name}`
      : "Hacer un gesto";
    choices.querySelector(".social-description")!.textContent = target
      ? "El otro visitante decide si acepta."
      : "Los visitantes cercanos pueden verte.";
    const kinds: Gesture[] = target
      ? ["high-five", "hold-hands"]
      : ["ok", "peace", "ragdoll"];
    for (const kind of kinds)
      options.append(
        button(gestureNames[kind], () => {
          if (
            send({
              type: "social.request",
              kind,
              ...(target ? { target: target.id } : {}),
            })
          )
            closeChoices(true);
        }),
      );
    document.body.classList.add("social-open");
    choices.showModal();
  }
  function consent(action: SocialAction) {
    if (shell.dialog.open) return;
    if (expanded) closeChat();
    if (choices.open) closeChoices();
    engine.pause();
    dialogAction = action.id;
    choices.querySelector("h2")!.textContent =
      `${action.fromName} quiere interactuar`;
    choices.querySelector(".social-description")!.textContent =
      gestureNames[action.kind];
    options.replaceChildren();
    options.append(
      button("Aceptar", () => {
        if (send({ type: "social.respond", id: action.id, accept: true }))
          closeChoices(true);
      }),
      button("Rechazar", () => {
        if (send({ type: "social.respond", id: action.id, accept: false }))
          closeChoices(true);
      }),
    );
    document.body.classList.add("social-open");
    choices.showModal();
  }
  function dismissChoices(resume = false) {
    if (dialogAction)
      send({ type: "social.respond", id: dialogAction, accept: false });
    closeChoices(resume);
  }
  choices.querySelector<HTMLButtonElement>(".social-dismiss")!.onclick = () => dismissChoices(true);
  choices.querySelector<HTMLButtonElement>(".social-close")!.onclick = () => dismissChoices();
  choices.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissChoices();
  });
  shell.dialog.addEventListener("toggle", () => {
    if (
      !shell.dialog.open &&
      pending?.to === presence.self &&
      pending.expiresAt > presence.now() &&
      !choices.open
    )
      consent(pending);
  });
  engine.onSocialMenu = menu;
  engine.social.onCancel = (id) => send({ type: "social.cancel", id });
  engine.social.onImpulse = (id, direction) => {
    if (performance.now() - impulseAt < 300) return;
    impulseAt = performance.now();
    send({ type: "social.impulse", id, direction });
  };
  presence.onSocial = (event) => {
    status.textContent = "Chat grupal";
    if (event.type === "chat.message" && typeof event.message === "object") {
      const message = event.message;
      if (sending === message.text && message.userId === userId) {
        if (input.value.trim() === sending) input.value = "";
        sending = null;
        window.clearTimeout(sendTimer);
        feedback.textContent = "";
      }
      if (!recent.has(message.id) && message.sentAt > presence.now() - 300000) {
        recent.set(message.id, message);
        render();
        engine.social.audio.play("message", 0.28);
      }
    } else if (event.type === "chat.recent") {
      for (const message of event.messages ?? [])
        recent.set(message.id, message);
      render();
    } else if (event.type === "chat.history" && expanded) {
      window.clearTimeout(historyTimer);
      const before = !!cursor;
      for (const message of event.messages ?? [])
        history.set(message.id, message);
      cursor = event.messages?.at(-1) ?? cursor;
      more = !!event.more;
      historyPending = false;
      older.disabled = false;
      older.classList.toggle("hidden", !more);
      feedback.textContent = "";
      render(before);
    } else if (event.type === "social.action" && event.action) {
      const action = event.action;
      if (action.status === "pending") {
        pending = action;
        if (action.to === presence.self) consent(action);
      } else {
        if (pending?.id === action.id) pending = null;
        if (dialogAction === action.id) closeChoices();
        engine.social.action(action);
        if (action.status === "declined" && action.from === presence.self)
          shell.toast(`${action.toName} rechazó la invitación.`);
        if (
          action.status === "cancelled" &&
          (action.from === presence.self || action.to === presence.self)
        )
          shell.toast("La interacción se canceló.");
      }
    } else if (event.type === "social.impulse") {
      const data = event as typeof event & {
        id: string;
        direction: "forward" | "back" | "left" | "right" | "up";
      };
      engine.social.impulse(data.id, data.direction);
    } else if (event.type === "social.error") {
      const message =
        typeof event.message === "string"
          ? event.message
          : "No se pudo completar.";
      feedback.textContent = message;
      historyPending = false;
      older.disabled = false;
      shell.toast(message);
      sending = null;
      window.clearTimeout(sendTimer);
      window.clearTimeout(historyTimer);
    }
  };
  presence.onDisconnect = () => {
    engine.social.clear();
    pending = null;
    notice.classList.add("hidden");
    status.textContent = "Sin conexión";
    sending = null;
    window.clearTimeout(sendTimer);
    if (choices.open) closeChoices();
    if (expanded) closeChat();
    recent.clear();
    history.clear();
    render();
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;
    if (send({ type: "chat.send", text })) {
      sending = text;
      feedback.textContent = "Enviando…";
      sendTimer = window.setTimeout(() => {
        sending = null;
        feedback.textContent = "No llegó la confirmación. Podés reintentar.";
      }, 10000);
    }
  };
  older.onclick = () => loadHistory(cursor);
  root.querySelector<HTMLButtonElement>(".chat-close")!.onclick = () => closeChat();
  root.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeChat();
  });
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.code === "Escape" && expanded) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeChat();
        return;
      }
      if (
        event.code !== "KeyC" || expanded || event.repeat ||
        event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
        (event.target instanceof Element &&
          event.target.closest("input,textarea,select,[contenteditable],dialog"))
      ) return;
      if (!shell.dialog.open && !choices.open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openChat();
      }
    },
    { capture: true },
  );
  new MutationObserver(() => {
    if (!engine.walker.enabled) {
      if (choices.open) closeChoices();
      pending = null;
    }
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  window.setInterval(() => {
    let changed = false;
    for (const [id, message] of recent)
      if (message.sentAt <= presence.now() - 300000) {
        if (expanded) history.set(id, message);
        recent.delete(id);
        changed = true;
      }
    if (changed) render();
    if (pending && pending.expiresAt <= presence.now()) {
      if (dialogAction === pending.id) closeChoices();
      pending = null;
      shell.toast("La invitación venció.");
    }
    notice.classList.toggle("hidden", !pending);
    if (pending)
      notice.textContent = `${pending.from === presence.self ? "Esperando a " + pending.toName : "Invitación de " + pending.fromName} · ${Math.max(0, Math.ceil((pending.expiresAt - presence.now()) / 1000))} s`;
  }, 1000);
  render();
  return { open: openChat };
}
