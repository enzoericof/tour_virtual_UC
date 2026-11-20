/** Aceleraciones en m/s². El motor suma empuje: nunca reemplaza la velocidad de caída. */
export const JETPACK_PHYSICS = { gravity:18, thrust:30, drag:.025, maxStep:1/120 } as const;
export function jetpackVelocity(velocity:number,active:boolean,dt:number){
 const {gravity,thrust,drag}=JETPACK_PHYSICS;
 return velocity+((active?thrust:0)-gravity-drag*velocity*Math.abs(velocity))*dt;
}
