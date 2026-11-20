import * as T from "three";
import { deiForecourt as plan, deiGardenPath, deiEntrancePaving, facultyAnnexes } from "../../data/faculty-annexes";
import type { Vec2 } from "../../data/faculty-blueprint";
import { insidePolygon } from "../../data/campus-geometry";
import { addCantinaTree } from "../cantina-tree";
import { cantinaGardenFloor } from "./cantina-garden";
import type { FacultyBuilder } from "./builder";
import { addSegmentedGardenPath, gardenJunctionReach, pathSampler } from "./garden-path";

function alongPath(points: readonly Vec2[], target: Vec2) {
  let offset=0, nearest=Infinity, at=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const t=T.MathUtils.clamp(((target[0]-a[0])*dx+(target[1]-a[1])*dz)/(length*length),0,1);
    const distance=Math.hypot(target[0]-a[0]-t*dx,target[1]-a[1]-t*dz);
    if(distance<nearest){nearest=distance;at=offset+t*length;}
    offset+=length;
  }
  return {at,distance:nearest};
}

export function deiForecourtRoadJunctions() {
  return [plan.main,[...plan.branch].reverse()].map((points,index)=>({
    at:alongPath(deiGardenPath,points[0]).at,points,width:plan.width,
    label:index===0?"Acceso exterior LED izquierdo":"Acceso exterior LED derecho",height:()=>.15,
  }));
}

/** Prolongación en Y indicada en rojo y cuatro árboles señalados en azul. */
export function addDeiForecourt(builder:FacultyBuilder,paving:T.MeshStandardMaterial) {
  const floor=()=>.15;
  const forkIndex=plan.main.findIndex(p=>Math.hypot(p[0]-plan.fork[0],p[1]-plan.fork[1])<.001);
  const upper=plan.main.slice(0,forkIndex+1),lower=plan.main.slice(forkIndex),reach=3.2;
  addSegmentedGardenPath(builder,upper,floor,paving,{
    width:plan.width,finishedHeight:true,groundHeight:cantinaGardenFloor,name:"Caminero exterior principal del LED",
    startDistance:gardenJunctionReach,endInset:reach,
  });
  addSegmentedGardenPath(builder,lower,floor,paving,{
    width:plan.width,finishedHeight:true,groundHeight:cantinaGardenFloor,name:"Caminero exterior principal del LED",
    startDistance:reach,
  });
  addSegmentedGardenPath(builder,plan.branch,floor,paving,{
    width:plan.width,finishedHeight:true,groundHeight:cantinaGardenFloor,name:"Ramal exterior derecho del LED",
    startDistance:reach,endInset:gardenJunctionReach,
  });
  // Una pieza común recibe los tres brazos, recortados antes de llegar al cruce.
  const ends=[upper.slice().reverse(),lower,plan.branch].flatMap(route=>{
    const at=pathSampler(route).at;return [at(reach,-plan.width/2),at(reach,plan.width/2)];
  }).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a:Vec2,b:Vec2,c:Vec2)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const hull=(points:Vec2[])=>{const result:Vec2[]=[];for(const p of points){
    while(result.length>1 && cross(result[result.length-2],result[result.length-1],p)<=0)result.pop();result.push(p);
  }return result;};
  const outline=[...hull(ends).slice(0,-1),...hull(ends.slice().reverse()).slice(0,-1)];
  const landing:T.Mesh=builder.prism(outline,-.05,.20,paving);
  const edge=builder.m.concrete.clone();edge.color.set("#8e877c");landing.material=[paving,edge];
  landing.name="Horquilla del jardín exterior LED";
  builder.layers.solid.children[builder.layers.solid.children.length-1].userData.walkJunction="Horquilla del jardín exterior LED";
  addCanopy(builder,plan.main,"Carpa del caminero exterior principal LED",outline);
  addCanopy(builder,plan.branch,"Carpa del ramal exterior derecho LED",outline);

  // Una geometría de árbol compartida por las cuatro copias, con raíces apoyadas en el terreno.
  const solids=builder.layers.solid,firstCollider=solids.children.length;
  const template=addCantinaTree(builder.layers.visual,solids,plan.trees[0],cantinaGardenFloor(plan.trees[0]));
  template.scale.set(.65,.95,.65);
  template.name="Árbol exterior nuevo del LED 1";template.userData.deiForecourtTree=true;
  template.traverse(o=>{if(o instanceof T.Mesh)o.userData.keep=true;});
  const firstBody=solids.children[firstCollider];firstBody.userData.deiForecourtTree=true;
  firstBody.scale.set(.65,.95,.65);firstBody.position.set(plan.trees[0][0]-.14*.65,
    cantinaGardenFloor(plan.trees[0])+1.425*.95,plan.trees[0][1]+.04*.65);
  const colliderGeometry=new T.CylinderGeometry(.42,.57,2.85,10);
  plan.trees.slice(1).forEach((point,index)=>{
    const tree=template.clone(true),scale=[.94,1.08,.90][index];
    tree.name=`Árbol exterior nuevo del LED ${index+2}`;
    tree.position.set(point[0],cantinaGardenFloor(point),point[1]);
    tree.rotation.y=[1.35,-1.9,2.8][index];tree.scale.set(.65*scale,.95*scale,.65*scale);builder.layers.visual.add(tree);
    const body=new T.Mesh(colliderGeometry);body.scale.set(.65*scale,.95*scale,.65*scale);
    body.position.set(point[0],cantinaGardenFloor(point)+1.425*.95*scale,point[1]);
    body.userData.deiForecourtTree=true;body.userData.treeTrunk=true;solids.add(body);
  });
}

function addCanopy(builder:FacultyBuilder,points:readonly Vec2[],name:string,landing:Vec2[]) {
  const {layers,box,pole,beam,v3,m}=builder;
  const {total,at,corners}=pathSampler(points),half=plan.canopyWidth/2;
  const samples=[...new Set([0,total,...corners,...Array.from({length:Math.ceil(total/.30)},(_,i)=>Math.min(total,i*.30))])].sort((a,b)=>a-b);
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<samples.length;i++) for(let j=0;j<3;j++) {
    const u=j-1,p=at(samples[i],u*half);
    const sag=.025*Math.sin(Math.PI*((samples[i]%4)/4));
    positions.push(p[0],plan.eave+plan.ridge*(1-Math.abs(u))-sag,p[1]);uv.push(j*half,samples[i]);
    if(i<samples.length-1 && j<2) {
      const a=i*3+j,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  geo.setAttribute("uv",new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const roof=new T.Mesh(geo,m.awning);roof.name=name;roof.userData.deiForecourtCanopy=true;roof.userData.keep=true;
  roof.castShadow=roof.receiveShadow=true;layers.visual.add(roof);
  // Faldones y costuras siguen los mismos quiebres del piso.
  for(const side of [-1,1]) {
    const p:number[]=[],t:number[]=[],idx:number[]=[];
    for(let i=0;i<samples.length;i++) {
      const q=at(samples[i],side*half);p.push(q[0],plan.eave,q[1],q[0],plan.eave-.14,q[1]);
      t.push(samples[i],0,samples[i],.14);
      if(i<samples.length-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));
    g.setAttribute("uv",new T.Float32BufferAttribute(t,2));g.setIndex(idx);g.computeVertexNormals();layers.visual.add(new T.Mesh(g,m.awning));
  }
  const bays=Math.ceil(total/4),supports=[...new Set([0,total,...corners,...Array.from({length:bays-1},(_,i)=>(i+1)*total/bays)])].sort((a,b)=>a-b);
  const dei=facultyAnnexes.find(b=>b.id==="dei-led")!,c=Math.cos(dei.rect.angle),s=Math.sin(dei.rect.angle);
  for(const distance of supports) {
    const center=at(distance),left=at(distance,-half),right=at(distance,half);
    beam(v3(left[0],plan.eave,left[1]),v3(center[0],plan.eave+plan.ridge,center[1]),.022,m.metal);
    beam(v3(center[0],plan.eave+plan.ridge,center[1]),v3(right[0],plan.eave,right[1]),.022,m.metal);
    for(const p of [left,right]) {
      if(insidePolygon(p,landing) || alongPath([...landing,landing[0]],p).distance<.10)continue;
      if([plan.main,plan.branch,deiGardenPath].some(route=>alongPath(route,p).distance<plan.width/2+.12))continue;
      const dx=p[0]-dei.rect.center[0],dz=p[1]-dei.rect.center[1],x=dx*c+dz*s,z=-dx*s+dz*c;
      if(x>deiEntrancePaving.minX && x<deiEntrancePaving.maxX && z>deiEntrancePaving.frontZ(x) && z<1)continue;
      const ground=cantinaGardenFloor(p)-.025,h=plan.eave-ground;
      const post=pole(.035,h,p[0],ground+h/2,p[1],m.metal,true);
      post.userData.deiForecourtPost=true;post.userData.keep=true;
      box(.14,.025,.14,p[0],ground+.025,p[1],m.metal);
    }
  }
}
