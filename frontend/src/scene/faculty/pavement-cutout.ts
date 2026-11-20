import { ShapeUtils, Vector2 } from "three";
import type { Vec2 } from "../../data/faculty-blueprint";

const area = (p: readonly Vec2[]) => p.reduce((sum,a,i)=>{
  const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];
},0)/2;

/** Resta un recinto convexo al pavimento: la misma abertura para acabado y colisión.
 * Triangular primero permite recortar también explanadas cóncavas sin unir islas. */
export function pavementOutside(outline: readonly Vec2[], room: readonly Vec2[]): Vec2[][] {
  const bounds=(p:readonly Vec2[])=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),
    Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
  const a=bounds(outline),b=bounds(room);
  if(a[2]<=b[0]||a[0]>=b[2]||a[3]<=b[1]||a[1]>=b[3]) return [[...outline]];
  const sign=Math.sign(area(room));
  const result:Vec2[][]=[];
  for(const indices of ShapeUtils.triangulateShape(outline.map(([x,z])=>new Vector2(x,z)),[])) {
    let remaining:Vec2[]=indices.map(i=>outline[i]);
    for(let i=0;i<room.length && remaining.length>=3;i++) {
      const a=room[i], b=room[(i+1)%room.length];
      const side=(p:Vec2)=>sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
      const split=(inside:boolean)=>{
        const out:Vec2[]=[];
        for(let j=0;j<remaining.length;j++) {
          const p=remaining[j],q=remaining[(j+1)%remaining.length],dp=side(p),dq=side(q);
          const keepP=inside?dp>=0:dp<=0,keepQ=inside?dq>=0:dq<=0;
          if(keepP)out.push(p);
          if(keepP!==keepQ) {
            const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);
          }
        }
        return out.filter((p,i)=>i===0||Math.hypot(p[0]-out[i-1][0],p[1]-out[i-1][1])>1e-8);
      };
      const outside=split(false);
      if(outside.length>=3 && Math.abs(area(outside))>1e-7)result.push(outside);
      remaining=split(true);
    }
  }
  return result;
}
