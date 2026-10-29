import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three';

// Keep the polished cut walls, but never put a reflective lid above the lava.
export function createResinShell(width:number,height:number,depth:number){
 const indexedBox=new BoxGeometry(width,height,depth),box=indexedBox.toNonIndexed();
 indexedBox.dispose();
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
 const p=box.getAttribute('position'),n=box.getAttribute('normal'),uv=box.getAttribute('uv');
 for(let i=0;i<p.count;i+=3){
  if(n.getY(i)>.9)continue;
  for(let j=i;j<i+3;j++){
   positions.push(p.getX(j),p.getY(j),p.getZ(j));
   normals.push(n.getX(j),n.getY(j),n.getZ(j));
   uvs.push(uv.getX(j),uv.getY(j));
  }
 }
 box.dispose();
 const shell=new BufferGeometry();
 shell.setAttribute('position',new Float32BufferAttribute(positions,3));
 shell.setAttribute('normal',new Float32BufferAttribute(normals,3));
 shell.setAttribute('uv',new Float32BufferAttribute(uvs,2));
 return shell;
}
