// Ejecutar contra dos instancias locales que compartan la misma base de pruebas.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { WebSocket } from '../frontend/node_modules/ws/wrapper.mjs';

const servers = ['http://127.0.0.1:18081', 'http://127.0.0.1:18082'];
const origin = 'http://127.0.0.1:5174';
const clients = [];
const sockets = new Set();
const timers = [];

async function request(client, path, method = 'GET', body, server = client.server) {
  const response = await fetch(server + '/api/auth/' + path, {
    method,
    headers: { Cookie: client.cookie ?? '', ...(client.csrf ? { [client.csrf.headerName]: client.csrf.token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const cookie = response.headers.getSetCookie().find(value => value.startsWith('JSESSIONID='));
  if (cookie) client.cookie = cookie.split(';')[0];
  assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`);
  return response.status === 204 ? null : response.json();
}

function connect(client) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(client.server.replace('http:', 'ws:') + '/ws/presence', {
      headers: { Cookie: client.cookie, Origin: origin }, handshakeTimeout: 5000,
    });
    sockets.add(socket);
    socket.movements = new Map();
    socket.on('message', bytes => {
      socket.snapshot = JSON.parse(bytes);
      for (const player of socket.snapshot.players) {
        let movement = socket.movements.get(player.id);
        if (!movement) {
          movement = { positions: new Set(), turns: new Set(), last: Date.now(), maxGap: 0 };
          socket.movements.set(player.id, movement);
        }
        const position = [player.x, player.y, player.z].map(value => value.toFixed(3)).join(',');
        if (!movement.positions.has(position)) {
          movement.maxGap = Math.max(movement.maxGap, Date.now() - movement.last);
          movement.last = Date.now();
          movement.positions.add(position);
        }
        movement.turns.add(player.yaw.toFixed(3));
      }
    });
    socket.once('error', reject);
    socket.once('open', () => resolve(socket));
  });
}

async function until(condition, label) {
  const deadline = Date.now() + 10000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, label);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

function move(socket, index) {
  const started = Date.now();
  const send = () => {
    const elapsed = (Date.now() - started) / 1000;
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({
      x: 10 + index * 3 + Math.sin(elapsed), y: Math.max(0, Math.sin(elapsed * 2)) * 0.3,
      z: 20 + Math.cos(elapsed), yaw: Math.sin(elapsed) * Math.PI, walking: true,
    }));
  };
  send();
  timers.push(setInterval(send, 100));
}

try {
  for (let index = 0; index < 11; index++) {
    const client = { server: servers[index % 2] };
    clients.push(client);
    client.csrf = await request(client, 'csrf');
    const details = { nombre: 'Capacidad' + index, apellido: 'QA', correo: randomUUID() + '@example.test',
      password: randomUUID(), carrera: 1 };
    await request(client, 'registro', 'POST', details);
    await request(client, 'login', 'POST', details);
    client.csrf = await request(client, 'csrf');
    await request(client, 'me', 'GET', undefined, servers[(index + 1) % 2]);
  }
  const active = await Promise.all(clients.slice(0, 10).map(connect));
  active.forEach(move);
  await until(() => active.every(socket => socket.snapshot?.players.length === 10), 'Los diez deben verse entre instancias');
  for (const socket of active) {
    assert.equal(new Set(socket.snapshot.players.map(player => player.id)).size, 10);
    assert.equal(socket.snapshot.players.filter(player => player.id !== socket.snapshot.self).length, 9);
  }
  active.forEach(socket => socket.movements.clear());
  // Supera la caducidad y comprueba desplazamiento y giro continuos en cada observador.
  const stableUntil = Date.now() + 22000;
  while (Date.now() < stableUntil) {
    assert.ok(active.every(socket => socket.readyState === WebSocket.OPEN
      && socket.snapshot?.players.length === 10), 'Los diez permanecen conectados y visibles');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const socket of active) {
    assert.equal(socket.movements.size, 10);
    for (const movement of socket.movements.values()) {
      assert.ok(movement.positions.size >= 35, `Movimiento insuficiente: ${movement.positions.size} posiciones en 22 segundos`);
      assert.ok(movement.turns.size >= 35, 'El giro debe actualizarse durante el recorrido');
      assert.ok(movement.maxGap < 2000, `Movimiento detenido durante ${movement.maxGap} ms`);
      assert.ok(Date.now() - movement.last < 2000, 'La última posición debe ser reciente');
    }
  }
  const observations = active.flatMap(socket => [...socket.movements.values()]);
  console.log(`Movimiento observado: mínimo ${Math.min(...observations.map(value => value.positions.size))} posiciones por avatar en 22 s, pausa máxima ${Math.max(...observations.map(value => value.maxGap))} ms.`);
  const extra = await connect(clients[10]);
  const rejected = new Promise(resolve => extra.once('close', code => resolve(code)));
  move(extra, 10);
  assert.equal(await Promise.race([rejected, new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('El servidor no comunicó el cupo completo')), 10000);
    timeout.unref();
  })]), 4001, 'El undécimo recibe el aviso de cupo completo');
  assert.ok(active.every(socket => socket.readyState === WebSocket.OPEN), 'Ningún jugador admitido es expulsado');
  active[0].close();
  await until(() => active.slice(1).every(socket => socket.snapshot?.players.length === 9), 'Se libera la plaza al salir');
  const replacement = await connect(clients[10]);
  move(replacement, 10);
  await until(() => [replacement, ...active.slice(1)].every(socket => socket.snapshot?.players.length === 10), 'El siguiente jugador ocupa la plaza libre');
  console.log('PASS: diez jugadores entre dos servidores, desplazamiento y giro continuos durante 22 segundos, rechazo del undécimo y reutilización de plaza.');
} finally {
  timers.forEach(clearInterval);
  for (const socket of sockets) socket.terminate();
  await Promise.allSettled(clients.map(client => request(client, 'logout', 'POST')));
}
