import * as T from "three";
import { annexPoint, facultyAnnexes } from "../../data/faculty-annexes";
import type { Rect } from "../../data/faculty-blueprint";
import type { FacultyBuilder } from "./builder";
import { addDeiPerimeterWalk } from "./dei-perimeter-walk";
import { addOfficeCourtyardWalk, addOfficeCourtyardAwnings } from './office-courtyard-walk';
import {addOfficeEndRestrooms} from './office-courtyard-access';

const officeIds = new Set(["led", "da-cap", "das", "dg"]);
export const isOfficeAnnex = (id: string) => officeIds.has(id);

/** Cubierta continua de tejas del bloque de oficinas, seg�n la vista a�rea. */
export function addOfficeRoof(builder: FacultyBuilder, brick: T.MeshStandardMaterial, paving:T.MeshStandardMaterial) {
  const offices = facultyAnnexes.filter(a => isOfficeAnnex(a.id));
  const min = Math.min(...offices.map(a => a.mapCenter[1] - a.rect.size[0] / 2));
  const max = Math.max(...offices.map(a => a.mapCenter[1] + a.rect.size[0] / 2));
  const rect: Rect = {
    center: annexPoint(offices[0].mapCenter[0], (min + max) / 2),
    size: [max - min, 9.2], angle: offices[0].rect.angle,
  };
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ab6547"; ctx.fillRect(0, 0, 256, 256);
  // Ocho canales y cuatro hiladas por repetici�n; una sola textura compartida.
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
    const x = col * 32, y = row * 64;
    const gradient = ctx.createLinearGradient(x, y, x + 32, y);
    const shade = (row * 7 + col * 3) % 5;
    gradient.addColorStop(0, "#754632");
    gradient.addColorStop(.28, ["#c17c56", "#ce8961", "#b87550", "#c48259", "#ba7451"][shade]);
    gradient.addColorStop(.65, "#d5996f"); gradient.addColorStop(1, "#8d5038");
    ctx.fillStyle = gradient; ctx.fillRect(x, y, 32, 64);
    ctx.fillStyle = "#784632"; ctx.fillRect(x, y + 61, 32, 3);
    ctx.fillStyle = "#d59a75"; ctx.fillRect(x + 3, y + 58, 26, 2);
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  const tiles = new T.MeshStandardMaterial({ map, roughness: .94 });
  tiles.userData.tile = [1.6, 1.44];
  const clay = new T.MeshStandardMaterial({ color: "#ad6848", roughness: .94 });
  const { frame, box, slopedWall, beam, v3, layers } = builder;
  frame(rect, () => {
    layers.visual.name = "office-tiled-roof";
    const eave = 3.7, half = rect.size[1] / 2, rise = 1.45, overhang = .32;
    const pitch = Math.atan2(rise, half), run = half + overhang;
    const roofRise = run * Math.tan(pitch), ridge = eave + rise;
    for (const side of [-1, 1]) {
      box(rect.size[0] + overhang * 2, .12, Math.hypot(run, roofRise),
        0, ridge - roofRise / 2, side * run / 2, tiles, true, { pitch: side * pitch });
      box(rect.size[0] + overhang * 2, .16, .08,
        0, ridge - roofRise - .06, side * run, clay);
    }
    for (const x of [-rect.size[0] / 2, rect.size[0] / 2]) {
      slopedWall(x, -half, 0, eave, ridge, eave, brick);
      slopedWall(x, 0, half, ridge, eave, eave, brick);
    }
    beam(v3(-rect.size[0] / 2 - overhang, ridge + .06, 0),
      v3(rect.size[0] / 2 + overhang, ridge + .06, 0), .14, clay);
  });
  addDeiPerimeterWalk(builder,tiles,brick,paving);
  addOfficeCourtyardWalk(builder,tiles,brick,paving);
  addOfficeEndRestrooms(builder,brick,paving,tiles);
  addOfficeCourtyardAwnings(builder,tiles);
  // El cascarón es continuo también en las juntas de 10 y 40 cm entre módulos.
  const dei=facultyAnnexes.find(b=>b.id==='dei-led')!,ordered=[...offices].sort((a,b)=>a.mapCenter[1]-b.mapCenter[1]);
  frame(dei.rect,()=>{
    const centerX=ordered[0].mapCenter[0]-dei.mapCenter[0];
    for(let i=1;i<ordered.length;i++) {
      const start=ordered[i-1].mapCenter[1]-dei.mapCenter[1]+ordered[i-1].rect.size[0]/2;
      const end=ordered[i].mapCenter[1]-dei.mapCenter[1]-ordered[i].rect.size[0]/2;
      if(end-start<.001)continue;
      for(const side of[-1,1])box(.20,3.7,end-start,centerX+side*4.6,1.85,(start+end)/2,brick,true);
    }
  });
}

