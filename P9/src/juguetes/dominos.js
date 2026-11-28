// Fichas de dominó (ammo - cuerpos dinámicos)

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ARCOIRIS, material } from "../paleta.js";
import * as fisica from "../fisica.js";

export const ALTO = 1.2, GROSOR = 0.16, ANCHO = 0.6;
const SEPARACION = 0.55; 

const CAMINO = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-2.5, 0, 4.0),
  new THREE.Vector3(-0.6, 0, 5.5),
  new THREE.Vector3(1.6, 0, 6.2),
  new THREE.Vector3(3.1, 0, 6.85),
  new THREE.Vector3(3.7, 0, 7.5),
]);

let escena = null;
let geoFicha = null;
let fichas = [];

// Pos primera ficha
export function primeraFicha() {
  return { posicion: CAMINO.getPointAt(0), direccion: CAMINO.getTangentAt(0) };
}


export function centroFila() {
  return CAMINO.getPointAt(0.5);
}


// Pos ficha que cae
export function puntoCaida() {
  return CAMINO.getPointAt(1).addScaledVector(CAMINO.getTangentAt(1), ALTO * 0.8);
}


export function crearDominos(scene) {
  escena = scene;
  geoFicha = new RoundedBoxGeometry(GROSOR, ALTO, ANCHO, 2, 0.03);
  colocar();
}


function colocar() {
  const n = Math.floor(CAMINO.getLength() / SEPARACION) + 1;
  fichas = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const p = CAMINO.getPointAt(u);
    const t = CAMINO.getTangentAt(u);
    const ficha = new THREE.Mesh(geoFicha, material(ARCOIRIS[i % ARCOIRIS.length]));
    ficha.position.set(p.x, ALTO / 2, p.z);
    ficha.rotation.y = -Math.atan2(t.z, t.x); 
    ficha.castShadow = ficha.receiveShadow = true;
    ficha.userData.geometriaCompartida = true;
    escena.add(ficha);
    fisica.crearCuerpoRigido(ficha, fisica.formaCaja(GROSOR, ALTO, ANCHO, 0.01), 0.3, { friccion: 0.6 });
    fichas.push(ficha);
  }
}


export function reiniciar() {
  fichas.forEach((f) => fisica.eliminar(f));
  colocar();
}
