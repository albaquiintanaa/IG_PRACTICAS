import { E } from "./estado.js";
import { fechaInicio, fechaFin, minutosPorFotograma, colorMar } from "./config.js";

// ----------------- AVANCE DEL TIEMPO -----------------

export function actualizarFecha() {
  const maxMinutos = (fechaFin - fechaInicio) / 60000;
  if (!E.pausa && !E.arrastrandoTiempo && E.totalMinutos < maxMinutos)
    E.totalMinutos = Math.min(maxMinutos, E.totalMinutos + minutosPorFotograma * E.velocidad);
  E.fechaActual = new Date(fechaInicio.getTime() + E.totalMinutos * 60000);
}

export function Reiniciar() {
  E.totalMinutos = 0;
  E.estadoAnterior = "";
}

// ----------------- DÍA Y NOCHE -----------------

//El sol sale por el este, se pone por el oeste 
export function ActualizaLuz() {
  const hora = (E.fechaActual.getUTCHours() + 1 + E.fechaActual.getUTCMinutes() / 60) % 24;
  
  //Amanecer ~7:30, atardecer ~20:45 -> ángulo del sol de 0 a PI
  const ang = ((hora - 7.5) / 13.25) * Math.PI;
  const dia = Math.max(0, Math.sin(ang)); 
  E.sol.position.set(4 * Math.cos(ang), 1.5, 0.5 + 4 * Math.max(0.05, Math.sin(ang)));
  E.sol.intensity = 0.1 + 0.8 * dia;
  E.light.intensity = 0.18 + 0.27 * dia;

  const brillo = 0.35 + 0.65 * dia;
  E.scene.background.setRGB(
    (colorMar[0] / 255) * brillo,
    (colorMar[1] / 255) * brillo,
    (colorMar[2] / 255) * brillo
  );
  E.scene.fog.color.copy(E.scene.background);

  const objetivo = E.verBrasas ? E.luzFuego.userData.objetivo || 0 : 0;
  const parpadeo = 0.85 + 0.15 * Math.sin(performance.now() / 70);
  E.luzFuego.intensity = objetivo * (1 - 0.6 * dia) * parpadeo;
}
