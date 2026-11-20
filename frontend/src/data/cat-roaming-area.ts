import {facultyBlueprint as p,cantinaForecourt,rectCorners,fromRect,type Vec2} from "./faculty-blueprint";
import {facultyToWorld,insidePolygon} from "./campus-geometry";
function strip(a:Vec2,b:Vec2,width=2):Vec2[]{const l=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/l,dz=(b[1]-a[1])/l,nx=-dz*width/2,nz=dx*width/2;return [[a[0]+nx-dx*.2,a[1]+nz-dz*.2],[b[0]+nx+dx*.2,b[1]+nz+dz*.2],[b[0]-nx+dx*.2,b[1]-nz+dz*.2],[a[0]-nx-dx*.2,a[1]-nz-dz*.2]];}
const [a,b]=p.coveredWalk,j=p.blockGAwning.junction,dx=b[0]-a[0],dz=b[1]-a[1];
const t=((j[0]-a[0])*dx+(j[1]-a[1])*dz)/(dx*dx+dz*dz),branch:Vec2=[a[0]+dx*t,a[1]+dz*t];
// Los cuatro puntos del acceso son controles Bézier, no esquinas del caminero.
const [bend,guide,tangent,merge]=p.plazaGallery.approach.bend;
const approach=[p.plazaGallery.approach.start,...Array.from({length:17},(_,i):Vec2=>{
 const t=i/16,s=1-t,coordinate=(k:0|1)=>s*s*s*bend[k]+3*s*s*t*guide[k]+3*s*t*t*tangent[k]+t*t*t*merge[k];return [coordinate(0),coordinate(1)];
})];
// Patio interior entre las galerías: permite cruzar directamente entre ambos bloques.
const courtyard=[fromRect(p.main,[-p.main.size[0]/2,p.main.size[1]/2]),fromRect(p.main,[p.main.size[0]/2,p.main.size[1]/2]),
 fromRect(p.block2,[p.block2.size[0]/2,-p.block2.size[1]/2]),fromRect(p.block2,[-p.block2.size[0]/2,-p.block2.size[1]/2])];
/** Planta baja y conexiones directas existentes: quedan fuera jardines y senderos perimetrales. */
export const catRoamingAreas=[rectCorners(p.main),rectCorners(p.block2),rectCorners(p.coveredPlaza),rectCorners(p.cantina),
 courtyard,p.openPlaza,p.plazaGallery.outline,p.elevatorLanding,p.platform[0],p.platform[4],p.platform[6],
 cantinaForecourt.outline.map(q=>fromRect(p.cantina,q)),
 ...approach.slice(1).map((q,i)=>strip(approach[i],q)),strip(a,branch,2),strip(branch,p.blockGAwning.end,2)]
 .map(poly=>poly.map(([x,z])=>{const q=facultyToWorld([x,0,z]);return [q[0],q[2]] as Vec2;}));
const bounds=catRoamingAreas.map(poly=>({minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))}));
export const insideCatRoamingArea=(x:number,z:number)=>catRoamingAreas.some((poly,i)=>{
 const b=bounds[i];return x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&insidePolygon([x,z],poly);
});
