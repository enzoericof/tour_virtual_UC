import { test } from "node:test";
import assert from "node:assert/strict";
import { deiEntranceWing, deiForecourt, deiGardenPath, deiPerimeterWalk, deiReception, deiSidePassage, facultyAnnexes } from "../src/data/faculty-annexes.ts";
import { fromRect } from "../src/data/faculty-blueprint.ts";
import { facultyToWorld, insidePolygon, layout } from "../src/data/campus-geometry.ts";

function clearance(point,route) {
  return Math.min(...route.slice(1).map((b,i)=>{
    const a=route[i],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz)));
    return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz);
  }));
}

test("El árbol de la divisoria queda entre ambos ramales y fuera de sus carpas",()=>{
  for(const route of [deiForecourt.main,deiForecourt.branch])
    assert.ok(clearance(deiForecourt.medianTree,route)>2.6,"Raíces y tronco dejan libre el paso y los soportes");
  const point=facultyToWorld([deiForecourt.medianTree[0],0,deiForecourt.medianTree[1]]);
  assert.ok(insidePolygon([point[0],point[2]],layout.boundary));
});

test("Las camionetas estacionadas dejan libres los camineros y quedan dentro del campus",()=>{
  assert.equal(deiForecourt.parking.length,8);
  for(const vehicle of deiForecourt.parking) {
    const rect={center:vehicle.center,size:[4.9,2.1],angle:vehicle.angle};
    for(const local of [[-2.5,-1.2],[-2.5,1.2],[2.5,-1.2],[2.5,1.2],[0,0]]) {
      const point=fromRect(rect,local),world=facultyToWorld([point[0],0,point[1]]);
      assert.ok(insidePolygon([world[0],world[2]],layout.boundary));
      for(const route of [deiForecourt.main,deiForecourt.branch,deiGardenPath,deiPerimeterWalk.route])
        assert.ok(clearance(point,route)>deiForecourt.canopyWidth/2+.1,"Carrocería y espejos quedan fuera del paso techado");
    }
  }
});

test("El ramal azul llega al vértice naranja del pasillo y el perímetro queda dentro del terreno",()=>{
  assert.deepEqual(deiForecourt.branch.at(-1),deiPerimeterWalk.orange);
  const dei=facultyAnnexes.find(b=>b.id==="dei-led").rect;
  for(const point of deiPerimeterWalk.outline) {
    const p=fromRect(dei,point),world=facultyToWorld([p[0],0,p[1]]);
    assert.ok(insidePolygon([world[0],world[2]],layout.boundary));
  }
});

test("La llegada recta mira al centro de ambos ramales sin alargarse hacia los árboles",()=>{
  assert.equal(deiForecourt.main.length,3,"Solo hay un encuentro entre tres tramos rectos");
  assert.equal(deiForecourt.branch.length,2,"El segundo ramal llega recto a la esquina del pasillo");
  assert.deepEqual(deiForecourt.branch[0],deiForecourt.fork);
  const start=deiForecourt.main.at(-1),fork=deiForecourt.fork;
  const length=Math.hypot(start[0]-fork[0],start[1]-fork[1]);
  const armLength=Math.hypot(deiForecourt.main[0][0]-fork[0],deiForecourt.main[0][1]-fork[1]);
  assert.ok(Math.abs(length-armLength*.2)<1e-8,"Se conserva exactamente el largo del tramo corto");
  assert.ok(length<6,"La carpa empieza después de la fila de árboles");
  const direction=p=>{const dx=p[0]-fork[0],dz=p[1]-fork[1],n=Math.hypot(dx,dz);return[dx/n,dz/n];};
  const incoming=direction(start),a=direction(deiForecourt.main[0]),b=direction(deiForecourt.branch.at(-1));
  assert.ok(Math.abs(incoming[0]*(a[1]+b[1])-incoming[1]*(a[0]+b[0]))<1e-8,"La llegada apunta entre las dos entradas");
  assert.ok(incoming[0]*(a[0]+b[0])+incoming[1]*(a[1]+b[1])<0);
});

test("La ampliación del acceso alcanza el muro del bloque de tejas sin desplazar los pilares",()=>{
  const led=facultyAnnexes.find(b=>b.id==="led"),dei=facultyAnnexes.find(b=>b.id==="dei-led");
  const officeEdge=led.mapCenter[0]-dei.mapCenter[0]+led.rect.size[1]/2+.1;
  assert.ok(Math.abs(deiEntranceWing.minX-officeEdge)<1e-8);
  assert.ok(Math.abs(deiSidePassage.pillarX+20.04)<1e-8);
  assert.deepEqual(deiSidePassage.pillarZ,[-4.4,-2.075]);
});

test("El recorte de la cabecera alinea el pasillo con los pilares y conserva el fondo del LED",()=>{
  assert.ok(Math.abs(deiPerimeterWalk.frontZ-deiSidePassage.centerZ)<1e-6);
  assert.ok(Math.abs(deiPerimeterWalk.portal.width-deiSidePassage.width)<1e-6);
  const led=facultyAnnexes.find(b=>b.id==="led"),dei=facultyAnnexes.find(b=>b.id==="dei-led");
  assert.ok(Math.abs(led.mapCenter[1]-dei.mapCenter[1]+led.rect.size[0]/2-8.8)<1e-6,"El extremo posterior del módulo conserva su posición");
});

test("Las pickups forman una fila paralela al caminero y miran hacia él",()=>{
  const [a,b]=deiForecourt.branch,axis=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...axis),u=axis.map(v=>v/length);
  for(const [i,car]of deiForecourt.parking.entries()){
    assert.ok(Math.abs(Math.cos(car.angle)*u[0]+Math.sin(car.angle)*u[1])<1e-8,"Los frentes quedan perpendiculares al caminero");
    if(i){const previous=deiForecourt.parking[i-1],dx=car.center[0]-previous.center[0],dz=car.center[1]-previous.center[1];
      assert.ok(Math.abs(dx*u[1]-dz*u[0])<1e-8);assert.ok(Math.abs(Math.hypot(dx,dz)-3.35)<1e-8);assert.equal(car.angle,previous.angle);}
  }
  assert.ok(deiForecourt.pickupScale===1,"Las Raptor recuperan su tamaño de doble cabina");
});

test("Los postes bajos delimitan los frentes y laterales sin atravesar las carrocerías",()=>{
  assert.equal(deiForecourt.parkingBollards.length,139);
  for(const p of deiForecourt.parkingBollards){
    const world=facultyToWorld([p[0],0,p[1]]);assert.ok(insidePolygon([world[0],world[2]],layout.boundary));
    assert.ok(clearance(p,deiForecourt.branch)>deiForecourt.canopyWidth/2+.7);
    for(const car of deiForecourt.parking){const dx=p[0]-car.center[0],dz=p[1]-car.center[1],c=Math.cos(car.angle),s=Math.sin(car.angle);
      assert.ok(Math.abs(dx*c+dz*s)>2.85||Math.abs(-dx*s+dz*c)>1.35,"Los delimitadores quedan fuera del vehículo");}
  }
  assert.ok(deiReception.backZ-deiReception.frontZ>2.5,"La recepción se retranquea respecto del antiguo fondo");
});
