import { AnimationMixer,Box3,Vector3,SkinnedMesh,Quaternion } from 'three';
import { loadMapModel } from './load-map-model';
const gltf=await loadMapModel(),scene=gltf.scene,mixer=new AnimationMixer(scene);
scene.scale.setScalar(.82);scene.position.z=.23;
console.log('clips',gltf.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})));
for(const clip of gltf.animations.filter(c=>c.name==='reference')){
 mixer.clipAction(clip).play();mixer.setTime(0);scene.updateMatrixWorld(true);console.log('bounds',new Box3().setFromObject(scene).min,new Box3().setFromObject(scene).max);
 scene.traverse(b=>{if(b.type==='Bone'&&/pelvis|spine|neck|head|jaw|thigh|shin|metatarsus|toeII01/.test(b.name))console.log(JSON.stringify({name:b.name,parent:b.parent?.name,p:b.getWorldPosition(new Vector3()).toArray(),local:b.position.toArray(),q:b.quaternion.toArray()}));});
 scene.traverse(o=>{if(o instanceof SkinnedMesh){const points=[];for(let i=0;i<o.geometry.attributes.position.count;i++){const p=new Vector3().fromBufferAttribute(o.geometry.attributes.position,i);o.applyBoneTransform(i,p);p.applyMatrix4(o.matrixWorld);points.push(p);}points.sort((a,b)=>b.z-a.z);console.log(o.name,new Box3().setFromPoints(points),points.slice(0,3));}});
 console.log('head world quaternion',scene.getObjectByName('DEF-head')!.getWorldQuaternion(new Quaternion()));
}
