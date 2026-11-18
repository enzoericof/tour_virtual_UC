import type { Skin } from "../data/skins";

export type User = { id: number; name: string; email: string; role: string; skin: Skin };
type Account = { id: number; nombre: string; apellido: string; correo: string; rol: number; skin: Skin };

function account(data: Account): User {
  return { id: data.id, name: [data.nombre, data.apellido].join(" "), email: data.correo,
    role: data.rol === 2 ? "ADMIN" : "USER", skin: data.skin };
}

export async function currentUser() {
  return account(await api<Account>("/auth/me"));
}
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
export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function refreshCsrf() {
  const r = await fetch("/api/auth/csrf", { credentials: "same-origin", signal: AbortSignal.timeout(10000) });
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
  const r = await fetch((url.startsWith("/auth/") || url === "/health" ? "/api" : "/api/v1") + url, {
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
      if (data.mensaje || data.message) message = data.mensaje ?? data.message;
    } catch {}
    throw new ApiError(message, r.status);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
export async function login(email: string, password: string) {
  const user = await api<Account>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo: email, password }),
  });
  csrf = null;
  return account(user);
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
