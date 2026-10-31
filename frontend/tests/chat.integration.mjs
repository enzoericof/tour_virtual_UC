// Run against a disposable local instance: node tests/chat.integration.mjs.
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {Client} from '@stomp/stompjs';
const base=process.env.TEST_BASE_URL??'http://127.0.0.1:8080';
const origin=process.env.TEST_ORIGIN??'http://127.0.0.1:5173';
async function session(name){
 let cookie='';let csrf;
 async function call(route,method='GET',body){const r=await fetch(base+'/api/v1'+route,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const c=r.headers.getSetCookie();if(c.length)cookie=c.map(v=>v.split(';')[0]).join('; ');assert.ok(r.ok,`${route}: ${r.status} ${r.ok?'':await r.text()}`);return r.status===204?null:r.json();}
 csrf=await call('/auth/csrf');const email=`${name}-${Date.now()}@example.test`;const password='synthetic-test-only-password';await call('/auth/register','POST',{name,email,password});await call('/auth/login','POST',{email,password});csrf=await call('/auth/csrf');return {call,csrf,cookie,name};
}
const a=await session('Prueba-A'),b=await session('Prueba-B');const received=[];const clients=[];
function connect(s){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('WebSocket timed out')),10000);const c=new Client({webSocketFactory:()=>new WebSocket(base.replace('http','ws')+'/ws',{headers:{Cookie:s.cookie,Origin:origin}}),connectHeaders:{[s.csrf.headerName]:s.csrf.token},reconnectDelay:0});clients.push(c);c.onStompError=f=>{clearTimeout(timer);reject(new Error(f.headers.message));};c.onWebSocketError=e=>{clearTimeout(timer);reject(new Error(String(e.message)));};c.onConnect=()=>{c.subscribe('/topic/campus',m=>received.push({client:s.name,message:JSON.parse(m.body)}));clearTimeout(timer);resolve(c);};c.activate();});}
try{const ca=await connect(a);await connect(b);await new Promise(r=>setTimeout(r,150));ca.publish({destination:'/app/chat',body:JSON.stringify({text:'Mensaje de prueba de integración'})});const deadline=Date.now()+5000;while(received.length<2&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));assert.equal(received.length,2);assert.ok(received.every(x=>x.message.name==='Prueba-A'&&x.message.text==='Mensaje de prueba de integración'));console.log('PASS: dos sesiones autenticadas reciben el mensaje STOMP con identidad del servidor.');}finally{await Promise.all(clients.map(c=>c.deactivate()));await a.call('/auth/logout','POST');await b.call('/auth/logout','POST');}
