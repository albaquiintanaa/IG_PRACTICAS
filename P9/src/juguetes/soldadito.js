// Soldadito (tween + un cuerpo cinemático de ammo.)

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETA, material } from "../paleta.js";
import * as fisica from "../fisica.js";
import { tween, TWEEN } from "../animacion.js";
import { primeraFicha } from "./dominos.js";

const ALTURA_HOMBRO = 1.0;
const LARGO_BRAZO = 0.48;
const DISTANCIA_SALIDA = 3.6; 

let soldadito, cuerpo;
let piernaIzq, piernaDer, brazoIzq, brazoDer;
let posInicial, posParada;
let rumbo = 0; 

export function crearSoldadito(scene) {
  soldadito = new THREE.Group();
  scene.add(soldadito);
  cuerpo = new THREE.Group();
  soldadito.add(cuerpo);

  const chaqueta = material(PALETA.rosaFuerte);
  const pantalon = material(PALETA.celeste);
  const piel = material(PALETA.melocoton);
  const oro = material(PALETA.dorado);
  const oscuro = material(PALETA.lavandaOscura);
  
  // Piernas (pivote en la cadera, cuelgan hacia -Y)
  const crearPierna = (lado) => {
    const pivote = new THREE.Object3D();
    pivote.position.set(lado * 0.11, 0.5, 0);
    const pierna = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 10), pantalon);
    pierna.position.y = -0.24;
    const bota = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.12, 0.24, 2, 0.05), oscuro);
    bota.position.set(0, -0.45, 0.04);
    pivote.add(pierna, bota);
    cuerpo.add(pivote);
    return pivote;
  };
  piernaIzq = crearPierna(-1);
  piernaDer = crearPierna(1);

  // Tronco
  const tronco = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.5, 0.3, 3, 0.1), chaqueta);
  tronco.position.y = 0.76;
  const cinturon = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.32), material(PALETA.crema));
  cinturon.position.y = 0.56;
  const hebilla = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), oro);
  hebilla.position.set(0, 0.56, 0.165);
  cuerpo.add(tronco, cinturon, hebilla);
  for (let i = 0; i < 3; i++) {
    const boton = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), oro);
    boton.position.set(0, 0.68 + i * 0.1, 0.155);
    cuerpo.add(boton);
  }
  for (const lado of [-1, 1]) {
    const hombrera = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), oro);
    hombrera.scale.set(1, 0.5, 1);
    hombrera.position.set(lado * 0.23, ALTURA_HOMBRO + 0.02, 0);
    cuerpo.add(hombrera);
  }

  // Cabeza y gorro 
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), piel);
  cabeza.position.y = 1.2;
  const gorro = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.34, 20), oscuro);
  gorro.position.y = 1.47;
  const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), oscuro);
  visera.position.set(0, 1.32, 0.03);
  const cinta = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 20), oro);
  cinta.rotation.x = Math.PI / 2;
  cinta.position.y = 1.36;
  const pompon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), material(PALETA.rosa));
  pompon.position.y = 1.68;
  cuerpo.add(cabeza, gorro, visera, cinta, pompon);
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), material(PALETA.noche));
    ojo.position.set(lado * 0.07, 1.22, 0.185);
    const moflete = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), material(PALETA.rosaFuerte));
    moflete.scale.set(1, 0.6, 0.4);
    moflete.position.set(lado * 0.12, 1.15, 0.165);
    cuerpo.add(ojo, moflete);
  }

  // Brazos (pivote en el hombro, cuelgan hacia -Y)
  const crearBrazo = (lado) => {
    const pivote = new THREE.Object3D();
    pivote.position.set(lado * 0.27, ALTURA_HOMBRO, 0);
    const brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, LARGO_BRAZO - 0.16, 4, 10), chaqueta);
    brazo.position.y = -(LARGO_BRAZO - 0.1) / 2;
    const guante = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), material(PALETA.crema));
    guante.position.y = -LARGO_BRAZO + 0.04;
    pivote.add(brazo, guante);
    cuerpo.add(pivote);
    return { pivote, guante };
  };
  // mira a +Z => mano derecha queda en -X
  const der = crearBrazo(-1);
  brazoDer = der.pivote;
  brazoIzq = crearBrazo(1).pivote;

  cuerpo.traverse((o) => { if (o.isMesh) o.castShadow = true; });


  const { posicion, direccion } = primeraFicha();
  const dir = new THREE.Vector3(direccion.x, 0, direccion.z).normalize();
  posParada = posicion.clone().addScaledVector(dir, -0.38);
  posParada.addScaledVector(new THREE.Vector3(dir.z, 0, -dir.x), 0.27); 
  posInicial = posParada.clone().addScaledVector(dir, -DISTANCIA_SALIDA);
  rumbo = Math.atan2(dir.x, dir.z); 

  reiniciar();

  fisica.crearCuerpoRigido(der.guante, fisica.formaCaja(0.15, 0.15, 0.15, 0.01), 0, { cinematico: true });
  return soldadito;
}


function posturaFirmes() {
  piernaIzq.rotation.set(0, 0, 0);
  piernaDer.rotation.set(0, 0, 0);
  brazoIzq.rotation.set(0, 0, 0);
  brazoDer.rotation.set(0, 0, 0);
  cuerpo.position.y = 0;
}


export function reiniciar() {
  soldadito.position.copy(posInicial);
  soldadito.rotation.y = rumbo;
  posturaFirmes();
}


export function centroDesfile() {
  return posInicial.clone().lerp(posParada, 0.6).setY(0.8);
}


export function saludarSinFin(puntoCamara) {
  const haciaCamara = Math.atan2(puntoCamara.x - soldadito.position.x, puntoCamara.z - soldadito.position.z);
  const actual = soldadito.rotation.y;
  const giro = Math.atan2(Math.sin(haciaCamara - actual), Math.cos(haciaCamara - actual));
  const girarse = tween(soldadito.rotation).to({ y: actual + giro }, 500).easing(TWEEN.Easing.Quadratic.InOut);
  const saludos = tween(brazoDer.rotation)
    .to({ x: 0.4, z: -2.3 }, 450)
    .easing(TWEEN.Easing.Quadratic.Out)
    .yoyo(true)
    .repeat(Infinity)
    .repeatDelay(600);
  girarse.chain(saludos);
  girarse.start();
}


export function desfilar(alEmpujar, puntoCamara) {
  const DURACION = 3200;
  const PASOS = 6;

  // Mira y saluda
  const haciaCamara = Math.atan2(puntoCamara.x - soldadito.position.x, puntoCamara.z - soldadito.position.z);
  const giro = Math.atan2(Math.sin(haciaCamara - rumbo), Math.cos(haciaCamara - rumbo));
  const girarse = tween(soldadito.rotation).to({ y: rumbo + giro }, 450).easing(TWEEN.Easing.Quadratic.InOut);

  const saludo = tween(brazoDer.rotation).to({ x: 0.4, z: -2.3 }, 450).easing(TWEEN.Easing.Back.Out).delay(100);
  const bajarSaludo = tween(brazoDer.rotation).to({ x: 0, z: 0 }, 350).easing(TWEEN.Easing.Quadratic.In).delay(400);
  const volverRumbo = tween(soldadito.rotation).to({ y: rumbo }, 450).easing(TWEEN.Easing.Quadratic.InOut).delay(100);

  // Desfila
  const fase = { f: 0 };
  const marcha = tween(fase)
    .to({ f: Math.PI * PASOS }, DURACION)
    .onUpdate(() => {
      const s = Math.sin(fase.f);
      piernaIzq.rotation.x = 0.55 * s;
      piernaDer.rotation.x = -0.55 * s;
      brazoIzq.rotation.x = -0.6 * s;

      const progreso = fase.f / (Math.PI * PASOS);
      brazoDer.rotation.x = 0.6 * s * Math.min(1, (1 - progreso) / 0.3);
      cuerpo.position.y = 0.04 * Math.abs(Math.cos(fase.f));
    });
  const avance = tween(soldadito.position).to({ x: posParada.x, z: posParada.z }, DURACION);
  marcha.onStart(() => avance.start()); // avanza a la vez que da los pasos

  const ini = [0, 0, 0, 0, 0];
  const estadoFirmes = { k: 1 };
  const aFirmes = tween(estadoFirmes)
    .to({ k: 0 }, 300)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onStart(() => {
      ini[0] = piernaIzq.rotation.x;
      ini[1] = piernaDer.rotation.x;
      ini[2] = brazoIzq.rotation.x;
      ini[3] = brazoDer.rotation.x;
      ini[4] = cuerpo.position.y;
    })
    .onUpdate(() => {
      const k = estadoFirmes.k;
      piernaIzq.rotation.x = ini[0] * k;
      piernaDer.rotation.x = ini[1] * k;
      brazoIzq.rotation.x = ini[2] * k;
      brazoDer.rotation.x = ini[3] * k;
      cuerpo.position.y = ini[4] * k;
    })
    .onComplete(posturaFirmes);

  // Empuje a la ficha
  const empujon = tween(brazoDer.rotation).to({ x: -1.7 }, 450).easing(TWEEN.Easing.Back.Out).delay(400);
  if (alEmpujar) empujon.onComplete(alEmpujar);
  const recoger = tween(brazoDer.rotation).to({ x: 0 }, 500).easing(TWEEN.Easing.Quadratic.InOut).delay(400);

  girarse.chain(saludo);
  saludo.chain(bajarSaludo);
  bajarSaludo.chain(volverRumbo);
  volverRumbo.chain(marcha);
  marcha.chain(aFirmes);
  aFirmes.chain(empujon);
  empujon.chain(recoger);
  girarse.start();
}
