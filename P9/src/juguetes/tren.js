// tren (tween + cuerpos cinemáticos de ammo)

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETA, material } from "../paleta.js";
import * as fisica from "../fisica.js";
import { tween, TWEEN } from "../animacion.js";
import { cargarSonido, reproducir, parar } from "../sonido.js";

const CENTRO_VIA = new THREE.Vector2(0, -1);
const RADIO_X = 12, RADIO_Z = 10;
const ANCHO_VIA = 0.6;

const V_NORMAL = 3.5; 
const SEPARACION_VAGONES = 1.75;
const MORRO = 0.85; 
const DISTANCIA_PITIDO = 3.0; 
const ADELANTO_PITIDO = 1.0; 

let escena = null;
let via = null; 
let largoVia = 0;
const tren = { s: 0, v: V_NORMAL };
const vagones = [];
let chimenea = null;
let humo = [];
let humeando = false;
let silbato = null;
let pitar = false;
let pitarSoloUnaVez = false;
let sPitido = 0; 


function puntoElipse(a, desplazamiento = 0) {
  const x = RADIO_X * Math.cos(a), z = RADIO_Z * Math.sin(a);
  const n = new THREE.Vector2(x / (RADIO_X * RADIO_X), z / (RADIO_Z * RADIO_Z)).normalize();
  return new THREE.Vector3(CENTRO_VIA.x + x + n.x * desplazamiento, 0, CENTRO_VIA.y + z + n.y * desplazamiento);
}


function curvaElipse(desplazamiento) {
  const puntos = [];
  const N = 64;
  for (let i = 0; i < N; i++) puntos.push(puntoElipse((i / N) * Math.PI * 2, desplazamiento));
  return new THREE.CatmullRomCurve3(puntos, true); // cerrada
}


function crearVia() {
  via = curvaElipse(0);
  largoVia = via.getLength();

  // Raíles
  for (const lado of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(curvaElipse(lado * ANCHO_VIA * 0.5), 400, 0.04, 6, true),
      material(PALETA.dorado)
    );
    rail.position.y = 0.11;
    rail.castShadow = true;
    escena.add(rail);
  }


  const n = Math.floor(largoVia / 0.55);
  const geo = new RoundedBoxGeometry(ANCHO_VIA + 0.35, 0.06, 0.2, 1, 0.02);
  const colores = [material(PALETA.madera), material(PALETA.lavanda)];
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const p = via.getPointAt(u);
    const t = via.getTangentAt(u);
    const traviesa = new THREE.Mesh(geo, colores[i % 2]);
    traviesa.position.set(p.x, 0.05, p.z);
    traviesa.rotation.y = Math.atan2(t.x, t.z);
    traviesa.receiveShadow = true;
    escena.add(traviesa);
  }
}


// Tren (los modelos miran hacia +Z)
function ruedas(grupo, largo, color) {
  for (const z of [-largo * 0.3, largo * 0.3]) {
    for (const lado of [-1, 1]) {
      const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), material(color));
      rueda.rotation.z = Math.PI / 2;
      rueda.position.set(lado * 0.36, 0.22, z);
      const tapacubos = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), material(PALETA.dorado));
      tapacubos.position.set(lado * 0.41, 0.22, z);
      grupo.add(rueda, tapacubos);
    }
  }
}


function crearLocomotora() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.22, 1.5, 2, 0.06), material(PALETA.lavandaOscura));
  base.position.y = 0.35;
  const caldera = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.85, 20), material(PALETA.menta));
  caldera.rotation.x = Math.PI / 2;
  caldera.position.set(0, 0.72, 0.28);
  const frente = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 20), material(PALETA.dorado));
  frente.rotation.x = Math.PI / 2;
  frente.position.set(0, 0.72, 0.72);
  const cabina = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.7, 0.55, 2, 0.06), material(PALETA.rosaFuerte));
  cabina.position.set(0, 0.8, -0.45);
  const techo = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.08, 0.7, 2, 0.03), material(PALETA.lavanda));
  techo.position.set(0, 1.19, -0.45);
  const ventana = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.22, 0.3, 2, 0.05), material(PALETA.celeste));
  ventana.position.set(0, 0.92, -0.45);
  chimenea = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.32, 14), material(PALETA.dorado));
  chimenea.position.set(0, 1.12, 0.45);
  const campana = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), material(PALETA.amarillo));
  campana.position.set(0, 1.03, 0.1);
  const quitapiedras = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 4), material(PALETA.rosaFuerte));
  quitapiedras.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  quitapiedras.position.set(0, 0.3, 0.85);
  g.add(base, caldera, frente, cabina, techo, ventana, chimenea, campana, quitapiedras);
  
  // Carita 
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), material(PALETA.noche));
    ojo.position.set(lado * 0.1, 0.8, 0.76);
    const moflete = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), material(PALETA.rosaFuerte));
    moflete.scale.set(1, 0.6, 0.4);
    moflete.position.set(lado * 0.17, 0.68, 0.76);
    g.add(ojo, moflete);
  }
  ruedas(g, 1.5, PALETA.noche);
  g.userData.forma = [0.8, 1.0, 1.7];
  return g;
}


function crearVagon(color, carga) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.2, 1.3, 2, 0.06), material(PALETA.lavandaOscura));
  base.position.y = 0.34;
  const caja = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.42, 1.2, 2, 0.08), material(color));
  caja.position.y = 0.64;
  g.add(base, caja);
  
  // bolitas de colores
  for (let i = 0; i < 5; i++) {
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), material(carga[i % carga.length]));
    bola.position.set((i % 2 ? 0.14 : -0.14), 0.9, -0.4 + i * 0.2);
    g.add(bola);
  }
  ruedas(g, 1.3, PALETA.noche);
  g.userData.forma = [0.8, 0.9, 1.4];
  return g;
}


export function crearTren(scene, listener) {
  escena = scene;
  silbato = cargarSonido(listener, "src/sounds/chuchu.mp3", { volumen: 0.8 });
  crearVia();

  vagones.push(crearLocomotora());
  vagones.push(crearVagon(PALETA.amarillo, [PALETA.rosa, PALETA.celeste]));
  vagones.push(crearVagon(PALETA.celeste, [PALETA.menta, PALETA.lavanda]));
  vagones.push(crearVagon(PALETA.rosa, [PALETA.amarillo, PALETA.melocoton]));

  for (const v of vagones) {
    v.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(v);
  }
  colocarVagones();

  // vagón: cuerpo cinemático + caja que lo envuelve
  for (const v of vagones) {
    const [sx, sy, sz] = v.userData.forma;
    const colision = new THREE.Object3D();
    colision.position.y = sy / 2;
    v.add(colision);
    fisica.crearCuerpoRigido(colision, fisica.formaCaja(sx, sy, sz, 0.02), 0, { cinematico: true });
  }

  reiniciar();
}


function colocarVagones() {
  for (let i = 0; i < vagones.length; i++) {
    const s = (((tren.s - i * SEPARACION_VAGONES) % largoVia) + largoVia) % largoVia;
    const u = s / largoVia;
    const p = via.getPointAt(u);
    const t = via.getTangentAt(u);
    vagones[i].position.set(p.x, 0, p.z);
    vagones[i].rotation.y = Math.atan2(t.x, t.z);
  }
}


export function actualizar(dt) {
  const paso = tren.v * dt;
  if (pitar) {
    const falta = (((sPitido - (tren.s + MORRO)) % largoVia) + largoVia) % largoVia;
    if (falta <= paso) {
      reproducir(silbato);
      if (pitarSoloUnaVez) pitar = false; // solo una vez
    }
  }
  tren.s = (tren.s + paso) % largoVia;
  colocarVagones();
}


// Humo
const _p = new THREE.Vector3();
function programarHumo() {
  tween({ t: 0 })
    .to({ t: 1 }, 320)
    .onComplete(() => {
      if (!humeando) return;
      soltarNube();
      programarHumo();
    })
    .start();
}


function soltarNube() {
  const mat = new THREE.MeshToonMaterial({ color: PALETA.crema, transparent: true, opacity: 0.9 });
  const nube = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat);
  chimenea.getWorldPosition(_p);
  nube.position.copy(_p).add(new THREE.Vector3(0, 0.2, 0));
  nube.scale.setScalar(0.4);
  escena.add(nube);
  humo.push(nube);
  const y0 = nube.position.y;
  const e = { t: 0 };
  tween(e)
    .to({ t: 1 }, 1500)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      nube.position.y = y0 + e.t * 1.2;
      nube.scale.setScalar(0.4 + e.t * 1.4);
      mat.opacity = 0.9 * (1 - e.t);
    })
    .onComplete(() => quitarNube(nube))
    .start();
}


function quitarNube(nube) {
  const i = humo.indexOf(nube);
  if (i >= 0) humo.splice(i, 1);
  escena.remove(nube);
  nube.geometry.dispose();
  nube.material.dispose();
}

// Historia
export function reiniciar() {
  parar(silbato);
  pitar = false;
  pitarSoloUnaVez = false;
  tren.v = V_NORMAL;
  humo.slice().forEach(quitarNube);
  humeando = true;
  programarHumo();
}


function distanciaEnVia(punto) {
  let mejor = 0, dMin = Infinity;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const d = via.getPointAt(i / N).distanceToSquared(punto);
    if (d < dMin) { dMin = d; mejor = i / N; }
  }
  return mejor * largoVia;
}


export function llegarA(punto) {
  const RAMPA = 0.7; // s de aceleración/frenada
  const sFicha = distanciaEnVia(punto);
  let d = (((sFicha - (tren.s + MORRO)) % largoVia) + largoVia) % largoVia;


  let T = d / V_NORMAL;
  if (d < 3) { d += largoVia; T = 5.5; } // si acaba de pasar: vuelta rápida
  else if (T > 5.5) T = 5; // si está lejos: acelera
  else if (T < 4) T = 4; // si está cerca: frena un poco

  const v0 = tren.v;
  const v = Math.max(0.8, (d - v0 * RAMPA * 0.5) / (T - RAMPA * 0.5));

  const antes = DISTANCIA_PITIDO + v * ADELANTO_PITIDO;
  sPitido = (((sFicha - antes) % largoVia) + largoVia) % largoVia;
  pitar = true;
  pitarSoloUnaVez = true;

  tween(tren).to({ v }, RAMPA * 1000).easing(TWEEN.Easing.Quadratic.InOut).start();
  // vuelve a su velocidad normal
  tween(tren).to({ v: V_NORMAL }, 1500).easing(TWEEN.Easing.Quadratic.InOut).delay(T * 1000 + 1200).start();
  return T * 1000;
}
