import * as T from "three";
import type { Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";
import { pathSampler } from "./garden-path";
import { subtractPaving } from "./paving-cutouts";

/** Cantos rectos y juntas estrechas: conserva el volumen sin el borde de discos. */
export function addForecourtStonePath(builder:FacultyBuilder,points:readonly Vec2[],
  material:T.MeshStandardMaterial,name:string,width:number,start:number,endInset=0,cutouts:readonly (readonly Vec2[])[]=[]) {
  const {total,at,corners}=pathSampler(points),limit=total-endInset,half=width/2;
  const cuts=[start,...corners.filter(d=>d>start+.01&&d<limit-.01),limit];
  const edge=builder.m.concrete.clone();edge.color.set("#8e8373");
  const group=new T.Group();group.name=name;builder.layers.visual.add(group);
  const parent=builder.layers.visual;builder.layers.visual=group;
  try {
    for(let part=1;part<cuts.length;part++) {
      const from=cuts[part-1],to=cuts[part],count=Math.max(1,Math.ceil((to-from)/2.25));
      for(let i=0;i<count;i++) {
        const a=from+(to-from)*i/count+(i===0?0:.009);
        const b=from+(to-from)*(i+1)/count-(i===count-1?0:.009);
        const outline=[at(a,-half),at(a,half),at(b,half),at(b,-half)];
        for(const polygon of cutouts.length?subtractPaving(outline,cutouts):[outline]) {
          const mesh:T.Mesh=builder.prism(polygon,-.05,.20,material);
          mesh.material=[material,edge];mesh.receiveShadow=true;
          builder.layers.solid.children.at(-1)!.userData.segmentedWalk=name;
        }
      }
    }
  } finally {builder.layers.visual=parent;}
}

/** Lajas cálidas irregulares de las fotos del acceso, con juntas y poros finos.
 * Una pareja de mapas pequeños compartidos por los dos ramales y su divisoria. */
export function makeForecourtStone() {
  const color=document.createElement("canvas"),relief=document.createElement("canvas");
  color.width=color.height=relief.width=relief.height=512;
  const c=color.getContext("2d")!,b=relief.getContext("2d")!;
  const noise=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  c.fillStyle="#8b8070";c.fillRect(0,0,512,512);
  b.fillStyle="#666";b.fillRect(0,0,512,512);
  const step=512/6;
  const point=(x:number,y:number):[number,number]=>{
    const wx=(x%6+6)%6,wy=(y%6+6)%6;
    return [(x+.5+(noise(wx*31+wy*79)-.5)*.75)*step,
      (y+.5+(noise(wx*43+wy*53+7)-.5)*.75)*step];
  };
  function stone(points:[number,number][],seed:number) {
    for(const ctx of [c,b]) {
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      if(ctx===c) {
        const shade=Math.round(120+noise(seed)*23);
        const tone=ctx.createLinearGradient(points[0][0],points[0][1],points[0][0]+80,points[0][1]+65);
        tone.addColorStop(0,`rgb(${shade+13},${shade+7},${shade-3})`);
        tone.addColorStop(1,`rgb(${shade+7},${shade+1},${shade-9})`);ctx.fillStyle=tone;
        ctx.strokeStyle="#817666";ctx.lineWidth=1.1;
      } else {ctx.fillStyle="#b5b5b5";ctx.strokeStyle="#747474";ctx.lineWidth=1.6;}
      ctx.fill();ctx.stroke();
    }
    if(noise(seed+82)>.75) {
      c.save();c.clip();c.beginPath();
      const center=points.reduce((p,q)=>[p[0]+q[0]/points.length,p[1]+q[1]/points.length],[0,0]);
      c.moveTo(center[0]-35,center[1]-9);c.lineTo(center[0]-8,center[1]+4);
      c.lineTo(center[0]+9,center[1]-2);c.lineTo(center[0]+31,center[1]+11);
      c.strokeStyle="#594a3833";c.lineWidth=.6;c.stroke();c.restore();
    }
  }
  // Celdas de Voronoi periódicas: piezas desiguales sin una retícula de triángulos.
  for(let y=-1;y<=6;y++)for(let x=-1;x<=6;x++) {
    let polygon:[number,number][]=[[0,0],[512,0],[512,512],[0,512]];
    const p=point(x,y);
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
      if(!dx&&!dy)continue;
      const q=point(x+dx,y+dy),nx=q[0]-p[0],ny=q[1]-p[1];
      const d=(q[0]*q[0]+q[1]*q[1]-p[0]*p[0]-p[1]*p[1])/2;
      const clipped:[number,number][]=[];
      for(let i=0;i<polygon.length;i++) {
        const a=polygon[(i+polygon.length-1)%polygon.length],b=polygon[i];
        const da=d-a[0]*nx-a[1]*ny,db=d-b[0]*nx-b[1]*ny;
        if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
        if(db>=0)clipped.push(b);
      }
      polygon=clipped;
    }
    if(polygon.length>=3)stone(polygon,((x%6+6)%6)*17+((y%6+6)%6)*131);
  }
  for(let i=0;i<14000;i++) {
    const x=noise(i+3)*512,y=noise(i+17)*512;
    c.fillStyle=i%2?"#fff9e50e":"#493c2d12";c.fillRect(x,y,1,1);
    b.fillStyle=i%2?"#ffffff10":"#0000000d";b.fillRect(x,y,1,1);
  }
  const map=new T.CanvasTexture(color),bump=new T.CanvasTexture(relief);
  map.colorSpace=T.SRGBColorSpace;
  for(const texture of [map,bump]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;}
  const material=new T.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.008,roughness:.98});
  material.name="Lajas irregulares del acceso LED";material.userData.tile=[2.5,2.5];
  return material;
}
