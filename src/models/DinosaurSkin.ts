import { Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three';
import type { Species } from '../world/paths';

export const SKIN_PALETTES: Record<Species, {back:string; belly:string; marking:string; iris:string}> = {
 rex:{back:'#655d4c',belly:'#a29478',marking:'#353b30',iris:'#87703e'},
 triceratops:{back:'#746b5b',belly:'#a79c82',marking:'#44483d',iris:'#6d5c37'},
 stegosaurus:{back:'#6d7056',belly:'#a49b7c',marking:'#4e4b38',iris:'#7f6c3b'},
 brachiosaurus:{back:'#747569',belly:'#a7a18c',marking:'#454d44',iris:'#73633c'},
 velociraptor:{back:'#79644e',belly:'#b9aa8e',marking:'#3f3b32',iris:'#98733a'},
 pterosaur:{back:'#655d50',belly:'#a89676',marking:'#484039',iris:'#8d6433'},
 spinosaurus:{back:'#65675b',belly:'#aaa38a',marking:'#454e42',iris:'#8c6c3d'},
};
export const TEXTURE_SIZE=1024;
const cache=new Map<Species,ReturnType<typeof makeSkin>>();
const hash=(x:number,y:number)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
const wrap=(x:number,n:number)=>(x%n+n)%n;
export function skinNoise(x:number,y:number,period=256){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash(wrap(ix,period),wrap(iy,period)),b=hash(wrap(ix+1,period),wrap(iy,period)),c=hash(wrap(ix,period),wrap(iy+1,period)),d=hash(wrap(ix+1,period),wrap(iy+1,period));return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;}

function texture(data:Uint8Array,name:string,color=false){
 const t=new DataTexture(data,TEXTURE_SIZE,TEXTURE_SIZE,RGBAFormat,UnsignedByteType);
 t.name=name;t.wrapS=t.wrapT=RepeatWrapping;t.anisotropy=4;t.generateMipmaps=true;t.minFilter=LinearMipmapLinearFilter;t.magFilter=LinearFilter;
 if(color)t.colorSpace=SRGBColorSpace;t.needsUpdate=true;return t;
}

function makeSkin(species:Species){
 const n=TEXTURE_SIZE,base=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),roughness=new Uint8Array(n*n*4),height=new Float32Array(n*n);
 const feathered=species==='velociraptor',membrane=species==='pterosaur',pebbled=species==='triceratops',cells=feathered?68:membrane?38:pebbled?26:species==='brachiosaurus'?45:54;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n*cells,v=y/n*cells;let first=10,second=10;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const gx=Math.floor(u)+dx,gy=Math.floor(v)+dy,px=gx+.5+(hash(wrap(gx,cells),wrap(gy,cells))-.5)*.76,py=gy+.5+(hash(wrap(gx+31,cells),wrap(gy+17,cells))-.5)*.76;
   const d=Math.hypot(u-px,(v-py)*(feathered?2:1));if(d<first){second=first;first=d;}else if(d<second)second=d;
  }
  const edge=Math.min(1,(second-first)*10),grain=hash(x,y),patch=skinNoise(x/n*8,y/n*8,8),fine=skinNoise(x/n*32,y/n*32,32),folds=Math.pow(.5+.5*Math.sin(y/n*Math.PI*38+Math.sin(x/n*Math.PI*6)*1.7),18)*(.15+patch*.20),vein=membrane?Math.pow(Math.max(0,Math.sin(x/n*Math.PI*32+Math.sin(y/n*Math.PI*8)*.45)),32)*.18:0;
  const dome=Math.max(0,1-first*.9);
  height[y*n+x]=membrane?.45+grain*.025-vein:feathered?.2+fine*.24+Math.sin(x*.7+y*.12)*.04:.12+edge*dome*.58+grain*.035-folds*.35;
  const tone=membrane?.83-vein*.7+patch*.08:feathered?.72+patch*.13+fine*.12:.62+edge*.22+dome*.08+patch*.08-folds*.23+(grain-.5)*.025;
  const i=(y*n+x)*4;base[i]=Math.round(255*tone);base[i+1]=Math.round(251*tone);base[i+2]=Math.round(242*tone);base[i+3]=255;
  const r=Math.round(((membrane?.58:feathered?.84:.63)+(1-edge)*.16+patch*.09+grain*.025)*255);
  roughness[i]=0;roughness[i+1]=Math.min(255,r);roughness[i+2]=0;roughness[i+3]=255;
 }
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const dx=(height[y*n+wrap(x+1,n)]-height[y*n+wrap(x-1,n)])*2.8,dy=(height[wrap(y+1,n)*n+x]-height[wrap(y-1,n)*n+x])*2.8,l=Math.hypot(dx,dy,1),i=(y*n+x)*4;
  normal[i]=Math.round((.5-dx/l*.5)*255);normal[i+1]=Math.round((.5-dy/l*.5)*255);normal[i+2]=Math.round((.5+.5/l)*255);normal[i+3]=255;
 }
 return {map:texture(base,`${species}-scale-albedo`,true),normalMap:texture(normal,`${species}-scale-normal`),roughnessMap:texture(roughness,`${species}-roughness-metalness`)};
}

/** Shared immutable maps. Each animal owns its material, not these textures. */
export function dinosaurSkin(species:Species){if(!cache.has(species))cache.set(species,makeSkin(species));return cache.get(species)!;}

/** Vertex pigmentation is independent from the tileable microstructure UVs. */
export function skinPigment(species:Species,x:number,y:number,z:number,belly:number){
 const p=SKIN_PALETTES[species],c=new Color(p.back),light=new Color(p.belly),dark=new Color(p.marking);
 const patch=skinNoise(x*6+z*2,y*6+z*4),mottle=skinNoise(x*25+z*8,y*23-z*6),stripes=.5+.5*Math.sin(z*12+skinNoise(x*5,y*8)*5);
 const shade=(patch*.28+Math.max(0,stripes-.65)*.25+mottle*.08)*(1-belly),fade=Math.max(0,Math.min(1,(belly-.03)/.85));
 c.lerp(dark,shade).lerp(light,fade*fade*(3-2*fade)*.70);c.multiplyScalar(.91+mottle*.16);return c;
}
