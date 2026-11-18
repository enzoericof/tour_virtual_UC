import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const { restoreSession } = await server.ssrLoadModule('/src/services/session.ts');
const { logout } = await server.ssrLoadModule('/src/services/api.ts');
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });
const account = { id: 7, nombre: 'Ana', apellido: 'Pérez', correo: 'ana@example.invalid', rol: 1, skin: 'verde' };

test('Al recargar se recupera la cuenta desde la cookie con una sola solicitud', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(account), { status: 200 });
  };
  const session = await restoreSession();
  assert.equal(session.user.name, 'Ana Pérez');
  assert.equal(session.online, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/auth/me');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.body, undefined);
});

test('Una sesión vencida y un fallo de conexión dan estados distintos', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  assert.deepEqual(await restoreSession(), { user: null, online: true });
  globalThis.fetch = async () => { throw new TypeError('Sin conexión'); };
  assert.deepEqual(await restoreSession(), { user: null, online: false });
});

test('Cerrar sesión usa la cookie y CSRF, y el próximo acceso requiere identificarse', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/csrf')) return new Response(JSON.stringify({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }));
    if (url.endsWith('/logout')) return new Response(null, { status: 204 });
    return new Response('{}', { status: 401 });
  };
  await logout();
  assert.equal(calls[1].options.headers.get('X-CSRF-TOKEN'), 'test-csrf');
  assert.ok(calls.every(call => call.options.credentials === 'same-origin'));
  assert.deepEqual(await restoreSession(), { user: null, online: true });
});
