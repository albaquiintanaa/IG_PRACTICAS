// Caja de musica + bailarina

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETA, material } from "../paleta.js";
import * as fisica from "../fisica.js";
import { tween, TWEEN } from "../animacion.js";
import { cargarSonido, reproducir, parar } from "../sonido.js";

const POSICION = new THREE.Vector3(-7, 0, -3);
export const CENTRO_CAJA = POSICION.clone().setY(1.2);

const ANCHO = 2.4, ALTO = 1.2, FONDO = 1.8;
const Y_ESCONDIDA = 0.1;
const Y_FUERA = ALTO + 0.12 + 0.04; 
const DURACION_SIN_MUSICA = 9000; 
const TIEMPO_EXHIBICION = 3500;
const RETRASO_MUSICA = 1000; 
const DURACION_SUBIDA = 1100; 

let escena = null;
let musica = null;
let pivoteTapa, pivoteLlave, elevador, giro;
let brazoIzq, brazoDer, piernaDer;
let sonando = false;
let bailes = [];
let avisarFin = null;
const notas = [];


// -----Construcción del jueguete -----
export function crearCaja(scene, listener) {
  escena = scene;
  const caja = new THREE.Group();
  caja.position.copy(POSICION);
  caja.rotation.y = 0.5;
  scene.add(caja);

  // Base
  const base = new THREE.Mesh(new RoundedBoxGeometry(ANCHO, ALTO, FONDO, 3, 0.1), material(PALETA.rosa));
  base.position.y = ALTO / 2 + 0.12;
  base.castShadow = base.receiveShadow = true;
  caja.add(base);

  // Ribete dorado y patitas
  const ribete = new THREE.Mesh(new RoundedBoxGeometry(ANCHO + 0.06, 0.1, FONDO + 0.06, 2, 0.04), material(PALETA.dorado));
  ribete.position.y = 0.45;
  caja.add(ribete);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const pata = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), material(PALETA.dorado));
      pata.position.set(x * (ANCHO / 2 - 0.2), 0.12, z * (FONDO / 2 - 0.2));
      caja.add(pata);
    }
  }

  // Terciopelo y plataforma giratoria
  const techo = ALTO + 0.12;
  const terciopelo = new THREE.Mesh(new THREE.BoxGeometry(ANCHO - 0.2, 0.02, FONDO - 0.2), material(PALETA.lavanda));
  terciopelo.position.y = techo + 0.005;
  caja.add(terciopelo);
  const plataforma = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 32), material(PALETA.dorado));
  plataforma.position.y = techo + 0.02;
  caja.add(plataforma);

  // Tapa
  pivoteTapa = new THREE.Object3D();
  pivoteTapa.position.set(0, techo, -FONDO / 2);
  caja.add(pivoteTapa);
  const tapa = new THREE.Mesh(new RoundedBoxGeometry(ANCHO, 0.25, FONDO, 3, 0.08), material(PALETA.rosaFuerte));
  tapa.position.set(0, 0.125, FONDO / 2);
  tapa.castShadow = true;
  pivoteTapa.add(tapa);

  const corazon = crearCorazon(0.22, PALETA.dorado);
  corazon.rotation.x = -Math.PI / 2;
  corazon.position.set(0, 0.26, FONDO / 2);
  pivoteTapa.add(corazon);

  const espejo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), material(PALETA.celeste, { emisivo: 0x223344 }));
  espejo.scale.set(1.3, 1, 1);
  espejo.rotation.x = Math.PI / 2; // mirando hacia abajo con la tapa cerrada
  espejo.position.set(0, -0.005, FONDO / 2);
  pivoteTapa.add(espejo);

  // Llave de cuerda
  pivoteLlave = new THREE.Object3D();
  pivoteLlave.position.set(ANCHO / 2 + 0.05, ALTO / 2 + 0.12, 0);
  caja.add(pivoteLlave);
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 10), material(PALETA.dorado));
  eje.rotation.z = Math.PI / 2;
  eje.position.x = 0.15;
  pivoteLlave.add(eje);
  for (const lado of [-1, 1]) {
    const oreja = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 20), material(PALETA.dorado));
    oreja.rotation.y = Math.PI / 2;
    oreja.position.set(0.32, lado * 0.14, 0);
    pivoteLlave.add(oreja);
  }

  // Bailarina
  elevador = new THREE.Object3D();
  caja.add(elevador);
  giro = new THREE.Object3D();
  elevador.add(giro);
  giro.add(crearBailarina());

  // Física: la base es estática y la tapa cinemática
  fisica.crearCuerpoRigido(base, fisica.formaCaja(ANCHO, ALTO, FONDO), 0);
  fisica.crearCuerpoRigido(tapa, fisica.formaCaja(ANCHO, 0.25, FONDO, 0.02), 0, { cinematico: true });

  musica = cargarSonido(listener, "src/sounds/caja_musica.mp3", { volumen: 0.5 }); // suena una sola vez
  reiniciar();
  return caja;
}


function crearCorazon(t, color) {
  const s = new THREE.Shape();
  s.moveTo(0, -t);
  s.bezierCurveTo(-t * 1.2, -t * 0.2, -t * 0.9, t * 0.9, 0, t * 0.35);
  s.bezierCurveTo(t * 0.9, t * 0.9, t * 1.2, -t * 0.2, 0, -t);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  geo.center();
  return new THREE.Mesh(geo, material(color));
}

// Bailarina
function crearBailarina() {
  const b = new THREE.Group();
  const piel = material(PALETA.melocoton);
  const vestido = material(PALETA.rosa);
  const pelo = material(PALETA.lavandaOscura);

  // Piernas - pivote en la cadera, la pierna cuelga hacia -Y
  const crearPierna = (lado) => {
    const pivote = new THREE.Object3D();
    pivote.position.set(lado * 0.05, 0.42, 0);
    const pierna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.4, 10), material(PALETA.crema));
    pierna.position.y = -0.2;
    const zapatilla = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), material(PALETA.rosaFuerte));
    zapatilla.scale.set(0.8, 0.7, 1.3);
    zapatilla.position.y = -0.4;
    pivote.add(pierna, zapatilla);
    b.add(pivote);
    return pivote;
  };
  crearPierna(-1);
  piernaDer = crearPierna(1);

  // Tutú y cuerpo
  const tutu = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.34, 0.12, 28), vestido);
  tutu.position.y = 0.46;
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 8, 28), material(PALETA.rosaFuerte));
  volante.rotation.x = Math.PI / 2;
  volante.position.y = 0.41;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.28, 16), vestido);
  torso.position.y = 0.62;
  b.add(tutu, volante, torso);

  // Cabeza 
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), piel);
  cabeza.position.y = 0.88;
  const melena = new THREE.Mesh(new THREE.SphereGeometry(0.158, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), pelo);
  melena.position.set(0, 0.885, -0.01);
  const mono = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), pelo);
  mono.position.set(0, 1.02, -0.06);
  const tiara = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 20, Math.PI), material(PALETA.dorado));
  tiara.position.set(0, 0.97, 0.06);
  tiara.rotation.x = -0.4;
  b.add(cabeza, melena, mono, tiara);
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), material(PALETA.noche));
    ojo.position.set(lado * 0.05, 0.89, 0.14);
    const moflete = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), material(PALETA.rosaFuerte));
    moflete.scale.set(1, 0.6, 0.4);
    moflete.position.set(lado * 0.085, 0.85, 0.125);
    b.add(ojo, moflete);
  }

  // Brazos - pivote en el hombro, el brazo apunta hacia +Y con rotación 0
  const crearBrazo = (lado) => {
    const pivote = new THREE.Object3D();
    pivote.position.set(lado * 0.1, 0.73, 0);
    const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.3, 8), piel);
    brazo.position.y = 0.15;
    pivote.add(brazo);
    b.add(pivote);
    return pivote;
  };
  brazoIzq = crearBrazo(-1);
  brazoDer = crearBrazo(1);

  b.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return b;
}

// ----- Animaciones del juguete -----
function ponerBrazos(ang) {
  brazoIzq.rotation.z = ang;
  brazoDer.rotation.z = -ang;
}


export function reiniciar() {
  sonando = false;
  bailes = [];
  avisarFin = null;
  parar(musica);
  notas.splice(0).forEach(quitarNota);
  pivoteTapa.rotation.x = 0;
  pivoteLlave.rotation.x = 0;
  elevador.position.y = Y_ESCONDIDA;
  giro.rotation.y = 0;
  ponerBrazos(2.6);
  piernaDer.rotation.x = 0;
}


export function abrir(alTerminar) {
  avisarFin = alTerminar;
  // Se da cuerda - dos vueltas
  const cuerda = tween(pivoteLlave.rotation).to({ x: Math.PI * 4 }, 800).easing(TWEEN.Easing.Quadratic.InOut);

  // Se abre la tapa + rebotito
  const tapa = tween(pivoteTapa.rotation).to({ x: -1.85 }, 900).easing(TWEEN.Easing.Back.Out);

  // Sube la bailarina
  const subir = tween(elevador.position).to({ y: Y_FUERA }, DURACION_SUBIDA).easing(TWEEN.Easing.Elastic.Out);
  subir.onStart(() => {
    tween({ t: 0 })
      .to({ t: 1 }, RETRASO_MUSICA)
      .onComplete(() => {
        sonando = true;
        reproducir(musica);
        programarNota();
      })
      .start();
    const brazos = { a: 2.6 };
    tween(brazos).to({ a: 0.35 }, 900).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => ponerBrazos(brazos.a)).start();
  });

  // Baile: giro continuo + brazos y pierna
  subir.onComplete(() => {
    empezarBaile();

    const duracion =
      musica && musica.buffer
        ? musica.buffer.duration * 1000 + RETRASO_MUSICA - DURACION_SUBIDA
        : DURACION_SIN_MUSICA;
    tween({ t: 0 }).to({ t: 1 }, Math.max(duracion, 1000)).onComplete(() => (sonando = false)).start();

    if (avisarFin) {
      const siguiente = avisarFin;
      avisarFin = null;
      tween({ t: 0 }).to({ t: 1 }, TIEMPO_EXHIBICION).onComplete(siguiente).start();
    }
  });

  cuerda.chain(tapa);
  tapa.chain(subir);
  cuerda.start();
}


function empezarBaile() {
  giro.rotation.y %= Math.PI * 2; // el tween de giro va de aquí a una vuelta completa
  bailes = [
    tween(giro.rotation).to({ y: Math.PI * 2 }, 3000).repeat(Infinity),
    tween(pivoteLlave.rotation).to({ x: pivoteLlave.rotation.x + Math.PI * 2 }, 3000).repeat(Infinity),
  ];
  const brazos = { a: 0.35 };
  bailes.push(
    tween(brazos)
      .to({ a: 1.5 }, 1500)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .yoyo(true)
      .repeat(Infinity)
      .onUpdate(() => ponerBrazos(brazos.a)),
    tween(piernaDer.rotation)
      .to({ x: 1.1 }, 1500)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .yoyo(true)
      .repeat(Infinity)
  );
  bailes.forEach((t) => t.start());
}


export function bailarSinFin() {
  if (bailes.length === 0) empezarBaile();
}


export function pararBaile() {
  if (bailes.length === 0) return;
  sonando = false;
  bailes.forEach((t) => t.stop());
  bailes = [];

  const vueltaCompleta = Math.ceil(giro.rotation.y / (Math.PI * 2)) * Math.PI * 2;
  tween(giro.rotation).to({ y: vueltaCompleta }, 1400).easing(TWEEN.Easing.Quadratic.Out).start();

  const brazos = { a: brazoDer.rotation.z * -1 };
  tween(brazos).to({ a: 0.35 }, 800).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => ponerBrazos(brazos.a)).start();
  tween(piernaDer.rotation).to({ x: 0 }, 800).easing(TWEEN.Easing.Quadratic.Out).start();
}


// Notas musicales
function programarNota() {
  tween({ t: 0 })
    .to({ t: 1 }, 650)
    .onComplete(() => {
      if (!sonando) return;
      crearNota();
      programarNota();
    })
    .start();
}

const COLORES_NOTA = [PALETA.rosaFuerte, PALETA.lavanda, PALETA.celeste, PALETA.dorado, PALETA.menta];


function crearNota() {
  const color = COLORES_NOTA[Math.floor(Math.random() * COLORES_NOTA.length)];
  // cada nota se desvanece por separado
  const mat = new THREE.MeshToonMaterial({ color, transparent: true, opacity: 1 });
  const nota = new THREE.Group();
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mat);
  cabeza.scale.set(1.25, 0.9, 0.6);
  const plica = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.26, 0.022), mat);
  plica.position.set(0.085, 0.13, 0);
  const bandera = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.022), mat);
  bandera.position.set(0.13, 0.25, 0);
  bandera.rotation.z = -0.5;
  nota.add(cabeza, plica, bandera);

  nota.position.set(
    POSICION.x + (Math.random() - 0.5) * 1.6,
    ALTO + 0.5,
    POSICION.z + (Math.random() - 0.5) * 1.0
  );
  nota.userData.material = mat;
  escena.add(nota);
  notas.push(nota);

  const x0 = nota.position.x;
  const deriva = (Math.random() - 0.5) * 1.2;
  const p = { t: 0 };
  tween(p)
    .to({ t: 1 }, 2600)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      nota.position.y = ALTO + 0.5 + p.t * 2.5;
      nota.position.x = x0 + Math.sin(p.t * Math.PI * 2) * 0.25 + deriva * p.t;
      nota.rotation.z = Math.sin(p.t * Math.PI * 3) * 0.3;
      mat.opacity = 1 - p.t;
    })
    .onComplete(() => {
      const i = notas.indexOf(nota);
      if (i >= 0) notas.splice(i, 1);
      quitarNota(nota);
    })
    .start();
}

function quitarNota(nota) {
  escena.remove(nota);
  nota.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  nota.userData.material.dispose();
}
