import * as THREE from "three";
import { vertexShaderSol, fragmentShaderSol,
         vertexShaderLuzSol, fragmentShaderDiaNoche,
         vertexShaderProcedural, fragmentShaderProcedural,
         vertexShaderAnillo, fragmentShaderAnillo } from "./shaders.js";

// ----------------- SOL + SHADER -----------------

export const uTiempo = { value: 0.0 };

const uniformsSol = {
  u_time: uTiempo,
};

export function Estrella(scene, rad, texture = undefined) {
  let geometry = new THREE.SphereGeometry(rad, 40, 40);
  texture.wrapS = THREE.RepeatWrapping;   // al pasar de 1 la textura se repite (si no, se estira)
  uniformsSol.texture1 = { value: texture };
  let material = new THREE.ShaderMaterial({
    uniforms: uniformsSol,
    vertexShader: vertexShaderSol(),
    fragmentShader: fragmentShaderSol(),
  });
  let estrella = new THREE.Mesh(geometry, material);
  estrella.userData = { speed: 0, f1: 0, f2: 0, dist: 0 };
  scene.add(estrella);
  return estrella;
}


// ----------------- PLANETAS Y ÓRBITAS -----------------

export function Planeta(scene, planetas, orbitas, radio, dist, vel, col, f1, f2, texture = undefined, angle = 0) {
  let pivoteOrbita = new THREE.Object3D();
  pivoteOrbita.rotation.x = angle;
  scene.add(pivoteOrbita);

  let geom = new THREE.SphereGeometry(radio, 40, 40);
  let matOptions = { color: col, shininess: 5 };
  if (texture !== undefined && texture !== null) {
    matOptions.map = texture;
    matOptions.bumpMap = texture;
    matOptions.bumpScale = 1.5;
  }
  let mat = new THREE.MeshPhongMaterial(matOptions);

  let planeta = new THREE.Mesh(geom, mat);
  planeta.userData.dist = dist;
  planeta.userData.speed = vel;
  planeta.userData.f1 = f1;
  planeta.userData.f2 = f2;
  planeta.castShadow = true;
  planeta.receiveShadow = true;

  planetas.push(planeta);
  pivoteOrbita.add(planeta);

  let curve = new THREE.EllipseCurve(0, 0, dist * f1, dist * f2);
  let points = curve.getPoints(100);
  let geome = new THREE.BufferGeometry().setFromPoints(points);
  let mate = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
  let orbita = new THREE.Line(geome, mate);
  pivoteOrbita.add(orbita);
  orbitas.push(orbita);

  return planeta;
}


// ----------------- TIERRA CON DÍA Y NOCHE -----------------
// Como Planeta(), pero con un ShaderMaterial de dos texturas:
// de día cuando mira al Sol y luces de las ciudades de noche

export function PlanetaDiaNoche(scene, planetas, orbitas, radio, dist, vel, texDia, texNoche, angle = 0) {
  let pivoteOrbita = new THREE.Object3D();
  pivoteOrbita.rotation.x = angle;
  scene.add(pivoteOrbita);

  let geom = new THREE.SphereGeometry(radio, 40, 40);
  let mat = new THREE.ShaderMaterial({
    uniforms: {
      texture1: { value: texDia },
      texture2: { value: texNoche },
    },
    vertexShader: vertexShaderLuzSol(),
    fragmentShader: fragmentShaderDiaNoche(),
  });

  let planeta = new THREE.Mesh(geom, mat);
  planeta.userData.dist = dist;
  planeta.userData.speed = vel;
  planeta.userData.f1 = 1.0;
  planeta.userData.f2 = 1.0;
  planeta.castShadow = true;

  planetas.push(planeta);
  pivoteOrbita.add(planeta);

  let curve = new THREE.EllipseCurve(0, 0, dist, dist);
  let points = curve.getPoints(100);
  let geome = new THREE.BufferGeometry().setFromPoints(points);
  let mate = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
  let orbita = new THREE.Line(geome, mate);
  pivoteOrbita.add(orbita);
  orbitas.push(orbita);

  return planeta;
}


// ----------------- PLANETAS PROCEDURALES (MODO CREADOR) -----------------

// uZona: 0 = abrasador (lava), 1 = templado (mar y continentes), 2 = helado
export function MaterialPlanetaProcedural() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: Math.random() * 100.0 },
      uZona: { value: 1.0 },
      uSea: { value: -0.12 },                    
      uNoiseAmp: { value: 0.12 },              
      uNoiseFreq: { value: 1.2 },             
      u_time: uTiempo,
    },
    vertexShader: vertexShaderProcedural(),
    fragmentShader: fragmentShaderProcedural(),
  });
}


// ----------------- ATMÓSFERAS Y CAPAS -----------------

export function EsferaHija(padre, atmosferas, radio, nx, ny, col, texture = undefined, texbump = undefined, texspec = undefined, texalpha = undefined) {
  let geometry = new THREE.SphereGeometry(radio, nx, ny);
  let matOptions = { color: col };

  if (texture !== undefined && texture !== null) matOptions.map = texture;
  if (texbump !== undefined && texbump !== null) {
    matOptions.bumpMap = texbump;
    matOptions.bumpScale = 3;
  }
  if (texspec !== undefined && texspec !== null) {
    matOptions.specularMap = texspec;
    matOptions.specular = new THREE.Color("orange");
  }
  if (texalpha !== undefined && texalpha !== null) {
    matOptions.alphaMap = texalpha;
    matOptions.transparent = true;
    matOptions.side = THREE.DoubleSide;
    matOptions.depthWrite = false;
  }

  let material = new THREE.MeshPhongMaterial(matOptions);
  let mesh = new THREE.Mesh(geometry, material);
  padre.add(mesh);
  atmosferas.push(mesh);
}


// ----------------- SATÉLITES Y ÓRBITAS -----------------

export function Luna(planeta, lunas, orbitas, radio, dist, vel, col, texture, angle) {
  let pivote = new THREE.Object3D();
  pivote.rotation.x = angle;
  planeta.add(pivote);

  let geom = new THREE.SphereGeometry(radio, 20, 20);
  let matOptions = { color: col };
  if (texture !== undefined && texture !== null) {
    matOptions.map = texture;
    matOptions.bumpMap = texture;
    matOptions.bumpScale = 1.5;
  }

  let mat = new THREE.MeshPhongMaterial(matOptions);
  let luna = new THREE.Mesh(geom, mat);
  luna.userData.dist = dist;
  luna.userData.speed = vel;
  luna.castShadow = true;
  luna.receiveShadow = true;
  luna.position.x = dist;
  pivote.add(luna);
  lunas.push(luna);

  let curve = new THREE.EllipseCurve(0, 0, dist, dist);
  let points = curve.getPoints(100);
  let geome = new THREE.BufferGeometry().setFromPoints(points);
  let mate = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
  let orbitaLuna = new THREE.Line(geome, mate);
  pivote.add(orbitaLuna);
  orbitas.push(orbitaLuna);
}

export function CinturonAsteroides(scene, distMin, distMax, texture) {
  let cinturon = new THREE.Object3D();
  const geom = new THREE.DodecahedronGeometry(0.3);
  let matOptions = { color: 0xcccccc, shininess: 2 };
  if (texture !== undefined && texture !== null) {
    matOptions.map = texture;
    matOptions.bumpMap = texture;
    matOptions.bumpScale = 1.5;
  }
  const mat = new THREE.MeshPhongMaterial(matOptions);

  for (let i = 0; i < 400; i++) {
    let roca = new THREE.Mesh(geom, mat);
    let angulo = Math.random() * Math.PI * 2;
    let radio = distMin + Math.random() * (distMax - distMin);
    roca.position.set(
      Math.cos(angulo) * radio,
      Math.sin(angulo) * radio,
      (Math.random() - 0.5) * 2.0
    );
    roca.rotation.set(Math.random(), Math.random(), Math.random());
    roca.castShadow = true;
    roca.receiveShadow = true;
    cinturon.add(roca);
  }
  scene.add(cinturon);
  return cinturon;
}

export function Anillo(padre, radioInt, radioExt) {
  let geometry = new THREE.RingGeometry(radioInt, radioExt, 128);
  // u = distancia normalizada al centro (0 en el borde interior, 1 en el exterior)
  let pos = geometry.attributes.position;
  let v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    let radioActual = v3.length();
    let escala = (radioActual - radioInt) / (radioExt - radioInt);
    geometry.attributes.uv.setXY(i, escala, 1);
  }
  let material = new THREE.ShaderMaterial({
    uniforms: { u_time: uTiempo },
    vertexShader: vertexShaderAnillo(),
    fragmentShader: fragmentShaderAnillo(),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  let anillo = new THREE.Mesh(geometry, material);
  anillo.rotation.x = Math.PI / 2;
  padre.add(anillo);
}


// ----------------- NAVE Y CONTROLES -----------------

export function Nave(scene) {
  let grupoNave = new THREE.Group();
  let matFuselaje = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.2 });
  let matAlas = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.4 });
  let matCristal = new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 1.0, roughness: 0.0, emissive: 0x002244 });
  let matFuego = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  let fuselaje = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4, 16), matFuselaje);
  fuselaje.rotation.x = Math.PI / 2;
  grupoNave.add(fuselaje);

  let morro = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 16), matFuselaje);
  morro.rotation.x = Math.PI / 2;
  morro.position.z = -2.75;
  grupoNave.add(morro);

  let cabina = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), matCristal);
  cabina.scale.set(1, 0.6, 2.5);
  cabina.position.set(0, 0.4, -1);
  grupoNave.add(cabina);

  let alaIzq = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.5), matAlas);
  alaIzq.position.set(-2, 0, 1);
  alaIzq.rotation.y = -Math.PI / 6;
  grupoNave.add(alaIzq);

  let alaDer = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.5), matAlas);
  alaDer.position.set(2, 0, 1);
  alaDer.rotation.y = Math.PI / 6;
  grupoNave.add(alaDer);

  let motorIzq = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16), matFuego);
  motorIzq.rotation.x = Math.PI / 2;
  motorIzq.position.set(-0.8, 0, 2.1);
  grupoNave.add(motorIzq);

  let motorDer = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16), matFuego);
  motorDer.rotation.x = Math.PI / 2;
  motorDer.position.set(0.8, 0, 2.1);
  grupoNave.add(motorDer);

  let luzPropulsor = new THREE.PointLight(0x00f0ff, 2, 10);
  luzPropulsor.position.set(0, 0, 2.5);
  grupoNave.add(luzPropulsor);

  let faro = new THREE.PointLight(0xffffff, 2.5, 50);
  faro.position.set(0, 0, -3);
  grupoNave.add(faro);

  let camaraNave = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camaraNave.position.set(0, 2, 7);
  grupoNave.add(camaraNave);

  grupoNave.position.set(0, 40, 60);
  grupoNave.rotation.x = -Math.PI / 6;
  scene.add(grupoNave);

  return { grupoNave, camaraNave };
}