import { addCourtyardElevatorTree } from "../courtyard-elevator-tree";
import * as T from "three";
import { facultyBlueprint as plan, gridAngle, PLAZA_LEVEL as level } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";

/** Vista desde Kampus Print: x hacia el patio, z hacia el jardín. */
export function addPassageEntrance(b: FacultyBuilder, brick: T.Material, facadeBrick: T.Material,
  steps: (foot: number, top: number, rise: number, width: number) => void) {
  const {box, frame, m, beam, pole, v3, layers} = b;
  frame({center:plan.platformSteps[1].top, angle:gridAngle+Math.PI, size:[3.5,2.4]}, () => {
    const top = level+3.6;
    box(4.4,level,2.4,0,level/2,1.2,m.accessStone,true);
    // La rampa lateral enlaza a ras con el rellano. Las estrías forman espigas.
    const run=5, end=-2.2, start=end-run;
    const profile=new T.Shape();
    profile.moveTo(start,0); profile.lineTo(end,0); profile.lineTo(end,level); profile.closePath();
    const wedge=new T.Mesh(new T.ExtrudeGeometry(profile,{depth:1.65,bevelEnabled:false}),m.concrete);
    wedge.position.z=0.75; layers.visual.add(wedge);
    const rampBody=new T.Mesh(wedge.geometry);
    rampBody.position.copy(wedge.position);
    layers.solid.add(rampBody);
    const rampY=(x:number)=>level*(x-start)/run+0.009;
    for(let x=start+0.22;x<end-0.2;x+=0.32)
      for(const z of [0.79,2.36]) beam(v3(x,rampY(x),z),v3(x+0.18,rampY(x+0.18),1.575),0.011,m.metal);
    frame({center:[2.2,1.2],size:[2,2.4],angle:0},()=>steps(1.6,0,level,2.4));

    for(const x of [-1.76,1.76]) box(0.23,3.6,0.38,x,level+1.8,-0.13,m.concrete,true);
    box(3.74,0.34,0.42,0,top-0.17,-0.11,m.concrete,true);
    
    box(0.29,0.12,0.08,0,top-0.08,0.13,m.white);

    // La cara exterior del muro de Bedelía queda en z=-1,90 en este marco.
    const facadeAdvance=0.83;
    const rearFace=-1.90-facadeAdvance, frontBack=-0.26, depth=frontBack-rearFace;
    frame({center:[0,facadeAdvance],size:[3.5,3],angle:0},()=>{
    const centerZ=(rearFace+frontBack)/2;
    const rearX=-7.45, noseX=-5.36, noseZ=-0.17;
    const footprint: [number,number][]=[[rearX,rearFace],[-1.86,rearFace],[-1.86,-0.08],[noseX,-0.08]];
    b.prism(footprint,0,level,m.concrete,true);

    const dx=noseX-rearX, dz=noseZ-rearFace;
    box(Math.hypot(dx,dz),3.6,0.18,(rearX+noseX)/2,level+1.8,(rearFace+noseZ)/2,
      facadeBrick,true,{rotation:-Math.atan2(dz,dx)});

    // Alineado con la cara blanca del acceso de doble hoja.
    box(0.21,3.6,depth+0.18,-1.755,level+1.8,centerZ+0.09,m.plaster,true);

    // El vidrio y la mampostería ocupan paños distintos de la misma fachada.
    for(const [left,right] of [[-5.36,-5.29],[-4.07,-1.86]])
      box(right-left,3.6,0.18,(left+right)/2,level+1.8,-0.17,facadeBrick,true);
    box(1.22,0.14,0.18,-4.68,level+0.07,-0.17,facadeBrick,true);
    box(1.22,0.74,0.18,-4.68,level+3.23,-0.17,facadeBrick,true);
    box(1.22,2.72,0.06,-4.68,level+1.5,-0.045,m.glass,true);
    
    for(const x of [-5.29,-4.68,-4.07]) box(0.045,2.73,0.14,x,level+1.5,0.04,m.steel);
    for(const y of [0.14,2.86]) box(1.26,0.06,0.15,-4.68,level+y,0.04,m.steel);
    box(0.86,0.63,0.38,-3.84,level+2.63,0.13,m.white);
    const fan=pole(0.235,0.045,-3.95,level+2.63,0.34,m.metal);
    fan.rotation.x=Math.PI/2;
    for(let i=-2;i<=2;i++) box(0.44,0.014,0.02,-3.95,level+2.63+i*0.077,0.37,m.steel);

    const ladder=-2.65;
    for(const x of [ladder-0.23,ladder+0.23]) pole(0.025,4.82,x,level+2.41,0.24,m.steel);
    for(let y=0.22;y<3.95;y+=0.27) beam(v3(ladder-0.23,level+y,0.24),v3(ladder+0.23,level+y,0.24),0.018,m.metal);
    for(const y of [2.2,3.05,3.9,4.78]){
      const hoop=new T.Mesh(new T.TorusGeometry(0.43,0.016,6,20,Math.PI),m.metal);
      hoop.rotation.x=Math.PI/2; hoop.position.set(ladder,level+y,0.24); layers.visual.add(hoop);
    }
    for(const angle of [0,Math.PI/2,Math.PI]) pole(0.015,2.58,ladder+0.43*Math.cos(angle),level+3.49,0.24+0.43*Math.sin(angle),m.metal);

    });
    // Losa continua desde la cubierta de Bedelía hasta el borde norte de Manfred.
    // El escalón posterior sigue los tres techos existentes, sin superponer sus caras.
    const roofEdge: [number,number][] = [
      [-7.30,-1.60],[-1.75,-1.60],[-1.75,0],[1.20,0],[1.20,1.14],
      [14.26,1.14],[14.26,1.87],[7.65,1.87],[4.4,0.82],[-5.45,0.82],
    ];
    b.prism(roofEdge,top,0.22,m.concrete,true);
    // El vértice exterior de Manfred sobresale hasta z=1,14 en este marco.
    // El muro bordea esa diagonal y se cierra en el extremo del patio.
    const patioBack = [[1.875,-0.13],[4.45,-0.13],[7.68,1.76],[14.17,1.76],[14.17,-2.64]];
    // Tabique entre el primer quiebre del patio y el paño diagonal de Manfred.
    const [returnX, wallAxisZ] = patioBack[1];
    const patioInnerZ = wallAxisZ - 0.09;
    const glazingZ = -1.32;
    box(0.16, top-level, patioInnerZ-glazingZ, returnX,
      (level+top)/2, (patioInnerZ+glazingZ)/2, brick, true);
    for (let i=1;i<patioBack.length;i++) {
      const [ax,az]=patioBack[i-1], [bx,bz]=patioBack[i];
      const length=Math.hypot(bx-ax,bz-az), rotation=-Math.atan2(bz-az,bx-ax);
      box(length,top,0.18,(ax+bx)/2,top/2,(az+bz)/2,brick,true,{rotation});
      
    }
    b.prism([[3.8,0],[4.45,0],[7.68,1.86],[11.5,1.86],[11.5,5.29],[3.8,5.29]],0,0.12,m.courtyardPaving,true);
    frame({center:[0,2.11],size:[7.7,3.45],angle:0},()=>{
      for(const [x,z] of [[4.9,0.35],[7.2,2.1]]) {
        box(1.8,0.09,0.43,x,0.56,z,m.metal,true);
        for(const dx of [-0.76,0.76]) box(0.065,0.42,0.36,x+dx,0.33,z,m.metal);
      }
      for(const x of [8.55,9.68,10.95]) box(0.14,0.86,0.67,x,0.55,0.22,brick,true);
      box(1.3,0.08,0.7,10.32,1.02,0.22,m.steel,true);
      box(0.91,0.018,0.46,10.32,1.067,0.22,m.metal);
      beam(v3(10.32,1.06,-0.02),v3(10.32,1.33,-0.02),0.018,m.steel);
      beam(v3(10.32,1.33,-0.02),v3(10.32,1.33,0.14),0.018,m.steel);
      for(let x=8.65;x<9.65;x+=0.075) box(0.022,0.03,0.62,x,0.96,0.22,m.metal);
      for(const z of [-0.07,0.51]) box(1.13,0.05,0.045,9.12,0.93,z,m.metal);
    });
    const leaf=new T.SphereGeometry(1,6,4);
    for(const [x,z,base] of [[1.48,0.54,level],[-5.75,0.38,0],[4,0.24,0.12]]) {
      pole(0.26,0.39,x,base+0.195,z,brick,true);
      for(let i=0;i<15;i++){
        const a=i*2.4, blade=new T.Mesh(leaf,m.leaves[i%4]);
        blade.position.set(x+0.15*Math.cos(a),base+0.56+i%3*0.07,z+0.15*Math.sin(a));
        blade.scale.set(0.055,0.36+i%4*0.06,0.09);
        blade.rotation.order="YXZ"; blade.rotation.set(0.53,a,0); layers.visual.add(blade);
      }
    }
    // Posiciones estimadas desde las fotos mirando desde el pasillo hacia Kampus Print.
    // El mango queda en la tierra justo después del borde exterior del patio.
    addCourtyardElevatorTree(layers.visual,layers.solid,{
      center:[5.8,6.25], baseY:0, height:7.6, spread:4.3,
      leavesPerTuft:190, protectShaft:false, name:"Mango junto a los bancos de Manfred",
    });
    addCourtyardElevatorTree(layers.visual,layers.solid,{
      center:[-3.7,6.7], baseY:0, height:10.3, spread:3.15,
      leavesPerTuft:65, protectShaft:false, name:"Árbol alto frente a Kampus Print",
    });
  });
}
