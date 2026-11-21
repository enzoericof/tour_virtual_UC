import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Capsule} from 'three/addons/math/Capsule.js';
import {driveStep} from '../src/navigation/vehicle-physics.ts';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

test('La Raptor acelera con inercia, frena antes de retroceder y no atraviesa una pared a velocidad máxima',()=>{
  const state={x:0,y:0,z:0,yaw:0,speed:0,steer:0};
  const tick=(input,seconds,blocked)=>{for(let i=0;i<seconds*120;i++)driveStep(state,input,1/120,blocked);};
  tick({throttle:1,steering:0,brake:false},4);
  assert.ok(state.speed>25&&state.speed<29,'Aceleración rápida pero progresiva');
  const speed=state.speed;tick({throttle:0,steering:0,brake:false},.2);assert.ok(state.speed>speed*.8,'Conserva inercia al soltar');
  tick({throttle:-1,steering:0,brake:false},.3);assert.ok(state.speed>0,'Primero frena');
  tick({throttle:-1,steering:0,brake:false},3);assert.ok(state.speed<0&&state.speed>=-7);
  tick({throttle:0,steering:0,brake:true},1);assert.equal(state.speed,0);
  Object.assign(state,{x:0,speed:34});driveStep(state,{throttle:1,steering:0,brake:false},.05,p=>p.x>1);
  assert.ok(state.x<=1);assert.equal(state.speed,0);
});
test('El giro depende de la velocidad y el retroceso invierte la trayectoria; el borde sin suelo detiene el vehículo',()=>{
  const a={x:0,y:0,z:0,yaw:0,speed:5,steer:.4},b={...a,speed:-5};
  driveStep(a,{throttle:0,steering:1,brake:false},.05);driveStep(b,{throttle:0,steering:1,brake:false},.05);
  assert.ok(a.yaw>0&&b.yaw<0);
  const x=a.x;driveStep(a,{throttle:1,steering:0,brake:false},.05,()=>false,()=>NaN);assert.equal(a.x,x);assert.equal(a.speed,0);
});

const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {MovingCollider}=await server.ssrLoadModule('/src/navigation/moving-collider.ts');
const {Walker}=await server.ssrLoadModule('/src/navigation/walker.ts');
const {VehicleFleet}=await server.ssrLoadModule('/src/scene/vehicle-fleet.ts');
const {buildCollisionWorld}=await server.ssrLoadModule('/src/navigation/collision-world.ts');

test('Las colisiones móviles siguen al vehículo sin dejar un sólido en su posición anterior',()=>{
  const local=new T.Mesh(new T.BoxGeometry(4,2,2));local.position.y=1;const collider=new MovingCollider(local);
  collider.setMatrix(new T.Matrix4().makeTranslation(10,0,0));
  assert.ok(collider.sphereIntersect(new T.Sphere(new T.Vector3(11.9,1,0),.25)));
  assert.equal(collider.sphereIntersect(new T.Sphere(new T.Vector3(1.9,1,0),.25)),false);
  assert.ok(collider.capsuleIntersect(new Capsule(new T.Vector3(12.1,.3,0),new T.Vector3(12.1,1.5,0),.28)));
  assert.ok(Math.abs(collider.rayIntersect(new T.Ray(new T.Vector3(20,1,0),new T.Vector3(-1,0,0))).distance-8)<.01);
});

test('La reserva confirmada monta la cabina, las réplicas interpolan y la salida estaciona y libera',()=>{
  const camera=new T.PerspectiveCamera(),floor=new T.Mesh(new T.BoxGeometry(100,.1,100));floor.position.y=-.05;
  const walker=Object.assign(Object.create(Walker.prototype),{camera,world:buildCollisionWorld(floor),editorWorld:buildCollisionWorld(),barriers:[],moving:[],keys:new Set(),controls:{isLocked:true},enabled:true,frozen:false,velocity:new T.Vector3(),spawn:new T.Vector3(),body:new Capsule(new T.Vector3(),new T.Vector3(0,1.5,0),.28)});
  const model=()=>{const visual=new T.Group(),solid=new T.Group();const body=new T.Mesh(new T.BoxGeometry(5,1.4,2));body.position.y=.8;solid.add(body);return {id:'raptor-0',visual,solid};};
  const fleet=new VehicleFleet([model()],walker,camera,()=>{}),messages=[];fleet.send=c=>messages.push(c);
  // Esta prueba pequeña utiliza el origen de su fixture, sin conducir fuera del contorno real.
  walker.teleport(new T.Vector3(0,0,-2));fleet.receive([{id:'raptor-0',x:0,y:0,z:0,yaw:0,speed:0,steer:0,driver:null,at:1}],'self');
  fleet.enter();assert.equal(fleet.driving,null);assert.equal(messages[0].type,'vehicle.claim');
  fleet.receive([{...fleet.cars[0].state,driver:'self',at:2}],'self');assert.ok(fleet.driving);assert.equal(walker.frozen,true);assert.equal(camera.position.y,1.60);
  walker.controls.isLocked=false;fleet.driving.state.speed=12;fleet.update(.05);assert.equal(fleet.driving.state.speed,0,'Pausa detiene la aceleración');
  assert.equal(fleet.exit(true),true);assert.equal(walker.frozen,false);assert.equal(messages.at(-1).type,'vehicle.release');
  fleet.receive([{...fleet.cars[0].state,x:8,driver:'other',at:3}],'self');fleet.update(.05);assert.ok(fleet.cars[0].state.x>0);assert.ok(fleet.drivers().has('other'));
  fleet.disconnected();assert.equal(fleet.driving,null);
});

test('Las ocho camionetas del campus tienen índices separados y se puede salir de una plaza en reversa',async()=>{
  const previous=globalThis.document;
  const context=new Proxy({},{get:(_,key)=>String(key).includes('Gradient')?()=>({addColorStop(){}}):key==='measureText'?()=>({width:100}):()=>{},set:()=>true});
  globalThis.document={createElement:()=>({getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(v){}})};
  try{
    const {createCampus}=await server.ssrLoadModule('/src/scene/campus.ts');const campus=createCampus(),camera=new T.PerspectiveCamera();
    const walker=Object.assign(Object.create(Walker.prototype),{camera,world:buildCollisionWorld(campus.colliders),editorWorld:buildCollisionWorld(),barriers:[],moving:[],keys:new Set(),controls:{isLocked:true},enabled:true,frozen:false,velocity:new T.Vector3(),spawn:new T.Vector3(),body:new Capsule(new T.Vector3(),new T.Vector3(0,1.5,0),.28)});
    const fleet=new VehicleFleet(campus.vehicles,walker,camera,s=>assert.fail(s));fleet.send=()=>{};
    assert.equal(fleet.cars.length,8);assert.equal(walker.moving.length,8);
    const remaining=[];campus.colliders.traverse(o=>{if(o.userData.vehicleId)remaining.push(o);});assert.equal(remaining.length,0,'Ningún automóvil queda en el índice estático');
    const car=fleet.cars[2],start={...car.state};walker.teleport(car.visual.localToWorld(new T.Vector3(.1,.03,-1.8)));
    fleet.receive(fleet.cars.map(c=>({...c.state})),'self');fleet.enter();assert.equal(fleet.driving,null);
    fleet.receive(fleet.cars.map(c=>({...c.state,driver:c===car?'self':null})),'self');assert.equal(fleet.driving,car);
    assert.ok(fleet.exit(),'También se puede bajar estando estacionado entre delimitadores');
    fleet.receive(fleet.cars.map(c=>({...c.state,driver:null})),'self');walker.teleport(car.visual.localToWorld(new T.Vector3(.1,.03,-1.8)));fleet.enter();fleet.receive(fleet.cars.map(c=>({...c.state,driver:c===car?'self':null})),'self');
    walker.keys.add('KeyS');for(let i=0;i<75;i++)fleet.update(1/60);
    assert.ok(Math.hypot(car.state.x-start.x,car.state.z-start.z)>3,'Sale por la parte abierta del cajón sin chocar con sus delimitadores');
    walker.keys.clear();walker.keys.add('Space');for(let i=0;i<30;i++)fleet.update(1/60);
    assert.equal(car.state.speed,0);assert.ok(fleet.exit());assert.equal(fleet.driving,null);assert.equal(walker.frozen,false);
    assert.ok(Number.isFinite(camera.position.y)&&camera.position.y>1.45,'La salida queda apoyada en el terreno');
    // Cancelar la reserva al pasar a vista general tampoco monta una respuesta tardía.
    walker.teleport(fleet.cars[3].visual.localToWorld(new T.Vector3(.1,.03,-1.8)));fleet.enter();fleet.exit(true);
    const late=fleet.cars.map(c=>({...c.state,driver:c===fleet.cars[3]?'self':null}));fleet.receive(late,'self');assert.equal(fleet.driving,null);
  }finally{globalThis.document=previous;}
});
