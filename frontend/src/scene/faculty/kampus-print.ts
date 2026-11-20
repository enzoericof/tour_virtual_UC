import * as T from "three";
import type { Annex } from "../../data/faculty-annexes";
import type { FacultyBuilder } from "./builder";

export function addKampusPrint(builder: FacultyBuilder, annex: Annex, brick: T.Material, steel: T.Material) {
  const { box, beam, v3, m } = builder;
  const [width, depth] = annex.rect.size;
  const side = width / 2, front = depth / 2, h = annex.height;
  const wallZ = front - 0.1, grilleZ = front + 0.015;
  box(width, h, 0.2, 0, h / 2, -wallZ, brick, true);
  for (const x of [-side + 0.1, side - 0.1])
    box(0.2, h, depth - 0.4, x, h / 2, 0, brick, true);
  box(width, 0.12, depth, 0, h + 0.06, 0, steel, true);
  const lintel = 2.55;
  box(width, h - lintel, 0.2, 0, (h + lintel) / 2, wallZ, brick, true);
  for (const [left, right] of [[-side,-9],[-4.65,-4.2],[-0.8,0],[4.65,5.15],[9.15,side]])
    box(right-left, lintel, 0.2, (left+right)/2, lintel/2, wallZ, brick, true);

  // Paños con antepecho, laterales de la entrada abierta y portón hasta el piso.
  for (const [left, right, sill] of [[-9,-4.65,0.83],[-4.2,-3.45,0],[-1.55,-0.8,0],[0,4.65,0.83],[5.15,9.15,0]]) {
    const span = right-left, mid = (left+right)/2, rise = lintel-sill;
    if (sill) box(span,sill,0.2,mid,sill/2,wallZ,brick,true);
    box(span,rise,0.06,mid,sill+rise/2,wallZ,m.glass,true);
    for (const x of [left,mid,right]) box(0.055,rise,0.08,x,sill+rise/2,front,steel);
    for (const y of [sill+0.03,2.13,lintel]) box(span,0.06,0.08,mid,y,front,steel);
    for (let start=left-rise+0.24; start<right; start+=0.34) {
      const x0=Math.max(left,start), x1=Math.min(right,start+rise);
      beam(v3(x0,sill+x0-start,grilleZ),v3(x1,sill+x1-start,grilleZ),0.015,steel);
    }
  }
  box(width,0.12,1.92,0,0,front+0.96,m.concrete,true);
  box(width,0.075,1.95,0,2.78,front+0.95,m.roof,true,{pitch:0.065});
  box(width,0.09,0.07,0,2.67,front+1.86,steel);
  for (const x of [-9.45,-4.55,0.2,4.95,9.45])
    box(0.065,2.66,0.065,x,1.35,front+1.86,steel,true);
  for (const x of [-8.85,-0.65,0.4,8.8]) {
    box(0.82,0.6,0.34,x,3.25,front+0.15,m.white);
    const fan=builder.pole(0.22,0.035,x-0.08,3.25,front+0.33,steel);
    fan.rotation.x=Math.PI/2;
    for (let i=-2; i<=2; i++) box(0.42,0.015,0.02,x-0.08,3.25+i*0.07,front+0.36,m.white);
  }
  const map = new T.TextureLoader().load("/assets/textures/kampus-banner.jpg");
  map.colorSpace = T.SRGBColorSpace;
  const banner = new T.Mesh(new T.PlaneGeometry(1.08,2.16),new T.MeshStandardMaterial({map,side:T.DoubleSide}));
  banner.position.set(1.9,1.56,front+1.91);
  builder.layers.visual.add(banner);
}
