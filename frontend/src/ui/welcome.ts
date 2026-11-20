import { logout, type User } from "../services/api";
import { restoreSession, type RegisteredSession } from "../services/session";
import { consumeVisitEnd, visitIdleMs } from "../services/visit-lifecycle";
import { mountAuthForm } from "./auth-form";
import { escapeHtml } from "./dom";
import { paintLoading, showVisitLoading } from "./visit-loading";

export async function enterCampus(root: HTMLElement): Promise<RegisteredSession> {
  try { document.documentElement.dataset.theme = localStorage.getItem("cyt-theme") === "dark" ? "dark" : "light"; }
  catch { document.documentElement.dataset.theme = "light"; }
  document.body.classList.add("at-welcome");
  document.body.classList.remove("in-tour", "is-walking", "ui-compact");
  const reason = consumeVisitEnd();
  root.innerHTML = `<main class="welcome">
    <section class="welcome-card tour-panel" aria-labelledby="welcome-title">
      <header class="welcome-brand"><img src="/assets/logo-uc-sapientia.png" width="44" height="44" alt="Universidad Católica"><div><strong>Universidad Católica</strong><span>Campus Santa Librada</span></div></header>
      <div class="welcome-heading"><span class="eyebrow">CIENCIAS Y TECNOLOGÍA</span><h1 id="welcome-title">Tour virtual</h1><p>Elegí cómo ingresar al recorrido.</p></div>
      ${reason ? `<p class="visit-note" role="status">${escapeHtml(reason)}</p>` : ""}
      <div id="welcome-auth"><p role="status" class="session-loading"><span class="inline-spinner" aria-hidden="true"></span>Comprobando cuenta…</p></div>
      <footer class="welcome-footnote">El recorrido termina al recargar, cerrar la página o pasar ${visitIdleMs / 60000} min sin actividad. Tu cuenta puede quedar recordada.</footer>
    </section>
  </main>`;
  const card = root.querySelector<HTMLElement>(".welcome-card")!;
  const container = root.querySelector<HTMLElement>("#welcome-auth")!;
  return new Promise(resolve => {
    let finished = false, pending = false;
    let loading: ReturnType<typeof showVisitLoading> | null = null;
    function busy(message: string) {
      card.inert = true;
      if (loading) loading.setMessage(message);
      else loading = showVisitLoading(root, message);
    }
    function ready() {
      loading?.hide(); loading = null;
      card.inert = false;
      pending = false;
    }
    function finish(session: RegisteredSession) {
      if (finished) return;
      finished = true;
      pending = true;
      busy("Cargando el recorrido…");
      document.body.classList.remove("at-welcome");
      resolve(session);
    }
    function renderLogin(message = "") {
      container.innerHTML = `${message ? `<p class="connection-note" role="status">${escapeHtml(message)}</p>` : ""}<div class="welcome-form"></div>`;
      mountAuthForm(container.querySelector<HTMLElement>(".welcome-form")!, user => finish({ user, online: true }), active => {
        if (finished) return;
        pending = active;
        if (active) busy("Validando tu cuenta…");
        else ready();
      });
    }
    function renderAccount(user: User, message = "") {
      container.innerHTML = `<div class="remembered-account"><span class="account-avatar" aria-hidden="true">${escapeHtml(user.name.trim().slice(0, 1).toUpperCase())}</span><div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div></div>
        <div class="welcome-actions"><button type="button" id="continue-account" class="primary">Continuar con esta cuenta</button><button type="button" id="other-account" class="secondary">Usar otra cuenta</button></div>
        <p class="connection-note" role="status">${escapeHtml(message)}</p>`;
      container.querySelector<HTMLButtonElement>("#continue-account")!.onclick = async () => {
        if (pending) return;
        pending = true; busy("Verificando tu cuenta…");
        await paintLoading();
        const session = await restoreSession();
        if (finished) return;
        if (session.online && session.user?.id === user.id) { finish({ user: session.user, online: true }); return; }
        ready();
        if (session.user) renderAccount(session.user, "La cuenta recordada cambió. Confirmá con cuál querés entrar.");
        else if (session.online) renderLogin("Esta cuenta ya no tiene acceso guardado. Iniciá sesión para continuar.");
        else renderAccount(user, "No pudimos verificar la cuenta. Revisá la conexión y volvé a intentar.");
      };
      container.querySelector<HTMLButtonElement>("#other-account")!.onclick = async () => {
        if (pending) return;
        pending = true; busy("Preparando el acceso…");
        try {
          await logout();
          if (finished) return;
          ready(); renderLogin();
        } catch {
          if (finished) return;
          ready(); renderAccount(user, "No pudimos cambiar de cuenta. Volvé a intentar.");
        }
      };
    }
    async function check() {
      const session = await restoreSession();
      if (finished) return;
      if (session.user) renderAccount(session.user);
      else {
        renderLogin(session.online ? "" : "No pudimos comprobar tu cuenta. Revisá la conexión y volvé a intentar.");
        if (!session.online) {
          const retry = document.createElement("button");
          retry.type = "button"; retry.className = "text-btn"; retry.textContent = "Reintentar conexión";
          retry.onclick = () => { retry.disabled = true; void check(); };
          container.prepend(retry);
        }
      }
    }
    void check();
  });
}
