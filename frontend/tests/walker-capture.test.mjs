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

function flightWorld(roof=false){
 const state=setup();const world=new T.Group();
 const floor=new T.Mesh(new T.BoxGeometry(60,.1,60));floor.position.y=-.05;world.add(floor);
 if(roof){const ceiling=new T.Mesh(new T.BoxGeometry(20,.15,20));ceiling.position.y=3.075;world.add(ceiling);}
 world.updateMatrixWorld(true);state.walker.setWorld(world);state.walker.teleport(new T.Vector3(0,.02,0));state.walker.walk();return state;
}
const space=held=>window.dispatchEvent(Object.assign(new Event(held?'keydown':'keyup'),{code:'Space'}));
function advance(walker,seconds,hz=60){for(let i=0;i<Math.round(seconds*hz);i++)walker.update(1/hz);}

test('Jetpack sostenido sube; al soltar conserva inercia y después cae por gravedad',()=>{
 const {walker,camera}=flightWorld();space(true);advance(walker,2);const height=camera.position.y,speed=walker.verticalSpeed;
 assert.ok(height>12);assert.ok(speed>10);space(false);advance(walker,.2);
 assert.ok(camera.position.y>height,'Conserva impulso ascendente');assert.ok(walker.verticalSpeed>0&&walker.verticalSpeed<speed);
 advance(walker,2);assert.ok(walker.verticalSpeed<0,'La gravedad invierte la marcha');
});
test('Activar en caída frena progresivamente antes de volver a subir',()=>{
 const {walker,camera}=flightWorld();walker.teleport(new T.Vector3(0,100,0));advance(walker,1);
 const down=walker.verticalSpeed,height=camera.position.y;assert.ok(down<-10);space(true);advance(walker,1/60);
 assert.ok(walker.verticalSpeed<0&&walker.verticalSpeed>down,'No cambia la velocidad instantáneamente');assert.ok(camera.position.y<height);
 advance(walker,2);assert.ok(walker.verticalSpeed>0,'El empuje termina por invertir la caída');
});
test('El jetpack no agota combustible y el vuelo es consistente entre tasas de cuadros',()=>{
 const fly=hz=>{const {walker,camera}=flightWorld();space(true);advance(walker,5,hz);return camera.position.y;};
 assert.ok(Math.abs(fly(30)-fly(144))<.08);
 const {walker,camera}=flightWorld();space(true);advance(walker,90);assert.ok(camera.position.y>1500);assert.ok(walker.jetpacking);
});
test('El vuelo respeta techos y el aterrizaje respeta el suelo',()=>{
 const {walker}=flightWorld(true);space(true);advance(walker,5);assert.ok(walker.body.end.y+walker.body.radius<=3.001);
 space(false);advance(walker,4);assert.ok(walker.grounded);assert.ok(walker.body.start.y-walker.body.radius>=-.001);assert.equal(walker.verticalSpeed,0);
});
test('Pausa y bloqueo social desactivan el propulsor',async()=>{
 const {walker,camera}=flightWorld();space(true);advance(walker,1);walker.frozen=true;const y=camera.position.y;advance(walker,1);
 assert.equal(camera.position.y,y);assert.equal(walker.jetpacking,false);walker.frozen=false;walker.pause();await Promise.resolve();advance(walker,1);
 assert.equal(walker.jetpacking,false);assert.equal(camera.position.y,y);walker.walk();advance(walker,1);assert.ok(camera.position.y<y);
});
