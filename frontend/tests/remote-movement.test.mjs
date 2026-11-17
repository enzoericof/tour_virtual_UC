import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

test('Los diez avatares interpolan posiciones y giros recibidos sin recrearse', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }),
  };
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: 'custom',
  });
  try {
    const { RemotePlayers } = await server.ssrLoadModule('/src/scene/remote-players.ts');
    const { Scene } = await import('three');
    const scene = new Scene();
    const remote = new RemotePlayers(scene);
    const initial = Array.from({ length: 10 }, (_, index) => ({
      id: String(index), name: 'Visitante ' + index, skin: 'azul',
      x: index * 3, y: 0, z: 10, yaw: 0, walking: false,
    }));
    remote.receive(initial);
    const avatars = [...scene.children];
    remote.receive(initial.map(player => ({ ...player, x: player.x + 2, y: 0.3, z: 11, yaw: 1, walking: true })));
    remote.update(1 / 60);
    avatars.forEach((avatar, index) => {
      assert.ok(avatar.position.x > index * 3 && avatar.position.x < index * 3 + 2);
      assert.ok(avatar.rotation.y > 0 && avatar.rotation.y < 1);
    });
    for (let frame = 0; frame < 60; frame++) remote.update(1 / 60);
    avatars.forEach((avatar, index) => {
      assert.equal(scene.children[index], avatar);
      assert.ok(Math.abs(avatar.position.x - (index * 3 + 2)) < 0.001);
      assert.ok(Math.abs(avatar.position.y - 0.3) < 0.001);
      assert.ok(Math.abs(avatar.rotation.y - 1) < 0.001);
    });
    remote.receive([]);
    assert.equal(scene.children.length, 0);
  } finally {
    globalThis.document = previousDocument;
    await server.close();
  }
});
