import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";
import { pickDestination, pointerOnCanvas } from "../src/navigation/pick-destination.ts";

function scene() {
  const world = new T.Group();
  const box = (w,h,d,x,y,z) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w,h,d)); mesh.position.set(x,y,z); world.add(mesh);
  };
  box(60, 0.2, 60, 0, -0.1, 0);
  return { world, box, picker() {
    world.updateMatrixWorld(true);
    const tree = new Octree().fromGraphNode(world);
    return ray => pickDestination(ray, world, feet => !tree.capsuleIntersect(new Capsule(
      feet.clone().add(new T.Vector3(0,.3,0)), feet.clone().add(new T.Vector3(0,1.5,0)), .28)));
  }};
}
test("Different selected coordinates keep their own destination instead of a default entrance", () => {
  const pick=scene().picker();
  for(const [x,z] of [[-13,8],[2,-9],[17,15]]) {
    const feet=pick(new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)));
    assert.ok(feet); assert.ok(Math.abs(feet.x-x)<1e-6); assert.ok(Math.abs(feet.z-z)<1e-6);
  }
});
test("A clicked elevated floor preserves its height", () => {
  const s=scene(); s.box(8,.2,8,0,3.9,0);
  const feet=s.picker()(new T.Raycaster(new T.Vector3(1,20,2),new T.Vector3(0,-1,0)));
  assert.ok(Math.abs(feet.y-4.04)<1e-6);
});
test("Clicking a facade finds floor outside the wall with room for the visitor", () => {
  const s=scene(); s.box(.3,5,10,0,2.5,0);
  const feet=s.picker()(new T.Raycaster(new T.Vector3(10,2,0),new T.Vector3(-1,0,0)));
  assert.ok(feet.x>.43); assert.ok(feet.x<2.5); assert.ok(feet.y<.1);
});
test("Sky and locations without headroom do not send the visitor elsewhere", () => {
  const s=scene();
  assert.equal(s.picker()(new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,1,0))),null);
  assert.equal(pickDestination(new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0)),s.world,()=>false),null);
});
test("Canvas offsets and dimensions are included when converting a click to a ray", () => {
  const bounds={left:120,top:80,width:800,height:400};
  assert.deepEqual(pointerOnCanvas(520,280,bounds).toArray(),[0,0]);
  assert.deepEqual(pointerOnCanvas(120,80,bounds).toArray(),[-1,1]);
});
