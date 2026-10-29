import { CatmullRomCurve3,Vector3 } from 'three';
import { groundHeight } from './terrain';
export const LAVA_LEVEL=.116;
const definitions=[
 {width:.14,points:[[-3.4,-.86],[-3.25,-.75],[-2.91,-.38],[-2.5,-.02],[-2.08,.25],[-1.74,.8],[-1.4,1.42],[-.96,1.93],[-.52,2.4],[-.3,2.62]]},
 {width:.095,points:[[-3.55,-1.32],[-3.48,-1.52],[-3.24,-1.94],[-2.95,-2.22],[-2.7,-2.58]]},
];
export const lavaFlows=definitions.map(d=>({width:d.width,curve:new CatmullRomCurve3(d.points.map(([x,z])=>new Vector3(x,0,z)),false,'centripetal')}));
export function flowPoint(index:number,t:number,side=0){
 const f=lavaFlows[index],p=f.curve.getPointAt(t),tangent=f.curve.getTangentAt(t);
 const width=f.width*(1+.12*Math.sin(t*43)+.16*Math.sin(t*19))*(1+Math.max(0,t-.8)*3);
 const x=p.x-tangent.z*side*width,z=p.z+tangent.x*side*width;
 return {x,z,y:Math.max(LAVA_LEVEL,groundHeight(x,z))+.022,width};
}
