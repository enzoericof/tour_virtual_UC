import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorVisit, visitIdleMs } from '../src/services/visit-lifecycle.ts';

function visit() {
  let now = 0, tick, cancelled = 0;
  const target = new EventTarget(), document = new EventTarget(), reasons = [];
  document.visibilityState = 'visible';
  const monitor = monitorVisit(reason => reasons.push(reason), { target, document, now: () => now,
    every: callback => { tick = callback; return () => cancelled++; } });
  return { target, document, reasons, monitor, advance: value => now = value, tick: () => tick(), cancelled: () => cancelled };
}

test('Tres minutos sin actividad terminan la visita una sola vez', () => {
  const v = visit();
  v.advance(visitIdleMs - 1); v.tick(); assert.deepEqual(v.reasons, []);
  v.advance(visitIdleMs); v.tick(); v.tick();
  assert.deepEqual(v.reasons, ['idle']); assert.equal(v.cancelled(), 1);
});

test('Teclado, mouse y rueda mantienen el recorrido; las actualizaciones de red no', () => {
  const v = visit();
  for (const [index, event] of ['keydown', 'mousemove', 'pointerdown', 'wheel'].entries()) {
    v.advance((index + 1) * 100000); v.target.dispatchEvent(new Event(event)); v.tick();
  }
  v.advance(579999); v.target.dispatchEvent(new Event('message')); v.tick();
  assert.deepEqual(v.reasons, []);
  v.advance(580000); v.tick(); assert.deepEqual(v.reasons, ['idle']);
});

test('Volver a una pestaña inactiva no revive la visita caducada', () => {
  const v = visit();
  v.document.visibilityState = 'hidden'; v.document.dispatchEvent(new Event('visibilitychange'));
  v.advance(visitIdleMs + 10000);
  v.document.visibilityState = 'visible'; v.document.dispatchEvent(new Event('visibilitychange'));
  v.target.dispatchEvent(new Event('keydown'));
  assert.deepEqual(v.reasons, ['idle']);
});

test('Recargar o cerrar retira la visita, incluso si después llegan más eventos', () => {
  const v = visit(); v.target.dispatchEvent(new Event('pagehide'));
  v.advance(500000); v.tick(); v.target.dispatchEvent(new Event('mousemove'));
  assert.deepEqual(v.reasons, ['pagehide']); assert.equal(v.cancelled(), 1);
});

test('El primer movimiento después de un plazo vencido tampoco reinicia el contador', () => {
  const v = visit(); v.advance(visitIdleMs + 1); v.target.dispatchEvent(new Event('pointermove'));
  assert.deepEqual(v.reasons, ['idle']);
});
