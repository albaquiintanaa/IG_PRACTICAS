import * as THREE from "three";
import { E } from "./estado.js";
import { LonLatAPixel, CalculaColorBase } from "./terreno.js";

// ----------------- LÍNEA DE COSTA (OpenStreetMap) -----------------

//El heightmap de Tangram suaviza la orilla y deja manchas en el mar.
//Con la línea de costa real de OSM se recorta
export function CargaCosta() {
  new THREE.FileLoader().load(
    "src/data/costa.osm",
    function (text) {
      const xmlDoc = new DOMParser().parseFromString(text, "application/xml");
      if (xmlDoc.querySelector("parsererror")) return;

      const nodos = new Map();
      for (let nd of xmlDoc.querySelectorAll("node"))
        nodos.set(nd.getAttribute("id"), [
          parseFloat(nd.getAttribute("lon")),
          parseFloat(nd.getAttribute("lat")),
        ]);

    const tramos = [];
      for (let way of xmlDoc.querySelectorAll("way"))
        tramos.push(Array.from(way.querySelectorAll("nd")).map((nd) => nd.getAttribute("ref")));

      const anillos = UneTramos(tramos);
      console.log("Costa: " + tramos.length + " tramos -> " + anillos.length + " anillos");
      AplicaCosta(anillos, nodos);
    },
    undefined,
    function () {
      console.log("Sin costa.osm: se usa el heightmap tal cual");
    }
  );
}


//la costa viene partida en muchos tramos
function UneTramos(tramos) {
  const pendientes = tramos.map((t) => t.slice());
  const anillos = [];
  while (pendientes.length > 0) {
    let anillo = pendientes.pop();
    let unido = true;
    while (anillo[0] !== anillo[anillo.length - 1] && unido) {
      unido = false;
      const fin = anillo[anillo.length - 1];
      for (let i = 0; i < pendientes.length; i++) {
        const t = pendientes[i];
        if (t[0] === fin) {
          anillo = anillo.concat(t.slice(1));
        } else if (t[t.length - 1] === fin) {
          anillo = anillo.concat(t.slice().reverse().slice(1));
        } else continue;
        pendientes.splice(i, 1);
        unido = true;
        break;
      }
    }
    anillos.push(anillo);
  }
  return anillos;
}


function AplicaCosta(anillos, nodos) {
  const mascara = document.createElement("canvas");
  mascara.width = E.imgW;
  mascara.height = E.imgH;
  const ctx = mascara.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (const anillo of anillos) {
    anillo.forEach((id, i) => {
      const p = nodos.get(id);
      if (!p) return;
      const [x, y] = LonLatAPixel(p[0], p[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
  ctx.fill();
  const m = ctx.getImageData(0, 0, E.imgW, E.imgH).data;

  for (let fila = 0; fila < E.imgH; fila++) {
    for (let col = 0; col < E.imgW; col++) {
      const i = (fila * E.imgW + col) * 4;
      if (m[i + 3] < 128) E.pixeles[i] = E.pixeles[i + 1] = E.pixeles[i + 2] = 0;
    }
  }

  const alturas = document.createElement("canvas");
  alturas.width = E.imgW;
  alturas.height = E.imgH;
  const actx = alturas.getContext("2d");
  const datos = actx.createImageData(E.imgW, E.imgH);
  datos.data.set(E.pixeles);
  actx.putImageData(datos, 0, 0);
  E.mapa.material.displacementMap = new THREE.CanvasTexture(alturas);
  E.mapa.material.needsUpdate = true;

  CalculaColorBase();
  E.estadoAnterior = "";
  E.texturaLienzo.needsUpdate = true;
}
