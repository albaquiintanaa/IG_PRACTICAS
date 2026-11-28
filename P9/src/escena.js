// La habitación - suelo, paredes, ventana con luna, lámpara y luces.
import * as THREE from "three";
import { PALETA, material } from "./paleta.js";
import * as fisica from "./fisica.js";

function caja(sx, sy, sz, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material(color));
  m.receiveShadow = true;
  return m;
}


// ----- Suelo y paredes - estáticos -----
export function crearHabitacion(scene) {
  const suelo = caja(30, 1, 30, PALETA.madera);
  suelo.position.set(0, -0.5, 0);
  scene.add(suelo);
  fisica.crearCuerpoRigido(suelo, fisica.formaCaja(30, 1, 30), 0, { friccion: 0.7 });

  const fondo = caja(30, 16, 0.6, PALETA.lavanda);
  fondo.position.set(0, 8, -15.3);
  scene.add(fondo);
  fisica.crearCuerpoRigido(fondo, fisica.formaCaja(30, 16, 0.6), 0);

  const izquierda = caja(0.6, 16, 30, PALETA.rosa);
  izquierda.position.set(-15.3, 8, 0);
  scene.add(izquierda);
  fisica.crearCuerpoRigido(izquierda, fisica.formaCaja(0.6, 16, 30), 0);

  const zocaloFondo = caja(30, 0.8, 0.3, PALETA.crema);
  zocaloFondo.position.set(0, 0.4, -14.85);
  scene.add(zocaloFondo);
  const zocaloIzq = caja(0.3, 0.8, 30, PALETA.crema);
  zocaloIzq.position.set(-14.85, 0.4, 0);
  scene.add(zocaloIzq);

  // Alfombra
  const alfombra = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.04, 48), material(PALETA.rosaFuerte));
  alfombra.position.set(6, 0.02, -5);
  alfombra.receiveShadow = true;
  scene.add(alfombra);

  crearVentana(scene);
}


// ----- Ventana y luna -----
function crearVentana(scene) {
  const ventana = new THREE.Group();
  ventana.position.set(5, 9, -14.98);
  scene.add(ventana);

  const ancho = 6, alto = 5;
  const cielo = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, alto),
    new THREE.MeshBasicMaterial({ color: PALETA.noche, fog: false })
  );
  ventana.add(cielo);

  const luna = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 32),
    new THREE.MeshBasicMaterial({ color: PALETA.crema, fog: false })
  );
  luna.position.set(1.6, 1.2, 0.01);
  ventana.add(luna);

  const matEstrella = new THREE.MeshBasicMaterial({ color: PALETA.amarillo, fog: false });
  const geoEstrella = new THREE.CircleGeometry(0.06, 8);
  for (let i = 0; i < 14; i++) {
    const e = new THREE.Mesh(geoEstrella, matEstrella);
    e.position.set((Math.random() - 0.5) * (ancho - 0.6), (Math.random() - 0.5) * (alto - 0.6), 0.01);
    ventana.add(e);
  }

  const g = 0.25;
  const marco = [
    [ancho + g, g, 0, alto / 2],
    [ancho + g, g, 0, -alto / 2],
    [g, alto + g, -ancho / 2, 0],
    [g, alto + g, ancho / 2, 0],
    [ancho, g * 0.6, 0, 0],
    [g * 0.6, alto, 0, 0],
  ];
  for (const [sx, sy, x, y] of marco) {
    const barra = caja(sx, sy, 0.2, PALETA.crema);
    barra.position.set(x, y, 0.1);
    ventana.add(barra);
  }
}


// ----- Luces - ambiente, luz de luna y lámpara -----
export function crearLuces(scene) {
  const ambiente = new THREE.HemisphereLight(PALETA.crema, PALETA.lavanda, 1.0);
  scene.add(ambiente);

  const luna = new THREE.DirectionalLight(0xc8dcff, 0.9);
  luna.position.set(6, 14, -12);
  luna.target.position.set(0, 0, 4);
  luna.castShadow = true;
  luna.shadow.mapSize.set(2048, 2048);
  const d = 18;
  luna.shadow.camera.left = -d;
  luna.shadow.camera.right = d;
  luna.shadow.camera.top = d;
  luna.shadow.camera.bottom = -d;
  luna.shadow.camera.near = 0.5;
  luna.shadow.camera.far = 60;
  luna.shadow.bias = -0.0005;
  scene.add(luna, luna.target);

  // Lámpara
  const lampara = new THREE.Group();
  lampara.position.set(-11, 0, -11);
  scene.add(lampara);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.2, 32), material(PALETA.crema));
  base.position.y = 0.1;
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 16), material(PALETA.crema));
  palo.position.y = 3;
  const pantalla = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.6, 1.4, 32, 1, true),
    new THREE.MeshToonMaterial({ color: PALETA.melocoton, side: THREE.DoubleSide })
  );
  pantalla.position.y = 6.2;
  const bombilla = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshBasicMaterial({ color: PALETA.amarillo })
  );
  bombilla.position.y = 5.9;
  for (const m of [base, palo, pantalla]) m.castShadow = true;
  lampara.add(base, palo, pantalla, bombilla);

  const luzLampara = new THREE.PointLight(0xffc98f, 120, 0, 2);
  luzLampara.position.set(-11, 5.7, -11);
  luzLampara.castShadow = true;
  luzLampara.shadow.mapSize.set(1024, 1024);
  luzLampara.shadow.bias = -0.002;
  scene.add(luzLampara);

  // para poder animarlas con tween 
  return { ambiente, luna, luzLampara, bombilla };
}
