import * as T from "three";
import { deiPerimeterWalk as plan, deiEntrancePaving, deiSideDoor, facultyAnnexes } from "../../data/faculty-annexes";
import type { Vec2 } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

/** Aberturas discretas y rejas del muro que acompaña el pasillo fotografiado. */
export function addOfficePerimeterFacade(builder:FacultyBuilder,a:Vec2,b:Vec2,height:number,brick:T.MeshStandardMaterial,
  openings:readonly {center:number;width:number;height:number}[] = []) {
  const {box,beam,v3,m}=builder;
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
  if(openings.length) {
    for(const [lo,hi]of builder.spans(-length/2,length/2,openings.map(o=>[o.center-o.width/2,o.center+o.width/2]))) {
      const start:Vec2=[a[0]+dx*(lo+length/2)/length,a[1]+dz*(lo+length/2)/length];
      const end:Vec2=[a[0]+dx*(hi+length/2)/length,a[1]+dz*(hi+length/2)/length];
      addOfficePerimeterFacade(builder,start,end,height,brick);
    }
    for(const o of openings)box(o.width,height-o.height,.2,(a[0]+b[0])/2+o.center*Math.cos(angle),
      (height+o.height)/2,(a[1]+b[1])/2+o.center*Math.sin(angle),brick,true,{rotation:-angle});
    return;
  }
  if(length<1.8){box(length,height,.2,(a[0]+b[0])/2,height/2,(a[1]+b[1])/2,brick,true,{rotation:-angle});return;}
  const nx=dz/length,nz=-dx/length,count=Math.max(1,Math.floor(length/3)),bay=length/count;
  const width=1.18,sill=1.08,windowHeight=1.32;
  function piece(w:number,h:number,d:number,at:number,y:number,material:T.Material,solid=false,out=0) {
    return box(w,h,d,a[0]+dx*at/length+nx*out,y,a[1]+dz*at/length+nz*out,material,solid,{rotation:-angle});
  }
  for(let i=0;i<count;i++) {
    const center=(i+.5)*bay;
    for(const at of [center-(bay+width)/4,center+(bay+width)/4])piece((bay-width)/2,height,.20,at,height/2,brick,true);
    piece(width,sill,.20,center,sill/2,brick,true);
    piece(width,height-sill-windowHeight,.20,center,(height+sill+windowHeight)/2,brick,true);
    const window=piece(width,windowHeight,.045,center,sill+windowHeight/2,m.glass,true,.025);
    window.name="Ventana enrejada del pasillo exterior LED";window.userData.officePerimeterWindow=true;
    piece(width+.12,.07,.28,center,sill-.035,m.concrete,false,.015);
    for(const at of [center-width/2,center+width/2])
      piece(.045,windowHeight+.08,.10,at,sill+windowHeight/2,m.metal,false,.13);
    for(let j=1;j<6;j++)piece(.017,windowHeight,.08,center-width/2+j*width/6,sill+windowHeight/2,m.metal,false,.13);
    for(const y of [sill,sill+windowHeight/2,sill+windowHeight])piece(width+.08,.035,.10,center,y,m.metal,false,.13);
    const p=(at:number,y:number)=>v3(a[0]+dx*at/length+nx*.15,y,a[1]+dz*at/length+nz*.15);
    for(let j=0;j<2;j++) {
      const lo=center-width/2+j*width/2,hi=lo+width/2;
      beam(p(lo,sill+.05),p(hi,sill+windowHeight/2),.009,m.metal);
      beam(p(hi,sill+windowHeight/2),p(lo,sill+windowHeight-.05),.009,m.metal);
    }
  }
}

/** Galería en L: se conserva el edificio y se añade un alero a su perímetro. */
export function addDeiPerimeterWalk(builder:FacultyBuilder,tiles:T.MeshStandardMaterial,brick:T.MeshStandardMaterial,tile:T.MeshStandardMaterial) {
  const dei=facultyAnnexes.find(b=>b.id==="dei-led")!;
  const {frame,box,beam,v3,layers,solidRoof}=builder;
  const wood=new T.MeshStandardMaterial({color:"#514431",roughness:.97});
  const roofMaterial=tiles.clone();roofMaterial.side=T.DoubleSide;
  const linerCanvas=document.createElement("canvas");linerCanvas.width=linerCanvas.height=128;
  const linerCtx=linerCanvas.getContext("2d")!;
  linerCtx.fillStyle="#a19f8b";linerCtx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=8) {
    linerCtx.fillStyle="#73796b";linerCtx.fillRect(i,0,1,128);
    linerCtx.fillStyle="#bcbba3";linerCtx.fillRect(i+2,0,2,128);
  }
  const linerMap=new T.CanvasTexture(linerCanvas);linerMap.colorSpace=T.SRGBColorSpace;
  linerMap.wrapS=linerMap.wrapT=T.RepeatWrapping;
  const liner=new T.MeshStandardMaterial({map:linerMap,roughness:1,side:T.DoubleSide});
  frame(dei.rect,()=>{
    const top=(x:number,z:number)=>{
      const end=deiSideDoor.center[1]+.30,t=T.MathUtils.clamp((z-deiEntrancePaving.frontZ(x))/(end-deiEntrancePaving.frontZ(x)),0,1);
      const threshold=T.MathUtils.lerp(deiEntrancePaving.frontHeight,deiEntrancePaving.rearHeight,t);
      return T.MathUtils.lerp(threshold,.15,T.MathUtils.clamp((plan.portal.x-x)/1.8,0,1));
    };
    const floor=builder.prism(plan.outline,-.05,.20,tile);
    const p=floor.geometry.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)>.05)p.setY(i,top(p.getX(i),p.getZ(i)));
    floor.geometry.computeVertexNormals();floor.name="Piso continuo del pasillo perimetral LED";floor.userData.keep=true;
    layers.solid.children.at(-1)!.userData.deiPerimeterFloor=true;
    function roof(points:number[][],front=false) {
      const geometry=new T.BufferGeometry();
      geometry.setAttribute("position",new T.Float32BufferAttribute(points.flat(),3));
      geometry.setAttribute("uv",new T.Float32BufferAttribute(points.flatMap(p=>front?[p[0]/1.6,p[2]/1.44]:[-p[2]/1.6,p[0]/1.44]),2));
      geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
      const mesh=new T.Mesh(geometry,roofMaterial);mesh.name="Alero de tejas del pasillo perimetral LED";
      mesh.userData.keep=true;mesh.userData.deiPerimeterRoof=true;mesh.castShadow=mesh.receiveShadow=true;
      layers.visual.add(mesh);solidRoof(mesh);
      const underGeometry=geometry.clone();underGeometry.translate(0,-.07,0);
      const under=new T.Mesh(underGeometry,liner);under.name="Cielorraso acanalado del pasillo LED";
      layers.visual.add(under);solidRoof(under);
    }
    const high=3.61,low=3.08,insideX=plan.wallX+.18,outsideX=plan.outerX-.22;
    const innerZ=plan.wallFrontZ+.18,outerZ=plan.wallFrontZ-plan.width-.22;
    roof([[insideX,high,innerZ],[outsideX,low,outerZ],[outsideX,low,plan.endZ+.25],[insideX,high,plan.endZ+.25]]);
    roof([[plan.portal.x+.04,high,innerZ],[insideX,high,innerZ],[outsideX,low,outerZ],[plan.portal.x+.04,low,outerZ]],true);
    function column(x:number,z:number) {
      const mesh=box(.24,2.95,.24,x,1.625,z,brick,true);
      mesh.name="Pilar del pasillo perimetral LED";mesh.userData.keep=true;
      box(.29,.12,.29,x,.20,z,builder.m.concrete,true);
    }
    const count=Math.ceil((plan.endZ-plan.frontZ)/3.55),columnX=plan.outerX+.13;
    for(let i=0;i<=count;i++) {
      const z=plan.frontZ+(plan.endZ-plan.frontZ)*i/count;
      column(columnX,z);
      beam(v3(insideX,high-.08,z),v3(outsideX,low-.08,z),.055,wood);
      if(i<count) {
        const bay=(plan.endZ-plan.frontZ)/count;
        box(.10,.16,bay,columnX,2.98,z+bay/2,wood);
      }
    }
    const frontCount=Math.ceil((plan.portal.x-columnX)/3.5);
    for(let i=1;i<=frontCount;i++) {
      const x=columnX+(plan.portal.x-columnX)*i/frontCount;
      if(x>plan.eastX-.3)continue;
      if(Math.abs(x-plan.localOrange[0])<plan.width/2+.25)continue;
      column(x,plan.wallFrontZ-plan.width+.13);
      beam(v3(x,high-.08,innerZ),v3(x,low-.08,outerZ),.055,wood);
    }
    box(.12,.21,plan.endZ-plan.frontZ+.5,outsideX,3.0,(plan.endZ+plan.frontZ)/2,wood);
  });
}
