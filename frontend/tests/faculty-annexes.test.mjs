import { test } from "node:test";
import assert from "node:assert/strict";
import { facultyAnnexes, annexPaths } from "../src/data/faculty-annexes.ts";
import { facultyBlueprint as plan, rectCorners, manfredOutline } from "../src/data/faculty-blueprint.ts";
import { insidePolygon } from "../src/data/campus-geometry.ts";
const footprints = facultyAnnexes.map((b)=>b.outline.map(([x,z])=>[
 b.rect.center[0]+x*Math.cos(b.rect.angle)-z*Math.sin(b.rect.angle),
 b.rect.center[1]+x*Math.sin(b.rect.angle)+z*Math.cos(b.rect.angle)]));
const existing = [plan.main,plan.block2,plan.bedelia,plan.cantina].map(rectCorners).concat([manfredOutline()]);
test("All nine added dependencies have arrivals outside every building",()=>{
 assert.equal(facultyAnnexes.length,9);
 assert.equal(new Set(facultyAnnexes.map((b)=>b.id)).size,9);
 assert.equal(facultyAnnexes.find((b)=>b.id==="kampus-print").name,"Kampus Print");
 for(const b of facultyAnnexes) for(const polygon of [...footprints,...existing])
   assert.ok(!insidePolygon(b.entrance,polygon),`${b.name}: arrival inside building`);
});
test("New pedestrian routes do not cut across existing or added buildings",()=>{
 for(const points of annexPaths) for(let i=1;i<points.length;i++) {
  const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);
  for(let k=0;k<=n;k++) { const t=n?k/n:0,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   for(const polygon of [...footprints,...existing]) assert.ok(!insidePolygon(p,polygon),`Path crosses building at ${p}`);
  }
 }
});
