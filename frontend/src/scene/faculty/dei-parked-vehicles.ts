import * as T from "three";
import { deiForecourt } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";
import { cantinaGardenFloor } from "./cantina-garden";

/** Camionetas genéricas estacionadas: piezas y materiales compartidos, sin animación. */
export function addDeiParkedVehicles(builder:FacultyBuilder) {
  const {box,frame,layers}=builder;
  const rubber=new T.MeshStandardMaterial({color:"#222628",roughness:.95});
  const trim=new T.MeshStandardMaterial({color:"#31393d",roughness:.72,metalness:.28});
  const alloy=new T.MeshStandardMaterial({color:"#b5bfc5",roughness:.32,metalness:.8});
  const glassCanvas=document.createElement("canvas");glassCanvas.width=glassCanvas.height=64;
  const glassCtx=glassCanvas.getContext("2d")!,glassGradient=glassCtx.createLinearGradient(0,0,0,64);
  glassGradient.addColorStop(0,"#8298a2");glassGradient.addColorStop(.48,"#496571");glassGradient.addColorStop(.52,"#344d58");glassGradient.addColorStop(1,"#233b46");
  glassCtx.fillStyle=glassGradient;glassCtx.fillRect(0,0,64,64);
  const glassMap=new T.CanvasTexture(glassCanvas);glassMap.colorSpace=T.SRGBColorSpace;
  const glazing=new T.MeshStandardMaterial({map:glassMap,roughness:.2,metalness:.2,side:T.DoubleSide});
  const lamp=new T.MeshStandardMaterial({color:"#e5edf0",roughness:.25,emissive:"#c7d6d9",emissiveIntensity:.06});
  const tail=new T.MeshStandardMaterial({color:"#ac2929",roughness:.3});
  const tireGeometry=new T.CylinderGeometry(.39,.39,.27,18);
  const rimGeometry=new T.CylinderGeometry(.245,.245,.018,12);
  const archGeometry=new T.TorusGeometry(.43,.045,5,16,Math.PI);
  const shadowCanvas=document.createElement("canvas");shadowCanvas.width=shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext("2d")!,gradient=shadowCtx.createRadialGradient(64,64,5,64,64,64);
  gradient.addColorStop(0,"#00000070");gradient.addColorStop(.65,"#00000045");gradient.addColorStop(1,"#00000000");
  shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const shadowMaterial=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const shadowGeometry=new T.PlaneGeometry(5.45,2.65);shadowGeometry.rotateX(-Math.PI/2);
  const paints=new Map<string,T.MeshStandardMaterial>();
  const chassis=[[-2.35,.52],[-2.4,.94],[-1.85,1.1],[1.65,1.1],[2.4,.91],[2.4,.57]] as const;
  const cabin=[[-1.83,1.07],[-1.2,1.87],[.77,1.87],[1.53,1.1]] as const;
  const profile=(points:readonly (readonly number[])[],width:number)=>{
    const shape=new T.Shape();
    points.forEach((p,i)=>{
      const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],radius=.10;
      const al=Math.hypot(a[0]-p[0],a[1]-p[1]),bl=Math.hypot(b[0]-p[0],b[1]-p[1]);
      const before=[p[0]+(a[0]-p[0])*radius/al,p[1]+(a[1]-p[1])*radius/al];
      const after=[p[0]+(b[0]-p[0])*radius/bl,p[1]+(b[1]-p[1])*radius/bl];
      if(i===0)shape.moveTo(before[0],before[1]);else shape.lineTo(before[0],before[1]);
      shape.quadraticCurveTo(p[0],p[1],after[0],after[1]);
    });shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelThickness:.025,bevelSize:.045,bevelSegments:2,curveSegments:3});
    geo.translate(0,0,-width/2);return geo;
  };
  const bodyGeometry=profile(chassis,1.98),cabinGeometry=profile(cabin,1.84);
  function pane(points:number[][]) {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(points.flat(),3));
    geometry.setAttribute("uv",new T.Float32BufferAttribute(points.flatMap(p=>[.5,1-(p[1]-1.1)/.7]),2));
    geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    layers.visual.add(new T.Mesh(geometry,glazing));
  }
  for(const [index,parking] of deiForecourt.parking.entries()) {
    let paint=paints.get(parking.color);
    if(!paint){paint=new T.MeshStandardMaterial({color:parking.color,roughness:.35,metalness:.48});paints.set(parking.color,paint);}
    frame({center:parking.center,size:[4.9,2.1],angle:parking.angle},()=>{
      const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.position.y=.012;layers.visual.add(shadow);
      for(const [geometry,roof] of [[bodyGeometry,false],[cabinGeometry,true]] as const) {
        const mesh=new T.Mesh(geometry,paint);
        mesh.name=`Camioneta estacionada del LED ${index+1}`;mesh.castShadow=mesh.receiveShadow=true;
        if(!roof){mesh.userData.keep=true;mesh.userData.deiParkedVehicle=true;}
        layers.visual.add(mesh);
        const body=new T.Mesh(geometry);
        if(!roof)body.userData.deiParkedVehicle=true;
        layers.solid.add(body);
      }
      // Cristales inclinados y dos ventanillas por lado, separados por el parante.
      for(const side of [-1,1]) {
        const z=side*.955;
        pane([[-1.66,1.15,z],[-1.12,1.77,z],[-.28,1.77,z],[-.28,1.15,z]]);
        pane([[-.16,1.15,z],[-.16,1.77,z],[.68,1.77,z],[1.33,1.15,z]]);
        for(const x of [-.78,.62]) {
          box(.21,.035,.035,x,1.11,side*1.025,alloy);
          box(.014,.52,.012,x-.25,.83,side*1.025,trim);
        }
        box(.24,.14,.18,1.15,1.32,side*1.12,paint!);
        box(3.4,.08,.11,-.1,.48,side*1.04,trim);
        box(2.25,.065,.055,-.2,1.97,side*.65,trim);
        for(const x of [-1.2,.8])box(.05,.12,.055,x,1.9,side*.65,trim);
      }
      pane([[.81,1.80,-.84],[.81,1.80,.84],[1.46,1.14,.84],[1.46,1.14,-.84]]);
      pane([[-1.27,1.80,.84],[-1.27,1.80,-.84],[-1.86,1.14,-.84],[-1.86,1.14,.84]]);
      // Parrilla, ópticas, paragolpes y patentes sin marcas comerciales.
      box(.08,.2,1.02,2.425,.82,0,trim);
      for(const z of [-.72,.72])box(.08,.19,.4,2.40,.94,z,lamp);
      for(const y of [.76,.84,.92])box(.09,.018,.85,2.475,y,0,alloy);
      for(const x of [-2.4,2.43]){
        box(.11,.12,1.88,x,.55,0,trim);
        box(.025,.12,.43,x+Math.sign(x)*.075,.69,0,lamp);
      }
      for(const z of [-.81,.81])box(.06,.27,.17,-2.4,.9,z,tail);
      for(const x of [-1.47,1.47])for(const side of [-1,1]) {
        const tire=new T.Mesh(tireGeometry,rubber);tire.rotation.x=Math.PI/2;
        tire.position.set(x,.39,side*.99);tire.castShadow=true;layers.visual.add(tire);
        const arch=new T.Mesh(archGeometry,trim);arch.position.set(x,.39,side*1.035);layers.visual.add(arch);
        const rim=new T.Mesh(rimGeometry,alloy);rim.rotation.x=Math.PI/2;
        rim.position.set(x,.39,side*1.137);layers.visual.add(rim);
        for(let spoke=0;spoke<5;spoke++){
          const a=spoke*Math.PI*2/5;
          const mesh=box(.07,.36,.025,x,.39,side*1.153,trim);mesh.rotation.z=a;
        }
        box(.10,.10,.03,x,.39,side*1.17,alloy);
      }
    },cantinaGardenFloor(parking.center));
  }
}
