import * as T from "three";

/** Baldosines gastados compartidos por el acceso y toda la galería del LED. */
export function makeLedPassageTile() {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
  const c=canvas.getContext("2d")!,step=256/12;
  c.fillStyle="#73786a";c.fillRect(0,0,256,256);
  for(let y=0;y<12;y++)for(let x=0;x<12;x++) {
    const shade=146+(x*13+y*7)%19;
    c.fillStyle=`rgb(${shade+5},${shade+5},${shade-4})`;c.fillRect(x*step+1,y*step+1,step-2,step-2);
    c.strokeStyle="#73786945";c.lineWidth=.55;
    for(let j=4;j<step-2;j+=4){c.beginPath();c.moveTo(x*step+j,y*step+2);c.lineTo(x*step+j,y*step+step-2);c.stroke();}
  }
  for(let i=0;i<3500;i++){const n=Math.sin(i*127.1)*43758.54;c.fillStyle=i%2?"#ffffff12":"#31372718";c.fillRect((n-Math.floor(n))*256,(i*97)%256,1,1);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;
  const material=new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.004,roughness:.98});
  material.userData.tile=[1.2,1.2];material.name="Baldosines gastados del acceso y pasillo LED";return material;
}
