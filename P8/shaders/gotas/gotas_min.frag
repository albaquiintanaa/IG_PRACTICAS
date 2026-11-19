precision mediump float;
uniform vec2 u_resolution,u_mouse;
uniform float u_time;
void main(){
vec2 r=u_resolution,p=gl_FragCoord.xy/r.y,q;
float t=u_time,h=0.,d,c,k;
for(float i=0.;i<4.;i++){c=t*.3+i*.25;
d=length(p-fract((floor(c)+i)*vec2(.61,.37))*r/r.y)-fract(c)*.5;
h+=sin(d*60.)*exp(-d*d*99.)*(1.-fract(c));}
d=length(p-u_mouse/r.y);h+=sin(d*50.-t*6.)*exp(-d*5.);
q=p*12.+h*.3;k=abs(sin(q.x+sin(q.y+t))+sin(q.y+sin(q.x-t)));
gl_FragColor=vec4(vec3(0,.2,.4)*(1.+p.y)+.1/(k+.1)*vec3(.4,.8,1)+h*(.1+h*.3),1);}