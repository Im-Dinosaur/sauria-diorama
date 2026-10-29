export const noiseGLSL=`
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float n=0.;float a=.55;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.07+7.3;a*=.48;}return n;}
`;
