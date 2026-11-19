// =====================================================================
// GOTAS DE AGUA Y RANITA - P8 IG - Alba Ramos Quintana
// =====================================================================

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float e;   // ancho del borde suave 


float relleno(float dist) {
    return smoothstep(e, -e, dist);
}

float elipse(vec2 v, vec2 radio) {
    return (length(v / radio) - 1.) * min(radio.x, radio.y);
}

// -------- AGUA --------
// Misma lógica que la versión de 512 bytes, en una función -> también en el centro del nenúfar.

float agua(vec2 p) {
    float t = u_time;
    float h = 0.;
    float d;
    
    for (float i = 0.; i < 4.; i++) {
        float ciclo = t * .3 + i * .25;
        float edad = fract(ciclo);
        vec2 centro = fract((floor(ciclo) + i) * vec2(.61, .37)) * u_resolution / u_resolution.y;
        d = length(p - centro) - edad * .5;
        h += sin(d * 60.) * exp(-d * d * 99.) * (1. - edad);
    }
    
    d = length(p - u_mouse / u_resolution.y);
    h += sin(d * 50. - t * 6.) * exp(-d * 5.);
    return h;
}


// -------- NENÚFAR --------

vec3 nenufar(vec3 col, vec2 p, vec2 centro, float radio, float giro) {
    vec2 v = p - centro;

    // Sombra sobre el agua, un poco desplazada
    col *= 1. - .45 * relleno(length(v - vec2(.012, -.015)) - radio);

    // Corte 
    float ang = atan(v.y, v.x);
    float corte = abs(mod(ang - giro + PI, 2. * PI) - PI);   // distancia angular al corte
    float dentro = relleno(length(v) - radio) * smoothstep(.18, .24, corte);

    vec3 verde = mix(vec3(.12, .42, .12), vec3(.25, .62, .2), length(v) / radio);
    verde += .06 * smoothstep(.9, 1., cos(ang * 13.)); // nervios radiales
    verde *= 1. - .35 * smoothstep(radio - .012, radio, length(v)); // borde más oscuro

    return mix(col, verde, dentro);
}


// -------- RANITA --------

vec3 rana(vec3 col, vec2 p, vec2 c, vec2 raton) {
    vec2 v = p - c;
    vec3 verde  = vec3(.36, .74, .28);
    vec3 oscuro = vec3(.2, .5, .16);

    // Sombra de la rana sobre el nenúfar
    col *= 1. - .3 * relleno(elipse(v - vec2(.01, -.075), vec2(.11, .03)));

    // Patas traseras - antes del cuerpo para que quede por detrás
    col = mix(col, oscuro, relleno(elipse(v - vec2(-.075, -.055), vec2(.05, .025))));
    col = mix(col, oscuro, relleno(elipse(v - vec2( .075, -.055), vec2(.05, .025))));

    // Cuerpo + cabeza (una elipse ancha) y abultamientos de los ojos
    float cuerpo = elipse(v, vec2(.1, .072));
    cuerpo = min(cuerpo, length(v - vec2(-.052, .055)) - .036);
    cuerpo = min(cuerpo, length(v - vec2( .052, .055)) - .036);
    vec3 piel = mix(verde, verde * 1.15, smoothstep(-.07, .07, v.y)); // un poco más clara arriba
    col = mix(col, piel, relleno(cuerpo));

    // Patas delanteras
    col = mix(col, oscuro, relleno(elipse(v - vec2(-.04, -.064), vec2(.022, .012))));
    col = mix(col, oscuro, relleno(elipse(v - vec2( .04, -.064), vec2(.022, .012))));

    // Cachetes 
    col = mix(col, vec3(1., .55, .6), .6 * relleno(length(v - vec2(-.062, -.012)) - .016));
    col = mix(col, vec3(1., .55, .6), .6 * relleno(length(v - vec2( .062, -.012)) - .016));

    // Sonrisa
    vec2 b = v - vec2(0., .012);
    float sonrisa = abs(length(b) - .038) - .0035;
    col = mix(col, vec3(.1, .25, .08), relleno(sonrisa) * step(b.y, -.012));

    // Ojos - la pupila mira al ratón y parpadea cada ~4 s
    float parpado = step(.96, fract(u_time * .25));   // 1 durante un instante
    for (float s = -1.; s <= 1.; s += 2.) {
        vec2 ojo = c + vec2(s * .052, .058);
        vec2 mira = normalize(raton - ojo + 1e-4) * .009; // pupila mira hacia el ratón
        float blanco = length(p - ojo) - .024;
        col = mix(col, vec3(1.), relleno(blanco) * (1. - parpado));
        col = mix(col, vec3(.05), relleno(length(p - ojo - mira) - .012) * (1. - parpado));
        // Ojo cerrado
        col = mix(col, vec3(.1, .3, .08), relleno(elipse(p - ojo, vec2(.022, .004))) * parpado);
    }
    return col;
}



void main() {
    e = 1.5 / u_resolution.y;
    vec2 p = gl_FragCoord.xy / u_resolution.y;
    vec2 raton = u_mouse / u_resolution.y;
    float aspecto = u_resolution.x / u_resolution.y;
    float t = u_time;

    float h = agua(p);
    vec2 q = p * 12. + h * .3;
    float k = abs(sin(q.x + sin(q.y + t)) + sin(q.y + sin(q.x - t)));
    vec3 col = vec3(0., .2, .4) * (1. + p.y);
    col += .1 / (k + .1) * vec3(.4, .8, 1.);
    col += h * (.1 + h * .3);

    // Los nenúfares flotan, se mecen y giran un poco
    // Se balancean cuando les llega una onda
    vec2 b1 = vec2(aspecto * .22 + .02 * sin(t * .23), .74 + .015 * sin(t * .31 + 1.));
    vec2 b2 = vec2(aspecto * .88 + .02 * sin(t * .27 + 3.), .83 + .012 * cos(t * .2));
    vec2 b3 = vec2(aspecto * .66 + .015 * sin(t * .19 + 5.), .3 + .01 * cos(t * .25 + 2.));

    vec2 c1 = b1 + vec2(.004 * sin(t * 1.7), .006 * sin(t * 1.3)) + .015 * agua(b1);
    vec2 c2 = b2 + vec2(.004 * sin(t * 1.4 + 1.), .006 * sin(t * 1.1 + 2.)) + .015 * agua(b2);
    vec2 c3 = b3 + vec2(.003 * sin(t * 1.2), .005 * sin(t * 1.5)) + .012 * agua(b3);

    col = nenufar(col, p, c1, .09, 2.2 + .25 * sin(t * .4) + .1 * agua(b1));
    col = nenufar(col, p, c2, .07, 4. + .3 * sin(t * .35 + 1.) + .1 * agua(b2));

    // La rana se mueve con el nenúfar
    col = nenufar(col, p, c3, .17, .5 + .15 * sin(t * .3) + .05 * agua(b3));
    col = rana(col, p, c3 + vec2(0., .04), raton);

    gl_FragColor = vec4(col, 1.);
}
