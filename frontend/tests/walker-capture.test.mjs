import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import * as T from "three";

let server, Walker;
before(async () => {
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: "custom" });
  ({ Walker } = await server.ssrLoadModule("/src/navigation/walker.ts"));
});
after(async () => { await server?.close(); });

function setup(request) {
  const doc = new EventTarget(), canvas = new EventTarget();
  globalThis.window = new EventTarget();
  canvas.ownerDocument = doc;
  doc.exitPointerLock = () => {
    doc.pointerLockElement = null;
    queueMicrotask(() => doc.dispatchEvent(new Event("pointerlockchange")));
  };
  const grant = () => { doc.pointerLockElement = canvas; doc.dispatchEvent(new Event("pointerlockchange")); };
  canvas.requestPointerLock = request ?? (() => { grant(); return Promise.resolve(); });
  const camera = new T.PerspectiveCamera(), walker = new Walker(camera, canvas), errors = [];
  walker.onCaptureError = text => errors.push(text);
  const move = () => doc.dispatchEvent(Object.assign(new Event("mousemove"), { movementX: 1500, movementY: 0 }));
  return { walker, camera, errors, move, grant };
}

test("Walking uses captured relative mouse movement, and Escape returns to pause", async () => {
  const { walker, camera, move } = setup();
  walker.walk(); assert.equal(walker.active, true);
  for (let i = 0; i < 20; i++) { const previous = camera.quaternion.clone(); move(); assert.ok(previous.angleTo(camera.quaternion) > 0.1); }
  window.dispatchEvent(Object.assign(new Event("keydown"), { code: "Escape" }));
  await Promise.resolve(); assert.equal(walker.active, false);
  const paused = camera.quaternion.clone(); move(); assert.ok(paused.equals(camera.quaternion));
  walker.walk(); assert.equal(walker.active, true);
});

test("Denied capture stays paused and reports the problem instead of using a bounded cursor", async () => {
  const { walker, errors, camera, move } = setup(() => Promise.reject(new Error("denied")));
  walker.walk(); await Promise.resolve();
  assert.equal(walker.active, false); assert.equal(errors.length, 1);
  const paused = camera.quaternion.clone(); move(); assert.ok(paused.equals(camera.quaternion));
});

test("Escape cancels a pending capture and a late denial does not resume or report an error", async () => {
  let reject;
  const { walker, errors } = setup(() => new Promise((_, fail) => { reject = fail; }));
  walker.walk(); window.dispatchEvent(Object.assign(new Event("keydown"), { code: "Escape" }));
  reject(new Error("late")); await Promise.resolve();
  assert.equal(walker.active, false); assert.deepEqual(errors, []);
});

test("A capture granted after pausing is immediately released", async () => {
  const { walker, grant } = setup(() => new Promise(() => {}));
  walker.walk(); walker.pause(); grant(); await Promise.resolve();
  assert.equal(walker.active, false);
});

test("Ragdoll contacts and sight rays include the static scene, editor and active doors", () => {
  const {walker}=setup();
  const ground=new T.Mesh(new T.BoxGeometry(5,.1,5));ground.position.y=-.05;ground.updateMatrixWorld();walker.setWorld(ground);
  const wall=new T.Mesh(new T.BoxGeometry(.2,2,2));wall.position.set(1,1,0);wall.updateMatrixWorld();walker.setEditorWorld(wall);
  assert.ok(walker.sphereCollision(new T.Sphere(new T.Vector3(0,.1,0),.2)));
  assert.ok(walker.sphereCollision(new T.Sphere(new T.Vector3(.85,1,0),.2)));
  assert.ok(walker.rayDistance(new T.Ray(new T.Vector3(0,1,0),new T.Vector3(1,0,0)),3)<1);
  let closed=false;
  const door=new T.Mesh(new T.BoxGeometry(1,2,.1));door.position.set(0,1,-.5);door.updateMatrixWorld();walker.addBarrier(door,()=>closed);
  const ray=new T.Ray(new T.Vector3(0,1,0),new T.Vector3(0,0,-1));
  assert.equal(walker.rayDistance(ray,2),2);
  closed=true;assert.ok(walker.rayDistance(ray,2)<.5);
  assert.ok(walker.sphereCollision(new T.Sphere(new T.Vector3(0,1,-.42),.2)));
});
