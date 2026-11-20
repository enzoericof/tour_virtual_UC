import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import * as T from "three";
import { facultyBlueprint as plan, manfredRampSection, manfredStairKnots } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

type P=[number,number,number];
/** Dos escalones curvos con remate fundido en el piso: ninguna excavación rectangular. */
export function addManfredFloor(b:FacultyBuilder) {
  const [w]=plan.manfred.size,p=plan.manfredInterior,pit=p.lowerLevel;
  const xs=[...new Set([...Array.from({length:385},(_,i)=>-w/2+w*i/384),
    ...manfredStairKnots.map(q=>q[0]),-w/4,w/4,p.ramp.startX,p.ramp.endX])].sort((a,c)=>a-c);
  const top:number[]=[],sides:number[]=[],lines:number[]=[];
  const tri=(out:number[],a:P,c:P,e:P)=>{
    const u=new T.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
    const v=new T.Vector3(e[0]-a[0],e[1]-a[1],e[2]-a[2]);
    if(u.cross(v).lengthSq()>1e-16)out.push(...a,...c,...e);
  };
  const quad=(out:number[],a:P,c:P,e:P,f:P,up=false)=>{
    if(up){tri(out,a,e,c);tri(out,c,e,f);}else{tri(out,a,c,e);tri(out,c,f,e);}
  };
  for(let i=1;i<xs.length;i++) {
    const x0=xs[i-1],x1=xs[i],a=manfredRampSection(x0),c=manfredRampSection(x1);
    // Piso inferior, huella intermedia/rampa y descanso alto comparten sus límites.
    quad(top,[x0,pit,a.back],[x1,pit,c.back],[x0,pit,a.low],[x1,pit,c.low],true);
    quad(top,[x0,a.lowY,a.low],[x1,c.lowY,c.low],[x0,a.highY,a.high],[x1,c.highY,c.high],true);
    quad(top,[x0,0,a.high],[x1,0,c.high],[x0,0,a.front],[x1,0,c.front],true);
    // Las únicas caras verticales son las dos contrahuellas: se desvanecen en la cuña.
    if(a.low>a.back+1e-6||c.low>c.back+1e-6)
      quad(sides,[x0,a.lowY,a.low],[x1,c.lowY,c.low],[x0,pit,a.low],[x1,pit,c.low]);
    if(a.high>a.back+1e-6||c.high>c.back+1e-6)
      quad(sides,[x0,0,a.high],[x1,0,c.high],[x0,a.highY,a.high],[x1,c.highY,c.high]);
    for(const k of [0,1]) {
      const za=k?a.high:a.low,zc=k?c.high:c.low;
      const ya=k?0:a.lowY,yc=k?0:c.lowY;
      const wa=.045*(1-a.blend),wc=.045*(1-c.blend);
      if((wa>1e-5||wc>1e-5)&&(a.high>a.back+1e-6||c.high>c.back+1e-6))
        quad(lines,[x0,ya+.002,za],[x1,yc+.002,zc],
          [x0,ya+.002,Math.min(za+wa,a.front)],[x1,yc+.002,Math.min(zc+wc,c.front)],true);
    }
  }
  const mesh=(positions:number[],material:T.Material,collide:boolean,vertical=false)=>{
    let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    const uv:number[]=[],tile=material.userData.tile as number[]|undefined;
    for(let i=0;i<positions.length;i+=3)uv.push((positions[i]+(vertical?positions[i+2]:0))/(tile?.[0]??1),positions[i+(vertical?1:2)]/(tile?.[1]??1));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(vertical) {const smooth=mergeVertices(geo,1e-6);geo.dispose();geo=smooth;}
    geo.computeVertexNormals();
    const visual=new T.Mesh(geo,material);visual.receiveShadow=true;b.layers.visual.add(visual);
    if(collide)b.layers.solid.add(new T.Mesh(geo));
  };
  mesh(top,b.m.tile,true);
  const riser=b.m.tile.clone();riser.side=T.DoubleSide;mesh(sides,riser,false,true);
  mesh(lines,b.m.metal,false);
}
