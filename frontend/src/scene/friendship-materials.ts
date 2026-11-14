import * as T from "three";

/** Acabados interpretados de las fotos de la Plaza de la Amistad del 14/11. */
export function friendshipMaterial(kind: "tile" | "soil" | "round" | "blue") {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!;
  const noise = (n: number) => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };
  c.fillStyle = kind === "soil" ? "#78644e" : kind === "blue" ? "#1269a1" : "#827e70";
  c.fillRect(0, 0, 512, 512);
  if (kind === "tile") for (let y=0;y<4;y++) for(let x=0;x<4;x++) {
    const t=163+Math.floor(noise(y*4+x)*24);
    c.fillStyle=`rgb(${t},${t-8},${t-25})`; c.fillRect(x*128+2,y*128+2,124,124);
  }
  if (kind === "round") for(let y=0;y<8;y++) for(let x=0;x<8;x++) {
    const t=146+Math.floor(noise(y*8+x)*35);
    c.fillStyle=`rgb(${t},${t-5},${t-18})`;
    c.beginPath();c.arc(x*64+32,y*64+32,29,0,Math.PI*2);c.fill();
    c.strokeStyle="#d4c6ac55";c.lineWidth=2;c.stroke();
  }
  for(let i=0;i<24000;i++) {
    c.fillStyle=i%2 ? "#ffffff13" : "#231c171c";
    const size=kind==="soil"?1+noise(i+80)*3:1;
    c.fillRect(noise(i)*512,noise(i+45000)*512,size,size);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;
  const material=new T.MeshStandardMaterial({map,roughness:kind==="blue"?.65:1,metalness:kind==="blue"?.25:0});
  material.userData.tile=kind==="round"?[1.6,1.6]:[1.6,1.6];
  return material;
}

export function friendshipSign() {
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=640;
  const c=canvas.getContext("2d")!;
  c.fillStyle="#237ca6";c.fillRect(0,0,512,640);
  c.fillStyle="#142b5d";c.fillRect(0,0,512,170);
  c.fillStyle="#ffffff";c.font="72px Arial";c.fillText("CT",28,96);
  c.font="20px Arial";c.fillText("FACULTAD DE",180,65);c.fillText("CIENCIAS Y",180,94);c.fillText("TECNOLOGÍA",180,123);
  c.font="bold 24px Arial";c.fillText("PLAZA DE LA AMISTAD",25,220);
  const rows=["Laboratorio de Física","Electrónica Digital","Electrónica Analógica","Laboratorio de Materiales","Laboratorio de Aguas"];
  c.font="22px Arial";
  rows.forEach((text,i)=>{c.fillText(text,25,290+i*65,420);c.fillText("➜",462,290+i*65);});
  c.fillRect(20,615,472,4);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  return new T.MeshStandardMaterial({map,roughness:.75,side:T.DoubleSide});
}
