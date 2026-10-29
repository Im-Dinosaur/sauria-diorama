import { useMemo } from 'react';
import { BufferGeometry,Float32BufferAttribute } from 'three';
import { Rod, Joint } from '../models/Primitives';
import { groundHeight } from '../world/terrain';
import { treeSites,rockSites,bushSites,carcass } from '../world/paths';
function Tree({x,z,s}:{x:number;z:number;s:number}){const y=groundHeight(x,z);return <group>
 <Rod a={[x,y,z]} b={[x+.06*s,y+1.2*s,z]} r={.09*s} r2={.02*s} color="#282b26"/>
 {[0,1,2].map(i=>{const a=i*2.4;return <group key={i}><Rod a={[x,y+.5*s,z]} b={[x+Math.cos(a)*s*.4,y+.88*s,z+Math.sin(a)*s*.4]} r={.035*s} r2={.015*s} color="#262c26"/><Rod a={[x+Math.cos(a)*s*.4,y+.88*s,z+Math.sin(a)*s*.4]} b={[x+Math.cos(a)*s*.47,y+1.1*s,z+Math.sin(a)*s*.47]} r={.02*s} r2={.004} color="#33372e"/><Rod a={[x,y+.1*s,z]} b={[x+Math.cos(a)*.22*s,groundHeight(x+Math.cos(a)*.22*s,z+Math.sin(a)*.22*s)+.013,z+Math.sin(a)*.22*s]} r={.035*s} r2={.012} color="#35362d"/></group>})}
 </group>}
function GroundRock({x,z,r,h}:{x:number;z:number;r:number;h:number}){const geometry=useMemo(()=>{const p:number[]=[];for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;const ax=x+Math.cos(a)*r,az=z+Math.sin(a)*r,bx=x+Math.cos(b)*r,bz=z+Math.sin(b)*r;p.push(ax,groundHeight(ax,az),az,bx,groundHeight(bx,bz),bz,x+.04,groundHeight(x,z)+h,z);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.computeVertexNormals();return g;},[x,z,r,h]);return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#737064" flatShading roughness={1}/></mesh>}
export function Props(){const {x,z,s}=carcass;return <group>
 {treeSites.map((p,i)=><Tree key={i} {...p}/>)}{rockSites.map((p,i)=><GroundRock key={i} {...p}/>)}
 {bushSites.map((p,i)=><group key={i}>{[0,1,2,3,4].map(j=>{const a=j*2.4;return <Rod key={j} a={[p.x,groundHeight(p.x,p.z),p.z]} b={[p.x+Math.cos(a)*p.s,groundHeight(p.x,p.z)+p.s*.8,p.z+Math.sin(a)*p.s]} r={.009} r2={.003} color="#34372e"/>})}</group>)}
 {Array.from({length:7},(_,i)=>{const xx=x+(i-3)*.12*s,yy=groundHeight(xx,z)+.06*s;return <group key={i}><Joint at={[xx,yy,z]} r={.065*s}/><Rod a={[xx-.06*s,yy,z]} b={[xx+.06*s,yy,z]} r={.035*s} color="#b8ad8b"/>{i<5&&[-1,1].map(side=><group key={side}><Rod a={[xx,yy,z]} b={[xx,yy+.18*s,z+side*.16*s]} r={.019*s} color="#b8ad8b"/><Rod a={[xx,yy+.18*s,z+side*.16*s]} b={[xx,groundHeight(xx,z+side*.27*s)+.024,z+side*.27*s]} r={.015*s} color="#b8ad8b"/></group>)}</group>})}
 <mesh position={[x+.48*s,groundHeight(x+.48*s,z)+.08*s,z]} scale={[.2*s,.11*s,.14*s]} castShadow><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#c2b28f" roughness={1} flatShading/></mesh>
 </group>}
