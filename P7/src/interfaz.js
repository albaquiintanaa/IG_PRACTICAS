import * as THREE from "three";
import { E } from "./estado.js";
import { incendios, fichas, zonas, fechaInicio, fechaFin, opcionesfecha } from "./config.js";
import { LonLatAEscena, AlturaZ } from "./terreno.js";
import { Reiniciar } from "./tiempo.js";

// ----------------- LÓGICA BOTONES Y SLIDERS (estructura de la práctica 6) -----------------

export function InicializaInterfaz() {
  const sliderTiempo = document.getElementById("sliderTiempo");
  sliderTiempo.max = (fechaFin - fechaInicio) / 60000;
  sliderTiempo.addEventListener("input", (evento) => {
    E.arrastrandoTiempo = true;
    E.totalMinutos = parseFloat(evento.target.value);
    E.fechaActual = new Date(fechaInicio.getTime() + E.totalMinutos * 60000);
  });
  sliderTiempo.addEventListener("change", () => {
    E.arrastrandoTiempo = false;
    sliderTiempo.blur();
    document.body.focus();
  });

  document.getElementById("btnPlay").addEventListener("click", (evento) => {
    CambiaPausa();
    evento.target.blur();
  });
  document.getElementById("btnReset").addEventListener("click", (evento) => {
    Reiniciar();
    evento.target.blur();
  });

  
  const sliderVelocidad = document.getElementById("sliderVelocidad");
  sliderVelocidad.addEventListener("input", (evento) => {
    E.velocidad = parseFloat(evento.target.value);
    document.getElementById("valorVelocidad").innerText =
      "x" + E.velocidad.toLocaleString("es-ES");
  });
  sliderVelocidad.addEventListener("change", () => {
    sliderVelocidad.blur();
    document.body.focus();
  });

  
  document.getElementById("btnBrasas").addEventListener("click", (evento) => {
    E.verBrasas = !E.verBrasas;
    evento.target.classList.toggle("activo");
    evento.target.blur();
  });
  document.getElementById("btnOSM").addEventListener("click", (evento) => {
    E.grupoOSM.visible = !E.grupoOSM.visible;
    evento.target.classList.toggle("activo");
    evento.target.blur();
  });
  document.getElementById("btnPicos").addEventListener("click", (evento) => {
    E.verPicos = !E.verPicos;
    E.objetos.forEach((o) => (o.visible = E.verPicos));
    evento.target.classList.toggle("activo");
    evento.target.blur();
  });


  document.getElementById("btnAnterior").addEventListener("click", (evento) => {
    E.zonaActual = (E.zonaActual - 1 + zonas.length) % zonas.length;
    IrAZona(E.zonaActual);
    evento.target.blur();
  });
  document.getElementById("btnSiguiente").addEventListener("click", (evento) => {
    E.zonaActual = (E.zonaActual + 1) % zonas.length;
    IrAZona(E.zonaActual);
    evento.target.blur();
  });
  document.getElementById("btnVerInfo").addEventListener("click", (evento) => {
    const panel = document.getElementById("panel-info");
    if (panel.style.display === "block") CerrarInfo();
    else AbrirInfo(E.zonaActual);
    evento.target.blur();
  });
  document.getElementById("btnCerrarInfo").addEventListener("click", (evento) => {
    CerrarInfo();
    evento.target.blur();
  });

  setTimeout(MostrarToastControles, 1000); 
}


export function CambiaPausa() {
  E.pausa = !E.pausa;
  document.getElementById("btnPlay").innerText = E.pausa ? "▶" : "⏸";
}


export function ActualizaTexto() {
  if (!E.arrastrandoTiempo) document.getElementById("sliderTiempo").value = E.totalMinutos;
  document.getElementById("valorTiempo").innerText = E.fechaActual.toLocaleString(
    "es-ES",
    opcionesfecha
  );
}


export function MarcasLineaTemporal() {
  const lista = document.getElementById("marcasTiempo");
  for (const inc of incendios) {
    for (const p of inc.perimetros) {
      const opcion = document.createElement("option");
      opcion.value = Math.round((p.fecha - fechaInicio) / 60000);
      lista.appendChild(opcion);
    }
  }
}

// ----------------- CÁMARA ENTRE ZONAS -----------------

function IrAZona(indice) {
  const zona = zonas[indice];
  document.getElementById("nombreZonaSlider").innerText = zona.nombre;
  if (document.getElementById("panel-info").style.display === "block") AbrirInfo(indice);

  if (!E.vistaGeneral) return; 
  if (zona.incendio < 0 || !E.incendiosCargados) {
    VolarA(E.vistaGeneral.pos, E.vistaGeneral.target);
    return;
  }

  const inc = incendios[zona.incendio];
  const ultimo = inc.perimetros[inc.perimetros.length - 1];
  let minx = Infinity,
    maxx = -Infinity,
    miny = Infinity,
    maxy = -Infinity;
  for (const f of ultimo.features)
    for (const poligono of f.geometry.coordinates)
      for (const p of poligono[0]) {
        minx = Math.min(minx, p[0]);
        maxx = Math.max(maxx, p[0]);
        miny = Math.min(miny, p[1]);
        maxy = Math.max(maxy, p[1]);
      }
  const [cx, cy] = LonLatAEscena((minx + maxx) / 2, (miny + maxy) / 2);
  const ancho = LonLatAEscena(maxx, miny)[0] - LonLatAEscena(minx, miny)[0];
  const d = ancho * 0.9 + 0.15;
  const objetivo = new THREE.Vector3(cx, cy, AlturaZ(cx, cy));
  const posicion = new THREE.Vector3(cx, cy - 0.75 * d, objetivo.z + 0.85 * d);
  VolarA(posicion, objetivo);
}


function VolarA(posFinal, targetFinal, duracion = 1.6) {
  E.vuelo = {
    pos0: E.camera.position.clone(),
    target0: E.camcontrols.target.clone(),
    pos1: posFinal.clone(),
    target1: targetFinal.clone(),
    inicio: performance.now() / 1000,
    duracion: duracion,
  };
}


export function ActualizaVuelo() {
  if (!E.vuelo) return;
  let t = (performance.now() / 1000 - E.vuelo.inicio) / E.vuelo.duracion;
  if (t >= 1) t = 1;
  const k = t * t * (3 - 2 * t); 
  E.camera.position.lerpVectors(E.vuelo.pos0, E.vuelo.pos1, k);
  E.camcontrols.target.lerpVectors(E.vuelo.target0, E.vuelo.target1, k);
  E.camcontrols.update();
  if (t === 1) E.vuelo = null;
}


// ----------------- PANEL DE INFORMACIÓN -----------------

function AbrirInfo(indice) {
  const zona = zonas[indice];
  let html;
  if (zona.incendio < 0) {
    let total = 0;
    incendios.forEach((inc) => {
      if (inc.perimetros && inc.perimetros.length)
        total += inc.perimetros[inc.perimetros.length - 1].hectareas;
    });
    html = `
      <ul>
        <li><strong>Periodo:</strong> 10 al 24 de agosto de 2019</li>
        <li><strong>Incendios:</strong> Artenara, Cazadores y Valleseco</li>
        <li><strong>Superficie quemada total:</strong> ${Math.round(total).toLocaleString("es-ES")} ha</li>
        <li><strong>Focos detectados por satélite:</strong> ${E.datosFIRMS.length}</li>
        <li><strong>Dato:</strong> el tercer incendio rodeó la zona que ya había ardido en Artenara una semana antes.</li>
      </ul>`;
  } else {
    const inc = incendios[zona.incendio];
    const ficha = fichas[zona.incendio];
    const ultimo = inc.perimetros[inc.perimetros.length - 1];
    const focos = E.datosFIRMS.filter((f) => f.fuego === inc.nombre);
    const frpMax = focos.length ? Math.max(...focos.map((f) => f.frp)) : 0;
    html = `
      <ul>
        <li><strong>Inicio:</strong> ${ficha.inicio}</li>
        <li><strong>Lugar:</strong> ${ficha.lugar}</li>
        <li><strong>Superficie quemada:</strong> ${ultimo.hectareas.toLocaleString("es-ES")} ha</li>
        ${ficha.danios ? `<li><strong>Daños:</strong> ${ficha.danios}</li>` : ""}
        <li><strong>Focos por satélite:</strong> ${focos.length} (máx. ${frpMax} MW)</li>
        <li><strong>Dato:</strong> ${ficha.extra}</li>
      </ul>
      <div style="font-size: 11px; color: #999;">Fuente: ${ficha.fuente} · NASA FIRMS</div>`;
  }
  document.getElementById("info-titulo").innerText = zona.nombre;
  document.getElementById("info-desc").innerHTML = html;
  document.getElementById("panel-info").style.display = "block";
  document.getElementById("btnVerInfo").classList.add("activo");
}


function CerrarInfo() {
  document.getElementById("panel-info").style.display = "none";
  document.getElementById("btnVerInfo").classList.remove("activo");
  document.body.focus();
}


function MostrarToastControles() {
  const toast = document.getElementById("toast-controles");
  document.getElementById("toast-titulo").innerText = "CONTROLES";
  document.getElementById("toast-desc").innerHTML = `
    <span class="tecla">Clic Izq</span> Rotar &nbsp;|&nbsp; <span class="tecla">Clic Der</span> Mover <br>
    <span class="tecla">Rueda</span> Zoom <br>
    <span class="tecla">Espacio</span> Pausa &nbsp;|&nbsp; <span class="tecla">R</span> Reiniciar
  `;
  toast.classList.add("mostrar");
  clearTimeout(E.temporizadorToast);
  E.temporizadorToast = setTimeout(() => {
    toast.classList.remove("mostrar");
  }, 6000); 
}
