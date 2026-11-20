import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: "custom" });
after(() => server.close());
const { nearbyInformation, informationPoints } = await server.ssrLoadModule("/src/data/place-information.ts");
const { TourEngine } = await server.ssrLoadModule("/src/scene/engine.ts");
const T = await import("three");
const previousElement = globalThis.Element;
globalThis.Element = class { closest() { return this.editing; } };
after(() => { globalThis.Element = previousElement; });

test("El aviso de Manfred se limita a su llegada y altura, sin activarse desde pisos superiores", () => {
  const point = informationPoints.find(point => point.place.id === "sala-manfred");
  const [x, y, z] = point.place.position;
  assert.equal(nearbyInformation(x, y + 1.5, z), point);
  assert.equal(nearbyInformation(x + 4.4, y + 1.5, z), point);
  assert.equal(nearbyInformation(x + 4.5, y + 1.5, z), null);
  assert.equal(nearbyInformation(x, y + 1.5 + 3.5, z), null);
  assert.match(point.information.dedication, /homenaje/);
});

test("La informaci�n no se ofrece a trav�s de muros, en pausa, ascensor o durante un gesto", () => {
  const [x, y, z] = informationPoints[0].place.position;
  const engine = { camera: { position: new T.Vector3(x + 1, y + 1.5, z) },
    walker: { active: true, obstructs: () => false }, social: { busy: false },
    elevatorPassenger: false, informationRay: new T.Ray() };
  const nearby = () => TourEngine.prototype.nearInformation.call(engine);
  assert.equal(nearby(), informationPoints[0]);
  engine.walker.obstructs = () => true;
  assert.equal(nearby(), null);
  engine.walker.obstructs = () => false;
  engine.walker.active = false; assert.equal(nearby(), null);
  engine.walker.active = true; engine.social.busy = true; assert.equal(nearby(), null);
  engine.social.busy = false; engine.elevatorPassenger = true; assert.equal(nearby(), null);
});

test("I abre solo la informaci�n cercana e ignora repetici�n, escritura, composici�n y modificadores", () => {
  const calls = [];
  const point = informationPoints[0];
  const engine = { walker: { active: true }, social: { busy: false },
    nearInformation: () => point, onInformation: info => calls.push(info) };
  const press = extra => TourEngine.prototype.interactionKey.call(engine, { code: "KeyI", preventDefault() {}, ...extra });
  press();
  assert.deepEqual(calls, [point.information]);
  calls.length = 0;
  const input = new Element(); input.editing = true;
  for (const extra of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { target: input }]) press(extra);
  engine.walker.active = false; press();
  engine.walker.active = true; engine.social.busy = true; press();
  engine.social.busy = false; engine.nearInformation = () => null; press();
  assert.deepEqual(calls, []);
});
