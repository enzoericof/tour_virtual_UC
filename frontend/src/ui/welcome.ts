import { restoreSession, type InitialSession } from "../services/session";
import { mountAuthForm } from "./auth-form";

export async function enterCampus(root: HTMLElement): Promise<InitialSession> {
  try {
    document.documentElement.dataset.theme = localStorage.getItem("cyt-theme") === "dark" ? "dark" : "light";
  } catch { document.documentElement.dataset.theme = "light"; }
  document.body.classList.add("at-welcome");
  root.innerHTML = `<main class="welcome">
    <section class="welcome-story" aria-label="Bienvenida al campus">
      <img class="welcome-photo" src="/assets/photos/IMG_5686.webp" alt="Galería del campus Santa Librada">
      <div class="welcome-story-copy"><img src="/assets/logo-uc-sapientia.png" width="52" height="52" alt="Universidad Católica">
        <span class="eyebrow">CAMPUS SANTA LIBRADA</span><h1>El campus,<br>a tu manera.</h1>
        <p>Recorré Ciencias y Tecnología, encontrate con otros visitantes y compartí lo que hacés.</p>
        <span class="welcome-caption">UNIVERSIDAD CATÓLICA · CIENCIAS Y TECNOLOGÍA</span>
      </div>
    </section>
    <section class="welcome-card tour-panel" aria-labelledby="welcome-title">
      <span class="eyebrow">VISITA VIRTUAL UC</span><h2 id="welcome-title">Tu próxima visita empieza acá.</h2>
      <p class="subtle">Ingresá para encontrarte con la comunidad y elegir tu apariencia.</p>
      <div id="welcome-auth"><p role="status" class="session-loading">Reconociendo tu sesión…</p></div>
      <div class="welcome-guest"><span>¿Solo querés conocer el campus?</span><button type="button" id="welcome-guest" class="text-btn">Explorar como invitado</button></div>
      <p class="welcome-footnote">Para PC o laptop · Teclado y mouse</p>
    </section>
  </main>`;
  return new Promise(resolve => {
    let finished = false;
    let online = false;
    const finish = (session: InitialSession) => {
      if (finished) return;
      finished = true;
      document.body.classList.remove("at-welcome");
      resolve(session);
    };
    root.querySelector<HTMLButtonElement>("#welcome-guest")!.onclick = () => finish({ user: null, online });
    const check = async () => {
      const session = await restoreSession();
      if (finished) return; // Una respuesta tardía no reemplaza la elección del visitante.
      online = session.online;
      if (session.user) { finish(session); return; }
      const container = root.querySelector<HTMLElement>("#welcome-auth")!;
      container.innerHTML = `${online ? "" : '<p class="connection-note" role="status">No pudimos comprobar tu sesión. Podés reintentar o explorar como invitado.</p><button type="button" class="text-btn" id="retry-session">Reintentar conexión</button>'}<div class="welcome-form"></div>`;
      mountAuthForm(container.querySelector<HTMLElement>(".welcome-form")!, user => finish({ user, online: true }));
      const retry = container.querySelector<HTMLButtonElement>("#retry-session");
      if (retry) retry.onclick = () => { retry.disabled = true; void check(); };
    };
    void check();
  });
}
