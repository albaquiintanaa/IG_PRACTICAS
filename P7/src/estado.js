import * as THREE from "three";
import { fechaInicio } from "./config.js";


export const E = {
  // Escena
  scene: null,
  camera: null,
  renderer: null,
  camcontrols: null,
  light: null, 
  sol: null, 
  luzFuego: null, 

  mapa: null,
  mapsx: 0,
  mapsy: 0,
  metro: 0, 
  dscale: 0, 
  pixeles: null, 
  imgW: 0,
  imgH: 0,
  divx: 0, 
  divy: 0,

  lienzo: null,
  ctxLienzo: null,
  texturaLienzo: null,
  baseColor: null,

  // OSM y picos
  grupoOSM: new THREE.Group(),
  objetos: [], 
  verPicos: false,

  // Incendios
  incendiosCargados: false,
  estadoAnterior: "", 
  lineasFuego: new THREE.Group(), 
  matFrente: null,

  // Focos NASA FIRMS
  datosFIRMS: [], 
  firmsCargados: false,
  texBrasa: null,
  focosActivos: 0,
  verBrasas: true,

  // Tiempo
  velocidad: 0.1, 
  arrastrandoTiempo: false,
  totalMinutos: 0,
  fechaActual: new Date(fechaInicio),
  pausa: false,

  // Interfaz y cámara
  zonaActual: 0,
  vistaGeneral: null,
  vuelo: null, 
  temporizadorToast: null,
};
