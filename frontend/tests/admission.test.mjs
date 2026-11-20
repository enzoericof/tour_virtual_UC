import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const { CampusPresence, AdmissionError } = await server.ssrLoadModule('/src/services/presence.ts');
after(() => server.close());

function harness() {
  const original = { window: globalThis.window, location: globalThis.location, WebSocket: globalThis.WebSocket };
  const sockets = [], timeouts = new Map(), intervals = new Map(); let id = 0;
  class Socket {
    static OPEN = 1;
    readyState = 1; bufferedAmount = 0; messages = []; closed = false;
    constructor() { sockets.push(this); }
    send(value) { this.messages.push(value); }
    close() { this.closed = true; this.onclose?.({ code: 1000 }); }
    message(value) { this.onmessage({ data: JSON.stringify(value) }); }
  }
  globalThis.WebSocket = Socket;
  globalThis.location = { protocol: 'http:', host: 'localhost' };
  globalThis.window = {
    setTimeout(fn, delay) { timeouts.set(++id, { fn, delay }); return id; }, clearTimeout(id) { timeouts.delete(id); },
    setInterval(fn) { intervals.set(++id, fn); return id; }, clearInterval(id) { intervals.delete(id); },
  };
  return { sockets, timeouts, intervals, restore() { Object.assign(globalThis, original); } };
}

test('Abrir WebSocket no basta: el acceso espera la reserva confirmada por el servidor', async () => {
  const h = harness(); const presence = new CampusPresence(() => null, () => {}, () => {});
  try {
    let entered = false;
    const admission = presence.admit().then(() => entered = true);
    const socket = h.sockets[0]; socket.onopen(); await Promise.resolve();
    assert.equal(entered, false); assert.deepEqual(socket.messages, ['join']);
    socket.message({ admitted: true }); await admission;
    assert.equal(entered, true); assert.equal(h.timeouts.size, 0);
    assert.equal(h.sockets.length, 1);
  } finally { presence.stop(); h.restore(); }
});

test('Diez plazas ocupadas rechazan el ingreso sin reintentos automáticos', async () => {
  const h = harness(); const presence = new CampusPresence(() => null, () => {}, () => {});
  try {
    const admission = presence.admit(); const rejected = assert.rejects(admission, error => error instanceof AdmissionError && error.reason === 'full');
    h.sockets[0].onopen(); h.sockets[0].onclose({ code: 4001 }); await rejected;
    assert.equal(h.timeouts.size, 0); assert.equal(h.intervals.size, 0);
  } finally { presence.stop(); h.restore(); }
});

test('Sin confirmación de cupo se cierra la conexión y se permite reintentar manualmente', async () => {
  const h = harness(); const presence = new CampusPresence(() => null, () => {}, () => {});
  try {
    const admission = presence.admit(); const rejected = assert.rejects(admission, error => error.reason === 'connection');
    [...h.timeouts.values()].find(t => t.delay === 15000).fn(); await rejected;
    assert.equal(h.sockets[0].closed, true); assert.equal(h.intervals.size, 0);
  } finally { presence.stop(); h.restore(); }
});

test('Volver a vista general oculta el avatar y conserva el cupo; salir lo libera', async () => {
  const h = harness(); let pose = { x: 1, y: 0, z: 0, yaw: 0 };
  const presence = new CampusPresence(() => pose, () => {}, () => {});
  try {
    const admission = presence.admit(); const socket = h.sockets[0]; socket.onopen(); socket.message({ admitted: true }); await admission;
    assert.equal(JSON.parse(socket.messages.at(-1)).x, 1);
    pose = null; [...h.intervals.values()][0]();
    assert.equal(socket.messages.at(-1), 'hide');
    presence.stop(); assert.equal(socket.messages.at(-1), 'leave');
  } finally { presence.stop(); h.restore(); }
});

test('Perder el cupo al reconectar termina la visita en vez de recorrer desconectado', async () => {
  const h = harness(); const denied = [];
  const presence = new CampusPresence(() => null, () => {}, () => {}, () => {}, error => denied.push(error.reason));
  try {
    const admission = presence.admit(); const socket = h.sockets[0]; socket.onopen(); socket.message({ admitted: true }); await admission;
    socket.onclose({ code: 1006 }); [...h.timeouts.values()][0].fn();
    h.sockets[1].onopen(); h.sockets[1].onclose({ code: 4001 });
    assert.deepEqual(denied, ['full']); assert.equal(h.intervals.size, 0);
  } finally { presence.stop(); h.restore(); }
});
