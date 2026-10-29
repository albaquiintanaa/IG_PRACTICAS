import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FlyControls } from "three/examples/jsm/controls/FlyControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { Estrella, Planeta, EsferaHija, Luna, CinturonAsteroides, Anillo, Nave } from "./objects.js";
import { crearConstelaciones } from "./constellations.js";

// ----------------- VARIABLES GLOBALES -----------------

let scene, renderer, camera;

let planetas = [];
let lunas = [];
let atmosferas = [];
let orbitas = [];

let t0 = 0;
let aceleracionGlobal = 0.0001; 
let timestamp;

let cinturonAsteroides;

let camaraNave, camaraActiva, camaraCinematica;
let camcontrols, flyControls;
let nave;
let clock = new THREE.Clock();

let planetaCercano = null;
let planetaEnfoque = null;

let indiceAstroActual = 0;
let enCinematica = false;

let grupoConstelaciones;

let planetasPersonalizados = []; 
let transformControl;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let modoEdicionActivo = false;

let temporizadorToast;

// ----------------- LLAMADA DE FUNCIONES -----------------

init();
animationLoop();

function init() {

  // ----------------- ESCENA Y CÁMARAS -----------------

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 20, 100);

  camaraCinematica = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);
  camaraActiva = camera;

  let naveConfig = Nave(scene);
  nave = naveConfig.grupoNave;
  camaraNave = naveConfig.camaraNave;

  flyControls = new FlyControls(nave, renderer.domElement);
  flyControls.movementSpeed = 15;
  flyControls.rollSpeed = Math.PI / 4; 
  flyControls.dragToLook = true; 

  const selectorCamara = document.getElementById("selectorCamara");
  
  if (selectorCamara) {
    selectorCamara.addEventListener("change", (evento) => {
      if (evento.target.value === "pilotar") {
        camaraActiva = camaraNave;
        mostrarToastControles("pilotar"); 
      } else {
        camaraActiva = camera;
        mostrarToastControles("orbitar"); 
      }
      selectorCamara.blur();
    });
  }

  setTimeout(() => mostrarToastControles("orbitar"), 1000); // Esperamos un sec al inicio

  // ----------------- TEXTURAS -----------------

  const textureLoader = new THREE.TextureLoader();
  scene.background = textureLoader.load(require("./img/stars_texture.jpg"));

  const txSol = textureLoader.load(require("./img/sun_texture.jpg"));
  
  const txMercurio = textureLoader.load(require("./img/mercury_texture.jpg"));
  const txVenus = textureLoader.load(require("./img/venus_surface.jpg"));
  const txVenusAtmos = textureLoader.load(require("./img/venus_atmosphere.jpg"));
  const txTierra = textureLoader.load(require("./img/earth_texture.jpg"));
  const txNubes = textureLoader.load(require("./img/earth_clouds.jpg"));
  const txMarte = textureLoader.load(require("./img/mars_texture.jpg"));
  const txAsteroide = textureLoader.load(require("./img/asteroid_texture.jpg"));
  const txJupiter = textureLoader.load(require("./img/jupiter_texture.jpg"));
  const txSaturno = textureLoader.load(require("./img/saturn_texture.jpg"));
  const txAnilloSaturno = textureLoader.load(require("./img/saturn_ring.png"));
  const txUrano = textureLoader.load(require("./img/uranus_texture.jpg"));
  const txNeptuno = textureLoader.load(require("./img/neptune_texture.jpg"));

  const txLuna = textureLoader.load(require("./img/moon_texture.jpg"));
  const txFobos = textureLoader.load(require("./img/phobos_texture.png"));
  const txDeimos = textureLoader.load(require("./img/deimos_texture.png"));
  const txIo = textureLoader.load(require("./img/io_texture.jpg"));
  const txEuropa = textureLoader.load(require("./img/europa_texture.jpg"));
  const txGanimedes = textureLoader.load(require("./img/ganymede_texture.jpg"));
  const txCalisto = textureLoader.load(require("./img/callisto_texture.jpg"));
  const txMimas = textureLoader.load(require("./img/mimas_texture.jpg"));
  const txTitan = textureLoader.load(require("./img/titan_texture.jpg"));
  const txTriton = textureLoader.load(require("./img/triton_texture.jpg"));

  // ----------------- LUCES -----------------

  const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.15); 
  scene.add(luzAmbiental);

  const luzPuntual = new THREE.PointLight(0xffffff, 2.5, 800); // Sol
  luzPuntual.position.set(0, 0, 0);
  luzPuntual.castShadow = true;
  luzPuntual.shadow.mapSize.width = 2048; 
  luzPuntual.shadow.mapSize.height = 2048;
  scene.add(luzPuntual);

  // ----------------- OBJETOS -----------------

  // SOL
  let sol = Estrella(scene, 4.0, 0xffffff, txSol);
  sol.userData.nombre = "El Sol";
  sol.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Estrella (Enana amarilla)</li>
      <li><strong>Satélites:</strong> Todo el sistema planetario</li>
      <li><strong>Dato:</strong> Su núcleo alcanza los 15 millones de grados Celsius y contiene el 99.8% de toda la masa del sistema solar.</li>
    </ul>`;
  planetas.unshift(sol);

  // MERCURIO
  let mercurio = Planeta(scene, planetas, orbitas, 0.8, 10, 2.5, 0xffffff, 1.0, 1.0, txMercurio, 0.12);
  mercurio.userData.nombre = "Mercurio";
  mercurio.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Planeta rocoso</li>
      <li><strong>Satélites:</strong> Ninguno</li>
      <li><strong>Dato:</strong> El planeta más cercano al Sol y el más rápido. Sufre temperaturas extremas (430°C de día, -180°C de noche).</li>
    </ul>`;

  // VENUS 
  let venus = Planeta(scene, planetas, orbitas, 1.2, 16, 1.2, 0xffffff, 1.0, 1.0, txVenus, 0.05);
  EsferaHija(venus, atmosferas, 1.22, 40, 40, 0xffffff, txVenusAtmos, undefined, undefined, txVenusAtmos);
  venus.userData.nombre = "Venus";
  venus.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Planeta rocoso</li>
      <li><strong>Satélites:</strong> Ninguno</li>
      <li><strong>Dato:</strong> El planeta más cálido del sistema solar.</li>
    </ul>`;

  // TIERRA 
  let tierra = Planeta(scene, planetas, orbitas, 1.5, 24, 0.8, 0xffffff, 1.0, 1.0, txTierra, 0.0);
  EsferaHija(tierra, atmosferas, 1.52, 40, 40, 0xffffff, txNubes, undefined, undefined, txNubes);
  Luna(tierra, lunas, orbitas, 0.4, 3.5, 3.0, 0xffffff, txLuna, 0.1);
  tierra.userData.nombre = "Tierra";
  tierra.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Planeta rocoso</li>
      <li><strong>Satélites:</strong> 1 (La Luna)</li>
      <li><strong>Dato:</strong> Nuestro hogar. Único planeta conocido que alberga vida.</li>
    </ul>`;

  // MARTE 
  let marte = Planeta(scene, planetas, orbitas, 1.0, 32, 0.5, 0xffffff, 1.0, 1.0, txMarte, 0.03);
  Luna(marte, lunas, orbitas, 0.15, 1.8, 4.0, 0xffffff, txFobos, 0.05);
  Luna(marte, lunas, orbitas, 0.12, 2.5, 2.5, 0xffffff, txDeimos, -0.05);
  marte.userData.nombre = "Marte";
  marte.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Planeta rocoso</li>
      <li><strong>Satélites:</strong> 2 (Fobos, Deimos)</li>
      <li><strong>Dato:</strong> El planeta rojo.</li>
    </ul>`;

  // ASTEROIDES
  CinturonAsteroides(scene, 38, 42, txAsteroide);

  // JÚPITER
  let jupiter = Planeta(scene, planetas, orbitas, 3.0, 48, 0.2, 0xffffff, 1.0, 1.0, txJupiter, 0.02);
  Luna(jupiter, lunas, orbitas, 0.2, 3.8, 3.0, 0xffffff, txIo, 0.02);
  Luna(jupiter, lunas, orbitas, 0.18, 4.5, 2.2, 0xffffff, txEuropa, 0.05);
  Luna(jupiter, lunas, orbitas, 0.25, 5.5, 1.5, 0xffffff, txGanimedes, -0.02);
  Luna(jupiter, lunas, orbitas, 0.22, 6.5, 1.0, 0xffffff, txCalisto, 0.1);
  jupiter.userData.nombre = "Júpiter";
  jupiter.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Gigante Gaseoso</li>
      <li><strong>Satélites:</strong> 95+</li>
      <li><strong>Dato:</strong> El planeta más grande del sistema solar.</li>
    </ul>`;

  // SATURNO 
  let saturno = Planeta(scene, planetas, orbitas, 2.5, 65, 0.1, 0xffffff, 1.0, 1.0, txSaturno, 0.04);
  Anillo(saturno, 3.2, 5.5, txAnilloSaturno);
  Luna(saturno, lunas, orbitas, 0.15, 3.5, 2.0, 0xffffff, txMimas, 0.2);
  Luna(saturno, lunas, orbitas, 0.35, 5.0, 1.2, 0xffffff, txTitan, 0.1);
  saturno.userData.nombre = "Saturno";
  saturno.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Gigante Gaseoso</li>
      <li><strong>Satélites:</strong> 146+</li>
      <li><strong>Dato:</strong> Famoso por sus espectaculares anillos.</li>
    </ul>`;

  // URANO
  let urano = Planeta(scene, planetas, orbitas, 1.8, 80, 0.07, 0xffffff, 1.0, 1.0, txUrano, 0.01);
  urano.userData.nombre = "Urano";
  urano.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Gigante de Hielo</li>
      <li><strong>Satélites:</strong> 28+</li>
      <li><strong>Dato:</strong> Rota de lado.</li>
    </ul>`;

  // NEPTUNO 
  let neptuno = Planeta(scene, planetas, orbitas, 1.7, 95, 0.05, 0xffffff, 1.0, 1.0, txNeptuno, 0.03);
  Luna(neptuno, lunas, orbitas, 0.25, 3.0, -1.5, 0xffffff, txTriton, -0.3);
  neptuno.userData.nombre = "Neptuno";
  neptuno.userData.infoHtml = `
    <ul>
      <li><strong>Tipo:</strong> Gigante de Hielo</li>
      <li><strong>Satélites:</strong> 16+</li>
      <li><strong>Dato:</strong> El planeta más lejano del Sol.</li>
    </ul>`;

    orbitas.forEach(orbita => orbita.visible = false);

  // ----------------- CONSTELACIONES -----------------

  grupoConstelaciones = new THREE.Group();
  scene.add(grupoConstelaciones);
  crearConstelaciones(grupoConstelaciones); 
  grupoConstelaciones.visible = false;

  // ----------------- LÓGICA BOTONES Y SLIDER -----------------

  document.getElementById("btnOrbitas").addEventListener("click", (evento) => {
    orbitas.forEach(orbita => orbita.visible = !orbita.visible);
    evento.target.classList.toggle("activo"); 
  });

  const slider = document.getElementById("sliderVelocidad");
  const textoVelocidad = document.getElementById("valorVelocidad");
  const btnReset = document.getElementById("btnReset");
  
  function actualizarVelocidad(valor) {
    aceleracionGlobal = valor;
    slider.value = valor;

    if (valor === 0) {
      textoVelocidad.innerText = "Pausado";
      btnReset.style.display = "inline-block"; 
    } else if (valor <= 0.0001) {
      textoVelocidad.innerText = "Tiempo Real";
      btnReset.style.display = "none"; 
    } else if (valor < 0.001) {
      let dias = Math.round((valor / 0.0001) * 10); 
      textoVelocidad.innerText = dias + " Días / seg";
      btnReset.style.display = "inline-block";
    } else if (valor < 0.005) {
      let meses = Math.round((valor / 0.001) * 3);
      textoVelocidad.innerText = meses + " Meses / seg";
      btnReset.style.display = "inline-block";
    } else {
      let anos = Math.round(valor / 0.001);
      textoVelocidad.innerText = anos + " Años / seg";
      btnReset.style.display = "inline-block";
    }
  }

  slider.addEventListener("input", (evento) => {
    let valor = parseFloat(evento.target.value);
    actualizarVelocidad(valor);
  });

  slider.addEventListener("keydown", (evento) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(evento.code)) {
      evento.preventDefault(); 
    }
  });

  slider.addEventListener("change", () => {
    slider.blur(); 
    document.body.focus(); 
  });

  btnReset.addEventListener("click", () => {
    actualizarVelocidad(0.0001); 
  });

  const spanNombreAstro = document.getElementById("nombreAstroSlider");
  
  function actualizarDeslizadorAstros() {
    if (planetas.length > 0) {
      let p = planetas[indiceAstroActual];
      spanNombreAstro.innerText = p.userData.nombre ? p.userData.nombre.toUpperCase() : "PLANETA";
    }
  }

  setTimeout(actualizarDeslizadorAstros, 100);

  document.getElementById("btnAnterior").addEventListener("click", () => {
    if (enCinematica) return;
    indiceAstroActual = (indiceAstroActual - 1 + planetas.length) % planetas.length;
    actualizarDeslizadorAstros();
  });

  document.getElementById("btnSiguiente").addEventListener("click", () => {
    if (enCinematica) return;
    indiceAstroActual = (indiceAstroActual + 1) % planetas.length;
    actualizarDeslizadorAstros();
  });

  function abrirInfo(planetaTarget) {
    if (enCinematica) return; 
    enCinematica = true;
    planetaEnfoque = planetaTarget; 

    const panel = document.getElementById("panel-info");
    document.getElementById("hud-proximidad").style.display = "none";

    document.getElementById("btnVerInfoSlider").classList.add("activo");
    
    document.getElementById("info-titulo").innerText = planetaTarget.userData.nombre;
    document.getElementById("info-desc").innerHTML = planetaTarget.userData.infoHtml;
    
    camaraActiva = camaraCinematica;
    
    panel.style.display = "block";
  }

  function cerrarInfo() {
    if (!enCinematica) return; 

    document.getElementById("panel-info").style.display = "none";
    document.getElementById("btnVerInfoSlider").classList.remove("activo");
    
    const selector = document.getElementById("selectorCamara");
    if (selector && selector.value === "pilotar") {
      camaraActiva = camaraNave;
      if (planetaCercano !== null) {
        document.getElementById("hud-proximidad").style.display = "block";
      }
    } else {
      camaraActiva = camera;
    }

    document.getElementById("btnCerrarInfo").blur();
    document.getElementById("btnVerInfoSlider").blur();
    document.body.focus(); 
    
    enCinematica = false;
    planetaEnfoque = null; 
  }

  document.getElementById("btnVerInfoSlider").addEventListener("click", () => {
    if (enCinematica) {
      cerrarInfo(); 
    } else {
      if (planetas.length > 0) abrirInfo(planetas[indiceAstroActual]);
    }
  });

  document.getElementById("btnConstelaciones").addEventListener("click", (evento) => {
    grupoConstelaciones.visible = !grupoConstelaciones.visible;
    evento.target.classList.toggle("activo");
    evento.target.blur();
    document.body.focus();
  });
  

  document.getElementById("btnCerrarInfo").addEventListener("click", cerrarInfo);

  function mostrarToastControles(modo) {
    const toast = document.getElementById("toast-controles");
    const titulo = document.getElementById("toast-titulo");
    const desc = document.getElementById("toast-desc");

    if (modo === "orbitar") {
      titulo.innerText = "CONTROLES VISTA ORBITAL";
      desc.innerHTML = `
        <span class="tecla">Clic Izq</span> Rotar &nbsp;|&nbsp; <span class="tecla">Clic Der</span> Mover X/Y <br>
        <span class="tecla">Rueda Ratón</span> Zoom
      `;
    } else if (modo === "pilotar") {
      titulo.innerText = "PILOTAR NAVE";
      desc.innerHTML = `
        <span class="tecla">W</span> <span class="tecla">A</span> <span class="tecla">S</span> <span class="tecla">D</span> Moverse <br>
        <span class="tecla">Flechas</span> Orientación <br>
        <span class="tecla">Q</span> <span class="tecla">E</span> Girar &nbsp;|&nbsp; <span class="tecla">R</span> <span class="tecla">F</span> Subir/Bajar
      `;
    }

    toast.classList.add("mostrar");

    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => {
      toast.classList.remove("mostrar");
    }, 6000); // Tras 6 segundos
  }

  // ----------------- EVENTOS DE TECLADO -----------------

  window.addEventListener("keydown", (evento) => {
    if (evento.code === "Space" && planetaCercano !== null && !enCinematica) {
      evento.preventDefault(); 
      abrirInfo(planetaCercano);
    }
    
    if (evento.code === "KeyQ" && enCinematica) {
      evento.preventDefault();
      cerrarInfo();
    }
  });

  
  // ----------------- MODO CREADOR -----------------
  
  transformControl = new TransformControls(camera, renderer.domElement);
  
  transformControl.addEventListener('dragging-changed', function (evento) {
    camcontrols.enabled = !evento.value;
  });

  transformControl.addEventListener('change', function () {
    if (transformControl.object && modoEdicionActivo) {
      let astro = transformControl.object;
      let distancia = astro.position.length(); 
      
      let clima, hab, colorHex;

      if (distancia < 17) {
        clima = "Abrasador (+400°C)";
        hab = "Imposible. Roca fundida.";
        colorHex = 0xff3300; 
      } else if (distancia >= 17 && distancia <= 30) {
        clima = "Templado (15°C)";
        hab = "ÓPTIMA. Agua líquida.";
        colorHex = 0x00ff88; 
      } else {
        clima = "Congelado (-150°C)";
        hab = "Imposible. Hielo perpetuo.";
        colorHex = 0xaaddff; 
      }

      astro.material.color.setHex(colorHex);

      document.getElementById("exo-dist").innerText = distancia.toFixed(1) + " Millones km";
      document.getElementById("exo-clima").innerText = clima;
      document.getElementById("exo-clima").style.color = "#" + colorHex.toString(16).padStart(6, '0');
      document.getElementById("exo-hab").innerText = hab;
    }
  });

  scene.add(transformControl);

  const panelAnalisis = document.getElementById("panel-analisis");
  const selectorHerramientas = document.getElementById("selectorHerramientas");

  if (selectorHerramientas) {
    selectorHerramientas.addEventListener("change", (evento) => {
      let accion = evento.target.value;
      modoEdicionActivo = true; 

      if (accion === "añadir") {
        let geom = new THREE.SphereGeometry(1.2, 32, 32);
        let mat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 10 }); 
        
        let nuevoAstro = new THREE.Mesh(geom, mat);
        nuevoAstro.castShadow = true;
        nuevoAstro.receiveShadow = true;
        nuevoAstro.position.set(24, 0, 0); 
        
        scene.add(nuevoAstro);
        planetasPersonalizados.push(nuevoAstro);
        
        transformControl.attach(nuevoAstro);
        panelAnalisis.style.display = "block";

      } else if (accion === "borrar") {
        if (transformControl.object) {
          let objetoABorrar = transformControl.object;
          transformControl.detach(); 
          scene.remove(objetoABorrar); 
          planetasPersonalizados = planetasPersonalizados.filter(p => p !== objetoABorrar);
          objetoABorrar.geometry.dispose();
          objetoABorrar.material.dispose();
          panelAnalisis.style.display = "none";
        }
      }

      selectorHerramientas.value = "";
      selectorHerramientas.blur(); 
      document.body.focus();
    });
  }

  window.addEventListener('pointerdown', (evento) => {
    if (evento.target !== renderer.domElement) return;

    if (!modoEdicionActivo || camaraActiva !== camera) return;

    // Coordenadas 2D del ratón en la pantalla a coordenadas 3D normalizadas (-1 a +1)
    mouse.x = (evento.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(evento.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    let intersecciones = raycaster.intersectObjects(planetasPersonalizados);

    if (intersecciones.length > 0) {
      transformControl.attach(intersecciones[0].object);
      panelAnalisis.style.display = "block";
      transformControl.dispatchEvent({ type: 'change' }); 
    } else if (!transformControl.dragging) {
      transformControl.detach();
      panelAnalisis.style.display = "none";
    }
  });


  t0 = Date.now();
  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  if(camaraNave) {
    camaraNave.aspect = window.innerWidth / window.innerHeight;
    camaraNave.updateProjectionMatrix();
  }
  if(camaraCinematica) {
    camaraCinematica.aspect = window.innerWidth / window.innerHeight;
    camaraCinematica.updateProjectionMatrix();
  }
}


// ----------------- EVENTOS DE VENTANA Y BUCLE DE ANIMACIÓN -----------------

function animationLoop() {
  let delta = clock.getDelta();
  timestamp = (Date.now() - t0) * aceleracionGlobal;
  requestAnimationFrame(animationLoop);

  let distanciaMinima = Infinity;
  let candidatoCercano = null;
  let umbralDistanciaSuperficie = 15.0; 

  let posicionCamara = new THREE.Vector3();
  if (camaraActiva) camaraActiva.getWorldPosition(posicionCamara);

  for (let object of planetas) {
    object.position.x = Math.cos(timestamp * object.userData.speed) * object.userData.f1 * object.userData.dist;
    object.position.y = Math.sin(timestamp * object.userData.speed) * object.userData.f2 * object.userData.dist;
    object.rotation.z += 0.01;

    if (camaraActiva === camaraNave && !enCinematica) {
      let posMundoPlaneta = new THREE.Vector3();
      object.getWorldPosition(posMundoPlaneta); 
      
      let distanciaAlCentro = posicionCamara.distanceTo(posMundoPlaneta);
      let radioPlaneta = object.geometry ? object.geometry.parameters.radius : 1.0;
      
      let distanciaSuperficie = distanciaAlCentro - radioPlaneta;

      if (object.userData.nombre && distanciaSuperficie < umbralDistanciaSuperficie && distanciaSuperficie < distanciaMinima) {
        distanciaMinima = distanciaSuperficie;
        candidatoCercano = object;
      }
    }
  }

  if (enCinematica && planetaEnfoque) {
    let posPlaneta = new THREE.Vector3();
    planetaEnfoque.getWorldPosition(posPlaneta);
    
    let radio = 1.5;
    if (planetaEnfoque.geometry && planetaEnfoque.geometry.parameters.radius) {
      radio = planetaEnfoque.geometry.parameters.radius;
    }

    camaraCinematica.position.set(
      posPlaneta.x - (radio * 3), 
      posPlaneta.y + (radio * 0.5), 
      posPlaneta.z + (radio * 4.5)
    );
    camaraCinematica.lookAt(posPlaneta.x - (radio * 2), posPlaneta.y, posPlaneta.z);
  }

  const hud = document.getElementById("hud-proximidad");
  if (candidatoCercano !== planetaCercano) {
    planetaCercano = candidatoCercano;
    if (planetaCercano !== null) {
      document.getElementById("prox-nombre").innerText = planetaCercano.userData.nombre;
      hud.style.display = "block";
    } else {
      hud.style.display = "none";
    }
  }

  for (let object of lunas) {
    object.parent.rotation.z = timestamp * object.userData.speed;
    object.rotation.z += 0.02; 
  }

  for (let nube of atmosferas) {
    nube.rotation.z += 0.003; 
  }

  if (cinturonAsteroides) cinturonAsteroides.rotation.z += 0.0002;

  if (camaraActiva === camaraNave) flyControls.update(delta);
  if (camaraActiva === camera) camcontrols.update();

  // ----------------- COLISIONES -----------------

  if (camaraActiva === camaraNave) {
    let posNave = new THREE.Vector3();
    nave.getWorldPosition(posNave);
    let radioNave = 2.0; 

    let cuerposCelestes = planetas.concat(lunas); 
    
    for (let cuerpo of cuerposCelestes) {
      let posCuerpo = new THREE.Vector3();
      cuerpo.getWorldPosition(posCuerpo);
      let radioCuerpo = cuerpo.geometry ? cuerpo.geometry.parameters.radius : 1.0;
      
      let distancia = posNave.distanceTo(posCuerpo);
      let distanciaMinimaPermitida = radioCuerpo + radioNave;
      
      if (distancia < distanciaMinimaPermitida) {
         let direccionRebote = new THREE.Vector3().subVectors(posNave, posCuerpo).normalize();
         let nuevaPosicion = posCuerpo.clone().add(direccionRebote.multiplyScalar(distanciaMinimaPermitida));
         nave.position.copy(nuevaPosicion);
      }
    }
  }

  renderer.render(scene, camaraActiva);
}