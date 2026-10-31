export type User = { id: number; name: string; email: string; role: string };
export type Work = {
  id: number;
  title: string;
  description: string;
  url: string;
  author: string;
  ownerId: number;
};
export type Panel = {
  id: number;
  placeId: string;
  title: string;
  body: string;
  url: string;
};
let csrf: { token: string; headerName: string } | null = null;
export async function refreshCsrf() {
  const r = await fetch("/api/v1/auth/csrf", { credentials: "same-origin" });
  if (!r.ok) throw new Error("El servicio no está disponible.");
  csrf = await r.json();
  return csrf!;
}
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET") {
    if (!csrf) await refreshCsrf();
    headers.set(csrf!.headerName, csrf!.token);
  }
  const r = await fetch("/api/v1" + url, {
    ...options,
    headers,
    credentials: "same-origin",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    let message =
      r.status === 401
        ? "Iniciá sesión para continuar."
        : r.status === 403
          ? "No tenés permisos para realizar esta acción."
          : "No se pudo completar la solicitud.";
    try {
      const data = await r.json();
      if (data.message) message = data.message;
    } catch {}
    throw new Error(message);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
export async function login(email: string, password: string) {
  const user = await api<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await refreshCsrf();
  return user;
}
export async function logout() {
  await api("/auth/logout", { method: "POST" });
  csrf = null;
}
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
