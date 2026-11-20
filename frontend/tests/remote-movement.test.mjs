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
    let now = 0;
    const remote = new RemotePlayers(scene, () => now);
    const initial = Array.from({ length: 10 }, (_, index) => ({
      id: String(index), name: 'Visitante ' + index, skin: 'azul',
      x: index * 3, y: 0, z: 10, yaw: 0, walking: false,
    }));
    remote.receive(initial);
    const avatars = [...scene.children];
    now = 100;
    remote.receive(initial.map(player => ({ ...player, x: player.x + 2, y: 0.3, z: 11, yaw: 1, walking: false })));
    for (let frame = 0; frame < 12; frame++) { now += 1000 / 60; remote.update(1 / 60); }
    avatars.forEach((avatar, index) => {
      assert.ok(avatar.position.x > index * 3 && avatar.position.x < index * 3 + 2);
      assert.ok(avatar.rotation.y > 0 && avatar.rotation.y < 1);
    });
    for (let frame = 0; frame < 90; frame++) { now += 1000 / 60; remote.update(1 / 60); }
    avatars.forEach((avatar, index) => {
      assert.equal(scene.children[index], avatar);
      assert.ok(Math.abs(avatar.position.x - (index * 3 + 2)) < 0.001);
      assert.ok(Math.abs(avatar.position.y - 0.3) < 0.001);
      assert.ok(Math.abs(avatar.rotation.y - 1) < 0.001);
    });
    now+=100;
    const flying=initial.map((p,i)=>({...p,x:p.x+2,y:.3,z:11,yaw:1,jetpacking:i===0,at:now}));
    remote.receive(flying);
    for(let i=0;i<20;i++){now+=1000/60;remote.update(1/60);}
    assert.equal(avatars[0].getObjectByName('Empuje del jetpack').visible,true,'El empuje se ve en el avatar remoto');
    assert.equal(avatars[1].getObjectByName('Empuje del jetpack').visible,false);
    now+=100;remote.receive(flying.map(p=>({...p,jetpacking:false,at:now})));
    for(let i=0;i<20;i++){now+=1000/60;remote.update(1/60);}
    assert.equal(avatars[0].getObjectByName('Empuje del jetpack').visible,false,'Soltar apaga el escape aunque la posición no cambie');
    remote.receive([]);
    assert.equal(scene.children.length, 0);
  } finally {
    globalThis.document = previousDocument;
    await server.close();
  }
});
