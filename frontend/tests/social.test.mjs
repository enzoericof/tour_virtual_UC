import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { Ragdoll } = await server.ssrLoadModule("/src/scene/ragdoll.ts");
const { recentMessages } = await server.ssrLoadModule(
  "/src/services/social.ts",
);
const { actionAnchor } = await server.ssrLoadModule("/src/scene/avatar.ts");

test("El chat oculta mensajes exactamente al cumplir cinco minutos", () => {
  const messages = [
    { id: "a", sentAt: 1000 },
    { id: "b", sentAt: 2000 },
    { id: "c", sentAt: 3000 },
  ];
  assert.deepEqual(
    recentMessages(messages, 302000).map((m) => m.id),
    ["c"],
  );
});

test("El ragdoll cae, choca contra suelo y pared, conserva articulaciones y acepta impulsos", () => {
  let impacts = 0;
  const world = (s) => {
    if (s.center.y < s.radius)
      return { normal: new T.Vector3(0, 1, 0), depth: s.radius - s.center.y };
    if (s.center.z - s.radius < -0.7)
      return {
        normal: new T.Vector3(0, 0, 1),
        depth: -0.7 - (s.center.z - s.radius),
      };
    return false;
  };
  const rag = new Ragdoll(new T.Vector3(0, 1, 0), 0, world, () => impacts++);
  for (let i = 0; i < 360; i++) rag.update(1 / 120);
  assert.ok(
    rag.center.y < 0.45,
    "El cuerpo queda sobre el entorno, no en una pose de pie",
  );
  assert.ok(impacts > 0, "El sonido requiere contactos físicos");
  for (const p of rag.particles) {
    assert.ok(p.position.y >= p.radius - 0.015);
    assert.ok(p.position.z - p.radius >= -0.72);
    assert.ok(p.position.distanceTo(rag.center) < 1.6);
  }
  const old = rag.center.clone();
  rag.impulse("right");
  for (let i = 0; i < 60; i++) rag.update(1 / 120);
  assert.ok(rag.center.x > old.x + 0.01, "Los impulsos desplazan el cuerpo");
});

test("Los dos participantes obtienen anclas enfrentadas sin cambiar de piso", () => {
  const action = {
    kind: "high-five",
    from: "a",
    to: "b",
    fromPose: { x: 0, y: 3, z: 0, yaw: 0 },
    toPose: { x: 0, y: 3, z: -1.5, yaw: Math.PI },
  };
  const a = actionAnchor(action, "a"),
    b = actionAnchor(action, "b");
  assert.ok(Math.abs(a.position.distanceTo(b.position) - 0.8) < 0.001);
  assert.equal(a.position.y, 3);
  assert.equal(b.position.y, 3);
  const forward = new T.Vector3(0, 0, -1).applyAxisAngle(
    new T.Vector3(0, 1, 0),
    a.yaw,
  );
  assert.ok(forward.dot(b.position.clone().sub(a.position).normalize()) > 0.99);
});

test("El GLB generado por Blender conserva dedos, articulaciones y los siete clips", async () => {
  const buffer = fs.readFileSync(
    new URL("../public/assets/avatar/campus-person.glb", import.meta.url),
  );
  assert.ok(buffer.length < 300000);
  const gltf = await new GLTFLoader().parseAsync(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
    "",
  );
  assert.deepEqual(gltf.animations.map((a) => a.name).sort(), [
    "Fall",
    "HighFive",
    "HoldHandsJump",
    "Idle",
    "OK",
    "Peace",
    "Walk",
  ]);
  for (const name of [
    "Pelvis",
    "Spine",
    "Head",
    "UpperArmR",
    "ForearmL",
    "IndexR",
    "MiddleR",
    "ThumbR",
  ])
    assert.ok(gltf.scene.getObjectByName(name), name);
  const bounds = new T.Box3().setFromObject(gltf.scene);
  assert.ok(bounds.max.y > 1.6 && bounds.max.y < 1.9);
  assert.ok(bounds.min.y > -0.1);
  const mixer = new T.AnimationMixer(gltf.scene);
  const clip = gltf.animations.find((a) => a.name === "HighFive");
  mixer.clipAction(clip).play();
  mixer.setTime(1.2);
  const hand = gltf.scene
    .getObjectByName("HandR")
    .getWorldPosition(new T.Vector3());
  assert.ok(hand.y > 1.5, "High five eleva la mano");
});

test("El high five aproxima las manos opuestas de los dos participantes", async () => {
  const { Avatar } = await server.ssrLoadModule("/src/scene/avatar.ts");
  const a = {
    id: "a",
    name: "Ana",
    skin: "azul",
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    walking: false,
  };
  const b = { ...a, id: "b", name: "Beto", z: -1.4, yaw: Math.PI };
  const action = {
    id: "pair",
    kind: "high-five",
    from: "a",
    to: "b",
    fromPose: a,
    toPose: b,
    status: "active",
    startedAt: 1000,
    expiresAt: 4200,
  };
  const left = new Avatar("a", a, 0, false),
    right = new Avatar("b", b, 0, false);
  left.setAction(action, () => false, 2000);
  right.setAction(action, () => false, 2000);
  left.update(1 / 60, 1000, false, 2000);
  right.update(1 / 60, 1000, false, 2000);
  left.group.updateMatrixWorld(true);
  right.group.updateMatrixWorld(true);
  const wristA = left.visual
    .getObjectByName("HandR")
    .getWorldPosition(new T.Vector3());
  const wristB = right.visual
    .getObjectByName("HandL")
    .getWorldPosition(new T.Vector3());
  assert.ok(wristA.distanceTo(wristB) < 0.08, `${wristA.distanceTo(wristB)} m`);
  left.remove();
  right.remove();
});

test("Una caducidad tardía no cancela un gesto nuevo del mismo avatar", async () => {
  const { RemotePlayers } = await server.ssrLoadModule(
    "/src/scene/remote-players.ts",
  );
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ fillRect() {}, fillText() {} }),
    }),
  };
  try {
    const remote = new RemotePlayers(new T.Scene());
    remote.now = () => 2000;
    const player = {
      id: "a",
      name: "Ana",
      skin: "azul",
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      walking: false,
    };
    remote.receive([player]);
    const first = {
      id: "first",
      kind: "ok",
      from: "a",
      to: null,
      fromPose: player,
      toPose: null,
      status: "active",
      startedAt: 1000,
      expiresAt: 4000,
    };
    const second = {
      ...first,
      id: "second",
      kind: "peace",
      startedAt: 2000,
      expiresAt: 5000,
    };
    remote.action(first);
    remote.action(second);
    remote.action({ ...first, status: "expired" });
    assert.equal(remote.avatars.get("a").actionId, "second");
    remote.action(first);
    assert.equal(remote.avatars.get("a").actionId, "second");
    remote.receive([]);
  } finally {
    globalThis.document = previous;
  }
});

test("OK y paz mantienen la mano levantada durante la meseta y vuelven a reposo al terminar", async () => {
  const { Avatar } = await server.ssrLoadModule("/src/scene/avatar.ts");
  const bytes = fs.readFileSync(
    new URL("../public/assets/avatar/campus-person.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const player = {
    id: "a",
    name: "Ana",
    skin: "azul",
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    walking: false,
  };
  const avatar = new Avatar("a", player, 0, false);
  avatar.visual.clear();
  avatar.visual.add(gltf.scene);
  avatar.nodes.clear();
  gltf.scene.traverse((node) => avatar.nodes.set(node.name, node));
  avatar.captureRest();
  avatar.mixer = new T.AnimationMixer(gltf.scene);
  avatar.animations = gltf.animations;
  const arm = avatar.nodes.get("UpperArmR"),
    rest = avatar.rest.get(arm).quaternion;
  for (const kind of ["ok", "peace"]) {
    avatar.setAction(
      {
        id: kind,
        kind,
        from: "a",
        to: null,
        fromPose: player,
        toPose: null,
        status: "active",
        startedAt: 1000,
        expiresAt: 4000,
      },
      () => false,
      1000,
    );
    for (let t = 1800; t <= 2200; t += 50) {
      avatar.update(0.05, t, false, t);
      assert.ok(
        arm.quaternion.angleTo(rest) > 1,
        "No se debe restaurar la pose entre cuadros constantes",
      );
    }
    avatar.update(0.05, 4100, false, 4100);
    assert.ok(arm.quaternion.angleTo(rest) < 0.05);
  }
  avatar.remove();
});
