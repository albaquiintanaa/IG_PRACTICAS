import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Ammo from "ammojs-typed";

import { PALETA, material } from "./paleta.js";
import { crearHabitacion, crearLuces } from "./escena.js";
import * as fisica from "./fisica.js";
import { tween, TWEEN, actualizarAnimaciones, pararAnimaciones } from "./animacion.js";
import { Grabadora } from "./grabacion.js";
import * as reloj from "./juguetes/reloj.js";
import * as caja from "./juguetes/caja.js";
import * as tiovivo from "./juguetes/tiovivo.js";
import * as dominos from "./juguetes/dominos.js";
import * as soldadito from "./juguetes/soldadito.js";
import * as tren from "./juguetes/tren.js";
import { cargarSonido, reproducir, parar } from "./sonido.js";

let scene, camera, renderer, controls, clock;
let listener, grabadora, luces;
let sonidoFondo = null;
let empezado = false;

const raycaster = new THREE.Raycaster();
const raton = new THREE.Vector2();

const pelotas = [];

const MAX_PELOTAS = 12;
const LAMPARA_TENUE = 8;
const LAMPARA_ENCENDIDA = 120;
const COLORES_PELOTA = [PALETA.rosaFuerte, PALETA.menta, PALETA.celeste, PALETA.amarillo, PALETA.lavanda];

// se carga de forma asíncrona
Ammo(Ammo).then(start);

function start(AmmoLib) {
  initGraficos();
  fisica.initFisica(AmmoLib);
  crearHabitacion(scene);
  luces = crearLuces(scene);
  initAudio();
  reloj.crearReloj(scene, listener);
  caja.crearCaja(scene, listener);
  tiovivo.crearTiovivo(scene, listener);
  dominos.crearDominos(scene);
  soldadito.crearSoldadito(scene);
  tren.crearTren(scene, listener);
  luces.luzLampara.intensity = LAMPARA_TENUE;
  initEventos();
  animationLoop();
}


function initGraficos() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETA.noche);
  scene.fog = new THREE.Fog(PALETA.lavandaOscura, 25, 60);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 7, 18);
  scene.add(camera); // la cámara lleva el AudioListener

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.useLegacyLights = false; 
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49; // tener en cuenta el suelo
  controls.minDistance = 4;
  controls.maxDistance = 35;
  controls.update();

  clock = new THREE.Clock();
}


function initAudio() {
  listener = new THREE.AudioListener();
  camera.add(listener);
  sonidoFondo = cargarSonido(listener, "src/sounds/fondo.mp3", { volumen: 0.25, bucle: true });
  grabadora = new Grabadora(renderer.domElement, listener);
}


// Eventos
function initEventos() {
  document.getElementById("inicio").addEventListener("click", empezar);
  renderer.domElement.addEventListener("dblclick", lanzarPelota);
  window.addEventListener("resize", alRedimensionar);

  window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "r": reiniciar(); break;
      case "g": grabadora.alternar(); break;
    }
  });
}


function empezar() {
  if (empezado) return;
  empezado = true;
  listener.context.resume().then(() => {
    document.getElementById("inicio").classList.add("oculto");
    mostrarToast();
    iniciarHistoria();
  });
}


// Historia => cuco -> caja de música -> soldadito -> dominó -> tren -> tiovivo
function iniciarHistoria() {
  controls.enabled = false;
  camera.position.set(0, 12, 30);
  controls.target.set(0, 2, 0);

  const c = reloj.CENTRO_RELOJ;
  const acercarse = moverCamara([c.x + 1.5, c.y - 0.3, c.z + 9], [c.x, c.y - 0.3, c.z], 3000);
  acercarse.onComplete(() =>
    reloj.darLaHora(() => {
      encenderLampara();
      verCaja();
    })
  );
  acercarse.start();
}


function verCaja() {
  const k = caja.CENTRO_CAJA;
  const aCaja = moverCamara([k.x + 3, k.y + 1.8, k.z + 5], [k.x, k.y + 0.4, k.z], 2200);
  aCaja.onComplete(() => caja.abrir(verDesfile));
  aCaja.start();
}


function verDesfile() {
  const d = soldadito.centroDesfile();
  const aDesfile = moverCamara([d.x + 1.5, 3.6, d.z + 8], [d.x + 1, 0.8, d.z + 1], 2200);
  aDesfile.onComplete(() => soldadito.desfilar(verTren, camera.position.clone()));
  aDesfile.start();
}


function verTren() {
  caja.pararBaile();
  const p = dominos.puntoCaida();
  const espera = tren.llegarA(p);
  moverCamara([p.x - 2.5, 3.8, p.z + 7], [p.x - 1.5, 0.5, p.z - 1.5], 2000).start();
  tween({ t: 0 }).to({ t: 1 }, espera + 1000).onComplete(verTiovivo).start();
}


function verTiovivo() {
  const t = tiovivo.CENTRO_TIOVIVO;
  const aTiovivo = moverCamara([t.x + 3.5, t.y + 2.8, t.z + 7.5], [t.x, t.y, t.z], 2200);
  aTiovivo.onComplete(() =>
    tiovivo.arrancar(() => {
      // cuando termina => plano general, control libre y música de fondo
      reproducir(sonidoFondo);
      tiovivo.girarSinFin();
      caja.bailarSinFin();
      soldadito.saludarSinFin(new THREE.Vector3(0, 7, 18));
      const alejarse = moverCamara([0, 7, 18], [0, 2, 0], 2500);
      alejarse.onComplete(() => (controls.enabled = true));
      alejarse.start();
    })
  );
  aTiovivo.start();
}


// tween que mueve a la vez la posición de la cámara y el punto al que mira
function moverCamara(posicion, objetivo, duracion, easing = TWEEN.Easing.Cubic.InOut) {
  const desdePos = new THREE.Vector3();
  const desdeObj = new THREE.Vector3();
  const hastaPos = new THREE.Vector3(...posicion);
  const hastaObj = new THREE.Vector3(...objetivo);
  return tween({ t: 0 })
    .to({ t: 1 }, duracion)
    .easing(easing)
    .onStart(() => {
      desdePos.copy(camera.position);
      desdeObj.copy(controls.target);
    })
    .onUpdate((o) => {
      camera.position.lerpVectors(desdePos, hastaPos, o.t);
      controls.target.lerpVectors(desdeObj, hastaObj, o.t);
    });
}


function encenderLampara() {
  tween(luces.luzLampara)
    .to({ intensity: LAMPARA_ENCENDIDA }, 1500)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
}


function reiniciar() {
  pararAnimaciones();
  reloj.reiniciar();
  caja.reiniciar();
  tiovivo.reiniciar();
  luces.luzLampara.intensity = LAMPARA_TENUE;
  dominos.reiniciar();
  soldadito.reiniciar();
  tren.reiniciar();
  parar(sonidoFondo);
  pelotas.splice(0).forEach((p) => fisica.eliminar(p));
  if (empezado) {
    mostrarToast();
    iniciarHistoria();
  }
}


function lanzarPelota(evento) {
  if (!empezado) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raton.set(
    ((evento.clientX - rect.left) / rect.width) * 2 - 1,
    -((evento.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(raton, camera);

  const radio = 0.28;
  const color = COLORES_PELOTA[Math.floor(Math.random() * COLORES_PELOTA.length)];
  const pelota = new THREE.Mesh(new THREE.SphereGeometry(radio, 24, 16), material(color));
  pelota.castShadow = true;
  pelota.position.copy(raycaster.ray.direction).add(raycaster.ray.origin);
  scene.add(pelota);

  const velocidad = raycaster.ray.direction.clone().multiplyScalar(16);
  fisica.crearCuerpoRigido(pelota, fisica.formaEsfera(radio), 1, { velocidad, restitucion: 0.6 });

  pelota.scale.setScalar(0.01);
  tween(pelota.scale).to({ x: 1, y: 1, z: 1 }, 250).easing(TWEEN.Easing.Back.Out).start();

  pelotas.push(pelota);
  if (pelotas.length > MAX_PELOTAS) fisica.eliminar(pelotas.shift());
}


function alRedimensionar() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Toast con los controles
let temporizadorToast = null;
function mostrarToast(duracion = 6000) {
  const toast = document.getElementById("toast");
  toast.classList.add("visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("visible"), duracion);
}


// tween mueve las cosas, avanza el tren, la física reacciona y se dibuja la escena
function animationLoop() {
  requestAnimationFrame(animationLoop);
  const dt = Math.min(clock.getDelta(), 0.1);
  actualizarAnimaciones();
  tren.actualizar(dt);
  fisica.actualizarFisica(dt);
  controls.update();
  renderer.render(scene, camera);
}
