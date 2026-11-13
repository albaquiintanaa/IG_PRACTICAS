import * as THREE from "three";
import { E } from "./estado.js";
import { maxElev, exageracion, exageracionEdificios, escalaPlanta } from "./config.js";
import { LonLatAEscena, AlturaZ, AlturaPixel } from "./terreno.js";

// ----------------- CARGA DEL ARCHIVO OSM -----------------

export function CargaOSM() {
  console.log("Cargando pueblos.osm...");
  var loader = new THREE.FileLoader();
  loader.load(
    "src/data/pueblos.osm",
    function (text) {
      console.log("pueblos.osm cargado: " + text.length + " caracteres");
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(text, "application/xml");
      if (xmlDoc.querySelector("parsererror")) {
        console.error("Error al interpretar el XML de pueblos.osm");
        return;
      }

      const nodeMap = new Map();
      for (let nd of xmlDoc.querySelectorAll("node")) {
        nodeMap.set(nd.getAttribute("id"), {
          lat: parseFloat(nd.getAttribute("lat")),
          lon: parseFloat(nd.getAttribute("lon")),
          tags: Array.from(nd.querySelectorAll("tag")).map((tag) => ({
            k: tag.getAttribute("k"),
            v: tag.getAttribute("v"),
          })),
        });
      }
      console.log(`Nodos cargados: ${nodeMap.size}`);

      Picos(nodeMap);
      Vias(xmlDoc, nodeMap);
    },
    undefined,
    function (err) {
      console.error("No se pudo cargar pueblos.osm", err);
    }
  );
}


// ----------------- PICOS -----------------

function Picos(nodeMap) {
  const principales = [
    "Pico de las Nieves",
    "Roque Nublo",
    "Roque Bentayga",
    "Tamadaba",
    "Altavista",
    "Moriscos",
  ];
  const yaPuestos = new Set(); //Moriscos aparece dos veces en OSM
  for (let [id, node] of nodeMap) {
    const pico = node.tags.find((t) => t.k === "natural" && t.v === "peak");
    const nombre = node.tags.find((t) => t.k === "name");
    if (!pico || !nombre || !principales.includes(nombre.v)) continue;
    if (yaPuestos.has(nombre.v)) continue;
    yaPuestos.add(nombre.v);
    const ele = node.tags.find((t) => t.k === "ele");

    const [mlon, mlat] = LonLatAEscena(node.lon, node.lat);

    const z = AlturaZ(mlon, mlat);
    Triangulo(mlon, mlat, z, 0.07, "#ff2a1a");
   
    //const debajo = nombre.v === "Pico de las Nieves";
    const debajo = false;
    EtiquetaPico(
      nombre.v + (ele ? " · " + Math.round(parseFloat(ele.v)) + " m" : ""),
      mlon,
      mlat,
      z,
      debajo
    );

    const altHeightmap = Math.round(AlturaPixel(mlon, mlat) * maxElev);
    console.log(
      nombre.v + ": OSM " + (ele ? ele.v : "?") + " m · heightmap " + altHeightmap + " m"
    );
  }
}


function Triangulo(x, y, z, tam, color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(32, 6); 
  ctx.lineTo(60, 58);
  ctx.lineTo(4, 58);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff"; 
  ctx.stroke();

  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })
  );
  sprite.scale.set(tam, tam, 1);
  sprite.position.set(x, y, z);
  sprite.center.set(0.5, 0.1); 
  sprite.renderOrder = 11;
  sprite.visible = E.verPicos;
  E.objetos.push(sprite); 
  E.scene.add(sprite);
}


function EtiquetaPico(texto, x, y, z, debajo = false) {
  const fuente = "bold 46px 'Segoe UI', sans-serif";
  const medida = document.createElement("canvas").getContext("2d");
  medida.font = fuente;
  const ancho = Math.ceil(medida.measureText(texto).width) + 40;

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = fuente;
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(texto, ancho / 2, 60);

  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false, 
    fog: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  const altoEtiqueta = 0.17; 
  sprite.scale.set((altoEtiqueta * ancho) / 96, altoEtiqueta, 1);
  sprite.position.set(x, y, z);
  sprite.center.set(0.5, debajo ? 1.15 : -0.6); 
  sprite.renderOrder = 10;
  sprite.visible = E.verPicos;
  E.objetos.push(sprite);
  E.scene.add(sprite);
}


// ----------------- CARRETERAS Y EDIFICIOS -----------------

function Vias(xmlDoc, nodeMap) {
  const buildingColors = {
    residential: 0xdee5f0,
    house: 0xcddaf5,
    apartments: 0xbac6f2,
    commercial: 0xffd180,
    retail: 0xffc266,
    industrial: 0xd1c4e9,
    warehouse: 0xb39ddb,
    school: 0xffcc80,
    university: 0xffb74d,
    hospital: 0xff9999,
    church: 0xff0000, 
    public: 0x9bd1a0,
    default: 0xdedede,
  };

  const wayElements = xmlDoc.querySelectorAll("way");
  let nCarreteras = 0,
    nEdificios = 0;

  for (let way of wayElements) {
    const tags = way.querySelectorAll("tag");
    let interest = 0;
    let height = 10 + THREE.MathUtils.randFloat(-3, 3);
    let levels = 0;
    let buildingType = "default";

    for (let tag of tags) {
      const k = tag.getAttribute("k");
      const v = tag.getAttribute("v");

      if (k === "highway") {
        interest = 1; 
        break;
      }
      if (k === "building") {
        interest = 2; 
        if (v) buildingType = v;
        break;
      }
      if (k === "height") {
        const val = parseFloat(v);
        if (!isNaN(val)) height = val;
      }
      if (k === "building:levels") {
        const val = parseFloat(v);
        if (!isNaN(val)) levels = val;
      }
    }

    if (interest === 0) continue;

    if (levels > 0 && (height === 10 || isNaN(height))) {
      height = levels * 3; // 3 m por planta por defecto
    }

    const nds = way.querySelectorAll("nd");
    const points = [];

    for (let nd of nds) {
      const ref = nd.getAttribute("ref");
      const node = nodeMap.get(ref);
      if (!node) continue;

      const { lat, lon } = node;
      const [mlon, mlat] = LonLatAEscena(lon, lat);

      points.push(new THREE.Vector3(mlon, mlat, AlturaZ(mlon, mlat)));
    }

    if (points.length === 0) continue;

    if (interest === 1) {
      for (let p of points) p.z += 3 * E.metro * exageracion;
      const material = new THREE.LineBasicMaterial({
        color: 0xf2e6c9,
        transparent: true,
        opacity: 0.55,
      });
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      E.grupoOSM.add(line);
      nCarreteras++;
    } else if (interest === 2) {
      const shape = new THREE.Shape();
      shape.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
      }

      const extrudeSettings = {
        steps: 1,
        depth: height * E.metro * exageracion * exageracionEdificios,
        bevelEnabled: false,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      let baseColor = buildingColors[buildingType] || buildingColors.default;
      const c = new THREE.Color(baseColor);

      const hsl = {};
      c.getHSL(hsl);
      hsl.h += THREE.MathUtils.randFloat(-0.03, 0.03);
      hsl.l += THREE.MathUtils.randFloat(-0.05, 0.05);
      c.setHSL(hsl.h, hsl.s, hsl.l);

      //Material Lambert para que reciba luz
      const material = new THREE.MeshLambertMaterial({ color: c });

      const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
      const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
      geometry.translate(-cx, -cy, 0);
      geometry.scale(escalaPlanta, escalaPlanta, 1);

      const mesh = new THREE.Mesh(geometry, material);
      //la base del edificio se apoya en el punto más bajo del terreno bajo él
      mesh.position.set(cx, cy, Math.min(...points.map((p) => p.z)));
      E.grupoOSM.add(mesh);
      nEdificios++;
    }
  }

  console.log(`Procesados ${nCarreteras} carreteras y ${nEdificios} edificios`);
}
