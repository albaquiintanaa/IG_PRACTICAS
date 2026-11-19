// =====================================================================
// GLITCH - P8 IG - Alba Ramos Quintana
// Versión legible y comentada de glitch_min.frag
// =====================================================================

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// 7 barras de colores: cada canal (R, G, B) sale de un bit del número de barra
vec3 barras(float x) {
    float n = floor(fract(x) * 7.);
    return mod(floor(n / vec3(2., 4., 1.)) + 1., 2.);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t = u_time;

    // La imagen rueda: lo que sale por arriba vuelve a entrar por abajo
    float y = fract(uv.y + t * .1);

    // Distorsión - 90 líneas horizontales
    float linea = floor(y * 90.);               
    float x = uv.x
            + .08 * abs(fract(y * 4. - t) - .5) // zigzag grande que se mueve
            + .01 * sin(linea + t * 9.); // temblor distinto en cada línea

    vec3 col;
    if (y > .4) {
        // barras de colores
        col = barras(x);
    } else if (y > .32) {
        // barras en orden inverso alternando con negro
        float hueco = step(fract(x * 3.5), .5);
        col = barras(-x) * hueco;
    } else {
        // degradados de negro a blanco - 8 bandas
        col = vec3(fract(x * 2. + floor(y * 8.) * .4));
    }

    // Nieve: ruido distinto en cada fotograma
    col = col * .8 + random(uv + t) * .3;

    // Bandas oscuras que suben por la pantalla
    col *= .7 + .3 * sin(y * 6. - t);

    gl_FragColor = vec4(col, 1.);
}