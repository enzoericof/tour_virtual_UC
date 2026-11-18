import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionBuffer } from '../src/scene/motion-buffer.ts';
const pose = (at, x, yaw = 0, walking = true) => ({ at, x, y: 0, z: 0, yaw, walking });

test('Movimiento continuo con paquetes cada 300 ms y jitter, sin perseguir cada paquete', () => {
  const buffer = new MotionBuffer();
  let next = 0, previous = 0;
  const distances = [];
  for (let now = 0; now < 6000; now += 1000 / 60) {
    if (now >= next) {
      buffer.receive(pose(100000 + next, next / 1000), now);
      next += next % 600 === 0 ? 280 : 320;
    }
    const x = buffer.sample(now).x;
    if (now > 2000) distances.push(x - previous);
    previous = x;
  }
  assert.ok(Math.min(...distances) > 0.005, 'No debe frenarse entre paquetes');
  assert.ok(Math.max(...distances) < 0.04, 'No debe saltar al recibir cada paquete');
});

test('Ignora duplicados, gira por el camino corto y limita la predicción al perder conexión', () => {
  const buffer = new MotionBuffer();
  buffer.receive(pose(10000, 0, 3.1), 0);
  buffer.receive(pose(10300, 0.3, -3.1), 300);
  buffer.receive(pose(10300, 9), 400);
  const mid = { ...buffer.sample(400) };
  assert.ok(mid.x > 0 && mid.x < 0.3);
  assert.ok(Math.abs(mid.yaw) > 3);
  assert.ok(buffer.sample(10000).x <= 0.401, 'No extrapola indefinidamente');
  buffer.receive(pose(21000, 10, 0, false), 11000);
  assert.equal(buffer.sample(11000).x, 10, 'Teletransporte inmediato');
});
