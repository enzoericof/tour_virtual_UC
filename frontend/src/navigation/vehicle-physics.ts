/** Metros, segundos y radianes. Modelo de bicicleta con inercia y frenado. */
export type VehiclePose = { x:number; y:number; z:number; yaw:number; speed:number; steer:number };
export type DriveInput = { throttle:number; steering:number; brake:boolean };
export const RAPTOR = { length:5.52, width:2.4, wheelbase:3.3, acceleration:7.4, maxSpeed:34, reverse:7 };
export const wrapAngle=(angle:number)=>Math.atan2(Math.sin(angle),Math.cos(angle));
export function driveStep(state:VehiclePose,input:DriveInput,dt:number,
  blocked:(next:VehiclePose)=>boolean=()=>false, ground:(x:number,z:number)=>number=()=>state.y) {
  // Pasos cortos incluso a máxima velocidad: no salta paredes delgadas.
  const steps=Math.max(1,Math.ceil(dt/Math.min(1/120,.10/(Math.abs(state.speed)+1)))),h=dt/steps;
  for(let i=0;i<steps;i++) {
    let acceleration=0;
    if(input.brake) acceleration=-Math.sign(state.speed)*23;
    else if(input.throttle && state.speed*input.throttle<-.3) acceleration=input.throttle*16;
    else acceleration=input.throttle*RAPTOR.acceleration;
    let speed=state.speed+acceleration*h;
    if(input.brake && speed*state.speed<0)speed=0;
    speed*=Math.exp(-(input.throttle?.045:.6)*h);
    speed=Math.max(-RAPTOR.reverse,Math.min(RAPTOR.maxSpeed,speed));
    if(Math.abs(speed)<.015)speed=0;
    const target=input.steering*(.57/(1+Math.abs(speed)/16));
    const steer=state.steer+(target-state.steer)*(1-Math.exp(-8*h));
    const yaw=wrapAngle(state.yaw+speed/RAPTOR.wheelbase*Math.tan(steer)*h);
    const x=state.x+Math.cos(yaw)*speed*h,z=state.z-Math.sin(yaw)*speed*h;
    const floor=ground(x,z),y=Number.isFinite(floor)?floor:state.y;
    const next={x,y,z,yaw,speed,steer};
    if(!Number.isFinite(floor)||Math.abs(y-state.y)>.24||blocked(next)) {
      state.speed=0;state.steer=steer;break;
    }
    Object.assign(state,next);
  }
}
