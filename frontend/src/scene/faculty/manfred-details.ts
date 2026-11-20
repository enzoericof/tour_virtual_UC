import { facultyBlueprint as plan } from "../../data/faculty-blueprint";
import * as T from "three";
import type { FacultyBuilder } from "./builder";
import { registerSeats } from "../seating";

/** Mobiliario y equipamiento reconstruidos de las fotos de la sala. */
export function manfredDetails(b: FacultyBuilder, w: number, d: number, pitY: number) {
  const { box, pole, beam, v3, frame, layers, sign, m } = b;
  const black = new T.MeshStandardMaterial({color: '#252a2c', roughness: .68});
  const steel = new T.MeshStandardMaterial({color: '#394c54', roughness: .62, metalness: .35});
  const cream = new T.MeshStandardMaterial({color: '#dbd8c7', roughness: .8});
  const wood = new T.MeshStandardMaterial({color: '#c79c60', roughness: .72});
  const light = new T.MeshStandardMaterial({color: '#ffffff', emissive: '#f6fff1', emissiveIntensity: 2});
  const cushion = new T.SphereGeometry(1, 12, 8);
  function chair(x: number, y: number, z: number, tablet = true, facing = 0) {
    frame({center:[x,z],size:[.65,.7],angle:facing},()=>{
      const seat = new T.Mesh(cushion,black);seat.scale.set(.25,.055,.23);seat.position.set(0,.45,0);layers.visual.add(seat);
      const back = new T.Mesh(cushion,black);back.scale.set(.25,.23,.055);back.position.set(0,.78,.22);back.rotation.x=-.1;layers.visual.add(back);
      for(const dx of [-.23,.23]) {
        beam(v3(dx,.04,-.27),v3(dx,.48,-.18),.018,black);
        beam(v3(dx,.04,.28),v3(dx,.95,.22),.018,black);
        beam(v3(dx,.18,-.23),v3(dx,.18,.25),.012,black);
        beam(v3(dx,.62,.21),v3(dx,.62,-.2),.018,black);
      }
      if(tablet) {
        box(.32,.035,.46,.3,.7,-.19,black);
        beam(v3(.23,.48,.12),v3(.35,.7,-.17),.018,black);
      }
      registerSeats(layers.visual,.5,0,.46,0,-1);
    },y);
  }
  // Cerchas expuestas y tubos luminosos, sin luces puntuales por cada tubo.
  for(const z of [-3.5,-1.7,.1,1.9]) {
    const span=w/2-w/4*Math.abs(z)/(d/2)-.2;
    beam(v3(-span,3.12,z),v3(span,3.12,z),.065,steel);
    for(let x=-span+.1;x<span-1.5;x+=2) {
      beam(v3(x,3.12,z),v3(x+1,3.48,z),.045,steel);
      beam(v3(x+1,3.48,z),v3(Math.min(x+2,span),3.12,z),.045,steel);
      box(1.55,.055,.09,x+.8,3.02,z,light);
    }
  }
  for(const x of [-2.5,0,2.5]) beam(v3(x,3.15,-4.2),v3(x,3.15,2.8),.05,steel);
  // Proyector suspendido, lente orientada a la pantalla.
  pole(.025,.35,0,2.98,-.4,steel);
  box(.48,.18,.36,0,2.74,-.4,cream);
  const lens=new T.Mesh(new T.CylinderGeometry(.055,.055,.04,16),m.glass);lens.rotation.x=Math.PI/2;lens.position.set(.12,2.74,-.6);layers.visual.add(lens);
  for(let x=-.15;x<=.05;x+=.04) box(.016,.08,.015,x,2.74,-.59,black);
  // Pantalla enrollable con bordes y pizarrón detrás.
  const backZ=-d/2+.28;
  box(3.05,2.1,.06,0,1.62,backZ+.12,black);
  box(2.88,1.92,.025,0,1.62,backZ+.16,m.white);
  box(3.3,.12,.15,0,2.74,backZ+.14,cream);
  box(3.18,.035,.055,0,.57,backZ+.18,cream);
  box(2.6,.65,.06,0,.18,backZ,m.white);
  // Mesa y sillas se desplazan juntas hacia el interior de la sala.
  frame({center:[0,plan.manfredInterior.furnitureShiftZ],size:[4,2],angle:0},()=>{
  box(4,.085,.72,0,pitY+.78,-4.15,wood,true);
  box(3.8,.52,.055,0,pitY+.44,-3.85,wood,true);
  for(const x of [-1.85,1.85]) for(const z of [-4.42,-3.88]) pole(.035,.72,x,pitY+.36,z,black);
  for(const x of [-1.15,0,1.15]) chair(x,pitY,-4.75,false,Math.PI);
  });
  // Atril translúcido, micrófono y pizarrón móvil lateral.
  const clear=new T.MeshStandardMaterial({color:'#cdd9dc',transparent:true,opacity:.38,roughness:.2});
  box(.55,1.05,.12,-3.0,pitY+.54,-3.5,clear);
  box(.72,.055,.48,-3.0,pitY+1.1,-3.5,black,false,{pitch:.14});
  box(.6,.04,.48,-3.0,pitY+.02,-3.5,steel);
  beam(v3(-2.85,pitY+1.13,-3.5),v3(-2.95,pitY+1.4,-3.55),.012,black);
  box(1.8,1.05,.05,3.1,pitY+1.55,-3.75,m.white);
  for(const x of [2.35,3.85]) {pole(.025,1.1,x,pitY+.55,-3.77,steel);box(.5,.04,.4,x,pitY+.03,-3.77,steel);}
  // Equipos split, zócalos y columnas interiores claras.
  for(const x of [-1.9,1.9]) {
    box(1.85,.32,.28,x,3.03,backZ+.07,cream);
    for(let j=0;j<4;j++) box(1.65,.018,.03,x,2.96+j*.035,backZ+.23,steel);
  }
  for(const x of [-2.25,2.25]) pole(.12,3.1-pitY,x,(3.1+pitY)/2,backZ+.01,m.concrete);
  box(.09,.4,.05,-1.6,2.23,backZ+.08,wood);box(.28,.07,.05,-1.6,2.3,backZ+.09,wood);
  // Banner vertical junto al atril y tomas eléctricas del frente.
  box(.7,1.8,.04,-3.3,pitY+.95,-4.8,cream);
  box(.8,.055,.3,-3.3,pitY+.04,-4.8,steel);
  sign('UNIVERSIDAD CATÓLICA',-3.3,pitY+1.65,-4.77,.65);
  sign('INGENIERÍA INFORMÁTICA',-3.3,pitY+1.05,-4.77,.64);
  for(const x of [-2.6,2.6]) box(.1,.07,.02,x,pitY+.28,backZ+.04,cream);
  return {chair};
}
