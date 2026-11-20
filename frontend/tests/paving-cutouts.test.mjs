import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server = await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{middlewareMode:true,hmr:false},appType:"custom"});
after(()=>server.close());
const { subtractPaving } = await server.ssrLoadModule("/src/scene/faculty/paving-cutouts.ts");
const area = polygon => Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-p[1]*q[0];},0)/2);
const total = polygons => polygons.reduce((sum,p)=>sum+area(p),0);
const square = [[0,0],[10,0],[10,10],[0,10]];

test("El acabado se recorta al cruzar un borde y mantiene intacta el área exterior al corte",()=>{
  const pieces=subtractPaving(square,[[[5,-2],[12,-2],[12,12],[5,12]]]);
  assert.ok(Math.abs(total(pieces)-50)<1e-7);
  assert.ok(pieces.flat().every(([x])=>x<=5+1e-7));
});
test("Los huecos interiores y cortes superpuestos se descuentan una sola vez",()=>{
  assert.ok(Math.abs(total(subtractPaving(square,[[[2,2],[8,2],[8,8],[2,8]]]))-64)<1e-7);
  const cuts=[[[0,0],[6,0],[6,10],[0,10]],[[4,0],[8,0],[8,10],[4,10]]];
  assert.ok(Math.abs(total(subtractPaving(square,cuts))-20)<1e-7);
  assert.equal(subtractPaving(square,[square]).length,0);
});
test("Los contornos cóncavos, el sentido inverso y los bordes que solo se tocan conservan superficie",()=>{
  const concave=[[0,0],[10,0],[10,4],[4,4],[4,10],[0,10]];
  assert.ok(Math.abs(total(subtractPaving(concave,[[[2,2],[8,2],[8,8],[2,8]]]))-44)<1e-7);
  assert.ok(Math.abs(total(subtractPaving([...square].reverse(),[[[10,0],[12,0],[12,10],[10,10]]]))-100)<1e-7);
});
