import * as T from "three";
import { annexEnclosedLink, facultyAnnexes, deiEntranceWing as wing, deiSideDoor, deiEntrancePaving, deiPerimeterWalk } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";
import type { Vec2 } from "../../data/faculty-blueprint";
import { subtractPaving } from "./paving-cutouts";

/** Acceso del LED según la foto frontal: galería, cantero de macetas, carpa y blindex. */
export function addLedEntranceWing(builder: FacultyBuilder, brick: T.MeshStandardMaterial, paving:T.MeshStandardMaterial) {
  const { layers, box, pole, beam, v3, prism, m, solidRoof } = builder;
  const { minX, maxX, frontZ, backZ, height, recess, canopy } = wing;
  const [doorX, doorZ] = deiSideDoor.center, doorW = deiSideDoor.width, doorH = deiSideDoor.height;
  const centerX = (minX + maxX) / 2, width = maxX - minX;
  const masonry = brick;
  const plinth = brick;
  const steel = new T.MeshStandardMaterial({ color: "#55594b", roughness: .78, metalness: .35 });
  const timber = new T.MeshStandardMaterial({ color: "#544b3b", roughness: .94 });
  const wood = new T.MeshStandardMaterial({ color: "#5b4532", roughness: .83 });
  const concrete = m.concrete.clone(); concrete.color.set("#dfdbce");
  const glass = m.glass.clone(); glass.color.set("#263c3d"); glass.opacity = .68; glass.roughness = .24; glass.depthWrite = false;
  const footprint = [[minX,frontZ],[maxX,frontZ],[maxX,backZ],[minX,backZ]] as const;
  prism(footprint,-.10,.15,paving).name = "Ampliación baja del LED";
  box(width+.15,.14,backZ-frontZ+.2,centerX,height+.03,(frontZ+backZ)/2,m.roof,true);
  const portal=deiPerimeterWalk.portal;
  const openStart=portal.z-portal.width/2;
  box(.20,height+.22,openStart-frontZ,minX,(height+.22)/2,(frontZ+openStart)/2,masonry,true);
  box(.20,height+.22-portal.height,backZ-openStart,minX,(height+.22+portal.height)/2,(backZ+openStart)/2,masonry,true);
  // El cierre antiguo del enlace se retira: el piso interior llega sin césped hasta él.
  const dei=facultyAnnexes.find(b=>b.id==="dei-led")!,led=facultyAnnexes.find(b=>b.id==="led")!;
  const linkFront=led.mapCenter[1]-dei.mapCenter[1]-annexEnclosedLink.rect.size[1]/2;
  box(width,.15,linkFront-backZ+.04,centerX,-.025,(backZ+linkFront)/2,paving,true);
  // Cierre continuo marcado por el usuario, detrás del paso lateral entre los pilares.
  const joinMin=minX-.10,joinMax=wing.frontWallMinX+.10;
  const joinZ=deiPerimeterWalk.wallFrontZ+.10;
  const joinWall=box(joinMax-joinMin,height,.20,(joinMin+joinMax)/2,height/2,joinZ,masonry,true);
  joinWall.name="Pared de unión entre el acceso DEI y el bloque de oficinas";joinWall.userData.keep=true;
  box(.20,height,doorZ-joinZ,wing.frontWallMinX,height/2,(doorZ+joinZ)/2,masonry,true);

  // Galería abierta delante del cierre; dos pilares exteriores y dos junto al vidrio.
  const halfGlass=wing.glazingWidth/2, columnOffset=halfGlass+wing.pillarSize/2;
  function pillar(x: number,z: number,kind: "front"|"middle"|"entry") {
    const column=box(wing.pillarSize,3.05,wing.pillarSize,x,1.575,z,masonry,true);
    column.name=kind==="entry"?"Pilar de ladrillo junto al blindex":kind==="middle"?"Pilar intermedio del acceso LED":"Pilar frontal del pórtico LED";
    column.userData.keep=true;
    box(wing.pillarSize+.035,.43,wing.pillarSize+.035,x,.415,z,plinth,true);
    box(wing.pillarSize+.055,.08,wing.pillarSize+.055,x,.24,z,concrete);
  }
  for(const side of [-1,1]) {
    pillar(doorX+side*columnOffset,frontZ,"front");
    pillar(doorX+side*columnOffset,(frontZ+doorZ)/2,"middle");
    pillar(doorX+side*columnOffset,doorZ,"entry");
  }
  box(width,.46,.24,centerX,3.28,frontZ,masonry,true);
  for(const z of [frontZ,doorZ]) {
    const column=box(wing.pillarSize,3.05,wing.pillarSize,wing.frontWallMinX+1.4,1.575,z,masonry,true);
    column.name="Columna lateral de la prolongación LED";column.userData.keep=true;
  }
  box(wing.glazingWidth+.62,.15,.22,doorX,3.02,frontZ,timber);
  // Frontón de ladrillo debajo de la cumbrera de la lona.
  const triangle = new T.ExtrudeGeometry(new T.Shape([
    new T.Vector2(doorX-canopy.width/2,3.5),new T.Vector2(doorX+canopy.width/2,3.5),new T.Vector2(doorX,3.98),
  ]),{depth:.18,bevelEnabled:false});
  triangle.translate(0,0,frontZ-.1);
  const pos=triangle.attributes.position,uv=triangle.attributes.uv,tile=masonry.userData.tile??[4,2];
  for(let i=0;i<pos.count;i++) uv.setXY(i,pos.getX(i)/tile[0],pos.getY(i)/tile[1]);
  layers.visual.add(new T.Mesh(triangle,masonry));
  // Vigas y tirantes visibles del pequeño techo interior, como en la fotografía.
  box(wing.glazingWidth+.6,.08,recess,doorX,3.14,frontZ+recess/2,timber);
  for(let i=0;i<=4;i++) box(wing.glazingWidth+.56,.12,.12,doorX,3.03,frontZ+.15+i*(recess-.3)/4,timber);
  for(const offset of [-1.35,-.45,.45,1.35]) box(.07,.15,recess,doorX+offset,3.0,frontZ+recess/2,timber);

  // Ventanas altas de rejas azules flanqueando el mismo frente del blindex.
  box(width,height-doorH,.18,centerX,(height+doorH)/2,doorZ,masonry,true);
  const chrome=new T.MeshStandardMaterial({color:"#afb4ad",metalness:.75,roughness:.28});
  function pane(w: number,d: number,x: number,z: number,collide=true) {
    const mesh=box(w,doorH-.10,d,x,doorH/2+.05,z,glass,collide);
    mesh.name="Blindex oscuro de acceso al LED"; mesh.userData.ledEntranceGlass=true; mesh.userData.keep=true;
    return mesh;
  }
  // Un único frente de blindex oscuro, con dos hojas centrales corredizas.
  const glassLeft=doorX-halfGlass,glassRight=doorX+halfGlass;
  for(const [a,b] of [[glassLeft,doorX-doorW/2],[doorX+doorW/2,glassRight]]) {
    pane(b-a,.028,(a+b)/2,doorZ+.035);
    for(const y of [.085,doorH+.015]) box(b-a,.025,.045,(a+b)/2,y,doorZ+.035,steel);
  }
  const blueGrille=new T.MeshStandardMaterial({color:"#48728a",metalness:.38,roughness:.65});blueGrille.name="Reja azul del acceso LED";
  const sideGlass=glass.clone();sideGlass.color.set("#8ea5ad");sideGlass.opacity=.38;
  const win=wing.sideWindows;
  for(const side of [-1,1]) {
    const wx=doorX+side*win.offset;
    const lo=side<0?wing.frontWallMinX:doorX+columnOffset+wing.pillarSize/2;
    const hi=side<0?doorX-columnOffset-wing.pillarSize/2:maxX;
    for(const [a,b] of [[lo,wx-win.width/2],[wx+win.width/2,hi]])
      box(b-a,doorH,.18,(a+b)/2,doorH/2,doorZ,masonry,true);
    box(win.width,win.sill,.18,wx,win.sill/2,doorZ,masonry,true);
    box(win.width,doorH-win.sill-win.height,.18,wx,(doorH+win.sill+win.height)/2,doorZ,masonry,true);
    const window=box(win.width,win.height,.035,wx,win.sill+win.height/2,doorZ+.025,sideGlass,true);
    window.name="Ventana lateral con reja azul del LED";window.userData.ledEntrySideWindow=true;window.userData.keep=true;
    for(const x of [wx-win.width/2,wx,wx+win.width/2])
      box(.028,win.height+.05,.085,x,win.sill+win.height/2,doorZ-.075,blueGrille);
    for(let row=0;row<=3;row++) box(win.width+.06,.035,.085,wx,win.sill+row*win.height/3,doorZ-.075,blueGrille);
    for(let row=0;row<3;row++) {
      const y=win.sill+row*win.height/3,h=win.height/3;
      const points=[[-win.width/2,y+.1],[0,y+h*.38],[win.width/2,y+.1],
        [win.width/2,y+h-.1],[0,y+h*.62],[-win.width/2,y+h-.1]];
      for(let i=0;i<points.length;i++) {
        const a=points[i],b=points[(i+1)%points.length];
        beam(v3(wx+a[0],a[1],doorZ-.10),v3(wx+b[0],b[1],doorZ-.10),.009,blueGrille);
      }
    }
    box(win.width+.12,.04,.24,wx,win.sill-.025,doorZ-.015,concrete);
  }
  const doorRoot=new T.Group();doorRoot.position.set(doorX,0,doorZ);
  doorRoot.name="Blindex corredizo doble del DEI";doorRoot.userData.entranceDoorId="dei";
  const parent=layers.visual;parent.add(doorRoot);
  for(const side of [-1,1]) {
    const leaf=new T.Group();leaf.position.set(side*doorW/4,0,-.13);
    leaf.name=side<0?"Hoja izquierda corrediza del DEI":"Hoja derecha corrediza del DEI";
    leaf.userData.entranceDoorSlide=side*(doorW/2+.045);
    doorRoot.add(leaf);layers.visual=leaf;
    pane(doorW/2-.012,.028,0,0,false);
    for(const y of [.085,doorH+.015]) box(doorW/2,.025,.045,0,y,0,steel);
    const handleX=-side*(doorW/4-.10);
    beam(v3(handleX,.90,-.055),v3(handleX,1.45,-.055),.013,chrome);
    for(const y of [.90,1.45]) beam(v3(handleX,y,0),v3(handleX,y,-.055),.011,chrome);
  }
  doorRoot.traverse(o=>{if(o instanceof T.Mesh)o.userData.keep=true;});layers.visual=parent;
  box(doorW+.12,.075,.13,doorX,doorH+.07,doorZ-.12,steel);
  const barrier=new T.Mesh(builder.unit);
  barrier.position.set(doorX,doorH/2+.05,doorZ-.13);barrier.scale.set(doorW,doorH-.10,.04);
  barrier.visible=false;barrier.userData.keep=true;barrier.userData.entranceDoorBarrierId="dei";
  parent.add(barrier);
  // El fondo comunica con el enlace existente, sin un telón de ladrillo agregado.

  // Misma textura, escala y origen UV que la galería perimetral.
  const [tileX,tileZ]=paving.userData.tile;
  const endZ=doorZ+.30,apron=deiEntrancePaving;
  const outline=[[apron.minX,apron.frontZ(apron.minX)],[apron.maxX,apron.frontZ(apron.maxX)],
    [apron.maxX,endZ],[apron.minX,endZ]];
  const floorGeometry=new T.ExtrudeGeometry(new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z))),{depth:1,bevelEnabled:false});
  floorGeometry.rotateX(-Math.PI/2);
  const floorP=floorGeometry.attributes.position,floorUV=floorGeometry.attributes.uv;
  for(let i=0;i<floorP.count;i++) {
    const x=floorP.getX(i),z=floorP.getZ(i),t=T.MathUtils.clamp((z-apron.frontZ(x))/(endZ-apron.frontZ(x)),0,1);
    const top=T.MathUtils.lerp(apron.frontHeight,apron.rearHeight,t);
    floorP.setY(i,T.MathUtils.lerp(-.07,top,floorP.getY(i)));
    floorUV.setXY(i,x/tileX,z/tileZ);
  }
  floorGeometry.computeVertexNormals();
  const path=new T.Mesh(floorGeometry,paving);path.name="Embaldosado completo de entrada al DEI";
  path.userData.keep=true;path.receiveShadow=true;layers.visual.add(path);
  const floorBody=new T.Mesh(floorGeometry);floorBody.userData.deiEntranceApron=true;layers.solid.add(floorBody);
  // Plataformas y cordones laterales elevados; el eje de acceso queda a nivel del sendero.
  for(const side of [-1,1]) {
    const platformWidth=1.40,px=doorX+side*(wing.approachWidth/2+platformWidth/2);
    const lo=px-platformWidth/2,hi=px+platformWidth/2;
    for(const part of [0,1]) {
    const start=(x:number)=>apron.frontZ(x)+(part===0?.20:.60);
    const end=(x:number)=>part===0?apron.frontZ(x)+.60:doorZ+.3;
    const outline:Vec2[]=[[lo,start(lo)],[hi,start(hi)],[hi,end(hi)],[lo,end(lo)]];
    const cut:Vec2[]=[[lo-.1,portal.z-portal.width/2],[hi+.1,portal.z-portal.width/2],
      [hi+.1,portal.z+portal.width/2],[lo-.1,portal.z+portal.width/2]];
    const parts=side<0?subtractPaving(outline,[cut]):[outline];
    for(const polygon of parts) {
    const geo=new T.ExtrudeGeometry(new T.Shape(polygon.map(([x,z])=>new T.Vector2(x,-z))),{depth:1,bevelEnabled:false});geo.rotateX(-Math.PI/2);
    const p=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),z=p.getZ(i),top=T.MathUtils.lerp(.15,wing.sidePlatformHeight,T.MathUtils.smoothstep(z-apron.frontZ(x)-.2,0,.4));
      p.setY(i,T.MathUtils.lerp(.01,top,p.getY(i)));uv.setXY(i,x/tileX,z/tileZ);
    }
    geo.computeVertexNormals();layers.visual.add(new T.Mesh(geo,paving));layers.solid.add(new T.Mesh(geo));
    }
    }
    const curbX=doorX+side*(wing.approachWidth/2+.025),curbStart=apron.frontZ(curbX)+.6;
    const curbParts=side<0?builder.spans(curbStart,doorZ,[[portal.z-portal.width/2,portal.z+portal.width/2]]):[[curbStart,doorZ]];
    for(const [a,b] of curbParts)box(.055,.13,b-a,curbX,.14,(a+b)/2,concrete,true);
  }
  box(doorW,.025,.24,doorX,.065,doorZ-.08,concrete,true);

  // Lona azul a dos aguas longitudinal, centrada con el pasillito y las puertas.
  const fabric=m.awning.clone();fabric.color.set("#a6b0ec");fabric.side=T.DoubleSide;
  const tentEnd=canopy.endZ,tentStart=canopy.startZ;
  for(const side of [-1,1]) {
    const edgeX=doorX+side*canopy.width/2;
    const roof=new T.BufferGeometry();
    roof.setAttribute("position",new T.Float32BufferAttribute([
      edgeX,canopy.eave,tentStart,edgeX,canopy.eave,tentEnd,
      doorX,canopy.ridge,tentEnd,doorX,canopy.ridge,tentStart,
    ],3));
    roof.setAttribute("uv",new T.Float32BufferAttribute([0,0,0,tentEnd-tentStart,2,tentEnd-tentStart,2,0],2));
    roof.setIndex([0,1,2,0,2,3]);roof.computeVertexNormals();
    const mesh=new T.Mesh(roof,fabric);mesh.name="Carpa azul alineada con entrada LED";mesh.userData.ledEntranceCanopy=true;mesh.userData.keep=true;layers.visual.add(mesh);solidRoof(mesh);
    box(.025,.22,tentEnd-tentStart,edgeX,canopy.eave-.1,(tentEnd+tentStart)/2,fabric);
    beam(v3(edgeX,canopy.eave,tentStart),v3(edgeX,canopy.eave,tentEnd),.022,steel);
    for(const z of [tentStart,(tentStart+tentEnd)/2]) pole(.025,canopy.eave,edgeX,canopy.eave/2,z,steel,true);
  }
  for(let i=0;i<=4;i++) {
    const z=tentStart+(tentEnd-tentStart)*i/4;
    for(const side of [-1,1]) beam(v3(doorX+side*canopy.width/2,canopy.eave,z),v3(doorX,canopy.ridge,z),.018,steel);
  }
  beam(v3(doorX,canopy.ridge,tentStart),v3(doorX,canopy.ridge,tentEnd),.018,steel);
  const lightCase=new T.MeshStandardMaterial({color:"#e0dfcc",roughness:.65});
  const lightTube=new T.MeshStandardMaterial({color:"#f5f1d5",emissive:"#f0e4b3",emissiveIntensity:.28,roughness:.5});
  box(.15,.075,1.3,doorX,canopy.ridge-.12,tentEnd-1.7,lightCase);
  box(.065,.028,1.15,doorX,canopy.ridge-.17,tentEnd-1.7,lightTube);
  // Rincón lateral con puerta de servicio de madera, como el lateral izquierdo de la foto.
  const sideDoor=box(.04,2.05,.82,maxX-.12,1.225,frontZ+1.15,wood);
  sideDoor.name="Puerta lateral de madera del acceso LED";

  addEntrancePlants(builder,doorX,frontZ,doorZ,columnOffset);
}

/** Macetas de barro, follaje fino y guías trepadoras; geometría compartida para las hojas. */
function addEntrancePlants(builder: FacultyBuilder,cx: number,frontZ: number,doorZ: number,columnOffset: number) {
  const {layers,beam,v3}=builder;
  const clay=new T.MeshStandardMaterial({color:"#ac7559",roughness:1});
  const soil=new T.MeshStandardMaterial({color:"#453e2c",roughness:1});
  const stem=new T.MeshStandardMaterial({color:"#687044",roughness:1});
  const foliage=new T.MeshStandardMaterial({color:"#ffffff",side:T.DoubleSide,roughness:.9});
  const leafShape=new T.BufferGeometry();
  leafShape.setAttribute("position",new T.Float32BufferAttribute([0,0,0,-.055,.12,.015,-.035,.24,0,0,.29,0,.035,.24,0,.055,.12,.015,0,.14,.035],3));
  leafShape.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);leafShape.computeVertexNormals();
  const leaves=new T.InstancedMesh(leafShape,foliage,1400);
  leaves.name="Follaje de las macetas y trepadoras del LED";
  const dummy=new T.Object3D(),color=new T.Color();let n=0;
  const random=(i:number)=>{const r=Math.sin(i*127.1+311.7)*43758.5453;return r-Math.floor(r);};
  function leaf(x:number,y:number,z:number,index:number,size=1) {
    dummy.position.set(x,y,z);dummy.rotation.set((random(index+3)-.5)*1.8,random(index+7)*Math.PI*2,(random(index+11)-.5)*1.4);
    dummy.scale.setScalar(size);dummy.updateMatrix();leaves.setMatrixAt(n,dummy.matrix);
    color.setHSL(.22+random(index+17)*.10,.25+random(index+21)*.30,.24+random(index+25)*.15,T.SRGBColorSpace);leaves.setColorAt(n++,color);
  }
  const potBody=new T.CylinderGeometry(1,.64,1,16),potRim=new T.TorusGeometry(1,.055,5,20);
  let plantIndex=0;
  for(const side of [-1,1]) for(let j=0;j<5;j++) {
    const x=cx+side*([1.65,1.88,2.27,2.28,1.43][j]);
    const z=side<0 && j===2?frontZ-.35:[frontZ-2.9,frontZ-1.8,frontZ+.55,doorZ-.20,doorZ+.55][j];
    const floor=j===4?.05:wing.sidePlatformHeight;
    const radius=j===0?.27:j===3?.20:.22,h=j===0?.24:.35;
    const pot=new T.Mesh(potBody,clay);pot.position.set(x,floor+h/2,z);pot.scale.set(radius,h,radius);layers.visual.add(pot);
    const rim=new T.Mesh(potRim,clay);rim.rotation.x=Math.PI/2;rim.position.set(x,floor+h-.015,z);rim.scale.setScalar(radius);layers.visual.add(rim);
    const dirt=new T.Mesh(new T.CircleGeometry(radius*.88,16),soil);dirt.rotation.x=-Math.PI/2;dirt.position.set(x,floor+h-.02,z);layers.visual.add(dirt);
    for(let k=0;k<7;k++) {
      const a=k*2.39996,len=.30+random(k+plantIndex*13)*.40;
      const tip=v3(x+Math.cos(a)*.22,floor+h+len,z+Math.sin(a)*.22);
      beam(v3(x,floor+h-.03,z),tip,.006,stem);
      for(let q=0;q<12;q++) {
        const t=.16+q*.065,idx=plantIndex*173+k*19+q;
        leaf(x+(tip.x-x)*t+Math.cos(idx)*.10,floor+h+len*t,z+(tip.z-z)*t+Math.sin(idx)*.10,idx,.65+random(idx)*.55);
      }
    }
    plantIndex++;
  }
  for(const side of [-1,1]) {
    const x=cx+side*columnOffset;
    for(let i=0;i<18;i++) {
      const y=.35+i*.125,px=x+Math.sin(i*.8)*.14;
      if(i) beam(v3(x+Math.sin((i-1)*.8)*.14,y-.125,frontZ-.17),v3(px,y,frontZ-.17),.007,stem);
      for(let k=0;k<9;k++) leaf(px+Math.sin(i*3+k)*.15,y,frontZ-.18+Math.cos(i+k)*.10,1700+i*17+k,.65);
    }
  }
  leaves.count=n;leaves.instanceMatrix.needsUpdate=true;leaves.computeBoundingSphere();layers.visual.add(leaves);
}

