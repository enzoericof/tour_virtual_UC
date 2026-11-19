import * as T from "three";

/** Dos hojas que deslizan hacia lados opuestos al aproximarse desde cualquiera de los lados. */
export class EntranceDoors {
  readonly doors: {leaves:{object:T.Object3D;closedX:number;travel:number}[];barrier:T.Mesh;opening:number;near:boolean;center:T.Vector3}[]=[];
  constructor(root:T.Object3D) {
    const pivots=new Map<string,T.Object3D>(),barriers=new Map<string,T.Mesh>();
    root.updateMatrixWorld(true);
    root.traverse(o=>{
      if(o.userData.entranceDoorId)pivots.set(o.userData.entranceDoorId,o);
      if(o instanceof T.Mesh && o.userData.entranceDoorBarrierId)barriers.set(o.userData.entranceDoorBarrierId,o);
    });
    for(const [id,pivot] of pivots) {
      const barrier=barriers.get(id);if(!barrier)continue;
      const leaves:{object:T.Object3D;closedX:number;travel:number}[]=[];
      pivot.traverse(o=>{if(typeof o.userData.entranceDoorSlide === "number")
        leaves.push({object:o,closedX:o.position.x,travel:o.userData.entranceDoorSlide});});
      this.doors.push({leaves,barrier,opening:0,near:false,center:barrier.getWorldPosition(new T.Vector3())});
    }
  }
  register(walker:{addBarrier:(mesh:T.Mesh,blocked:()=>boolean)=>void}) {
    for(const door of this.doors)walker.addBarrier(door.barrier,()=>door.opening<.95);
  }
  update(dt:number,position:T.Vector3,walking=true) {
    for(const door of this.doors) {
      const distance=Math.hypot(position.x-door.center.x,position.z-door.center.z);
      const atDoorHeight=Math.abs(position.y-door.center.y)<2;
      door.near=walking && atDoorHeight && distance<(door.near?3.2:2.5);
      door.opening=T.MathUtils.damp(door.opening,door.near?1:0,9,dt);
      for(const leaf of door.leaves) {
        leaf.object.position.x=leaf.closedX+leaf.travel*door.opening;
        leaf.object.updateMatrixWorld(true);
      }
    }
  }
}
