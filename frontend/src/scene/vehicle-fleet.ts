import * as T from 'three';
import type { Walker } from '../navigation/walker';
import { MovingCollider } from '../navigation/moving-collider';
import { driveStep,wrapAngle,type VehiclePose } from '../navigation/vehicle-physics';
import { insidePolygon,layout } from '../data/campus-geometry';

export type VehicleState=VehiclePose&{id:string;driver:string|null;at:number};
type Car={id:string;visual:T.Group;collider:MovingCollider;state:VehicleState;target:VehicleState;wheels:T.Object3D[];steering?:T.Object3D;needle?:T.Object3D};
export class VehicleFleet {
  readonly cars:Car[]=[];
  private self='';
  private ignored='';
  private pending='';
  private pendingAt=0;
  private lastReceived=0;
  private lastSend=0;
  private previousYaw=0;
  private outside=false;
  private groundRay=new T.Ray(new T.Vector3(),new T.Vector3(0,-1,0));
  private sphere=new T.Sphere(new T.Vector3(),.19);
  private point=new T.Vector3();
  private eye=new T.Vector3();
  private entryReturn=new T.Vector3();
  private savedFov=52;
  private quat=new T.Quaternion();
  private scale=new T.Vector3(1,1,1);
  driving:Car|null=null;
  send:((command:Record<string,unknown>)=>void)|null=null;
  constructor(models:{id:string;visual:T.Group;solid:T.Group}[],private walker:Walker,private camera:T.PerspectiveCamera,private error:(s:string)=>void) {
    for(const model of models) {
      const collider=new MovingCollider(model.solid),yaw=new T.Euler().setFromQuaternion(model.visual.quaternion,'YXZ').y;
      const state={id:model.id,x:model.visual.position.x,y:model.visual.position.y,z:model.visual.position.z,yaw,speed:0,steer:0,driver:null,at:0};
      const wheels:T.Object3D[]=[];let steering:T.Object3D|undefined,needle:T.Object3D|undefined;
      model.visual.traverse(o=>{if(o.userData.wheel)wheels.push(o);if(o.userData.steering)steering=o;if(o.userData.speedNeedle)needle=o;});
      const car={...model,collider,state,target:{...state},wheels,steering,needle};this.cars.push(car);
      this.place(car);walker.addMoving(collider,()=>this.ignored!==car.id&&this.driving!==car);
    }
  }
  private command(command:Record<string,unknown>) {try{if(!this.send)throw Error('Esperá a conectarte al recorrido.');this.send(command);return true;}catch(e){this.error((e as Error).message);return false;}}
  receive(states:VehicleState[],self:string) {
    this.self=self;this.lastReceived=performance.now();
    for(const state of states) {
      const car=this.cars.find(c=>c.id===state.id);if(!car||![state.x,state.y,state.z,state.yaw,state.speed,state.steer].every(Number.isFinite))continue;
      const wasDriver=car.state.driver;car.target={...state};car.state.driver=state.driver;
      if(this.driving===car && state.driver!==self) {this.exit(true);this.error('Se liberó la camioneta. Volvé a subirte cuando haya conexión.');}
      if(this.pending===car.id && state.driver===self) {
        this.pending='';Object.assign(car.state,state);this.place(car);this.driving=car;
        this.previousYaw=state.yaw;this.outside=false;this.walker.frozen=true;
        this.savedFov=this.camera.fov;this.camera.fov=70;this.camera.updateProjectionMatrix();
        this.camera.position.copy(car.visual.localToWorld(this.eye.set(.03,1.60,-.46)));
        this.point.set(10,1.60,-.46);car.visual.localToWorld(this.point);this.camera.lookAt(this.point);
      } else if(state.driver===self&&this.driving!==car) this.command({type:'vehicle.release',id:car.id});
      if(this.pending===car.id&&state.driver&&state.driver!==self) {this.pending='';this.error('Esa camioneta ya está ocupada.');}
      if(!wasDriver&&state.driver&&this.driving!==car)Object.assign(car.state,state);
    }
  }
  disconnected() {this.pending='';this.exit(true,false);this.self='';this.lastReceived=0;}
  nearest() {
    if(this.driving||this.pending)return null;
    let best:Car|null=null,distance=3.0;
    for(const car of this.cars) {
      if(car.state.driver)continue;
      const d=this.camera.position.distanceTo(car.visual.localToWorld(this.point.set(.05,1.5,-1.35)));
      if(d<distance){
        const ray=new T.Ray(this.camera.position.clone(),this.point.clone().sub(this.camera.position).normalize());
        this.ignored=car.id;const clear=!this.walker.obstructs(ray,d);this.ignored='';
        if(clear){best=car;distance=d;}
      }
    }
    return best;
  }
  enter() {
    const car=this.nearest();if(!car)return;
    this.entryReturn.copy(this.walker.body.end).y-=1.5;
    this.pending=car.id;this.pendingAt=performance.now();
    if(!this.command({type:'vehicle.claim',id:car.id}))this.pending='';
  }
  toggleCamera(){if(this.driving)this.outside=!this.outside;}
  exit(force=false,notify=true) {
    if(this.pending){const id=this.pending;this.pending='';if(notify)this.command({type:'vehicle.release',id});}
    const car=this.driving;if(!car)return true;
    if(!force&&Math.abs(car.state.speed)>1){this.error('Frená la camioneta antes de bajarte.');return false;}
    let destination:T.Vector3|null=null;
    // Ambos laterales y la parte trasera; nunca se expulsa al jugador dentro de una pared.
    for(const [x,z]of [[.1,-1.9],[.1,1.9],[-3.3,-1.8],[-3.3,1.8],[-3.55,0],[3.55,0]]) {
      const point=car.visual.localToWorld(new T.Vector3(x,0,z));const y=this.floor(point.x,point.z,car.state.y);
      if(!Number.isFinite(y)||!insidePolygon([point.x,point.z],layout.boundary))continue;
      point.y=y+.04;if(this.walker.canStandAt(point)){destination=point;break;}
    }
    if(!destination&&!force){this.error('No hay espacio para bajar. Mové la camioneta a un lugar abierto.');return false;}
    car.state.speed=0;
    this.driving=null;this.walker.frozen=false;this.outside=false;
    this.camera.fov=this.savedFov;this.camera.updateProjectionMatrix();
    this.walker.teleport(destination??this.entryReturn);
    if(notify){this.command({type:'vehicle.update',...car.state});this.command({type:'vehicle.release',id:car.id});}
    return true;
  }
  private floor(x:number,z:number,y:number) {
    this.groundRay.origin.set(x,y+.8,z);this.ignored=this.driving?.id??'';
    const distance=this.walker.rayDistance(this.groundRay,2.5);this.ignored='';
    return distance>=2.5?NaN:y+.8-distance;
  }
  private blocked(state:VehiclePose) {
    const c=Math.cos(state.yaw),s=Math.sin(state.yaw);
    for(const x of[-2.55,0,2.55])for(const z of[-1.07,1.07]) {
      const px=state.x+c*x+s*z,pz=state.z-s*x+c*z;
      if(!insidePolygon([px,pz],layout.boundary))return true;
    }
    // Carrocería, neumáticos y cabina. Los apoyos verticales del suelo no bloquean el avance.
    for(const [x,y,z,r]of BODY_SAMPLES) {
      this.sphere.center.set(state.x+c*x+s*z,state.y+y,state.z-s*x+c*z);this.sphere.radius=r;
      const hit=this.walker.sphereCollision(this.sphere);
      if(hit&&hit.depth>.008&&hit.normal.y<.72)return true;
    }
    return false;
  }
  private place(car:Car) {
    const s=car.state;car.visual.position.set(s.x,s.y,s.z);car.visual.rotation.set(0,s.yaw,0);car.visual.updateMatrixWorld(true);car.collider.setMatrix(car.visual.matrixWorld);
  }
  update(dt:number,now=performance.now()) {
    if(this.pending&&now-this.pendingAt>5000){this.command({type:'vehicle.release',id:this.pending});this.pending='';this.error('No se pudo reservar la camioneta. Reintentá.');}
    for(const car of this.cars) {
      if(car!==this.driving) {
        const a=1-Math.exp(-12*dt),s=car.state,t=car.target;
        s.x+=(t.x-s.x)*a;s.y+=(t.y-s.y)*a;s.z+=(t.z-s.z)*a;s.yaw=wrapAngle(s.yaw+wrapAngle(t.yaw-s.yaw)*a);s.speed=t.speed;s.steer=t.steer;
      }else {
        const s=car.state,active=this.walker.active&&now-this.lastReceived<2500;
        const key=(a:string,b:string)=>this.walker.pressed(a)||this.walker.pressed(b);
        if(!active)s.speed=0;
        else driveStep(s,{throttle:Number(key('KeyW','ArrowUp'))-Number(key('KeyS','ArrowDown')),steering:Number(key('KeyA','ArrowLeft'))-Number(key('KeyD','ArrowRight')),brake:this.walker.pressed('Space')},dt,p=>this.blocked(p),(x,z)=>this.floor(x,z,s.y));
        if(now-this.lastSend>100){this.lastSend=now;this.command({type:'vehicle.update',...s});}
        if(now-this.lastReceived>6500){this.disconnected();this.error('Se pausó el manejo al perder la conexión.');}
      }
      this.place(car);
      for(const wheel of car.wheels){wheel.rotation.y=wheel.userData.front?car.state.steer:0;wheel.rotation.z-=car.state.speed*dt/.44;}
      if(car.steering)car.steering.rotation.x=-car.state.steer*2.8;
      if(car.needle)car.needle.rotation.x=-2.2+Math.abs(car.state.speed)/34*3.5;
    }
    const car=this.driving;if(!car)return;
    const delta=wrapAngle(car.state.yaw-this.previousYaw);this.previousYaw=car.state.yaw;
    if(this.outside) {
      const from=car.visual.localToWorld(this.eye.set(-7.5,3.6,0)),to=car.visual.localToWorld(this.point.set(.5,1.1,0));
      const ray=new T.Ray(to.clone(),from.clone().sub(to).normalize()),distance=from.distanceTo(to);
      const clear=this.walker.rayDistance(ray,distance);this.camera.position.copy(to).addScaledVector(ray.direction,Math.max(.4,clear-.25));this.camera.lookAt(to);
    } else {
      this.camera.quaternion.premultiply(this.quat.setFromAxisAngle(UP,delta));
      this.camera.position.copy(car.visual.localToWorld(this.eye.set(.03,1.60,-.46)));
    }
  }
  hint() {return this.driving?`${Math.round(Math.abs(this.driving.state.speed)*3.6)} km/h   ${this.driving.state.speed<-.1?'R':'D'}\nW / S  Acelerar y frenar   A / D  Girar\nEspacio  Freno   F  Bajarse   V  Cámara`:this.pending?'Reservando camioneta…':this.nearest()?'F  Subir a Ranger Raptor':'';}
  drivers(){return new Set(this.cars.map(c=>c.state.driver).filter((id):id is string=>Boolean(id)));}
}
const UP=new T.Vector3(0,1,0);
const BODY_SAMPLES:number[][]=[];
for(let x=-2.5;x<=2.51;x+=.4)for(const z of[-.94,.94])BODY_SAMPLES.push([x,.90,z,.2]);
for(const x of[-1.65,1.65])for(const z of[-1.03,1.03])BODY_SAMPLES.push([x,.43,z,.40]);
for(const x of[-.8,0,.7])for(const z of[-.7,.7])BODY_SAMPLES.push([x,1.68,z,.24]);

for(const x of[-2.55,2.55])for(let z=-.8;z<=.81;z+=.32)BODY_SAMPLES.push([x,.88,z,.21]);
