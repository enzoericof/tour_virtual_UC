import type { TourEngine } from "../scene/engine";
import { logout, type User } from "../services/api";
import { mountSocialHud } from "./social-hud";
import { CampusPresence } from "../services/presence";
import { element, escapeHtml } from "./dom";
import { createLibrary } from "./library";
import type { TourShell } from "./tour-shell";
import type { InitialSession } from "../services/session";
import { mountAuthForm } from "./auth-form";
import { icon } from "./icons";

export function mountCommunity(
  shell: TourShell,
  engine: TourEngine | undefined,
  managePanels: () => Promise<void>,
  initialSession: InitialSession = { user: null, online: false },
  admittedPresence?: CampusPresence,
) {
  const { openDialog, closeDialog, isDialogContent, toast } = shell;
  let user: User | null = initialSession.user;
  let online = initialSession.online;
  let presenceStatus = "Sin sesión";
  const presence =
    admittedPresence ??
    new CampusPresence(
      () => null,
      () => {},
      () => {},
    );
  presence.bind(
    () => engine?.playerPose() ?? null,
    (players) => engine?.remotePlayers.receive(players),
    (status) => {
      presenceStatus = status;
      const label = document.querySelector("#presence-status");
      if (label) label.textContent = status;
    },
    (players, self) => engine?.receiveSeating(players, self),
  );
  if(engine){
    engine.vehicles.send=command=>presence.send(command);
    presence.onVehicles=(states,self)=>{engine.vehicles.receive(states,self);engine.remotePlayers.drivers=engine.vehicles.drivers();};
    presence.onVehicleDisconnect=()=>engine.vehicles.disconnected();
  }
  const library = createLibrary(shell, () => user, account);
  if (engine) engine.onOpenWorks = () => void library("all");

  function account() {
    if (user) {
      openDialog(
        `<span class="eyebrow">MI CUENTA</span><h2>Hola, ${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><p class="subtle">${user.role === "ADMIN" ? "Administrador de contenidos" : "Miembro de la comunidad"}</p><p class="subtle" id="presence-status">${escapeHtml(presenceStatus)}</p><div class="account-actions"><button class="primary" id="my-works">${icon("book")}<span>Mis trabajos</span></button><button class="primary" id="community-chat">${icon("chat")}<span>Chat del campus</span></button>${user.role === "ADMIN" ? '<button class="secondary" id="manage-panels">Administrar paneles</button>' : ""}<button class="account-logout" id="logout">${icon("logout")}<span>Cerrar sesión</span></button></div>`,
      );
      element("#my-works").onclick = () => void library();
      element("#community-chat").onclick = openChat;
      const panelsButton =
        document.querySelector<HTMLButtonElement>("#manage-panels");
      if (panelsButton) panelsButton.onclick = () => void managePanels();
      const logoutButton = element<HTMLButtonElement>("#logout");
      logoutButton.onclick = async () => {
        try {
          await logout();
          user = null;
          endVisit();
          location.reload();
        } catch (e) {
          toast((e as Error).message);
        }
      };
      return;
    }
    openDialog(
      `<span class="eyebrow">COMUNIDAD UC</span><h2>Nos encontramos acá.</h2><p class="subtle">Ingresá para recorrer el campus con otros visitantes.</p><div id="account-auth"></div>`,
    );
    const container = element("#account-auth");
    mountAuthForm(container, (authenticatedUser) => {
      user = authenticatedUser;
      online = true;
      updateAccount();
      if (isDialogContent(container)) closeDialog();
      toast(`Bienvenido, ${user.name}.`);
    });
  }
  function updateAccount() {
    const accountButton = element<HTMLButtonElement>("#account-btn");
    accountButton.querySelector("span")!.textContent = user
      ? user.name.split(" ")[0]
      : "Ingresar";
    accountButton.title = user ? "Mi cuenta" : "Iniciar sesión";
    accountButton.setAttribute(
      "aria-controls",
      user ? "tour-account" : "dialog",
    );
    accountButton.setAttribute("aria-haspopup", user ? "true" : "dialog");
    if (user) presence.start();
    else presence.stop();
    element("#account-details span").textContent = user
      ? "Mi cuenta"
      : "Ingresar o crear cuenta";
    element("#account-works span").textContent = user
      ? "Mis trabajos"
      : "Biblioteca de trabajos";
    element("#account-chat").classList.toggle("hidden", !user);
    element("#account-panels").classList.toggle(
      "hidden",
      user?.role !== "ADMIN",
    );
  }
  element("#account-details").onclick = account;
  element("#account-works").onclick = () => void library();
  element("#account-chat").onclick = openChat;
  element("#account-panels").onclick = () => void managePanels();

  const socialHud = engine
    ? mountSocialHud(engine, presence, shell, user?.id)
    : undefined;
  function openChat() {
    closeDialog();
    document.querySelector("#tour-account")?.classList.add("hidden");
    document.querySelector("#account-btn")?.setAttribute("aria-expanded", "false");
    socialHud?.open();
  }

  const accountButton = element<HTMLButtonElement>("#account-btn");
  const openAccountMenu = accountButton.onclick;
  accountButton.onclick = (event) => {
    if (user) openAccountMenu?.call(accountButton, event);
    else account();
  };
  updateAccount();

  function endVisit() {
    presence.stop();
    engine?.social.clear();
    engine?.pause();
  }

  return {
    getUser: () => user,
    isOnline: () => online,
    openAccount: account,
    endVisit,
  };
}
