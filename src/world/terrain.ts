import { DIORAMA } from './layout';
export const GRID={minX:-DIORAMA.halfWidth+.15,minZ:-DIORAMA.halfDepth+.15,width:DIORAMA.width-.3,depth:DIORAMA.depth-.3,nx:78,nz:39};
export const VOLCANO={x:-6.7,z:-2.2,radius:1.42};
export function random(seed:number){const t=Math.sin(seed*127.1+311.7)*43758.5453;return t-Math.floor(t);}
export function rawHeight(x:number,z:number){
 const a=Math.atan2(z/4.35,(x+1.1)/7.8);
 // A broad, rounded shelf gives the larger machines room to walk.
 const d=Math.pow(Math.pow(Math.abs((x+1.1)/7.8),4)+Math.pow(Math.abs(z/4.35),4),.25)+.018*Math.sin(a*7)+.012*Math.sin(a*13);
 let h=d<.82?.38:Math.max(-.74,.38-(d-.82)*4.4);
 const r=Math.hypot(x-VOLCANO.x,z-VOLCANO.z),angle=Math.atan2(z-VOLCANO.z,x-VOLCANO.x);
 const rr=r*(1+.085*Math.sin(angle*7)+.04*Math.cos(angle*11));
 if(rr<1.42){const cone=.4+2.3*Math.pow(Math.max(0,1-(rr-.36)/1.06),1.22);const pit=2.15+rr*.8;h=Math.max(h,rr<.36?pit:cone);}
 if(d<.77&&r>1.5)h=.38;
 return Math.max(-.74,h);
}
// Barycentric interpolation uses the exact same triangles as the visible terrain.
export function groundHeight(x:number,z:number){
 const {minX,minZ,width,depth,nx,nz}=GRID,dx=width/nx,dz=depth/nz;
 const ix=Math.min(nx-1,Math.max(0,Math.floor((x-minX)/dx))),iz=Math.min(nz-1,Math.max(0,Math.floor((z-minZ)/dz)));
 const x0=minX+ix*dx,z0=minZ+iz*dz,u=(x-x0)/dx,v=(z-z0)/dz;
 const h00=rawHeight(x0,z0),h10=rawHeight(x0+dx,z0),h01=rawHeight(x0,z0+dz),h11=rawHeight(x0+dx,z0+dz);
 return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}
export const landmarks=[{x:6.35,z:-2.5,r:.34,h:1.35},{x:6.8,z:-2.28,r:.23,h:.83},{x:5.96,z:-2.4,r:.2,h:.62},{x:7.8,z:2.85,r:.32,h:.8},{x:7.36,z:3.12,r:.2,h:.51},{x:5.85,z:3.5,r:.23,h:.61}];
