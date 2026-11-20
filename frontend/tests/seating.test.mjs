import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { registerSeats, collectSeats, occupiedSeat } from '../src/scene/seating.ts';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

test('Bancos con dos plazas y sillas con una, incluyendo giro y altura', () => {
 const root=new T.Group(), group=new T.Group(); root.add(group);
 group.position.set(10,2,7); group.rotation.y=Math.PI/2;
 registerSeats(group,1.8); registerSeats(group,.57,3,.46,0);
 const seats=collectSeats(root);
 assert.equal(seats.length,3); assert.equal(new Set(seats.map(s=>s.id)).size,3);
 assert.ok(seats.every(s=>Math.abs(s.point.y-2.46)<1e-8));
 assert.ok(seats[0].forward.distanceTo(new T.Vector3(1,0,0))<1e-8);
 const pose=s=>({x:s.point.x,y:s.point.y-.9,z:s.point.z});
 assert.equal(occupiedSeat(seats,pose(seats[0])),seats[0]);
 assert.equal(occupiedSeat(seats,pose(seats[1])),seats[1]);
 assert.equal(occupiedSeat(seats,{...pose(seats[0]),y:2}),undefined);
});

test('Ocupación independiente, desempate simultáneo y liberación al salir', async () => {
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
  const {TourEngine}=await server.ssrLoadModule('/src/scene/engine.ts');
  const root=new T.Group();registerSeats(root,1.8);const seats=collectSeats(root);
  const engine=Object.create(TourEngine.prototype);
  engine.social={setSelf:()=>{}};
  Object.assign(engine,{seats,occupied:new Set(),seated:seats[0],seatReturn:new T.Vector3(2,0,3),onError:()=>{},walker:{teleport:p=>engine.returned=p.clone()}});
  const player=(id,s)=>({id,x:s.point.x,y:s.point.y-.9,z:s.point.z,yaw:0,walking:false});
  engine.receiveSeating([player('b',seats[0]),player('c',seats[1])],'a');
  assert.equal(engine.seated,seats[0]); assert.equal(engine.occupied.size,2);
  engine.receiveSeating([player('a',seats[0])],'b');
  assert.equal(engine.seated,null);assert.deepEqual(engine.returned.toArray(),[2,0,3]);
  engine.receiveSeating([],'b');assert.equal(engine.occupied.size,0);
  engine.camera=new T.PerspectiveCamera();engine.camera.position.set(0,1.5,1);engine.camera.lookAt(0,1.5,0);
  engine.walker.obstructs=()=>false;
  assert.ok(engine.nearSeat());
  engine.receiveSeating(seats.map((s,i)=>player(String(i),s)),'b');
  assert.equal(engine.nearSeat(),null);
  engine.receiveSeating([],'b');engine.walker.obstructs=()=>true;
  assert.equal(engine.nearSeat(),null);
 } finally {await server.close();}
});
