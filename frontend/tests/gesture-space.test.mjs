import { after, test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{middlewareMode:true,hmr:false},appType:"custom"});
after(()=>server.close());
const {Walker}=await server.ssrLoadModule('/src/navigation/walker.ts');
const {SocialPerformance}=await server.ssrLoadModule('/src/scene/social-performance.ts');
const {Capsule}=await import('three/addons/math/Capsule.js');
const {buildCollisionWorld}=await server.ssrLoadModule('/src/navigation/collision-world.ts');
const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=new EventTarget();globalThis.document={};after(()=>{globalThis.window=oldWindow;globalThis.document=oldDocument;});
function setup(height=0){
 globalThis.window=new EventTarget();
 const floor=new T.Mesh(new T.BoxGeometry(20,.2,20));floor.position.y=height-.1;floor.updateMatrixWorld(true);
 const camera=new T.PerspectiveCamera();
 const walker=Object.assign(Object.create(Walker.prototype),{camera,body:new Capsule(new T.Vector3(0,height+.28,0),new T.Vector3(0,height+1.48,0),.28),world:buildCollisionWorld(floor),editorWorld:buildCollisionWorld(),barriers:[],enabled:true,frozen:false,ground:true,spawn:new T.Vector3()});camera.position.copy(walker.body.end);
 walker.velocity=new T.Vector3();
 const errors=[],cancelled=[],remote={action(){},clearActions(){}};
 const performance=new SocialPerformance(new T.Scene(),camera,walker,remote,()=>false,m=>errors.push(m));performance.now=()=>1500;performance.onCancel=id=>cancelled.push(id);
 const player={id:'self',name:'Ana',skin:'azul',x:0,y:height-.02,z:0,yaw:0,walking:false};performance.setSelf(player);
 const action={id:'gesture',kind:'ok',from:'self',to:null,fromName:'Ana',toName:null,fromPose:player,toPose:null,status:'active',startedAt:1000,expiresAt:4000};
 return {walker,performance,errors,cancelled,action};
}
test('Un gesto en el suelo donde el caminante ya está apoyado no se rechaza por contacto con el piso',()=>{
 const {performance,walker,action,errors,cancelled}=setup();performance.action(action);
 assert.deepEqual(errors,[]);assert.deepEqual(cancelled,[]);assert.equal(performance.busy,true);assert.equal(walker.frozen,true);performance.clear();
});
test('OK, paz, caída y gestos de dos personas funcionan en suelo y pisos elevados',()=>{
 for(const height of [0,.9,3.5,7])for(const kind of ['ok','peace','ragdoll','high-five','hold-hands']){
  const {performance,walker,action,errors,cancelled}=setup(height);action.kind=kind;
  if(['high-five','hold-hands'].includes(kind)){action.to='other';action.toPose={...action.fromPose,id:'other',x:1.4};}
  performance.action(action);
  assert.deepEqual(errors,[],`${kind} a ${height} m`);assert.deepEqual(cancelled,[]);assert.ok(performance.busy);
  assert.ok(Math.abs(walker.body.end.y-height-1.525)<.001);performance.clear();
 }
});
test('Una pared y una barrera activa siguen impidiendo ocupar el lugar del gesto',()=>{
 for(const layer of ['editor','barrier']){
  const {performance,walker,action,errors,cancelled}=setup();
  const wall=new T.Mesh(new T.BoxGeometry(.3,2,.5));wall.position.set(.3,1,0);wall.updateMatrixWorld(true);
  if(layer==='editor')walker.setEditorWorld(wall);else walker.addBarrier(wall,()=>true);
  performance.action(action);assert.equal(performance.busy,false);assert.equal(errors.length,1);assert.deepEqual(cancelled,['gesture']);
 }
});
test('Un gesto no teletransporta al visitante hacia un destino sin piso',()=>{
 const {performance,walker,action,errors}=setup();
 const floor=new T.Mesh(new T.BoxGeometry(.4,.2,4));floor.position.y=-.1;floor.updateMatrixWorld(true);walker.setWorld(floor);
 action.kind='high-five';action.to='other';action.toPose={...action.fromPose,id:'other',x:1.9};
 performance.action(action);assert.equal(performance.busy,false);assert.equal(errors.length,1);
});
