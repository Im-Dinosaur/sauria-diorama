import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group,Mesh,MeshBasicMaterial,InstancedMesh,Object3D } from 'three';
import { LivingDinosaur } from '../models/LivingDinosaur';
import { simulation,diagnostics } from '../config';
import { surfacingState } from '../world/lavaEvents';
import { LAVA_LEVEL } from '../world/lavaFlows';
import { random } from '../world/terrain';
export function LavaLife(){const body=useRef<Group>(null),ring=useRef<Mesh>(null),ringMat=useRef<MeshBasicMaterial>(null),droplets=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]);
 useFrame(()=>{const p=surfacingState(simulation.time),visible=p.visible&&simulation.surfaceLife;
 diagnostics.lavaLife={visible,age:p.age,site:p.site};
 if(body.current){body.current.visible=visible;body.current.position.set(p.x,p.y,p.z);body.current.rotation.set(p.pitch,p.heading,p.roll);}
 if(ring.current){ring.current.visible=visible;ring.current.position.set(p.x,LAVA_LEVEL+.012,p.z);const f=(Math.max(0,p.age)*1.6)%1;ring.current.scale.setScalar(.3+f*.52);if(ringMat.current)ringMat.current.opacity=(1-f)*.65;}
 if(droplets.current){for(let i=0;i<16;i++){const age=(Math.max(0,p.age)*1.25+i*.117)%1,a=i*Math.PI*2/16,r=.32+age*.42,y=LAVA_LEVEL+Math.sin(age*Math.PI)*(.16+random(i+74)*.3);
 dummy.position.set(p.x+Math.cos(a)*r,y,p.z+Math.sin(a)*r);dummy.rotation.set(i,age*5,0);dummy.scale.setScalar(visible&&p.age>1&&p.age<6.4?(.023+random(i+42)*.02)*(1-age):0);dummy.updateMatrix();droplets.current.setMatrixAt(i,dummy.matrix);}droplets.current.instanceMatrix.needsUpdate=true;}
 });
 return <group><group ref={body} visible={false} scale={.78}><LivingDinosaur/></group>
 <mesh ref={ring} visible={false} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.84,1,20]}/><meshBasicMaterial ref={ringMat} color="#ff9b35" transparent depthWrite={false}/></mesh>
 <instancedMesh ref={droplets} args={[undefined,undefined,16]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#ffae40" emissive="#ff6e09" emissiveIntensity={2.5} flatShading/></instancedMesh>
 </group>
}
