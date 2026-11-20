import { ApiError, currentUser, type User } from "./api";

export type InitialSession = { user: User | null; online: boolean };
export type RegisteredSession = { user: User; online: true };

/** La cookie HttpOnly es la única credencial persistida. Nunca se guarda la contraseña. */
export async function restoreSession(load = currentUser): Promise<InitialSession> {
  try { return { user: await load(), online: true }; }
  catch (error) {
    return { user: null, online: error instanceof ApiError && error.status === 401 };
  }
}
