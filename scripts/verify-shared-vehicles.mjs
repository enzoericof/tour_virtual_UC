// Solo con dos instancias de prueba (18086/18087) y PostgreSQL desechable.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {WebSocket} from '../frontend/node_modules/ws/wrapper.mjs';
assert.equal(process.env.PRESENCE_TEST_DB,'jdbc:postgresql://127.0.0.1:55433/tour_fluidity','Usá exclusivamente la base desechable documentada.');
const origin='http://127.0.0.1:5174',clients=[],timers=[];
async function auth(c,path,body){
  const r=await fetch(c.server+'/api/auth/'+path,{method:body?'POST':'GET',headers:{Cookie:c.cookie??'',...(c.csrf?{[c.csrf.headerName]:c.csrf.token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body&&JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  const cookie=r.headers.getSetCookie().find(v=>v.startsWith('JSESSIONID='));if(cookie)c.cookie=cookie.split(';')[0];
  assert.ok(r.ok,`${path}: ${r.status}`);return r.status===204?null:r.json();
}
async function connect(index){
  const c={server:`http://127.0.0.1:${18086+index%2}`,pose:{x:84.086935,y:0,z:-119.05111,yaw:0,walking:false}};clients.push(c);
  c.csrf=await auth(c,'csrf');const credentials={nombre:'Raptor',apellido:'Prueba',correo:randomUUID()+'@example.test',password:randomUUID(),carrera:1};
  await auth(c,'registro',credentials);await auth(c,'login',credentials);
  c.ws=new WebSocket(c.server.replace('http:','ws:')+'/ws/presence',{headers:{Cookie:c.cookie,Origin:origin}});
  c.ws.on('message',bytes=>{const data=JSON.parse(bytes);if(data.admitted)c.ws.send(JSON.stringify(c.pose));if(data.players&&data.vehicles)c.snapshot=data;});
  await new Promise((resolve,reject)=>{c.ws.once('open',resolve);c.ws.once('error',reject);});c.ws.send('join');
  timers.push(setInterval(()=>{if(c.ws.readyState===WebSocket.OPEN)c.ws.send(JSON.stringify(c.pose));},250));
  await until(()=>c.snapshot?.players.some(p=>p.id===c.snapshot.self),'Admisión y primera pose');return c;
}
async function until(condition,label){const end=Date.now()+12000;while(!condition()){assert.ok(Date.now()<end,label);await new Promise(r=>setTimeout(r,50));}}
const car=c=>c.snapshot?.vehicles.find(v=>v.id==='raptor-0');
const send=(c,command)=>c.ws.send(JSON.stringify(command));
try{
  const a=await connect(0),b=await connect(1),initial={...car(a)};
  for(const c of[a,b]){c.pose.x=initial.x;c.pose.z=initial.z;send(c,c.pose);}
  await new Promise(r=>setTimeout(r,500));
  send(a,{type:'vehicle.claim',id:initial.id});send(b,{type:'vehicle.claim',id:initial.id});
  await until(()=>car(a)?.driver&&car(a)?.driver===car(b)?.driver,'Reserva atómica entre servidores');
  const owner=car(a).driver===a.snapshot.self?a:b,other=owner===a?b:a;
  let parked;
  for(let i=1;i<=10;i++){
    parked={...initial,x:initial.x+i*.35,z:initial.z+i*.1,speed:3,steer:.1};
    Object.assign(owner.pose,{x:parked.x,z:parked.z});send(owner,{type:'vehicle.update',...parked});await new Promise(r=>setTimeout(r,120));
  }
  await until(()=>Math.abs(car(other).x-parked.x)<.01,'El observador recibe la marcha');
  send(other,{type:'vehicle.update',...parked,x:parked.x+2});await new Promise(r=>setTimeout(r,350));assert.equal(car(owner).x,parked.x,'Un rival no mueve la camioneta ocupada');
  send(owner,{type:'vehicle.update',...parked,speed:0});send(owner,{type:'vehicle.release',id:initial.id});
  await until(()=>car(other).driver===null,'Liberación al estacionar');
  const late=await connect(2);await until(()=>Math.abs(car(late).x-parked.x)<.01&&car(late).driver===null,'Un nuevo visitante ve la posición estacionada');
  send(owner,{type:'vehicle.claim',id:initial.id});await until(()=>car(other).driver===owner.snapshot.self,'Segunda reserva');
  owner.ws.close();await until(()=>car(other).driver===null,'Desconectarse libera la reserva y conserva la posición');
  assert.equal(car(other).x,parked.x);
  console.log('Correcto: dos servidores, reserva única, marcha compartida, rechazo de movimiento ajeno, estacionamiento durable, ingreso tardío y liberación al desconectarse.');
}finally{for(const timer of timers)clearInterval(timer);for(const c of clients)if(c.ws?.readyState===WebSocket.OPEN){c.ws.send('leave');c.ws.close();}}
