// Reloj de cuco (tween + un cuerpo cinemático de ammo)

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETA, material } from "../paleta.js";
import * as fisica from "../fisica.js";
import { tween, TWEEN } from "../animacion.js";
import { cargarSonido, reproducir } from "../sonido.js";

const POSICION = new THREE.Vector3(-4, 8.5, -14.55);
export const CENTRO_RELOJ = POSICION.clone(); 

const MINUTO_INICIAL = 57;
const NUM_CUCUS = 3;

// Sonidos
let sonidoCucu = null;
let sonidoTictac = null;

let pivoteMinutero, pivoteHorario, pivotePuertaIzq, pivotePuertaDer;
let pajaro, cuerpoPajaro, alaIzq, alaDer, pivotePendulo;
const hora = { minuto: MINUTO_INICIAL };


// ----- Construcción del reloj -----
export function crearReloj(scene, audioListener) {
  sonidoCucu = cargarSonido(audioListener, "src/sounds/cucu.mp3", { volumen: 0.8 });
  sonidoTictac = cargarSonido(audioListener, "src/sounds/tictac.mp3", { volumen: 0.6 });
  const reloj = new THREE.Group();
  reloj.position.copy(POSICION);
  scene.add(reloj);

  // Casa
  const casa = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.6, 0.9, 3, 0.12), material(PALETA.melocoton));
  casa.castShadow = casa.receiveShadow = true;
  reloj.add(casa);

  // Tejado + adorno
  for (const lado of [-1, 1]) {
    const faldon = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.2, 1.1, 2, 0.08), material(PALETA.rosaFuerte));
    faldon.position.set(lado * 0.62, 1.75, 0);
    faldon.rotation.z = -lado * 0.6;
    faldon.castShadow = true;
    reloj.add(faldon);
  }
  const adorno = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), material(PALETA.dorado));
  adorno.position.set(0, 2.28, 0.1);
  reloj.add(adorno);

  crearEsfera(reloj);
  crearPuertasYPajaro(reloj);
  crearPendulo(reloj);
  crearPesas(reloj);

  // obstáculo estático
  fisica.crearCuerpoRigido(casa, fisica.formaCaja(2.4, 2.6, 0.9), 0);

  reiniciar();
  return reloj;
}


function crearEsfera(reloj) {
  const Y = -0.25, Z = 0.47;

  const esfera = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 48), material(PALETA.crema));
  esfera.rotation.x = Math.PI / 2;
  esfera.position.set(0, Y, Z);
  reloj.add(esfera);

  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 12, 48), material(PALETA.rosaFuerte));
  aro.position.set(0, Y, Z + 0.03);
  reloj.add(aro);

  // marcas de la hora
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const grande = i === 0;
    const marca = new THREE.Mesh(
      new THREE.SphereGeometry(grande ? 0.07 : 0.04, 12, 8),
      material(grande ? PALETA.dorado : PALETA.lavandaOscura)
    );
    marca.position.set(Math.sin(ang) * 0.62, Y + Math.cos(ang) * 0.62, Z + 0.04);
    reloj.add(marca);
  }

  // Agujas - +y - 12:00
  pivoteMinutero = new THREE.Object3D();
  pivoteMinutero.position.set(0, Y, Z + 0.06);
  reloj.add(pivoteMinutero);
  const minutero = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.56, 0.02, 2, 0.01), material(PALETA.lavandaOscura));
  minutero.position.y = 0.24;
  pivoteMinutero.add(minutero);

  pivoteHorario = new THREE.Object3D();
  pivoteHorario.position.set(0, Y, Z + 0.08);
  reloj.add(pivoteHorario);
  const horario = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.38, 0.02, 2, 0.01), material(PALETA.rosaFuerte));
  horario.position.y = 0.15;
  pivoteHorario.add(horario);

  const tapon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), material(PALETA.dorado));
  tapon.position.set(0, Y, Z + 0.1);
  reloj.add(tapon);
}


function crearPuertasYPajaro(reloj) {
  const Y = 0.95, Z = 0.46, ANCHO = 0.46;

  const hueco = new THREE.Mesh(new THREE.BoxGeometry(ANCHO, ANCHO, 0.02), material(PALETA.noche));
  hueco.position.set(0, Y, Z);
  reloj.add(hueco);

  // Cada puerta cuelga de un pivote en su bisagra
  const hoja = new THREE.BoxGeometry(ANCHO / 2, ANCHO, 0.04);
  pivotePuertaIzq = new THREE.Object3D();
  pivotePuertaIzq.position.set(-ANCHO / 2, Y, Z + 0.02);
  reloj.add(pivotePuertaIzq);
  const puertaIzq = new THREE.Mesh(hoja, material(PALETA.menta));
  puertaIzq.position.x = ANCHO / 4;
  pivotePuertaIzq.add(puertaIzq);

  pivotePuertaDer = new THREE.Object3D();
  pivotePuertaDer.position.set(ANCHO / 2, Y, Z + 0.02);
  reloj.add(pivotePuertaDer);
  const puertaDer = new THREE.Mesh(hoja, material(PALETA.menta));
  puertaDer.position.x = -ANCHO / 4;
  pivotePuertaDer.add(puertaDer);

  // Pajarito
  pajaro = new THREE.Group();
  pajaro.position.set(0, Y - 0.05, 0.1);
  reloj.add(pajaro);

  cuerpoPajaro = new THREE.Group();
  pajaro.add(cuerpoPajaro);

  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), material(PALETA.celeste));
  cuerpo.scale.set(1, 0.9, 1.1);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), material(PALETA.celeste));
  cabeza.position.set(0, 0.17, 0.08);
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 12), material(PALETA.dorado));
  pico.rotation.x = Math.PI / 2;
  pico.position.set(0, 0.15, 0.24);
  cuerpoPajaro.add(cuerpo, cabeza, pico);

  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), material(PALETA.noche));
    ojo.position.set(lado * 0.05, 0.2, 0.18);
    const moflete = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), material(PALETA.rosa));
    moflete.scale.set(1, 0.6, 0.4);
    moflete.position.set(lado * 0.08, 0.14, 0.17);
    cuerpoPajaro.add(ojo, moflete);
  }


  const crearAla = (lado) => {
    const pivote = new THREE.Object3D();
    pivote.position.set(lado * 0.14, 0.03, 0);
    const ala = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), material(PALETA.lavanda));
    ala.scale.set(0.5, 0.35, 1);
    ala.position.x = lado * 0.04;
    pivote.add(ala);
    cuerpoPajaro.add(pivote);
    return pivote;
  };
  alaIzq = crearAla(-1);
  alaDer = crearAla(1);
}


function crearPendulo(reloj) {
  pivotePendulo = new THREE.Object3D();
  pivotePendulo.position.set(0, -1.3, 0.4); // por delante de las pesas
  reloj.add(pivotePendulo);

  const varilla = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.03), material(PALETA.dorado));
  varilla.position.y = -0.8;
  pivotePendulo.add(varilla);

  const lenteja = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 32), material(PALETA.dorado));
  lenteja.rotation.x = Math.PI / 2;
  lenteja.position.y = -1.65;
  lenteja.castShadow = true;
  pivotePendulo.add(lenteja);

  // Cinemático - lo mueve el tween y ammo lo usa para golpear las pelotitas
  fisica.crearCuerpoRigido(lenteja, fisica.formaCaja(0.44, 0.08, 0.44, 0.02), 0, { cinematico: true });
}


function crearPesas(reloj) {
  for (const x of [-0.75, 0.75]) {
    const cadena = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), material(PALETA.dorado));
    cadena.position.set(x, -1.9, 0.15);
    const pina = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.45, 12), material(PALETA.madera));
    pina.position.set(x, -2.7, 0.15);
    pina.castShadow = true;
    reloj.add(cadena, pina);
  }
}


// ----- Animación del reloj -----
function actualizarAgujas() {
  // Sentido horario
  pivoteMinutero.rotation.z = -(hora.minuto / 60) * Math.PI * 2;
  pivoteHorario.rotation.z = -((11 + hora.minuto / 60) / 12) * Math.PI * 2;
}

function iniciarPendulo() {
  pivotePendulo.rotation.z = -0.35;
  tween(pivotePendulo.rotation)
    .to({ z: 0.35 }, 1000)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .yoyo(true)
    .repeat(Infinity) // no se para nunca
    .start();
}


export function reiniciar() {
  hora.minuto = MINUTO_INICIAL;
  actualizarAgujas();
  pivotePuertaIzq.rotation.y = 0;
  pivotePuertaDer.rotation.y = 0;
  pajaro.position.z = 0.1;
  cuerpoPajaro.rotation.x = 0;
  alaIzq.rotation.z = alaDer.rotation.z = 0;
  iniciarPendulo();
}


export function darLaHora(alTerminar) {
  // tween por minuto
  const tics = [];
  for (let m = MINUTO_INICIAL + 1; m <= 60; m++) {
    tics.push(
      tween(hora)
        .to({ minuto: m }, 450)
        .easing(TWEEN.Easing.Back.Out)
        .delay(250)
        .onStart(() => reproducir(sonidoTictac))
        .onUpdate(actualizarAgujas)
    );
  }

  const puertas = { ang: 0 };
  const moverPuertas = () => {
    pivotePuertaIzq.rotation.y = -puertas.ang;
    pivotePuertaDer.rotation.y = puertas.ang;
  };
  const abrir = tween(puertas).to({ ang: 1.9 }, 450).easing(TWEEN.Easing.Back.Out).onUpdate(moverPuertas);

  // sale el pájaro
  const salir = tween(pajaro.position).to({ z: 0.68 }, 900).easing(TWEEN.Easing.Elastic.Out);

  const cucus = [];
  for (let i = 0; i < NUM_CUCUS; i++) {
    const p = { k: 0 };
    cucus.push(
      tween(p)
        .to({ k: 1 }, 320)
        .easing(TWEEN.Easing.Quadratic.Out)
        .yoyo(true)
        .repeat(1)
        .delay(i === 0 ? 0 : 250)
        .repeatDelay(0)
        .onStart(() => reproducir(sonidoCucu))
        .onUpdate(() => {
          cuerpoPajaro.rotation.x = p.k * 0.45;
          alaIzq.rotation.z = p.k * 0.9;
          alaDer.rotation.z = -p.k * 0.9;
        })
    );
  }

  const entrar = tween(pajaro.position).to({ z: 0.1 }, 500).easing(TWEEN.Easing.Back.In).delay(300);
  const cerrar = tween(puertas).to({ ang: 0 }, 350).easing(TWEEN.Easing.Quadratic.In).onUpdate(moverPuertas);
  if (alTerminar) cerrar.onComplete(alTerminar);

  // Encadenar todo
  const secuencia = [...tics, abrir, salir, ...cucus, entrar, cerrar];
  for (let i = 0; i < secuencia.length - 1; i++) secuencia[i].chain(secuencia[i + 1]);
  secuencia[0].start();
}