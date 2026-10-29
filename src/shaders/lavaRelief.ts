// World-space surface gradients keep relief consistent across camera angles and DPR.
// The surface stays rigid; only the procedural material flows.
export const lavaReliefVertex = `
 varying vec2 vUv;
 varying vec3 vWorldPosition;
 void main(){
  vUv=uv;
  vWorldPosition=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 }`;

export const lavaReliefGLSL = `
 vec3 reliefNormal(float height){
  vec3 dx=dFdx(vWorldPosition),dy=dFdy(vWorldPosition);
  vec3 base=normalize(cross(dx,dy));
  vec3 rx=cross(dy,base),ry=cross(base,dx);
  float determinant=dot(dx,rx);
  vec3 gradient=(rx*dFdx(height)+ry*dFdy(height))/max(abs(determinant),1.e-9);
  return normalize(base-sign(determinant)*gradient);
 }
 vec3 lavaLight(vec3 albedo,vec3 normal,vec3 view,vec3 light,vec3 radiance,float roughness){
  vec3 halfDirection=normalize(view+light);
  float nl=max(dot(normal,light),0.),nv=max(dot(normal,view),.02);
  float nh=max(dot(normal,halfDirection),0.),vh=max(dot(view,halfDirection),0.);
  float a=roughness*roughness,a2=a*a;
  float d=nh*nh*(a2-1.)+1.;
  float distribution=a2/(3.141593*d*d);
  float k=(roughness+1.)*(roughness+1.)*.125;
  float visibility=1./max(4.*(nv*(1.-k)+k)*(nl*(1.-k)+k),.001);
  float fresnel=.045+.955*pow(1.-vh,5.);
  return radiance*nl*(albedo/3.141593+distribution*visibility*fresnel);
 }
 vec3 shadeLavaCrust(vec3 albedo,vec3 normal,float roughness,float cavity){
  vec3 view=normalize(cameraPosition-vWorldPosition);
  // Match the existing warm key and cool fill in Studio, without a glass clearcoat.
  vec3 color=albedo*mix(.3,.8,normal.y*.5+.5)*cavity;
  color+=lavaLight(albedo,normal,view,normalize(vec3(-6.,12.,5.)),vec3(3.5,2.9,2.2),roughness)*cavity;
  color+=lavaLight(albedo,normal,view,normalize(vec3(3.,7.,-8.)),vec3(1.5,1.9,2.2),roughness)*cavity;
  return color;
 }
`;
