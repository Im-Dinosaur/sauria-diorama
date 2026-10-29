import { Bloom,DepthOfField,EffectComposer,SSAO,ToneMapping,FXAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
export function PostEffects({tier}:{tier:number}){return <EffectComposer multisampling={0} enableNormalPass={tier===0} resolutionScale={.5}>
 {tier===0?<SSAO resolutionScale={.5} samples={8} rings={3} radius={.09} intensity={1.4} luminanceInfluence={.65}/>:<></>}
 {tier<2?<DepthOfField target={[0,.3,0]} focusRange={9} bokehScale={1.4} resolutionScale={.5}/>:<></>}
 <Bloom intensity={.45} luminanceThreshold={1.1} luminanceSmoothing={.4} mipmapBlur resolutionScale={.5}/>
 <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><FXAA/>
 </EffectComposer>}
