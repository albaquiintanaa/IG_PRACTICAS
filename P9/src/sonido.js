// Utilidades de sonido
import * as THREE from "three";


export function cargarSonido(listener, ruta, { volumen = 0.7, bucle = false } = {}) {
  const sonido = new THREE.Audio(listener);
  new THREE.AudioLoader().load(
    ruta,
    (buffer) => {
      sonido.setBuffer(buffer);
      sonido.setLoop(bucle);
      sonido.setVolume(volumen);
      sonido.userData = { volumen };
    },
    undefined,
    () => console.warn(`No se encontró ${ruta}`)
  );
  return sonido;
}


export function reproducir(sonido) {
  if (!sonido || !sonido.buffer) return;
  if (sonido.isPlaying) sonido.stop();
  if (sonido.userData) sonido.setVolume(sonido.userData.volumen);
  sonido.play();
}


export function parar(sonido) {
  if (sonido && sonido.isPlaying) sonido.stop();
}
