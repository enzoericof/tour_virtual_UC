import * as T from "three";
import {Octree} from "three/addons/math/Octree.js";
import {catRoamingAreas,insideCatRoamingArea} from "../data/cat-roaming-area";
import {insidePolygon} from "../data/campus-geometry";
type Node={x:number;y:number;z:number;gx:number;gz:number;key:string};
class NodeQueue {
 private heap:{node:Node;score:number}[]=[];
 get length(){return this.heap.length;}
 push(node:Node,score:number){const item={node,score},h=this.heap;let i=h.length;h.push(item);while(i){const parent=(i-1)>>1;if(h[parent].score<=score)break;h[i]=h[parent];i=parent;}h[i]=item;}
 pop(){const h=this.heap,first=h[0].node,last=h.pop()!;if(h.length){let i=0;while(i*2+1<h.length){let child=i*2+1;if(child+1<h.length&&h[child+1].score<h[child].score)child++;if(h[child].score>=last.score)break;h[i]=h[child];i=child;}h[i]=last;}return first;}
}
/** Malla de paso inferida del piso real. Los destinos son aleatorios; la conexión es la más corta. */
export class CatNavigation {
 private links=new Map<string,Node[]>();private pools=new Map<string,Node[]>();private edges=new Map<string,boolean>();
 private destinations=new WeakMap<Node[],Node[][]>();
 readonly nodes:Node[]=[];private grid=new Map<string,Node>();private ray=new T.Ray(new T.Vector3(),new T.Vector3(0,-1,0));private sphere=new T.Sphere(new T.Vector3(),.18);
 constructor(private world:Octree){
  const points=catRoamingAreas.flat(),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  for(let gx=Math.floor(Math.min(...xs)*2);gx<=Math.ceil(Math.max(...xs)*2);gx++)for(let gz=Math.floor(Math.min(...zs)*2);gz<=Math.ceil(Math.max(...zs)*2);gz++){
   const x=gx*.5,z=gz*.5;if(!insideCatRoamingArea(x,z))continue;
   this.ray.origin.set(x,1.4,z);this.ray.direction.set(0,-1,0);const hit=world.rayIntersect(this.ray);if(!hit||hit.position.y<-.15||hit.position.y>1.2)continue;
   const y=hit.position.y+.015;
   let blocked=false;for(const h of [.37,.53]){this.sphere.center.set(x,y+h,z);if(world.sphereIntersect(this.sphere)){blocked=true;break;}}
   if(blocked)continue;const key=`${gx},${gz}`,node={x,y,z,gx,gz,key};this.grid.set(key,node);this.nodes.push(node);
  }
 }
 private neighbors(node:Node){
  const cached=this.links.get(node.key);if(cached)return cached;const result:Node[]=[];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const next=this.grid.get(`${node.gx+dx},${node.gz+dz}`);if(!next||Math.abs(next.y-node.y)>.4)continue;
   if(dx&&dz&&(!this.grid.has(`${node.gx+dx},${node.gz}`)||!this.grid.has(`${node.gx},${node.gz+dz}`)))continue;
   const key=node.key<next.key?`${node.key}:${next.key}`:`${next.key}:${node.key}`;
   let clear=this.edges.get(key);if(clear===undefined){clear=this.canTraverse(node,next)&&this.canTraverse(next,node);this.edges.set(key,clear);}
   if(clear)result.push(next);
  }
  this.links.set(node.key,result);return result;
 }
 private canTraverse(a:Node,b:Node){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),samples=Math.ceil(length/.1),sx=dx/length,sz=dz/length;
  let y=a.y;
  for(let i=1;i<=samples;i++){
   const x=a.x+dx*i/samples,z=a.z+dz*i/samples;if(!insideCatRoamingArea(x,z))return false;
   this.ray.origin.set(x,y+.28,z);this.ray.direction.set(0,-1,0);const floor=this.world.rayIntersect(this.ray);
   if(!floor||floor.distance>.6||Math.abs(floor.position.y+.015-y)>=.22)return false;y=floor.position.y+.015;
   // La misma envolvente y altura de paso que el gato animado: no planear a través de muebles ni peldaños altos.
   this.sphere.radius=.17;
   for(const offset of [-.16,0,.2])for(const h of [.36,.52]){
    this.sphere.center.set(x+sx*offset,y+h,z+sz*offset);if(this.world.sphereIntersect(this.sphere))return false;
   }
  }
  return Math.abs(y-b.y)<.03;
 }
 private pool(start:Node){
  const cached=this.pools.get(start.key);if(cached)return cached;
  const component=[start],seen=new Set([start.key]);
  for(let i=0;i<component.length;i++)for(const next of this.neighbors(component[i]))if(!seen.has(next.key)){seen.add(next.key);component.push(next);}
  for(const n of component)this.pools.set(n.key,component);return component;
 }
 nearest(position:T.Vector3){let best=this.nodes[0],distance=Infinity;for(const node of this.nodes){const d=(node.x-position.x)**2+(node.z-position.z)**2+4*(node.y-position.y)**2;if(d<distance){distance=d;best=node;}}return best;}
 path(position:T.Vector3,random:()=>number):T.Vector3[]{
  if(!this.nodes.length)return [];const start=this.nearest(position);
  const pool=this.pool(start);let zones=this.destinations.get(pool);
  if(!zones){zones=catRoamingAreas.slice(0,4).map(area=>pool.filter(n=>insidePolygon([n.x,n.z],area)));this.destinations.set(pool,zones);}
  for(let attempt=0;attempt<4;attempt++){
   const zone=zones[Math.floor(random()*zones.length)],choices=zone.length&&random()<.8?zone:pool;
   const goal=choices[Math.floor(random()*choices.length)],open=new NodeQueue(),cost=new Map([[start.key,0]]),previous=new Map<string,Node>(),closed=new Set<string>();
   const heuristic=(n:Node)=>Math.hypot(n.x-goal.x,n.z-goal.z);
   open.push(start,heuristic(start));
   while(open.length&&closed.size<this.nodes.length){
    const node=open.pop();if(closed.has(node.key))continue;
    if(node===goal){const route:T.Vector3[]=[];let at=node;while(at!==start){route.push(new T.Vector3(at.x,at.y,at.z));at=previous.get(at.key)!;}return route.reverse();}
    closed.add(node.key);
    for(const next of this.neighbors(node)){
     if(closed.has(next.key))continue;const length=Math.hypot(next.x-node.x,next.z-node.z);
     const score=cost.get(node.key)!+length+Math.abs(next.y-node.y)*.2;if(score>=(cost.get(next.key)??Infinity))continue;
     cost.set(next.key,score);previous.set(next.key,node);open.push(next,score+heuristic(next));
    }
   }
  }
  return [];
 }
}
