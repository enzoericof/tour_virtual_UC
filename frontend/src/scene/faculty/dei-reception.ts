import * as T from "three";
import { deiReception as plan, deiInterior, facultyAnnexes } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";
import { addDeiInterior, makeDeiInteriorMaterials } from './dei-interior';

/** Frente de recepción según la foto: madera enmarcada, puerta izquierda y ventanilla derecha. */
export function addDeiReception(builder:FacultyBuilder,brick:T.MeshStandardMaterial) {
  const {box,frame,prism,layers,beam,v3}=builder,dei=facultyAnnexes.find(b=>b.id==="dei-led")!;
  const canvas=document.createElement("canvas");canvas.width=128;canvas.height=512;const c=canvas.getContext("2d")!;
  c.fillStyle="#9b7147";c.fillRect(0,0,128,512);
  for(let i=0;i<500;i++) {
    const x=(Math.sin(i*73.1)*43758.5%1+1)%1*128;
    c.strokeStyle=i%3?"#57351a20":"#efbf7f2f";c.lineWidth=.4+(i%3)*.3;c.beginPath();c.moveTo(x,0);
    c.bezierCurveTo(x+Math.sin(i)*8,170,x-Math.cos(i)*10,340,x+Math.sin(i*2)*4,512);c.stroke();
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;
  const wood=new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.006,roughness:.66});wood.userData.tile=[1.7,2.5];
  const edging=wood.clone();edging.color.set("#bd9b77");
  const interior=makeDeiInteriorMaterials(),pale=interior.plaster;
  const metal=new T.MeshStandardMaterial({color:"#999d94",roughness:.35,metalness:.7});
  const dark=new T.MeshStandardMaterial({color:"#242c2d",roughness:.7});
  const glass=new T.MeshStandardMaterial({color:"#839d98",transparent:true,opacity:.30,roughness:.19,metalness:.1,side:T.DoubleSide,depthWrite:false});
  const {minX,maxX,frontZ,backZ,height,counterHeight,doorX,doorWidth,doorHeight}=plan;
  const roomBack=backZ+1.8,midX=(minX+maxX)/2,width=maxX-minX;
  frame(dei.rect,()=>{
    // El terrazo continúa detrás de la madera, sin una tapa superpuesta en el vestíbulo.
    const officeFloor=prism([[minX,backZ],[maxX,backZ],[maxX,roomBack],[minX,roomBack]],-.10,deiInterior.floor+.10,interior.terrazzo,true);officeFloor.name="Terrazo de la oficina de recepción LED";officeFloor.userData.keep=true;
    box(width+.2,.16,roomBack-frontZ+.3,midX,height+.20,(frontZ+roomBack)/2,builder.m.roof,true);
    box(width,.06,roomBack-frontZ,midX,height+.09,(frontZ+roomBack)/2,pale);
    for(const x of [minX,maxX]) {
      const start=x===minX?backZ:deiInterior.left.centerZ+deiInterior.left.width/2;
      box(.20,height+.14,roomBack-start,x,(height+.14)/2,(start+roomBack)/2,brick,true);
      box(.018,height,roomBack-start,x+(x===minX?.111:-.111),height/2,(start+roomBack)/2,pale);
    }
    box(width,height,.20,midX,height/2,roomBack,brick,true);
    box(width-.2,height,.018,midX,height/2,roomBack-.111,pale);
    const left=doorX-doorWidth/2,right=doorX+doorWidth/2,windowLeft=minX+.16,windowRight=left-.28;
    // Paños y marcos con relieve real; las texturas continúan en metros.
    const backplane=backZ+.03;
    box(maxX-right,height-.10,.08,(maxX+right)/2,height/2,backplane,wood,true);
    box(left-windowRight,height-.10,.08,(left+windowRight)/2,height/2,backplane,wood,true);
    box(windowLeft-minX,height-.1,.08,(windowLeft+minX)/2,height/2,backplane,wood,true);
    const panel=box(windowRight-windowLeft,counterHeight-.055,.10,(windowLeft+windowRight)/2,(counterHeight+.055)/2,backplane,wood,true);
    panel.name="Mostrador de madera de recepción LED";panel.userData.keep=true;
    const upper=2.43;
    box(width,height-upper,.10,midX,(height+upper)/2,backplane,wood,true);
    for(const x of [minX+.04,left-.035,right+.035,windowLeft,windowRight,maxX-.04])box(.07,height,.13,x,height/2,backZ-.025,edging);
    for(const y of [.09,upper,height-.04])box(width,.065,.13,midX,y,backZ-.025,edging);
    for(let x=minX+.7;x<maxX-.3;x+=1.0)box(.05,height-upper-.08,.13,x,(height+upper)/2,backZ-.025,edging);
    for(let x=windowLeft+.85;x<windowRight;x+=.85)box(.04,counterHeight-.1,.13,x,counterHeight/2,backZ-.025,edging);
    const door=box(doorWidth-.025,doorHeight,.085,doorX,doorHeight/2+.055,backZ,wood,true);
    door.name="Puerta de madera de recepción LED";door.userData.keep=true;
    for(const x of [left+.065,right-.065])box(.05,doorHeight-.10,.13,x,doorHeight/2+.055,backZ-.025,edging);
    for(const y of [.13,doorHeight+.02])box(doorWidth-.10,.06,.13,doorX,y,backZ-.025,edging);
    box(.07,.25,.018,left+.12,1.08,backZ-.077,metal);
    beam(v3(left+.12,1.16,backZ-.12),v3(left+.31,1.16,backZ-.12),.018,metal);
    const pane=box(windowRight-windowLeft,upper-counterHeight,.025,(windowLeft+windowRight)/2,(upper+counterHeight)/2,backZ,glass,true);
    pane.name="Ventanilla de recepción LED";pane.userData.keep=true;pane.userData.deiReceptionWindow=true;
    box(windowRight-windowLeft,.035,.065,(windowLeft+windowRight)/2,1.88,backZ-.025,edging);
    box(windowRight-windowLeft+.12,.085,.36,(windowLeft+windowRight)/2,counterHeight,backZ-.08,edging,true);
    function notice(text:string,w:number,h:number,x:number,y:number,z:number,evac=false){
      const sheet=document.createElement("canvas");sheet.width=256;sheet.height=evac?384:96;const cc=sheet.getContext("2d")!;
      cc.fillStyle=evac?"#eee9cd":"#786244";cc.fillRect(0,0,sheet.width,sheet.height);
      cc.fillStyle=evac?"#262b26":"#e6d4a4";cc.font=evac?"bold 14px sans-serif":"bold 28px sans-serif";cc.textAlign="center";cc.fillText(text,128,evac?24:60,245);
      if(evac)for(let i=0;i<7;i++){cc.fillStyle=i%2?"#e7aa64":"#e3ce58";cc.fillRect(12,42+i*44,232,40);cc.fillStyle="#333832";cc.font="bold 28px sans-serif";cc.fillText("←",42,72+i*44);cc.fillRect(72,55+i*44,155,3);cc.fillRect(72,64+i*44,132,3);}
      const texture=new T.CanvasTexture(sheet);texture.colorSpace=T.SRGBColorSpace;
      const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,roughness:.85}));mesh.rotation.y=Math.PI;mesh.position.set(x,y,z);layers.visual.add(mesh);
    }
    notice("GUÍA DE EVACUACIÓN",.63,1.03,(maxX+right)/2,1.81,backZ-.065,true);
    notice("RECEPCIÓN",.58,.13,(windowLeft+windowRight)/2,upper+.04,backZ-.098);
    // Oficina visible a través del vidrio, cerrada hacia el patio por su pared posterior.
    const deskX=(windowLeft+windowRight)/2,deskZ=backZ+.65;
    box(windowRight-windowLeft-.25,.07,.78,deskX,.85,deskZ,wood);
    for(const x of [windowLeft+.2,windowRight-.2])box(.08,.78,.65,x,.43,deskZ,metal);
    const monitor=box(.69,.45,.065,deskX-.45,1.20,deskZ-.08,dark);
    monitor.name="Monitor de la recepción LED";monitor.userData.keep=true;
    box(.10,.21,.10,deskX-.45,.96,deskZ-.06,metal);box(.45,.025,.24,deskX-.45,.895,deskZ-.1,dark);
    box(.46,.025,.14,deskX-.45,.897,deskZ-.28,dark);
    box(.5,.10,.39,deskX+.85,.93,deskZ,dark);
    for(let i=0;i<3;i++)box(.25,.018,.32,deskX+.3,.90+i*.018,deskZ-.1,pale);
    box(.45,.61,.10,deskX-.45,1.14,roomBack-.5,dark);box(.47,.08,.45,deskX-.45,.54,roomBack-.65,dark);
    box(.06,.49,.06,deskX-.45,.26,roomBack-.65,metal);
    const yellow=new T.MeshStandardMaterial({color:"#c2a831",roughness:.95});
    const cartX=maxX-.57,cartZ=deiInterior.left.centerZ+deiInterior.left.width/2+.35;
    const bin=new T.Mesh(new T.CylinderGeometry(.23,.20,.69,16),yellow);bin.position.set(cartX,.405,cartZ);layers.visual.add(bin);
    const rim=new T.Mesh(new T.TorusGeometry(.225,.026,5,20),dark);rim.rotation.x=Math.PI/2;rim.position.set(cartX,.76,cartZ);layers.visual.add(rim);
    box(.66,.045,.43,cartX,.79,cartZ,pale);box(.64,.035,.35,cartX-.12,.24,cartZ+.06,metal);
    for(const x of[cartX-.29,cartX+.29])box(.03,.60,.035,x,.48,cartZ+.16,metal);
    beam(v3(cartX-.28,.09,cartZ-.27),v3(cartX-.34,1.81,cartZ-.10),.014,dark);
    box(.26,.06,.15,cartX-.28,.085,cartZ-.27,pale);
    for(const [x,color]of[[cartX+.18,"#c9d8cc"],[cartX+.03,"#ba3f2c"]]as const) {
      box(.07,.20,.07,x,.91,cartZ-.03,new T.MeshStandardMaterial({color,roughness:.7}));box(.045,.035,.045,x,1.025,cartZ-.03,dark);
    }

  });
  addDeiInterior(builder,interior,brick);
}
