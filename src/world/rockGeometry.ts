import { BufferGeometry,Float32BufferAttribute } from 'three';
const noise=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export function fracturedSlab(seed:number){
 const positions:number[]=[],count=7,outline=Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2+(noise(seed*71+i)-.5)*.30,r=.75+noise(seed*29+i+17)*.32;return [Math.cos(a)*r,Math.sin(a)*r];});
 const point=(i:number,ring:number)=>{const p=outline[i%count],inset=ring===2?.78:ring===0?.90:1;return [p[0]*inset,ring===0?-.45:ring===1?.12:.38+noise(seed*137+i)*.13,p[1]*inset];};
 for(let i=0;i<count;i++){const j=(i+1)%count;for(let ring=0;ring<2;ring++)positions.push(...point(i,ring),...point(j,ring),...point(i,ring+1),...point(j,ring),...point(j,ring+1),...point(i,ring+1));positions.push(0,.45,0,...point(i,2),...point(j,2));}
 // Increasing angles in X/Z face down. Reverse every triangle so the top and walls face out.
 for(let i=0;i<positions.length;i+=9)for(let axis=0;axis<3;axis++){const v=positions[i+3+axis];positions[i+3+axis]=positions[i+6+axis];positions[i+6+axis]=v;}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
