import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createServer} from 'vite';
import {facultyToWorld,insidePolygon,layout} from '../src/data/campus-geometry.ts';
test('Tres gatos exploran sin rutas, permanecen en el suelo y respetan paredes y límites',async()=>{
 const before=globalThis.document;
 const context=new Proxy({}, {get:()=>()=>{}});
 globalThis.document={createElement:()=>({getContext:()=>context})};
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {insideCatRoamingArea}=await server.ssrLoadModule('/src/data/cat-roaming-area.ts');
  const {CampusCats}=await server.ssrLoadModule('/src/scene/campus-cats.ts');
  const world=new T.Group(),floor=new T.Mesh(new T.PlaneGeometry(1500,1500));floor.rotation.x=-Math.PI/2;world.add(floor);
  const [x,,z]=facultyToWorld([25,0,14]);const wall=new T.Mesh(new T.BoxGeometry(1,3,15));wall.position.set(x+2,1.5,z);world.add(wall);world.updateMatrixWorld(true);
  let seed=771;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const cats=new CampusCats(world,random);assert.equal(cats.cats.length,3);
  const starts=cats.cats.map(c=>c.model.root.position.clone());const paths=cats.cats.map(()=>new Set());let pauses=0;
  for(let i=0;i<6000;i++){
   cats.update(.05);
   cats.cats.forEach((cat,j)=>{const p=cat.model.root.position;
    assert.ok(insidePolygon([p.x,p.z],layout.boundary),'No salen del campus');assert.ok(insideCatRoamingArea(p.x,p.z),'Se quedan en edificios, plazas y conexiones interiores');assert.ok(Math.abs(p.y-.015)<.001,'Patas al nivel del piso');
    assert.ok(!(Math.abs(p.x-(x+2))<.67&&Math.abs(p.z-z)<7.67),'No atraviesan paredes');
    paths[j].add(Math.round(cat.heading*10));if(cat.pause>0)pauses++;
   });
  }
  assert.ok(pauses>0,'Hacen pausas independientes');
  cats.cats.forEach((cat,i)=>{assert.ok(cat.model.root.position.distanceTo(starts[i])>2,'Exploran fuera del punto inicial');assert.ok(paths[i].size>12,'Cambian de rumbo');});
 }finally{globalThis.document=before;await server.close();}
});
