// Los usan objects.js (astros) y choque.js (efecto de choque)

// ----------------- SOL -----------------

// "Latido" del Sol
export function vertexShaderSol() {
    return `
      varying vec2 vUv;
      varying vec3 vPos;
      uniform float u_time;
  
      void main() {
        vUv = uv;
        vPos = position;
        // el Sol crece y encoge un poco
        float scale = 1.0 + sin(u_time * 2.0) * 0.02;
        vec4 modelViewPosition = modelViewMatrix * vec4(position * scale, 1.0);
        gl_Position = projectionMatrix * modelViewPosition;
      }
    `;
  }
  
// Textura del Sol que se desplaza + manchas de ruido que "hierven"
export function fragmentShaderSol() {
  return `
    uniform sampler2D texture1;
    uniform float u_time;
    varying vec2 vUv;
    varying vec3 vPos;

    float random(in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(random(i),                  random(i + vec2(1.0, 0.0)), u.x),
                 mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
                 u.y);
    }

    void main() {
      vec3 p = vPos * 0.8;

      // Ruido en los tres planos
      float n = (vnoise(p.xy + u_time * 0.5)
               + vnoise(p.yz - u_time * 0.4)
               + vnoise(p.zx + u_time * 0.45)) / 3.0;

      // La textura se desplaza y se deforma con el ruido
      vec2 st = vUv;
      st.x += u_time * 0.01;
      st += (n - 0.5) * 0.06;
      vec3 color = texture2D(texture1, st).rgb;

      color = mix(color * vec3(0.9, 0.45, 0.2), color * 1.5, smoothstep(0.35, 0.65, n));

      gl_FragColor = vec4(color, 1.0);
    }
  `;
}


// ----------------- LUZ DEL SOL + TIERRA CON DÍA Y NOCHE -----------------

// Vértices con la dirección hacia el Sol
export function vertexShaderLuzSol() {
  return `
    varying vec2 vUv;
    varying vec3 v_Normal;
    varying vec3 v_Luz;

    void main() {
      vUv = uv;
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);

      // Posición del Sol (está en el origen de la escena)
      vec4 viewSunPos = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      // Normal del vértice
      v_Normal = normalize(normalMatrix * normal);
      // Vector desde el vértice hacia el Sol
      v_Luz = normalize(viewSunPos.xyz - modelViewPosition.xyz);

      gl_Position = projectionMatrix * modelViewPosition;
    }
  `;
}

export function fragmentShaderDiaNoche() {
  return `
    uniform sampler2D texture1;
    uniform sampler2D texture2;
    varying vec2 vUv;
    varying vec3 v_Luz;
    varying vec3 v_Normal;

    void main() {
      // Producto escalar normal-luz: > 0 mira al Sol, < 0 está de noche
      float LdotN = dot(v_Luz, v_Normal);
      float Id = min(1.0, abs(LdotN)); // Lambert

      if (LdotN > 0.0) {
        gl_FragColor = vec4(texture2D(texture1, vUv).rgb * Id, 1.0);
      } else {
        gl_FragColor = vec4(texture2D(texture2, vUv).rgb * Id, 1.0);
      }
    }
  `;
}


// ----------------- PLANETAS PROCEDURALES (MODO CREADOR) -----------------

export function vertexShaderProcedural() {
  return `
    uniform float uSeed;
    uniform float uSea;
    uniform float uNoiseAmp;
    uniform float uNoiseFreq;

    varying float vH;
    varying vec3 v_Normal;
    varying vec3 v_Luz;

    float random(in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(random(i),                  random(i + vec2(1.0, 0.0)), u.x),
                 mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
                 u.y);
    }

    float rnd(vec2 p) {
      p = p * uNoiseFreq + uSeed;
      float n = vnoise(p) * 0.5
              + vnoise(p * 2.0) * 0.25
              + vnoise(p * 4.0) * 0.125;
      return n * 2.0 - 1.0;
    }

    void main() {
      vec3 p = normalize(position) * 2.0;
      float h = (rnd(p.xy) + rnd(p.yz + 7.0) + rnd(p.zx + 13.0)) / 3.0;
      vH = h;

      // Relieve
      vec3 newPosition = position + normal * (max(h, uSea) - uSea) * uNoiseAmp * 3.0;

      vec4 modelViewPosition = modelViewMatrix * vec4(newPosition, 1.0);

      // Luz del Sol
      vec4 viewSunPos = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      v_Normal = normalize(normalMatrix * normal);
      v_Luz = normalize(viewSunPos.xyz - modelViewPosition.xyz);

      gl_Position = projectionMatrix * modelViewPosition;
    }
  `;
}

export function fragmentShaderProcedural() {
  return `
    uniform float uZona;
    uniform float uSea;
    uniform float u_time;
    varying float vH;
    varying vec3 v_Normal;
    varying vec3 v_Luz;

    void main() {
      float h = vH;
      // 0 en el nivel del mar, 1 en las cumbres
      float alto = clamp((h - uSea) * 3.0, 0.0, 1.0);
      // 0 en la costa, 1 en las zonas más profundas
      float prof = clamp((uSea - h) * 4.0, 0.0, 1.0);
      vec3 color;
      vec3 brillo = vec3(0.0);

      if (uZona < 0.5) {
        // lagos de lava y roca volcánica oscura
        if (h < uSea) {
          float pulso = 0.8 + 0.2 * sin(u_time * 2.0 + h * 40.0);
          color = mix(vec3(1.0, 0.85, 0.2), vec3(0.9, 0.2, 0.0), prof);
          brillo = color * 0.6 * pulso;
        } else {
          color = mix(vec3(0.25, 0.1, 0.05), vec3(0.08, 0.06, 0.06), alto);
        }
      } else if (uZona < 1.5) {
        // océanos, playas, bosques, montañas y nieve
        if (h < uSea) {
          color = mix(vec3(0.1, 0.35, 0.7), vec3(0.02, 0.08, 0.3), prof);
        } else if (alto < 0.08) {
          color = vec3(0.85, 0.8, 0.55); 
        } else if (alto < 0.45) {
          color = mix(vec3(0.15, 0.5, 0.15), vec3(0.1, 0.35, 0.1), alto);
        } else if (alto < 0.75) {
          color = vec3(0.45, 0.35, 0.25);                 
        } else {
          color = vec3(0.95);
        }
      } else {
        // mares congelados y montañas de hielo
        if (h < uSea) {
          color = mix(vec3(0.75, 0.9, 1.0), vec3(0.5, 0.7, 0.9), prof);
        } else {
          color = mix(vec3(0.85, 0.92, 1.0), vec3(1.0), alto);
        }
      }

      float Id = max(dot(v_Luz, v_Normal), 0.0);
      gl_FragColor = vec4(color * (0.15 + 0.85 * Id) + brillo, 1.0);
    }
  `;
}


// ----------------- ANILLOS DE SATURNO -----------------

export function vertexShaderAnillo() {
  return `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

// cientos de anillos finos de distinta densidad, huecos y un leve brillo del hielo
export function fragmentShaderAnillo() {
  return `
    uniform float u_time;
    varying vec2 vUv;

    float hash(float p) {
      return fract(sin(p * 127.1) * 43758.5453);
    }
    float noise(float p) {
      float i = floor(p);
      float f = fract(p);
      float u = f * f * (3.0 - 2.0 * f);
      return mix(hash(i), hash(i + 1.0), u);
    }

    void main() {
      float r = vUv.x; // 0 = borde interior, 1 = borde exterior

      // Densidad
      float densidad = 0.3 + 0.4 * noise(r * 25.0) + 0.3 * noise(r * 200.0);

      // Huecos
      densidad *= smoothstep(0.03, 0.05, abs(r - 0.62));
      densidad *= smoothstep(0.005, 0.012, abs(r - 0.9));

      densidad *= smoothstep(0.0, 0.05, r) * smoothstep(1.0, 0.95, r);

      vec3 color = mix(vec3(0.75, 0.65, 0.5), vec3(0.95, 0.9, 0.82), r);
      color *= 0.8 + 0.4 * noise(r * 60.0);

      color += 0.12 * pow(noise(r * 400.0 + u_time * 3.0), 6.0);

      gl_FragColor = vec4(color, densidad * 0.9);
    }
  `;
}


// ----------------- EFECTO DE CHOQUE -----------------
export function vertexShaderChoque() {
  return `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;
}

export function fragmentShaderChoque() {
  return `
    uniform sampler2D tDiffuse;
    uniform float u_time;
    uniform float u_progreso;
    uniform float u_aspecto;
    varying vec2 vUv;

    void main() {
      float p = u_progreso;
      float k = 1.0 - p;

      vec2 c = vUv - 0.5;
      c.x *= u_aspecto;
      float d = length(c);
      vec2 dir = c / (d + 0.0001); // dirección hacia fuera desde el centro

      // Temblor de cámara
      vec2 uv = vUv + k * k * 0.015 * vec2(sin(u_time * 90.0), cos(u_time * 75.0));

      // Onda expansiva: un anillo que crece desde el centro
      float radio = p * 1.2;
      float onda = d - radio;
      float anillo = exp(-onda * onda * 800.0);
      uv += dir / vec2(u_aspecto, 1.0) * anillo * 0.06 * k;

      vec2 s = dir / vec2(u_aspecto, 1.0) * (0.006 * k + 0.01 * anillo * k);
      vec3 col = vec3(texture2D(tDiffuse, uv + s).r,
                      texture2D(tDiffuse, uv).g,
                      texture2D(tDiffuse, uv - s).b);

      col = pow(col, vec3(1.0 / 2.2));

      // brillo
      col += vec3(0.6, 0.8, 1.0) * anillo * k * 0.25;

      // Destello blanco del impacto
      col += vec3(1.0, 0.95, 0.9) * pow(k, 12.0) * 0.7;

      // Bordes de rojo
      float borde = smoothstep(0.5, 1.0, d);
      col *= mix(vec3(1.0), vec3(1.0, 0.25, 0.2), borde * sqrt(k));
      col += vec3(0.35, 0.0, 0.0) * borde * sqrt(k);

      gl_FragColor = vec4(col, 1.0);
    }
  `;
}