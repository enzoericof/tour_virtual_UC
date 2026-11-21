import * as T from "three";
import { deiForecourt as plan, deiGardenPath, deiEntrancePaving, deiPerimeterWalk, facultyAnnexes } from "../../data/faculty-annexes";
import { fromRect, type Vec2 } from "../../data/faculty-blueprint";
import { insidePolygon } from "../../data/campus-geometry";
import { addCantinaTree } from "../cantina-tree";
import { cantinaGardenFloor } from "./cantina-garden";
import type { FacultyBuilder } from "./builder";
import { gardenJunctionReach, pathSampler } from "./garden-path";
import { addForecourtStonePath, makeForecourtStone } from "./forecourt-stone";
import { addDeiParkedVehicles } from "./dei-parked-vehicles";
import { widenMedianCrown } from "./dei-median-tree";

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
  return [plan.main].map((points)=>({
    at:alongPath(deiGardenPath,points[0]).at,points,width:plan.width,
    label:"Acceso exterior LED izquierdo",height:()=>.15,
  }));
}

/** Acceso en Y de las fotos: lajas, divisoria ajardinada, carpas y estacionamiento. */
export function addDeiForecourt(builder:FacultyBuilder) {
  const paving=makeForecourtStone();
  const forkIndex=plan.main.findIndex(p=>Math.hypot(p[0]-plan.fork[0],p[1]-plan.fork[1])<.001);
  const upper=plan.main.slice(0,forkIndex+1),lower=plan.main.slice(forkIndex),reach=3.2;
  addForecourtStonePath(builder,upper,paving,"Caminero exterior principal del LED",plan.width,gardenJunctionReach,reach);
  addForecourtStonePath(builder,lower,paving,"Caminero exterior principal del LED",plan.width,reach);
  const deiRect=facultyAnnexes.find(b=>b.id==="dei-led")!.rect;
  addForecourtStonePath(builder,plan.branch,paving,"Ramal exterior derecho del LED",plan.width,reach,0,
    [deiPerimeterWalk.outline.map(p=>fromRect(deiRect,p))]);
  // Unión cóncava de tres cintas, con punta de césped entre los brazos.
  // El antiguo casco convexo rellenaba toda la divisoria.
  const arms=[upper.slice().reverse(),lower,plan.branch].map(route=>{
    const sample=pathSampler(route),p=sample.at(reach);
    const dx=p[0]-plan.fork[0],dz=p[1]-plan.fork[1],length=Math.hypot(dx,dz);
    return {sample,dx:dx/length,dz:dz/length,angle:Math.atan2(dz,dx)};
  }).sort((a,b)=>a.angle-b.angle);
  const outline:Vec2[]=[];
  for(let i=0;i<arms.length;i++) {
    const a=arms[i],b=arms[(i+1)%arms.length],half=plan.width/2;
    outline.push(a.sample.at(reach,-half),a.sample.at(reach,half));
    const p:Vec2=[plan.fork[0]-a.dz*half,plan.fork[1]+a.dx*half];
    const q:Vec2=[plan.fork[0]+b.dz*half,plan.fork[1]-b.dx*half];
    const cross=a.dx*b.dz-a.dz*b.dx;
    const t=Math.abs(cross)<1e-6?0:((q[0]-p[0])*b.dz-(q[1]-p[1])*b.dx)/cross;
    outline.push([p[0]+a.dx*t,p[1]+a.dz*t]);
  }
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
  const middle=template.clone(true);
  widenMedianCrown(middle,plan.medianCrown);
  middle.name="Árbol central entre los dos camineros del LED";
  middle.userData.deiForecourtTree=false;middle.userData.deiMedianTree=true;
  middle.position.set(plan.medianTree[0],cantinaGardenFloor(plan.medianTree),plan.medianTree[1]);
  middle.rotation.y=-.55;middle.scale.set(.68,1,.68);builder.layers.visual.add(middle);
  const earth=new T.Mesh(new T.CircleGeometry(1.08,24),new T.MeshStandardMaterial({color:"#76694e",roughness:1}));
  earth.rotation.x=-Math.PI/2;earth.scale.y=.82;earth.position.copy(middle.position);earth.position.y+=.008;
  earth.name="Tierra al pie del árbol central del LED";earth.receiveShadow=true;builder.layers.visual.add(earth);
  const trunk=new T.Mesh(colliderGeometry);
  trunk.position.set(plan.medianTree[0],cantinaGardenFloor(plan.medianTree)+1.425,plan.medianTree[1]);
  trunk.scale.set(.68,1,.68);trunk.userData.treeTrunk=true;trunk.userData.deiMedianTree=true;solids.add(trunk);
  addDeiParkedVehicles(builder);
}

function addCanopy(builder:FacultyBuilder,points:readonly Vec2[],name:string,landing:Vec2[]) {
  const {layers,box,pole,beam,v3,m,solidRoof}=builder;
  const steel=new T.MeshStandardMaterial({color:"#315f87",roughness:.65,metalness:.4});
  const fabric=m.awning.clone();fabric.color.set("#b0bce0");fabric.side=T.DoubleSide;
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
  const roof=new T.Mesh(geo,fabric);roof.name=name;roof.userData.deiForecourtCanopy=true;roof.userData.keep=true;
  roof.castShadow=roof.receiveShadow=true;layers.visual.add(roof);solidRoof(roof);
  // Faldones y costuras siguen los mismos quiebres del piso.
  for(const side of [-1,1]) {
    const p:number[]=[],t:number[]=[],idx:number[]=[];
    for(let i=0;i<samples.length;i++) {
      const q=at(samples[i],side*half);p.push(q[0],plan.eave,q[1],q[0],plan.eave-.14,q[1]);
      t.push(samples[i],0,samples[i],.14);
      if(i<samples.length-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));
    g.setAttribute("uv",new T.Float32BufferAttribute(t,2));g.setIndex(idx);g.computeVertexNormals();layers.visual.add(new T.Mesh(g,fabric));
  }
  const bays=Math.ceil(total/3.5),supports=[...new Set([0,total,...corners,...Array.from({length:bays-1},(_,i)=>(i+1)*total/bays)])].sort((a,b)=>a-b);
  const lightCase=new T.MeshStandardMaterial({color:"#b9beb8",roughness:.75});
  const lightTube=new T.MeshStandardMaterial({color:"#eeead9",emissive:"#ddd8b8",emissiveIntensity:.16,roughness:.6});
  for(let d=4;d<total-1;d+=8) {
    const a=at(d-.55),b=at(d+.55),y=plan.eave+plan.ridge-.10;
    beam(v3(a[0],y,a[1]),v3(b[0],y,b[1]),.055,lightCase);
    beam(v3(a[0],y-.045,a[1]),v3(b[0],y-.045,b[1]),.025,lightTube);
  }
  for(let i=1;i<supports.length;i++)for(const side of [-1,0,1]) {
    const a=at(supports[i-1],side*half),b=at(supports[i],side*half);
    const y=plan.eave+(side===0?plan.ridge:0)-.045;
    beam(v3(a[0],y,a[1]),v3(b[0],y,b[1]),.023,steel);
  }
  const dei=facultyAnnexes.find(b=>b.id==="dei-led")!,c=Math.cos(dei.rect.angle),s=Math.sin(dei.rect.angle);
  for(const distance of supports) {
    const center=at(distance),left=at(distance,-half),right=at(distance,half);
    beam(v3(left[0],plan.eave,left[1]),v3(center[0],plan.eave+plan.ridge,center[1]),.022,steel);
    beam(v3(center[0],plan.eave+plan.ridge,center[1]),v3(right[0],plan.eave,right[1]),.022,steel);
    for(const side of [-1,1]) {
      if(Math.hypot(center[0]-plan.fork[0],center[1]-plan.fork[1])<3.45)continue;
      const p=at(distance,side*half);
      if(insidePolygon(p,landing) || alongPath([...landing,landing[0]],p).distance<.10)continue;
      if([plan.main,plan.branch,deiGardenPath].some(route=>alongPath(route,p).distance<plan.width/2+.12))continue;
      const dx=p[0]-dei.rect.center[0],dz=p[1]-dei.rect.center[1],x=dx*c+dz*s,z=-dx*s+dz*c;
      if(insidePolygon([x,z],deiPerimeterWalk.outline))continue;
      if(x>deiEntrancePaving.minX && x<deiEntrancePaving.maxX && z>deiEntrancePaving.frontZ(x) && z<1)continue;
      const ground=cantinaGardenFloor(p)-.025,h=plan.eave-ground;
      const post=pole(.035,h,p[0],ground+h/2,p[1],steel,true);
      post.userData.deiForecourtPost=true;post.userData.keep=true;
      box(.14,.025,.14,p[0],ground+.025,p[1],steel);
      if(distance+1.05<total) {
        const brace=at(distance+1.05,side*half);
        if(!insidePolygon(brace,landing))beam(v3(p[0],1.25,p[1]),v3(brace[0],plan.eave-.08,brace[1]),.018,steel);
      }
    }
  }
}
