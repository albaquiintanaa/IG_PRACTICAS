// Gestión de tweens.
import * as TWEEN from "@tweenjs/tween.js";

export { TWEEN };

export const animaciones = new TWEEN.Group();


// tween que pertenece al grupo de la escena.
export function tween(objeto) {
  return new TWEEN.Tween(objeto, animaciones);
}


export function esperar(ms) {
  return new Promise((resolve) => {
    tween({ t: 0 }).to({ t: 1 }, ms).onComplete(resolve).start();
  });
}


export function actualizarAnimaciones() {
  animaciones.update();
}


export function pararAnimaciones() {
  animaciones.removeAll();
}
