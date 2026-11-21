import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: "custom" });
after(() => server.close());
const { TourEngine } = await server.ssrLoadModule("/src/scene/engine.ts");
const previousElement = globalThis.Element;
globalThis.Element = class { closest() { return this.editing; } };
after(() => { globalThis.Element = previousElement; });

function setup() {
  const calls = [];
  const target = { id: "other", name: "Visitante" };
  const engine = { walker: { active: true }, vehicles:{driving:null}, social: { busy: false }, seated: null,
    nearPlayer: () => target, onSocialMenu: player => calls.push(["gestures", player]),
    sit: () => calls.push("sit"), leaveSeat: () => calls.push("stand") };
  const press = (code, extra = {}) => TourEngine.prototype.interactionKey.call(engine, { code, preventDefault() {}, ...extra });
  return { engine, calls, target, press };
}

test("G abre gestos propios o interacciones con el visitante que se mira", () => {
  const { engine, calls, target, press } = setup();
  press("KeyG");
  engine.nearPlayer = () => null;
  press("KeyG");
  assert.deepEqual(calls, [["gestures", target], ["gestures", null]]);
});

test("E se reserva para sentarse y levantarse; C y Enter no disparan gestos", () => {
  const { engine, calls, press } = setup();
  press("KeyE");
  engine.seated = {};
  press("KeyE");
  press("KeyC"); press("Enter");
  assert.deepEqual(calls, ["sit", "stand"]);
});

test("Los gestos ignoran escritura, modificadores, repetición, composición, pausa y acciones activas", () => {
  const { engine, calls, press } = setup();
  const input = new Element(); input.editing = true;
  for (const extra of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { target: input }]) press("KeyG", extra);
  engine.walker.active = false; press("KeyG");
  engine.walker.active = true; engine.social.busy = true; press("KeyG");
  assert.deepEqual(calls, []);
});
