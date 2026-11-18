import { skinIds, skins, type Skin } from "../data/skins";
import type { TourEngine } from "../scene/engine";
import { api, logout, type User } from "../services/api";
import { CampusChat } from "../services/chat";
import { CampusPresence } from "../services/presence";
import { element, escapeHtml } from "./dom";
import { icon } from "./icons";
import { createLibrary } from "./library";
import type { TourShell } from "./tour-shell";
import type { InitialSession } from "../services/session";
import { mountAuthForm } from "./auth-form";

export function mountCommunity(
  shell: TourShell,
  engine: TourEngine | undefined,
  managePanels: () => Promise<void>,
  initialSession: InitialSession = { user: null, online: false },
) {
  const { openDialog, closeDialog, isDialogContent, toast } = shell;
  let user: User | null = initialSession.user;
  let online = initialSession.online;
  const chat = new CampusChat();
  let presenceStatus = "Sin sesión";
  const presence = new CampusPresence(
    () => engine?.playerPose() ?? null,
    players => engine?.remotePlayers.receive(players),
    status => {
      presenceStatus = status;
      const label = document.querySelector("#presence-status");
      if (label) label.textContent = status;
    },
    (players, self) => engine?.receiveSeating(players, self),
  );
  const library = createLibrary(shell, () => user, account);

  function account() {
    if (user) {
      openDialog(
        `<span class="eyebrow">MI CUENTA</span><h2>Hola, ${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><p class="subtle">${user.role === "ADMIN" ? "Administrador de contenidos" : "Miembro de la comunidad"}</p><p class="subtle" id="presence-status">${escapeHtml(presenceStatus)}</p><form id="skin-form"><label>Apariencia<select name="skin">${skinIds.map(id => `<option value="${id}" ${id === user?.skin ? "selected" : ""}>${skins[id].name}</option>`).join("")}</select></label><button class="secondary">Guardar apariencia</button><p class="form-error" role="alert"></p></form><div class="account-actions"><button class="primary" id="my-works">Mis trabajos</button><button class="secondary" id="community-chat">Chat del campus</button>${user.role === "ADMIN" ? '<button class="secondary" id="manage-panels">Administrar paneles</button>' : ""}<button class="text-btn" id="logout">Cerrar sesión</button></div>`,
      );
      element<HTMLFormElement>("#skin-form").onsubmit = async event => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const accountUser = user;
        const skin = new FormData(form).get("skin") as Skin;
        const button = form.querySelector("button")!;
        button.disabled = true;
        try {
          await api("/auth/skin", { method: "PUT", body: JSON.stringify({ skin }) });
          if (accountUser && user === accountUser) user.skin = skin;
          toast("Apariencia guardada.");
        } catch (error) {
          form.querySelector(".form-error")!.textContent = (error as Error).message;
        } finally {
          button.disabled = false;
        }
      };
      element("#my-works").onclick = () => void library();
      element("#community-chat").onclick = openChat;
      const panelsButton = document.querySelector<HTMLButtonElement>("#manage-panels");
      if (panelsButton) panelsButton.onclick = () => void managePanels();
      const logoutButton = element<HTMLButtonElement>("#logout");
      logoutButton.onclick = async () => {
        try {
          await logout();
          user = null;
          updateAccount();
          await chat.disconnect();
          if (isDialogContent(logoutButton)) closeDialog();
          toast("Sesión cerrada.");
        } catch (e) {
          toast((e as Error).message);
        }
      };
      return;
    }
    openDialog(`<span class="eyebrow">COMUNIDAD UC</span><h2>Nos encontramos acá.</h2><p class="subtle">Ingresá para recorrer el campus con otros visitantes.</p><div id="account-auth"></div>`);
    const container = element("#account-auth");
    mountAuthForm(container, authenticatedUser => {
      user = authenticatedUser;
      online = true;
      updateAccount();
      if (isDialogContent(container)) closeDialog();
      toast(`Bienvenido, ${user.name}.`);
    });
  }
  function updateAccount() {
    const accountButton = element<HTMLButtonElement>("#account-btn");
    accountButton.querySelector("span")!.textContent = user ? user.name.split(" ")[0] : "Ingresar";
    accountButton.title = user ? "Mi cuenta" : "Iniciar sesión";
    accountButton.setAttribute("aria-controls", user ? "tour-account" : "dialog");
    accountButton.setAttribute("aria-haspopup", user ? "true" : "dialog");
    if (user) presence.start();
    else presence.stop();
    element("#account-details span").textContent = user ? "Mi cuenta y apariencia" : "Ingresar o crear cuenta";
    element("#account-works span").textContent = user ? "Mis trabajos" : "Biblioteca de trabajos";
    element("#account-chat").classList.toggle("hidden", !user);
    element("#account-panels").classList.toggle("hidden", user?.role !== "ADMIN");
  }
  element("#account-details").onclick = account;
  element("#account-works").onclick = () => void library();
  element("#account-chat").onclick = openChat;
  element("#account-panels").onclick = () => void managePanels();

  function openChat() {
    openDialog(
      `<span class="eyebrow">COMUNIDAD EN VIVO</span><h2>Una charla en el campus</h2><p id="chat-status" class="subtle">Conectando…</p><div id="messages" class="messages" role="log" aria-live="polite"><p class="subtle">Los mensajes se comparten con quienes están conectados. No se guarda historial.</p></div><form id="chat-form" class="chat-form"><input name="message" aria-label="Mensaje" placeholder="Escribí un mensaje…" maxlength="500" required autocomplete="off"><button class="primary" aria-label="Enviar mensaje">${icon("arrow")}</button></form>`,
    );
    const log = element("#messages");
    const status = element("#chat-status");
    void chat
      .connect(
        (m) => {
          if (!isDialogContent(log)) return;
          const div = document.createElement("article");
          div.className = "chat-message";
          const name = document.createElement("strong");
          name.textContent = m.name;
          const text = document.createElement("p");
          text.textContent = m.text;
          div.append(name, text);
          log.append(div);
          while (log.childElementCount > 100) log.firstElementChild?.remove();
          log.scrollTop = log.scrollHeight;
        },
        (s) => {
          if (isDialogContent(status)) status.textContent = s;
        },
      )
      .catch((e) => {
        if (isDialogContent(status)) status.textContent = (e as Error).message;
      });
    element<HTMLFormElement>("#chat-form").onsubmit = (e) => {
      e.preventDefault();
      const input = element<HTMLInputElement>("[name=message]");
      try {
        chat.send(input.value.trim());
        input.value = "";
      } catch (e) {
        toast((e as Error).message);
      }
    };
  }

  const accountButton = element<HTMLButtonElement>("#account-btn");
  const openAccountMenu = accountButton.onclick;
  accountButton.onclick = event => {
    if (user) openAccountMenu?.call(accountButton, event);
    else account();
  };
  updateAccount();

  return { getUser: () => user, isOnline: () => online, openAccount: account };
}
