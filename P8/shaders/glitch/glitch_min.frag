precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
float R(vec2 v){return fract(sin(dot(v,vec2(12.9898,78.233)))*43758.5453);}
vec3 B(float x){return mod(floor(fract(x)*7./vec3(2,4,1))+1.,2.);}
void main(){
vec2 u=gl_FragCoord.xy/u_resolution;
float t=u_time,y=fract(u.y+t*.1),l=floor(y*90.),
x=u.x+.08*abs(fract(y*4.-t)-.5)+.01*sin(l+t*9.);
vec3 c=y>.4?B(x):y>.32?B(-x)*step(fract(x*3.5),.5):vec3(fract(x*2.+floor(y*8.)*.4));
gl_FragColor=vec4((c*.8+R(u+t)*.3)*(.7+.3*sin(y*6.-t)),1);}