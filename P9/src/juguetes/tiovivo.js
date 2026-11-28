// tiovivo (ammo: bisagra con motor + peluches; tween controla el motor)

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETA, material } from "../paleta.js";
import * as fisica from "../fisica.js";
import { tween, TWEEN } from "../animacion.js";
import { cargarSonido, reproducir, parar } from "../sonido.js";

const CENTRO = new THREE.Vector3(6, 0, -5); 
export const CENTRO_TIOVIVO = CENTRO.clone().setY(1.5); 

const ALTO_COLUMNA = 0.45;
const RADIO_DISCO = 2.2, GROSOR_DISCO = 0.2;
const ALTO_TECHO = 2.6; 
const RADIO_CABALLOS = 1.65;
const IMPULSO_MOTOR = 60; 

const V_PASEO = 1.4; 
const V_LOCA = 5.5;

let escena = null;
let disco = null;
let bisagra = null;
const motor = { v: 0 };
const caballos = [];
let peluches = [];
let musica = null;


// Construcción
export function crearTiovivo(scene, listener) {
  escena = scene;
  musica = cargarSonido(listener, "src/sounds/taratata.mp3", { volumen: 0.35 });
  const A = fisica.getAmmo();

  // Columna 
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, ALTO_COLUMNA, 24), material(PALETA.rosaFuerte));
  columna.position.set(CENTRO.x, ALTO_COLUMNA / 2, CENTRO.z);
  columna.castShadow = true;
  scene.add(columna);
  fisica.crearCuerpoRigido(columna, fisica.formaCilindro(0.45, ALTO_COLUMNA), 0);

  // Disco (dinámico)
  disco = new THREE.Mesh(new THREE.CylinderGeometry(RADIO_DISCO, RADIO_DISCO, GROSOR_DISCO, 48), material(PALETA.crema));
  disco.position.set(CENTRO.x, ALTO_COLUMNA + GROSOR_DISCO / 2, CENTRO.z);
  disco.castShadow = disco.receiveShadow = true;
  scene.add(disco);
  decorarDisco(disco);
  fisica.crearCuerpoRigido(disco, fisica.formaCilindro(RADIO_DISCO, GROSOR_DISCO, 0.02), 10, {
    friccion: 0.9,
    amortiguacion: [0.0, 0.3],
  });

  const pivoteA = new A.btVector3(0, ALTO_COLUMNA / 2, 0);
  const pivoteB = new A.btVector3(0, -GROSOR_DISCO / 2, 0);
  const eje = new A.btVector3(0, 1, 0);
  bisagra = new A.btHingeConstraint(
    columna.userData.cuerpoFisico,
    disco.userData.cuerpoFisico,
    pivoteA, pivoteB, eje, eje, true
  );
  fisica.getMundo().addConstraint(bisagra, true);

  reiniciar();
}


function decorarDisco(d) {
  const borde = new THREE.Mesh(new THREE.TorusGeometry(RADIO_DISCO, 0.06, 8, 48), material(PALETA.dorado));
  borde.rotation.x = Math.PI / 2;
  borde.position.y = GROSOR_DISCO / 2;
  d.add(borde);

  // Mástil central de rayas
  const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, ALTO_TECHO, 16), material(PALETA.rosa));
  mastil.position.y = ALTO_TECHO / 2;
  d.add(mastil);
  for (let i = 0; i < 5; i++) {
    const raya = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 6, 16), material(PALETA.celeste));
    raya.rotation.x = Math.PI / 2;
    raya.position.y = 0.4 + i * 0.45;
    d.add(raya);
  }

  // Techo
  const techo = new THREE.Mesh(new THREE.ConeGeometry(RADIO_DISCO + 0.4, 1.1, 24), material(PALETA.rosaFuerte));
  techo.position.y = ALTO_TECHO + 0.55;
  techo.castShadow = true;
  d.add(techo);
  const colores = [PALETA.rosa, PALETA.menta, PALETA.celeste, PALETA.lavanda, PALETA.amarillo, PALETA.melocoton];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const volante = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), material(colores[i % colores.length]));
    volante.scale.set(1, 0.7, 0.5);
    volante.position.set(Math.cos(a) * (RADIO_DISCO + 0.35), ALTO_TECHO - 0.05, Math.sin(a) * (RADIO_DISCO + 0.35));
    volante.rotation.y = -a + Math.PI / 2;
    const bombilla = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: PALETA.amarillo }));
    bombilla.position.set(Math.cos(a) * (RADIO_DISCO + 0.1), ALTO_TECHO + 0.15, Math.sin(a) * (RADIO_DISCO + 0.1));
    d.add(volante, bombilla);
  }
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), material(PALETA.dorado));
  bola.position.y = ALTO_TECHO + 1.15;
  d.add(bola);

  // Caballitos con su poste
  const coloresCaballo = [PALETA.menta, PALETA.lavanda, PALETA.celeste, PALETA.rosa];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const x = Math.cos(a) * RADIO_CABALLOS, z = Math.sin(a) * RADIO_CABALLOS;
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ALTO_TECHO, 8), material(PALETA.dorado));
    poste.position.set(x, ALTO_TECHO / 2, z);
    d.add(poste);

    const caballo = crearCaballito(coloresCaballo[i]);
    caballo.position.set(x, 1.0, z);
    caballo.rotation.y = -a; // mirando en el sentido de giro
    caballo.userData.fase = i * (Math.PI / 2);
    d.add(caballo);
    caballos.push(caballo);
  }
}


function crearCaballito(color) {
  const c = new THREE.Group();
  const mat = material(color);
  const crin = material(PALETA.rosaFuerte);

  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat);
  cuerpo.scale.set(0.7, 0.7, 1.2);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), mat);
  cabeza.scale.set(0.8, 0.9, 1.1);
  cabeza.position.set(0, 0.3, 0.32);
  const hocico = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), material(PALETA.crema));
  hocico.position.set(0, 0.24, 0.48);
  c.add(cuerpo, cabeza, hocico);

  for (const lado of [-1, 1]) {
    const oreja = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), mat);
    oreja.position.set(lado * 0.07, 0.47, 0.28);
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), material(PALETA.noche));
    ojo.position.set(lado * 0.09, 0.34, 0.45);
    c.add(oreja, ojo);
  }

  for (let k = 0; k < 4; k++) {
    const mecha = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), crin);
    mecha.position.set(0, 0.42 - k * 0.09, 0.2 - k * 0.08);
    c.add(mecha);
  }
  const cola = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), crin);
  cola.position.set(0, 0.05, -0.42);
  cola.rotation.x = -2.3;
  c.add(cola);
 
  for (const [x, z, rx] of [[-0.12, 0.2, 0.6], [0.12, 0.2, 0.6], [-0.12, -0.2, -0.6], [0.12, -0.2, -0.6]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 8), mat);
    pata.position.set(x, -0.25, z);
    pata.rotation.x = rx;
    c.add(pata);
  }
  c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return c;
}


// Peluches
function crearPeluche(tipo) {
  const p = new THREE.Group();
  const colores = { osito: PALETA.melocoton, conejito: PALETA.crema, pollito: PALETA.amarillo };
  const mat = material(colores[tipo]);

  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat);
  cabeza.position.y = 0.36;
  const barriga = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), material(PALETA.crema));
  barriga.scale.set(1, 1, 0.5);
  barriga.position.set(0, -0.02, 0.17);
  p.add(cuerpo, cabeza, barriga);

  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), material(PALETA.noche));
    ojo.position.set(lado * 0.07, 0.4, 0.17);
    const moflete = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), material(PALETA.rosaFuerte));
    moflete.scale.set(1, 0.6, 0.4);
    moflete.position.set(lado * 0.11, 0.33, 0.15);
    p.add(ojo, moflete);

    if (tipo === "osito") {
      const oreja = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat);
      oreja.position.set(lado * 0.14, 0.53, 0);
      p.add(oreja);
    } else if (tipo === "conejito") {
      const oreja = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), mat);
      oreja.position.set(lado * 0.08, 0.66, -0.02);
      oreja.rotation.z = lado * -0.2;
      const interior = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 4, 8), material(PALETA.rosa));
      interior.position.set(lado * 0.08, 0.66, 0.02);
      interior.rotation.z = lado * -0.2;
      p.add(oreja, interior);
    } else {
      const ala = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat);
      ala.scale.set(0.5, 1, 1);
      ala.position.set(lado * 0.26, 0.02, 0);
      p.add(ala);
    }
  }
  if (tipo === "pollito") {
    const pico = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 8), material(PALETA.melocoton));
    pico.rotation.x = Math.PI / 2;
    pico.position.set(0, 0.35, 0.22);
    p.add(pico);
  } else {
    const hocico = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), material(PALETA.crema));
    hocico.position.set(0, 0.33, 0.18);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), material(PALETA.noche));
    nariz.position.set(0, 0.35, 0.235);
    p.add(hocico, nariz);
  }
  p.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return p;
}


function sentarPeluches() {
  const tipos = ["osito", "conejito", "pollito"];
  const yAsiento = ALTO_COLUMNA + GROSOR_DISCO + 0.3;
  peluches = tipos.map((tipo, i) => {
    const a = (i / tipos.length) * Math.PI * 2 + Math.PI / 4; // entre caballitos
    const p = crearPeluche(tipo);
    p.position.set(CENTRO.x + Math.cos(a) * 1.15, yAsiento, CENTRO.z + Math.sin(a) * 1.15);
    p.rotation.y = -a - Math.PI / 2; // mirando hacia fuera
    escena.add(p);
    fisica.crearCuerpoRigido(p, fisica.formaCaja(0.5, 0.6, 0.45, 0.02), 0.4, {
      friccion: 0.8,
      restitucion: 0.3,
      amortiguacion: [0.05, 0.2],
    });
    return p;
  });
}


// Animaciones del tiovivo
function ponerMotor(v) {
  motor.v = v;
  bisagra.enableAngularMotor(true, v, IMPULSO_MOTOR); 
}


export function reiniciar() {
  parar(musica);
  ponerMotor(0);
  disco.position.set(CENTRO.x, ALTO_COLUMNA + GROSOR_DISCO / 2, CENTRO.z);
  disco.quaternion.identity();
  fisica.recolocar(disco);
  for (const c of caballos) c.position.y = 1.0;
  peluches.forEach((p) => fisica.eliminar(p));
  sentarPeluches();
  iniciarSubeBaja();
}


// Caballitos - suben y bajan con desfase; la amplitud depende de la velocidad del motor
function iniciarSubeBaja() {
  const fase = { f: 0 };
  tween(fase)
    .to({ f: Math.PI * 2 }, 1600)
    .repeat(Infinity)
    .onUpdate(() => {
      const amplitud = 0.22 * Math.min(Math.abs(motor.v) / V_PASEO, 1);
      for (const c of caballos) c.position.y = 1.0 + amplitud * Math.sin(fase.f + c.userData.fase);
    })
    .start();
}


export function girarSinFin() {
  tween(motor)
    .to({ v: V_PASEO * 0.8 }, 1500)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => ponerMotor(motor.v))
    .start();
}


export function arrancar(alTerminar) {
  const velocidad = (v, ms, easing) =>
    tween(motor).to({ v }, ms).easing(easing).onUpdate(() => ponerMotor(motor.v));

  const arranque = velocidad(V_PASEO, 1300, TWEEN.Easing.Quadratic.InOut);
  const paseo = velocidad(V_PASEO, 2200, TWEEN.Easing.Linear.None);
  const embalarse = velocidad(V_LOCA, 1200, TWEEN.Easing.Quadratic.In);
  const locura = velocidad(V_LOCA, 2000, TWEEN.Easing.Linear.None);
  const frenar = velocidad(0, 3000, TWEEN.Easing.Quadratic.Out);
  arranque.onStart(() => reproducir(musica));
  if (alTerminar) frenar.onComplete(alTerminar);

  arranque.chain(paseo);
  paseo.chain(embalarse);
  embalarse.chain(locura);
  locura.chain(frenar);
  arranque.start();
}
