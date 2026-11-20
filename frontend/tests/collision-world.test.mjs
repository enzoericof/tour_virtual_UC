import { after, test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{middlewareMode:true,hmr:false},appType:"custom"});
after(()=>server.close());
const { buildCollisionWorld }=await server.ssrLoadModule("/src/navigation/collision-world.ts");
function scene(){
 const group=new T.Group();
 const add=(w,h,d,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d));mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 add(60,.2,60,0,-.1,0);const wall=add(.2,3,8,2,1.5,0);add(2,.4,2,-3,.2,0);
 group.updateMatrixWorld(true);return {group,wall};
}
test("El índice acotado conserva los impactos de rayos del modelo exacto",()=>{
 const {group}=scene(),world=buildCollisionWorld(group);
 for(let x=-5.23;x<=5;x+=.47)for(const z of [-3.1,-.17,2.3]){
  const ray=new T.Ray(new T.Vector3(x,4,z),new T.Vector3(0,-1,0));
  const expected=new T.Raycaster(ray.origin,ray.direction,0,10).intersectObject(group,true)[0];
  const actual=world.rayIntersect(ray);
  assert.ok(expected&&actual);assert.ok(Math.abs(expected.distance-actual.distance)<1e-6);
 }
});
test("Piso, pared y escalón mantienen las colisiones de esfera y cápsula",()=>{
 const {group}=scene(),world=buildCollisionWorld(group),reference=new Octree();reference.maxLevel=8;reference.fromGraphNode(group);
 for(const [x,y,z] of [[0,.1,0],[1.8,1,0],[-3,.5,0],[0,2,4]]){
  const sphere=new T.Sphere(new T.Vector3(x,y,z),.28);
  const capsule=new Capsule(new T.Vector3(x,y,z),new T.Vector3(x,y+1.2,z),.28);
  for(const [method,body] of [["sphereIntersect",sphere],["capsuleIntersect",capsule]]){
   const a=world[method](body),b=reference[method](body);assert.equal(Boolean(a),Boolean(b));
   if(a&&b){assert.ok(Math.abs(a.depth-b.depth)<1e-6);assert.ok(a.normal.distanceTo(b.normal)<1e-6);}
  }
 }
});
test("Reconstruir conserva la referencia compartida y descarta la geometría anterior",()=>{
 const {group,wall}=scene(),world=buildCollisionWorld(group);
 const ray=new T.Ray(new T.Vector3(0,1,0),new T.Vector3(1,0,0));
 assert.ok(Math.abs(world.rayIntersect(ray).distance-1.9)<1e-6);
 wall.position.x=10;assert.equal(buildCollisionWorld(group,world),world);
 assert.ok(Math.abs(world.rayIntersect(ray).distance-9.9)<1e-6);
 buildCollisionWorld(null,world);assert.equal(world.rayIntersect(ray),false);
});
