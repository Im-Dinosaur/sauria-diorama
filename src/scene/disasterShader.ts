import {DIORAMA} from '../world/layout';
import {MOUNTAIN} from '../world/habitat';
/** A north-to-south frost front, or heat radiating from the volcano. */
export const disasterCoverageGLSL=`
 uniform float uDisasterProgress;uniform int uDisasterKind;
 float disasterCoverage(vec3 p){
  float front=uDisasterKind==1?(p.z/${DIORAMA.depth.toFixed(8)}+.5):length(p.xz-vec2(${MOUNTAIN.x.toFixed(8)},${MOUNTAIN.z.toFixed(8)}))/${DIORAMA.width.toFixed(8)};
  return smoothstep(0.,.2,uDisasterProgress*1.3-front);
 }
`;
