import * as THREE from "three";
import { uTiempo } from "./objects.js";
import { vertexShaderChoque, fragmentShaderChoque } from "./shaders.js";

// ----------------- EFECTO DE CHOQUE -----------------
// Cuando la nave choca hay un impacto: destello blanco, la cámara tiembla,
// una onda sale del centro y deforma la imagen al pasar

const DURACION = 0.7;

let rtChoque, escenaChoque, camaraChoque, uniformsChoque;
let inicioChoque = -100.0;   // instante (en uTiempo) del último choque


export function crearChoque() {
  rtChoque = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

  uniformsChoque = {
    tDiffuse: { value: rtChoque.texture },
    u_time: uTiempo,
    u_progreso: { value: 1.0 }, // 0 al chocar -> 1 al terminar
    u_aspecto: { value: window.innerWidth / window.innerHeight }, // para que la onda sea redonda
  };

  // Plano que cubre toda la pantalla
  escenaChoque = new THREE.Scene();
  camaraChoque = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let plano = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: uniformsChoque,
      vertexShader: vertexShaderChoque(),
      fragmentShader: fragmentShaderChoque(),
    })
  );
  escenaChoque.add(plano);
}


export function activarChoque() {
  if (uTiempo.value - inicioChoque > DURACION) {
    inicioChoque = uTiempo.value;

    let aviso = document.getElementById("aviso-choque");
    if (aviso) {
      aviso.classList.remove("activo");
      void aviso.offsetWidth;
      aviso.classList.add("activo");
    }
  }
}


export function renderConChoque(renderer, scene, camara) {
  let progreso = (uTiempo.value - inicioChoque) / DURACION;

  if (progreso >= 1.0) {
    // Sin choque: render normal, directamente a pantalla
    renderer.render(scene, camara);
    return;
  }

  uniformsChoque.u_progreso.value = progreso;

  // Escena -> textura
  renderer.setRenderTarget(rtChoque);
  renderer.render(scene, camara);
  // Textura deformada por el shader -> pantalla
  renderer.setRenderTarget(null);
  renderer.render(escenaChoque, camaraChoque);
}


export function redimensionarChoque() {
  if (rtChoque) {
    rtChoque.setSize(window.innerWidth, window.innerHeight);
    uniformsChoque.u_aspecto.value = window.innerWidth / window.innerHeight;
  }
}
