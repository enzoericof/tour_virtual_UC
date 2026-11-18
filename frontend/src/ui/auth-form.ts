import { api, login, type User } from "../services/api";
import { icon } from "./icons";

/** El mismo formulario se usa en la bienvenida y dentro del menú de cuenta. */
export function mountAuthForm(root: HTMLElement, authenticated: (user: User) => void, onPending: (pending: boolean) => void = () => {}) {
  root.innerHTML = `
    <div class="auth-tabs" role="tablist" aria-label="Acceso a la comunidad">
      <button type="button" role="tab" aria-selected="true" class="selected" data-mode="login">Iniciar sesión</button>
      <button type="button" role="tab" aria-selected="false" data-mode="register">Crear cuenta</button>
    </div>
    <form class="auth-form">
      <fieldset class="register-fields hidden" disabled>
        <div class="form-columns"><label>Nombre<input name="name" maxlength="100" autocomplete="given-name" required></label>
        <label>Apellido<input name="surname" maxlength="100" autocomplete="family-name" required></label></div>
        <label>Carrera<select name="career" required><option value="1">Ingeniería Informática</option><option value="2">Ingeniería Electrónica</option></select></label>
      </fieldset>
      <label>Correo electrónico<input name="email" type="email" required autocomplete="username" maxlength="150" placeholder="tu.correo@ejemplo.com"></label>
      <label>Contraseña<input name="password" type="password" required maxlength="72" autocomplete="current-password" placeholder="Tu contraseña"></label>
      <p class="session-note">Recordaremos esta cuenta. En tu próxima visita elegís si querés continuar.</p>
      <button class="primary auth-submit" type="submit">Entrar al campus ${icon("arrow")}</button>
      <p class="auth-progress hidden" role="status">Validando cuenta…</p>
      <p class="form-error" role="alert" aria-live="polite"></p>
    </form>`;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const fields = root.querySelector<HTMLFieldSetElement>("fieldset")!;
  const password = form.elements.namedItem("password") as HTMLInputElement;
  const submit = root.querySelector<HTMLButtonElement>(".auth-submit")!;
  const errorLabel = root.querySelector<HTMLElement>(".form-error")!;
  let register = false;
  let pending = false;
  root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(tab => {
    tab.onclick = () => {
      if (pending) return;
      register = tab.dataset.mode === "register";
      fields.disabled = !register;
      fields.classList.toggle("hidden", !register);
      password.minLength = register ? 8 : 0;
      password.autocomplete = register ? "new-password" : "current-password";
      submit.innerHTML = (register ? "Crear mi cuenta" : "Entrar al campus") + icon("arrow");
      errorLabel.textContent = "";
      root.querySelectorAll("[data-mode]").forEach(button => {
        button.classList.toggle("selected", button === tab);
        button.setAttribute("aria-selected", String(button === tab));
      });
    };
  });
  form.onsubmit = async event => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    root.querySelector(".auth-progress")!.classList.remove("hidden");
    onPending(true);
    const buttons = root.querySelectorAll<HTMLButtonElement>("button");
    buttons.forEach(button => button.disabled = true);
    errorLabel.textContent = "";
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    try {
      if (register) await api("/auth/registro", { method: "POST", body: JSON.stringify({
        nombre: data.name, apellido: data.surname, correo: data.email, password: data.password, carrera: Number(data.career),
      }) });
      const user = await login(data.email, data.password);
      password.value = "";
      authenticated(user);
    } catch (error) {
      errorLabel.textContent = error instanceof Error ? error.message : "No se pudo iniciar sesión.";
    } finally {
      pending = false;
      root.querySelector(".auth-progress")?.classList.add("hidden");
      onPending(false);
      buttons.forEach(button => button.disabled = false);
    }
  };
}
