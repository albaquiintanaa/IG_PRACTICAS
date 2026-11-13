import * as THREE from "three";
import { E } from "./estado.js";
import { horasDestello, horasBrasa, horasVisible } from "./config.js";
import { LonLatAEscena, AlturaZ } from "./terreno.js";

// ----------------- FOCOS NASA FIRMS (VIIRS 375 m + MODIS 1 km) -----------------

function CreaTexturaBrasa() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.8)");
  g.addColorStop(0.6, "rgba(255,255,255,0.2)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}


export function CargaFIRMS() {
  E.texBrasa = CreaTexturaBrasa();
  fetch("src/data/firms_gc_2019.csv")
    .then((response) => {
      if (!response.ok) throw new Error("Error: " + response.statusText);
      return response.text();
    })
    .then((content) => {
      procesarCSVFIRMS(content);
    })
    .catch((error) => {
      console.error("Error al cargar el archivo:", error);
    });
}


function procesarCSVFIRMS(content) {
  const sep = ";"; 
  const filas = content.split("\n");

  const encabezados = filas[0].trim().split(sep);
  
  // Obtiene índices de columnas de interés
  const indices = {
    fecha: encabezados.indexOf("fecha_utc"),
    lat: encabezados.indexOf("lat"),
    lon: encabezados.indexOf("lon"),
    frp: encabezados.indexOf("frp"),
    fuego: encabezados.indexOf("fuego"),
  };

  for (let i = 1; i < filas.length; i++) {
    const columna = filas[i].trim().split(sep);
    if (columna.length > 1) {
      const lon = parseFloat(columna[indices.lon]);
      const lat = parseFloat(columna[indices.lat]);
      const frp = parseFloat(columna[indices.frp]);
      const [x, y] = LonLatAEscena(lon, lat);

      //Tamaño según la potencia radiativa del fuego (FRP, de 0.6 a 485 MW)
      const tam = 0.07 * (0.6 + Math.log10(1 + frp) / 2.7);

      // Siempre mira a la cámara. Mezcla aditiva para que brille
      const material = new THREE.SpriteMaterial({
        map: E.texBrasa,
        color: 0xffaa33,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, AlturaZ(x, y) + tam * 0.4);
      sprite.visible = false;
      E.scene.add(sprite);

      E.datosFIRMS.push({
        fecha: new Date(columna[indices.fecha]),
        frp: frp,
        fuego: columna[indices.fuego],
        sprite: sprite,
        tam: tam,
        fase: Math.random() * 10, //para que no parpadeen todos a la vez
      });
    }
  }
  E.firmsCargados = true;
  console.log("Archivo csv FIRMS cargado: " + E.datosFIRMS.length + " focos");
}


export function ActualizaFIRMS() {
  const t = performance.now() / 1000;
  E.focosActivos = 0;

  let sx = 0,
    sy = 0,
    sz = 0;
  for (const f of E.datosFIRMS) {
    const horas = (E.fechaActual - f.fecha) / 3600000;
    const s = f.sprite;
    if (horas < 0 || horas > horasVisible) {
      s.visible = false;
      continue;
    }
    if (horas <= 12) {
      E.focosActivos++;
      sx += s.position.x;
      sy += s.position.y;
      sz += s.position.z;
    }
    s.visible = E.verBrasas;

    let escala, tono, luz, opacidad;
    if (horas < horasDestello) {
      //Destello
      const k = 1 - horas / horasDestello;
      escala = f.tam * (1 + 1.5 * k);
      tono = 0.13;
      luz = 0.6 + 0.3 * k;
      opacidad = 1;
    } else if (horas < horasBrasa) {
      //Brasa
      const d = (horas - horasDestello) / (horasBrasa - horasDestello);
      escala = f.tam * (1 - 0.6 * d);
      tono = 0.08 * (1 - d);
      luz = 0.55 - 0.25 * d;
      opacidad = 0.95 * (1 - d) + 0.15;
    } else {
      //Rescoldo
      escala = f.tam * 0.4;
      tono = 0.0;
      luz = 0.3;
      opacidad = 0.12;
    }
    //Parpadeo, simulando una llama
    opacidad *= 0.8 + 0.2 * Math.sin(t * 9 + f.fase);
    s.scale.set(escala, escala, 1);
    s.material.color.setHSL(tono, 1, luz);
    s.material.opacity = opacidad;
  }

  if (E.focosActivos > 0) {
    E.luzFuego.position.set(
      sx / E.focosActivos,
      sy / E.focosActivos,
      sz / E.focosActivos + 0.15
    );
    E.luzFuego.userData.objetivo = Math.min(2.5, 0.4 + E.focosActivos / 30);
  } else {
    E.luzFuego.userData.objetivo = 0;
  }
}
