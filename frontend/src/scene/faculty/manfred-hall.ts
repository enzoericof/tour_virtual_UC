import { addManfredFloor } from "./manfred-floor";
import { manfredDetails } from "./manfred-details";
import * as T from "three";
import { manfredRoofOutline, manfredOuterOutline, bulgedOutline, facultyBlueprint as plan, gridAngle, PLAZA_LEVEL } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

// Hexágono del plano: tres paños posteriores y tres hacia el acceso.
export function addManfredHall(builder: FacultyBuilder) {
  const { m, box, pole, sign, frame, prism, pave, solidRoof } = builder;
  frame(plan.manfred, () => {
    const [w,d] = plan.manfred.size, hw = 3.6;
    const outline = bulgedOutline(w,d,plan.manfred.bulge);
    const pitY = plan.manfredInterior.lowerLevel, bottom = pitY-.1;
    const plaster = new T.MeshStandardMaterial({color:'#d5d7d3',roughness:.94});
    const glass = new T.MeshStandardMaterial({color:'#d0cdc4',roughness:.72});
    const {chair} = manfredDetails(builder,w,d,pitY);
    const outer=manfredOuterOutline();
    // Muros exteriores en los tres lados de ladrillo del plano azul.
    for(let i=0;i<3;i++) {
      const a=outer[i],b=outer[i+1];
      box(Math.hypot(b[0]-a[0],b[1]-a[1]),hw-bottom,.18,(a[0]+b[0])/2,(hw+bottom)/2,
        (a[1]+b[1])/2,m.brick,true,{rotation:-Math.atan2(b[1]-a[1],b[0]-a[0])});
    }
    for(const i of [0,3]) {
      const a=outline[i],b=outer[i];
      box(Math.hypot(b[0]-a[0],b[1]-a[1]),hw-bottom,.18,(a[0]+b[0])/2,(hw+bottom)/2,
        (a[1]+b[1])/2,m.brick,true,{rotation:-Math.atan2(b[1]-a[1],b[0]-a[0])});
    }
    // El techo sigue el contorno cuadrangular azul, no la forma de la sala.
    const roof=manfredRoofOutline();
    prism(roof,hw,.22,m.concrete,true);
    solidRoof(pave(roof,m.roofUnder,hw-.01));

    for(let i=0;i<outline.length;i++) {
      const a=outline[i], b=outline[(i+1)%outline.length];
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      frame({center:[(a[0]+b[0])/2,(a[1]+b[1])/2],size:[length,.2],
        angle:Math.atan2(b[1]-a[1],b[0]-a[0])},()=>{
        if(i<3) {
          box(length,hw-bottom,.2,0,(hw+bottom)/2,0,m.brick,true);
          box(length-.08,hw-bottom,.025,0,(hw+bottom)/2,.115,plaster);
          return;
        }
        // Puerta doble en la diagonal del lado de la rampa exterior.
        const door=i===5, doorWidth=1.8, doorCenter=-length*.08;
        const left=doorCenter-doorWidth/2, right=doorCenter+doorWidth/2;
        const panel=(lo:number,hi:number)=>{
          if(hi-lo<.02)return;
          box(hi-lo,2.6-bottom,.06,(lo+hi)/2,(2.6+bottom)/2,0,glass,true);
          const bays=Math.ceil((hi-lo)/1.1);
          for(let k=0;k<=bays;k++) box(.06,hw,.14,lo+(hi-lo)*k/bays,hw/2,0,m.blue);
          for(const y of [.05,.85,1.7,2.6]) box(hi-lo,.055,.14,(lo+hi)/2,y,0,m.blue);
        };
        if(door) {
          panel(-length/2,left);panel(right,length/2);
          // Dos hojas abiertas hacia afuera; el vano y su umbral quedan libres.
          for(const side of [-1,1]) frame({center:[doorCenter+side*doorWidth/2,0],size:[.9,.1],angle:side*Math.PI*.43},()=>{
            const x=-side*.45;
            box(.84,2.5,.035,x,1.3,0,glass,true);
            for(const xx of [0,-side*.9]) box(.055,2.6,.09,xx,1.3,0,m.blue,true);
            for(const y of [.04,.9,1.78,2.6]) box(.9,.055,.09,x,y,0,m.blue);
            box(.035,.22,.09,-side*.74,1.15,.07,m.metal);
          });
          sign('SALA MANFRED STARK',doorCenter,2.95,.1,1.65);
        } else panel(-length/2,length/2);
        box(length,hw-2.6,.05,0,(hw+2.6)/2,0,m.glass,true);
        box(length,.06,.14,0,hw,0,m.blue);
      });
    }
    // Base enterrada; el acabado interior es una única superficie por secciones.
    prism(outer,pitY-.18,.16,m.tile,true);
    addManfredFloor(builder);
    for(const z of plan.manfredInterior.rows)
      for(const x of plan.manfredInterior.seatsX) chair(x,pitY,z+plan.manfredInterior.furnitureShiftZ);
    for(const x of plan.manfredInterior.upperSeatsX)
      chair(x,0,plan.manfredInterior.upperSeatsZ);
  },PLAZA_LEVEL);

  // Cubiertas repuestas en el pasillo y el desembarco exterior.
  for(const polygon of [plan.corridor,plan.platform[2],plan.platform[3]])
    prism(polygon,PLAZA_LEVEL+3.6,.2,m.concrete,true);
  {
    const [a,b,c,d]=plan.corridor;
    for(const t of [.12,.32,.52,.72,.92]) {
      for(const [start,end] of [[a,d],[b,c]]) {
        // Frente de Manfred libre de los apoyos señalados.
        if(start===a && t<=.52) continue;
        // Despejar el nuevo acceso de profesores; apoyo junto al borde del vano.
        const columnT = start===b && t===.32 ? .24 : t;
        const x=start[0]+(end[0]-start[0])*columnT,z=start[1]+(end[1]-start[1])*columnT;
        pole(.16,3.6,x,PLAZA_LEVEL+1.8,z,m.concrete,true);
      }
      const x=(a[0]+b[0])/2+(c[0]+d[0]-a[0]-b[0])/2*t;
      const z=(a[1]+b[1])/2+(c[1]+d[1]-a[1]-b[1])/2*t;
      box(.18,.055,1.1,x,PLAZA_LEVEL+3.5,z,m.white,false,{rotation:-gridAngle});
    }
  }
}
