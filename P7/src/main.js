import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { E } from "./estado.js";
import { scale, maxElev, kmAlto, exageracion, colorMar } from "./config.js";
import { LeeAlturas, CreaLienzo, Plano, MarAlrededor } from "./terreno.js";
import { CargaCosta } from "./costa.js";
import { CargaOSM } from "./osm.js";
import { CargaIncendios, ActualizaIncendios, LatidoFrente } from "./incendios.js";
import { CargaFIRMS, ActualizaFIRMS } from "./firms.js";
import { actualizarFecha, ActualizaLuz, Reiniciar } from "./tiempo.js";
import {
  InicializaInterfaz,
  CambiaPausa,
  ActualizaTexto,
  ActualizaVuelo,
} from "./interfaz.js";

// ----------------- LLAMADA DE FUNCIONES -----------------

init();
animate();

function init() {
  // ----------------- ESCENA Y CÁMARA -----------------

  E.scene = new THREE.Scene();

  E.scene.background = new THREE.Color(colorMar[0] / 255, colorMar[1] / 255, colorMar[2] / 255);
  E.scene.fog = new THREE.Fog(E.scene.background.clone(), 6, 16);

  E.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
  E.camera.position.set(0, -4, 3);

  E.renderer = new THREE.WebGLRenderer();
  E.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(E.renderer.domElement);

  E.camcontrols = new OrbitControls(E.camera, E.renderer.domElement);


  // ----------------- LUCES -----------------

  //Luz ambiente 
  E.light = new THREE.AmbientLight(0xffffff, 0.4);
  E.scene.add(E.light);

  //Luz direccional para que se aprecien laderas y barrancos
  E.sol = new THREE.DirectionalLight(0xffffff, 0.8);
  E.sol.position.set(-3, 3, 4); //desde el noroeste
  E.scene.add(E.sol);

  //Luz puntual para el fuego: se coloca sobre los focos activos y parpadea
  E.luzFuego = new THREE.PointLight(0xff6a00, 0, 1.2);
  E.scene.add(E.luzFuego);

  E.scene.add(E.grupoOSM);


  // ----------------- INTERFAZ Y TECLADO -----------------

  InicializaInterfaz();

  window.addEventListener("keydown", (evento) => {
    //Espacio = pausa
    if (evento.code === "Space") {
      evento.preventDefault();
      CambiaPausa();
    }
    //R = reiniciar
    if (evento.key === "r" || evento.key === "R") Reiniciar();
    
  });

  window.addEventListener("resize", onWindowResize, false);


  // ----------------- MAPA -----------------

  new THREE.TextureLoader().load("src/data/heightmap_gc.png", function (texture) {
    const aspecto = texture.image.width / texture.image.height;
    E.mapsy = scale;
    E.mapsx = E.mapsy * aspecto;

    E.metro = E.mapsy / (kmAlto * 1000);
    E.dscale = maxElev * E.metro * exageracion;
    console.log("Dimensiones " + E.mapsx + ", " + E.mapsy + " · displacementScale " + E.dscale);

    E.divx = 1000; 
    E.divy = Math.round(E.divx / aspecto);

    //Guarda los píxeles del heightmap para colocar objetos sobre el relieve
    LeeAlturas(texture.image);

    CreaLienzo();
    Plano(0, 0, 0, E.mapsx, E.mapsy, E.divx, E.divy, E.texturaLienzo, texture, E.dscale);
    MarAlrededor();

    //Vista general
    E.camera.position.set(-0.195, 0.407, 3.523);
    E.camcontrols.target.set(-0.226, 0.157, 0.124);
    E.camcontrols.update();
    E.vistaGeneral = {
      pos: E.camera.position.clone(),
      target: E.camcontrols.target.clone(),
    };

    CargaCosta();
    CargaOSM();
    CargaIncendios();
    CargaFIRMS();
  });
}


function onWindowResize() {
  E.camera.aspect = window.innerWidth / window.innerHeight;
  E.camera.updateProjectionMatrix();
  E.renderer.setSize(window.innerWidth, window.innerHeight);
}


// ----------------- BUCLE DE ANIMACIÓN -----------------

function animate() {
  if (E.incendiosCargados) {
    actualizarFecha();
    ActualizaIncendios();
    if (E.firmsCargados) ActualizaFIRMS();
    ActualizaLuz();
    ActualizaTexto();
    LatidoFrente();
  }
  ActualizaVuelo();
  requestAnimationFrame(animate);
  E.renderer.render(E.scene, E.camera);
}
