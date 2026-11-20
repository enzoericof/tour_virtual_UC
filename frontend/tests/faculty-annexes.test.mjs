import { test } from "node:test";
import assert from "node:assert/strict";
import { facultyAnnexes, annexPaths, deiGardenPath, deiForecourt } from "../src/data/faculty-annexes.ts";
import { facultyBlueprint as plan, rectCorners, manfredOutline, facultyVisitPoints } from "../src/data/faculty-blueprint.ts";
import { cantinaPatioStair, inCantina } from "../src/data/cantina-terrain.ts";
import { insidePolygon, facultyToWorld, layout } from "../src/data/campus-geometry.ts";
const footprints = facultyAnnexes.map((b)=>b.outline.map(([x,z])=>[
 b.rect.center[0]+x*Math.cos(b.rect.angle)-z*Math.sin(b.rect.angle),
 b.rect.center[1]+x*Math.sin(b.rect.angle)+z*Math.cos(b.rect.angle)]));
const existing = [plan.main,plan.block2,plan.bedelia,plan.cantina].map(rectCorners).concat([manfredOutline()]);
test("The eight annexes have distinct ids and arrivals outside every building",()=>{
 assert.deepEqual(facultyAnnexes.map(b => b.id).sort(),
   ["cta-dicia", "da-cap", "das", "dei-led", "dg", "kampus-print", "lab-maquetas", "led"]);
 assert.equal(facultyAnnexes.find((b)=>b.id==="kampus-print").name,"Kampus Print");
 for(const b of facultyAnnexes) for(const polygon of [...footprints,...existing])
   assert.ok(!insidePolygon(b.entrance,polygon),`${b.name}: arrival inside building`);
});
test("New pedestrian routes do not cut across existing or added buildings",()=>{
 for(const points of [...annexPaths, deiGardenPath, deiForecourt]) for(let i=1;i<points.length;i++) {
  const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);
  for(let k=0;k<=n;k++) { const t=n?k/n:0,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   for(const polygon of [...footprints,...existing]) assert.ok(!insidePolygon(p,polygon),`Path crosses building at ${p}`);
  }
 }
});
test("Kampus Print is visible straight ahead from the covered plaza passage", () => {
  const { start, target } = plan.plazaPassage;
  const print = facultyAnnexes.find(b => b.id === "kampus-print");
  const [x, , z] = facultyVisitPoints["pasillo-plaza"];
  assert.deepEqual([x, z], start);
  assert.ok(Math.hypot(print.rect.center[0] - target[0], print.rect.center[1] - target[1]) < 0.01);
  for (let i = 0; i <= 40; i++) {
    const point = start.map((coord, axis) => coord + (target[axis] - coord) * i / 40);
    assert.ok(!existing.some(outline => insidePolygon(point, outline)), "The sightline stays outside the other buildings");
  }
});

test("DEI–LED respeta la terraza lateral, sus escalones y una franja de césped", () => {
 const dei = facultyAnnexes.find(b => b.id === "dei-led");
 const nearest = Math.min(...rectCorners(dei.rect).map(p => inCantina(p)[0]));
 const stairEdge = cantinaPatioStair.startX + cantinaPatioStair.run;
 assert.ok(nearest >= stairEdge + 3 - 1e-6, `Separación desde la escalera: ${nearest - stairEdge} m`);
 assert.deepEqual(dei.rect.center, plan.electronics.center);
});


test("El jardín exterior del LED queda dentro del campus, con cuatro árboles fuera del paso",()=>{
 assert.equal(deiForecourt.trees.length,4);
 for(const point of [...deiForecourt.main,...deiForecourt.branch,...deiForecourt.trees]) {
  const w=facultyToWorld([point[0],0,point[1]]);
  assert.ok(insidePolygon([w[0],w[2]],layout.boundary),"Camineros y árboles quedan dentro del terreno");
 }
 for(const tree of deiForecourt.trees) for(const route of [deiForecourt.main,deiForecourt.branch,deiGardenPath]) {
  for(let i=1;i<route.length;i++) {
   const a=route[i-1],b=route[i],dx=b[0]-a[0],dz=b[1]-a[1];
   const t=Math.max(0,Math.min(1,((tree[0]-a[0])*dx+(tree[1]-a[1])*dz)/(dx*dx+dz*dz)));
   assert.ok(Math.hypot(tree[0]-a[0]-t*dx,tree[1]-a[1]-t*dz)>3,"Los troncos y las raíces quedan fuera del caminero");
  }
 }
});
