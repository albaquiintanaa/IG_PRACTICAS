import * as THREE from "three";
import { E } from "./estado.js";
import {
  minlon,
  maxlon,
  minlat,
  maxlat,
  maxElev,
  kmAlto,
  exageracion,
  verMalla,
  colorMar,
  brilloTerreno,
  paletaRealista,
  paletaSeca,
  paletaHumeda,
  tramosColor,
} from "./config.js";

// ----------------- COORDENADAS -----------------

export function Map2Range(val, vmin, vmax, dmin, dmax) {
  let t = 1 - (vmax - val) / (vmax - vmin);
  return dmin + t * (dmax - dmin);
}

//lon/lat -> posición (x, y) en la escena
export function LonLatAEscena(lon, lat) {
  return [
    Map2Range(lon, minlon, maxlon, -E.mapsx / 2, E.mapsx / 2),
    Map2Range(lat, minlat, maxlat, -E.mapsy / 2, E.mapsy / 2),
  ];
}


export function LonLatAPixel(lon, lat) {
  const x = ((lon - minlon) / (maxlon - minlon)) * E.imgW;
  const y = ((maxlat - lat) / (maxlat - minlat)) * E.imgH;
  return [x, y];
}

// ----------------- ALTURAS -----------------

//Lee los píxeles de la imagen del heightmap
export function LeeAlturas(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  E.pixeles = ctx.getImageData(0, 0, img.width, img.height).data;
  E.imgW = img.width;
  E.imgH = img.height;
}


function ValorImagen(u, v) {
  const px = Math.min(E.imgW - 1, Math.max(0, Math.round(u * (E.imgW - 1))));
  const py = Math.min(E.imgH - 1, Math.max(0, Math.round(v * (E.imgH - 1))));
  return E.pixeles[(py * E.imgW + px) * 4] / 255; 
}


//Valor del heightmap (0 = mar, 1 = punto más alto) en una posición (x, y) del plano
export function AlturaPixel(mx, my) {
  // u de izquierda a derecha, v de arriba abajo
  const u = (mx + E.mapsx / 2) / E.mapsx;
  const v = (E.mapsy / 2 - my) / E.mapsy;
  return ValorImagen(u, v);
}


//Altura z del terreno en (x, y), calculada igual que la malla
export function AlturaZ(mx, my) {
  const u = (mx + E.mapsx / 2) / E.mapsx;
  const v = (E.mapsy / 2 - my) / E.mapsy;
  const gx = Math.min(E.divx, Math.max(0, u * E.divx));
  const gy = Math.min(E.divy, Math.max(0, v * E.divy));
  const i0 = Math.min(E.divx - 1, Math.floor(gx)),
    j0 = Math.min(E.divy - 1, Math.floor(gy));
  const fx = gx - i0,
    fy = gy - j0;
  const h00 = ValorImagen(i0 / E.divx, j0 / E.divy);
  const h10 = ValorImagen((i0 + 1) / E.divx, j0 / E.divy);
  const h01 = ValorImagen(i0 / E.divx, (j0 + 1) / E.divy);
  const h11 = ValorImagen((i0 + 1) / E.divx, (j0 + 1) / E.divy);
  const h =
    h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
  return h * E.dscale;
}


// ----------------- PLANOS (mapa y mar) -----------------

export function Plano(px, py, pz, sx, sy, nx, ny, txt, dismap, dscale) {
  let geometry = new THREE.PlaneGeometry(sx, sy, nx, ny);
  let material = new THREE.MeshPhongMaterial({
    wireframe: verMalla,
  });

  if (txt != undefined) {
    material.map = txt;
  }

  if (dismap != undefined) {
    material.displacementMap = dismap;
    material.displacementScale = dscale;
  }

  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(px, py, pz);
  E.scene.add(mesh);
  E.mapa = mesh;
}


export function MarAlrededor() {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  ctx.fillStyle = `rgb(${colorMar[0]}, ${colorMar[1]}, ${colorMar[2]})`;
  ctx.fillRect(0, 0, 1, 1);
  const material = new THREE.MeshPhongMaterial({ map: new THREE.CanvasTexture(c) });
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), material);
  mar.position.z = -0.001; //justo por debajo del mapa
  E.scene.add(mar);
}


// ----------------- COLORES DEL TERRENO -----------------

function ColorPaleta(paleta, h) {
  for (let i = 1; i < paleta.length; i++) {
    if (h <= paleta[i][0]) {
      const [h0, c0] = paleta[i - 1];
      const [h1, c1] = paleta[i];
      const t = (h - h0) / (h1 - h0);
      return [0, 1, 2].map((k) => c0[k] + t * (c1[k] - c0[k]));
    }
  }
  return paleta[paleta.length - 1][1];
}


//h: altura 0..1, humedad: 0 (sur) a 1 (norte)
function ColorTerreno(h, humedad) {
  if (h < 0.004) return colorMar;
  const a = ColorPaleta(paletaSeca, h);
  const b = ColorPaleta(paletaHumeda, h);
  return [0, 1, 2].map((k) => a[k] + humedad * (b[k] - a[k]));
}


function ColorInicial(h) {
  if (h < 0.004) return colorMar;
  return ColorPaleta(tramosColor, h);
}


function Sombreado(fila, col) {
  const metrosPixel = (kmAlto * 1000) / E.imgH;
  const h = (f, c) => {
    f = Math.min(E.imgH - 1, Math.max(0, f));
    c = Math.min(E.imgW - 1, Math.max(0, c));
    return (E.pixeles[(f * E.imgW + c) * 4] / 255) * maxElev * exageracion;
  };

  if (h(fila, col + 1) === 0 || h(fila, col - 1) === 0 || h(fila - 1, col) === 0 || h(fila + 1, col) === 0)
    return 1;
  const dzdx = (h(fila, col + 1) - h(fila, col - 1)) / (2 * metrosPixel);
  const dzdy = (h(fila - 1, col) - h(fila + 1, col)) / (2 * metrosPixel); //hacia el norte

  const n = new THREE.Vector3(-dzdx, -dzdy, 1).normalize();
  const l = new THREE.Vector3(-0.5, 0.5, 0.7).normalize();
  return Math.min(1.15, Math.max(0.6, 0.45 + 0.65 * n.dot(l)));
}

//Crea el lienzo con el terreno coloreado y la textura de three.js asociada
export function CreaLienzo() {
  E.lienzo = document.createElement("canvas");
  E.lienzo.width = E.imgW;
  E.lienzo.height = E.imgH;
  E.ctxLienzo = E.lienzo.getContext("2d");

  E.baseColor = E.ctxLienzo.createImageData(E.imgW, E.imgH);
  CalculaColorBase();
  E.texturaLienzo = new THREE.CanvasTexture(E.lienzo);
}


export function CalculaColorBase() {
  const datos = E.baseColor.data;
  for (let fila = 0; fila < E.imgH; fila++) {
    for (let col = 0; col < E.imgW; col++) {
      const i = fila * E.imgW + col;
      const h = E.pixeles[i * 4] / 255;
      const norte = 1 - fila / E.imgH;
      const humedad = THREE.MathUtils.smoothstep(norte, 0.35, 0.65);
      const c = paletaRealista ? ColorTerreno(h, humedad) : ColorInicial(h);
      let sombra = h < 0.004 || !paletaRealista ? 1 : Sombreado(fila, col);
      if (h >= 0.004) sombra *= brilloTerreno; //solo la tierra
      datos[i * 4] = Math.min(255, c[0] * sombra);
      datos[i * 4 + 1] = Math.min(255, c[1] * sombra);
      datos[i * 4 + 2] = Math.min(255, c[2] * sombra);
      datos[i * 4 + 3] = 255;
    }
  }
  E.ctxLienzo.putImageData(E.baseColor, 0, 0);
}
