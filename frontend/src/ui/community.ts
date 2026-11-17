import { skinIds, skins, type Skin } from "../data/skins";
import type { TourEngine } from "../scene/engine";
import { api, currentUser, login, logout, type User } from "../services/api";
import { CampusChat } from "../services/chat";
import { CampusPresence } from "../services/presence";
import { element, escapeHtml } from "./dom";
import { icon } from "./icons";
import { createLibrary } from "./library";
import type { TourShell } from "./tour-shell";

export function mountCommunity(
  shell: TourShell,
  engine: TourEngine | undefined,
  managePanels: () => Promise<void>,
) {
  const { openDialog, closeDialog, isDialogContent, toast } = shell;
  let user: User | null = null;
  let online = false;
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
        `<span class="eyebrow">MI CUENTA</span><h2>Hola, ${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><p class="subtle">${user.role === "ADMIN" ? "Administrador de contenidos" : "Miembro de la comunidad"}</p><p class="subtle" id="presence-status">${escapeHtml(presenceStatus)}</p><form id="skin-form"><label>Apariencia<select name="skin">${skinIds.map(id => `<option value="${id}" ${id === user?.skin ? "selected" : ""}>${skins[id].name}</option>`).join("")}</select></label><button class="secondary">Guardar apariencia</button><p class="form-error" role="alert"></p></form><button class="primary" id="my-works">Mis trabajos</button><button class="secondary" id="community-chat">Chat del campus</button>${user.role === "ADMIN" ? '<button class="secondary" id="manage-panels">Administrar paneles</button>' : ""}<button class="text-btn" id="logout">Cerrar sesión</button>`,
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
    openDialog(
      `<span class="eyebrow">COMUNIDAD UC</span><h2>Nos encontramos acá.</h2><p class="subtle">Ingresá para recorrer el campus con otros visitantes y elegir tu apariencia.</p><div class="auth-tabs"><button id="login-tab" class="selected">Ingresar</button><button id="register-tab">Crear cuenta</button></div><form id="auth-form"><fieldset id="register-fields" class="hidden" disabled><label>Nombre<input name="name" maxlength="100" autocomplete="given-name" required></label><label>Apellido<input name="surname" maxlength="100" autocomplete="family-name" required></label><label>Carrera<select name="career" required><option value="1">Ingeniería Informática</option><option value="2">Ingeniería Electrónica</option></select></label></fieldset><label>Correo electrónico<input name="email" type="email" required autocomplete="email" maxlength="150"></label><label>Contraseña<input name="password" type="password" required maxlength="72" autocomplete="current-password"></label><button class="primary" id="auth-submit">Ingresar ${icon("arrow")}</button><p class="form-error" role="alert"></p></form><button class="text-btn" id="account-library">Biblioteca de trabajos</button>`,
    );
    element("#account-library").onclick = () => void library();
    let register = false;
    element("#register-tab").onclick = () => {
      register = true;
      const fields = element<HTMLFieldSetElement>("#register-fields");
      fields.classList.remove("hidden");
      fields.disabled = false;
      element<HTMLInputElement>("[name=password]").minLength = 8;
      element<HTMLInputElement>("[name=password]").autocomplete = "new-password";
      element("#auth-submit").textContent = "Crear mi cuenta";
      element("#register-tab").classList.add("selected");
      element("#login-tab").classList.remove("selected");
    };
    element("#login-tab").onclick = () => account();
    element<HTMLFormElement>("#auth-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const data = Object.fromEntries(new FormData(form)) as Record<
        string,
        string
      >;
      const button = element<HTMLButtonElement>("#auth-submit");
      button.disabled = true;
      try {
        if (register)
          await api("/auth/registro", {
            method: "POST",
            body: JSON.stringify({ nombre: data.name, apellido: data.surname, correo: data.email, password: data.password, carrera: Number(data.career) }),
          });
        user = await login(data.email, data.password);
        online = true;
        updateAccount();
        if (isDialogContent(form)) closeDialog();
        toast(`Bienvenido, ${user.name}.`);
      } catch (e) {
        form.querySelector(".form-error")!.textContent = (e as Error).message;
      } finally {
        button.disabled = false;
      }
    };
  }
  function updateAccount() {
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

  void currentUser().then(authenticatedUser => {
    user = authenticatedUser;
    online = true;
    updateAccount();
  }).catch(() => {});
  void api("/health").then(() => { online = true; }).catch(() => { online = false; });

  return { getUser: () => user, isOnline: () => online };
}
