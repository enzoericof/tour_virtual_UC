// Prueba optativa contra una base desechable. Crea dos cuentas y no elimina datos.
// TEST_BASE_URL=http://127.0.0.1:8080 CHAT_TEST_ALLOW_MUTATION=yes node tests/chat.integration.mjs
// CHAT_TEST_WAIT_ARCHIVE=yes agrega la espera real de cinco minutos.
import assert from "node:assert/strict";
import WebSocket from "ws";
if (
  process.env.CHAT_TEST_ALLOW_MUTATION !== "yes" ||
  !process.env.TEST_BASE_URL
)
  throw new Error(
    "Indicá TEST_BASE_URL de un entorno desechable y CHAT_TEST_ALLOW_MUTATION=yes.",
  );
const base = process.env.TEST_BASE_URL,
  origin = process.env.TEST_ORIGIN ?? "http://127.0.0.1:5173";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function session(nombre) {
  const cookies = new Map();
  let csrf;
  async function call(route, method = "GET", body) {
    const response = await fetch(base + "/api/auth" + route, {
      method,
      headers: {
        Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        "Content-Type": "application/json",
        ...(csrf ? { [csrf.headerName]: csrf.token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const raw of response.headers.getSetCookie()) {
      const value = raw.split(";")[0],
        at = value.indexOf("=");
      cookies.set(value.slice(0, at), value.slice(at + 1));
    }
    assert.ok(response.ok, `${route}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  csrf = await call("/csrf");
  const correo = `social-${nombre}-${crypto.randomUUID()}@example.test`,
    password = "synthetic-test-password";
  await call("/registro", "POST", {
    nombre,
    apellido: "Prueba",
    correo,
    password,
    carrera: 1,
  });
  await call("/login", "POST", { correo, password });
  csrf = await call("/csrf");
  return { call, cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") };
}
async function connect(session, pose) {
  const events = [];
  const socket = new WebSocket(base.replace(/^http/, "ws") + "/ws/presence", {
    headers: { Cookie: session.cookie, Origin: origin },
  });
  socket.on("message", (data) => events.push(JSON.parse(String(data))));
  const wait = async (predicate) => {
    const until = Date.now() + 10000;
    while (Date.now() < until) {
      const index = events.findIndex(predicate);
      if (index >= 0) return events.splice(index, 1)[0];
      await pause(25);
    }
    throw new Error("No llegó el evento esperado");
  };
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.send("join");
  await wait((e) => e.admitted);
  socket.send(JSON.stringify(pose));
  const snapshot = await wait((e) => e.players?.some((p) => p.id === e.self));
  const heartbeat = setInterval(
    () => socket.readyState === 1 && socket.send("ping"),
    4000,
  );
  return {
    socket,
    wait,
    id: snapshot.self,
    send: (data) => socket.send(JSON.stringify(data)),
    close: () => {
      clearInterval(heartbeat);
      socket.close();
    },
  };
}
const sessions = [],
  peers = [];
try {
  sessions.push(await session("Ana"), await session("Beto"));
  peers.push(
    await connect(sessions[0], { x: 0, y: 0, z: 0, yaw: 0, walking: false }),
    await connect(sessions[1], {
      x: 0,
      y: 0,
      z: -1.3,
      yaw: Math.PI,
      walking: false,
    }),
  );
  const [a, b] = peers;
  await pause(300);
  a.send({
    type: "chat.send",
    text: "Mensaje grupal de integración",
    name: "Identidad falsa",
  });
  const event = await a.wait((e) => e.type === "chat.message");
  await b.wait(
    (e) => e.type === "chat.message" && e.message.id === event.message.id,
  );
  assert.equal(event.message.name, "Ana Prueba");
  await pause(250);
  a.send({ type: "chat.history" });
  const early = await a.wait((e) => e.type === "chat.history");
  assert.ok(!early.messages.some((m) => m.id === event.message.id));
  await pause(250);
  a.send({ type: "social.request", kind: "high-five", target: b.id });
  const request = await b.wait(
    (e) => e.type === "social.action" && e.action.status === "pending",
  );
  await pause(250);
  a.send({ type: "social.respond", id: request.action.id, accept: true });
  await a.wait((e) => e.type === "social.error");
  b.send({ type: "social.respond", id: request.action.id, accept: true });
  const active = await a.wait(
    (e) => e.type === "social.action" && e.action.status === "active",
  );
  const other = await b.wait(
    (e) => e.type === "social.action" && e.action.status === "active",
  );
  assert.equal(active.action.startedAt, other.action.startedAt);
  assert.equal(active.action.id, request.action.id);
  if (process.env.CHAT_TEST_WAIT_ARCHIVE === "yes") {
    const remaining = event.message.sentAt + 302000 - Date.now();
    // Esperas cortas conservan la posibilidad de interrumpir la prueba.
    for (let left = remaining; left > 0; left -= 1000)
      await pause(Math.min(1000, left));
    a.send({ type: "chat.history" });
    const archived = await a.wait((e) => e.type === "chat.history");
    assert.ok(archived.messages.some((m) => m.id === event.message.id));
  }
  console.log(
    "PASS: chat autenticado, identidad del servidor, sin archivo temprano y consentimiento exclusivo del destinatario.",
  );
} finally {
  for (const peer of peers) peer.close();
  for (const session of sessions)
    await session.call("/logout", "POST").catch(() => {});
}
