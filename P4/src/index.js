import * as dat from "dat.gui";
import { mat4 } from "gl-matrix";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision mediump float;

      in vec3 aCoordinates;
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;

      void main(void) {
        gl_Position = uViewMatrix * uModelMatrix * vec4(aCoordinates, 1.0);
        gl_PointSize = 10.0;
        //gl_Position.z *= -1.0;
      }
`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
precision mediump float;

out vec4 fragColor;
uniform vec4 uColor;

void main(void) {
  fragColor = uColor;
}
`;

var canvas, gl;
var colorLocation;
var vertex_buffer;
var modelMatrixLoc;
var modelMatrix;
var index_buffer;
var rotateX=0, rotateY=0;
var mouseX, mouseY;
var zoomFactor = 1;
var viewMatrixLoc;
var alarm = false;
var hasDiamond = false;
var time = 0;
var columns = [];
var numColumns = 12;
var audio = null;
var teclas = {}
var gameOver = false;
var win = false;
var alarmTimer = 0;

var guard = { 
  x: 0, 
  z: 10, 
  speed: 0.035 
};

var player = {
  x: 0, y: 0.5, z: 10,
  ori: -Math.PI/2,
  vy:0,
  tilt: 0
 };

/*var settings = {
  translateX: 0.0,
  translateY: 0.0,
  rotateZ: 0.0,
};*/

var matrixStack = [];
function glPushMatrix() {
  const matrix = mat4.create();
  mat4.copy(matrix, modelMatrix);
  matrixStack.push(matrix);
}

function glPopMatrix() {
  modelMatrix = matrixStack.pop();
}

function init() {
  // ============ STEP 1: Creating a canvas=================
  canvas = document.getElementById("my_Canvas");
  gl = canvas.getContext("webgl2");

  /*// create GUI
  var gui = new dat.GUI();
  gui.add(settings, "translateX", -1.0, 1.0, 0.01);
  gui.add(settings, "translateY", -1.0, 1.0, 0.01);
  gui.add(settings, "rotateZ", -180, 180);

  // Posicionar el GUI debajo del canvas
  const canvasRect = canvas.getBoundingClientRect();
  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = canvasRect.bottom + window.scrollY + 20 + "px";
  gui.domElement.style.left =
    canvasRect.left +
    window.scrollX +
    (canvasRect.width - gui.domElement.offsetWidth) / 2 +
    "px";
    */

  //========== STEP 2: Create and compile shaders ==========

  // Create a vertex shader object
  const vertShader = gl.createShader(gl.VERTEX_SHADER);

  // Attach vertex shader source code
  gl.shaderSource(vertShader, vertexShaderSource);

  // Compile the vertex shader
  gl.compileShader(vertShader);
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.log("vertShader: " + gl.getShaderInfoLog(vertShader));
  }

  // Create fragment shader object
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  // Attach fragment shader source code
  gl.shaderSource(fragShader, fragmentShaderSource);

  // Compile the fragmentt shader
  gl.compileShader(fragShader);
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.log("fragShader: " + gl.getShaderInfoLog(fragShader));
  }

  // Create a shader program object to store
  // the combined shader program
  const shaderProgram = gl.createProgram();

  // Attach a vertex shader
  gl.attachShader(shaderProgram, vertShader);

  // Attach a fragment shader
  gl.attachShader(shaderProgram, fragShader);

  // Link both programs
  gl.linkProgram(shaderProgram);

  // Use the combined shader program object
  gl.useProgram(shaderProgram);  

  //======== STEP 3: Create buffer objects and associate shaders ========

  // Create an empty buffer object to store the vertex buffer
  vertex_buffer = gl.createBuffer();
  
  // create index buffer
  index_buffer = gl.createBuffer();

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // Get the attribute location
  const coordLocation = gl.getAttribLocation(shaderProgram, "aCoordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coordLocation, 3, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coordLocation);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // look up uniform locations
  colorLocation = gl.getUniformLocation(shaderProgram, "uColor");

  modelMatrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
  viewMatrixLoc = gl.getUniformLocation(shaderProgram,
    "uViewMatrix");

  // Generar posiciones aleatorias para las columnas
  for (let i = 0; i < numColumns; i++) {
    let colX = (Math.random() - 0.5) * 13;
    let colZ = (Math.random() * 16) - 6;

    // Si cae muy cerca del centro del pasillo donde están el jugador o el diamante, la movemos a un lado
    if (Math.abs(colX) < 1.5) {
      colX += (colX < 0 ? -2.0 : 2.0);
    }

    columns.push({ x: colX, z: colZ });
  }
  
  gl.enable(gl.DEPTH_TEST);
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  time += 0.05; // En cada fotograma

  let speed = 0.1;
  if (gameOver || win) speed = 0;

  let moveX = 0;
  let moveZ = 0;

  if (teclas[87] || teclas[38]) { moveX += speed * Math.cos(player.ori); moveZ += speed * Math.sin(player.ori); }
  if (teclas[83] || teclas[40]) { moveX -= speed * Math.cos(player.ori); moveZ -= speed * Math.sin(player.ori); }
  if (teclas[65] || teclas[37]) { moveX += speed * Math.cos(player.ori - Math.PI/2); moveZ += speed * Math.sin(player.ori - Math.PI/2); }
  if (teclas[68] || teclas[39]) { moveX += speed * Math.cos(player.ori + Math.PI/2); moveZ += speed * Math.sin(player.ori + Math.PI/2); }

  if (hayColision(player.x + moveX, player.z, player.y)) {
    moveX = 0; 
  }
  if (hayColision(player.x, player.z + moveZ, player.y)) {
    moveZ = 0; 
  }
  player.x += moveX;
  player.z += moveZ;


  // Clear the canvas
  if (alarm) {
    alarmTimer++;
    if (alarmTimer <= 180){
      playSound("alarm")
      
      if (Math.sin(time * 5) > 0){
        gl.clearColor(0.8, 0.0, 0.0, 1.0);
      } else {
        gl.clearColor(0.1, 0.0, 0.0, 1.0);
      }
    } else {
      gl.clearColor(0.6, 0.6, 0.6, 1.0);
    }
    if (alarmTimer >= 360) {
      alarmTimer = 0;
    }
  } else {
    gl.clearColor(0.6, 0.6, 0.6, 1.0);
  }



  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT |
    gl.DEPTH_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Set the model Matrix.
  modelMatrix = mat4.create();
  mat4.identity(modelMatrix);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,
    index_buffer);
  
  // perspective
  const viewMatrix = mat4.create();
  mat4.perspective(viewMatrix,
    Math.PI/4, // vertical opening angle
    1, // ratio width-height
    0.5, // z-near
    30 // z-far
  );
  gl.uniformMatrix4fv(viewMatrixLoc, false,
    viewMatrix);
  
  const eye = [player.x, player.y, player.z];
  const center = [player.x + Math.cos(player.tilt) * Math.cos(player.ori), player.y + Math.sin(player.tilt),
    player.z + Math.cos(player.tilt) * Math.sin(player.ori)];
  mat4.lookAt(modelMatrix, eye, center, [0,1,0]);
  
  // mouse transformations
  mat4.scale(modelMatrix, modelMatrix, [zoomFactor, zoomFactor,
    zoomFactor]);
  mat4.rotateX(modelMatrix, modelMatrix, rotateX);
  mat4.rotateY(modelMatrix, modelMatrix, rotateY);

  // Columnas  
  for (let i = 0; i < columns.length; i++) {
    renderCube(
      columns[i].x, 
      0, 
      columns[i].z, 
      0.8, 3.0, 0.8, 
      [0.2, 0.2, 0.25, 1.0],
    );
  }
   
   if (!hasDiamond ) {
    renderDiamond(0, 0.8 + Math.sin(time * 2) * 0.15, -5, 0.4, [0.0, 0.9, 1.0, 1.0]);
  }
  var laser1 = Math.sin(time) * 5.5;
  renderCube(laser1, 0.5, 2, 3, 0.05, 0.05, [1.0, 0.0, 0.0, 1.0]);

  var laser2 = -Math.sin(time * 1.5) * 5.5; 
  renderCube(laser2, 0.5, -2, 3, 0.05, 0.05, [1.0, 0.0, 0.0, 1.0]);

  // banco
  renderCube(0, 0.15, 5.0, 5.0, 0.3, 0.8, [0.4, 0.25, 0.15, 1.0]);

  // persiana
  renderCube(0, 1.4, -3.5, 6.0, 1.8, 0.2, [0.8, 0.0, 0.4, 1.0]);

  // Colisiones diamante y láseres
  if (!hasDiamond && Math.hypot(player.x - 0, player.z - (-5)) < 0.8) {
    hasDiamond = true;
    playSound("diamond");
    player.ori = Math.PI/ 2 // giro de 180 grados para que mire la puerta
    player.tilt = 0;

    let inv = document.getElementById("inventario");
    if (inv) {
      inv.innerHTML = "💎";
      inv.style.borderColor = "#00e5ff"; 
    }
    
  }

  // Comprobar colisión con Láser 1 (en z = 2)
  if (Math.abs(player.x - laser1) < 1.6 && Math.abs(player.z - 2) < 0.3) {
    alarm = true;
    alarmTimer = 0;
    player.ori = Math.PI / 2;
  }
  // Comprobar colisión con Láser 2 (en z = -2)
  if (Math.abs(player.x - laser2) < 1.6 && Math.abs(player.z - (-2)) < 0.3) {
    alarm = true;
    alarmTimer = 0;
    player.ori = Math.PI / 2;
  }

  if (alarm && !gameOver && !win) {
    let angleToPlayer = Math.atan2(player.z - guard.z, player.x - guard.x);
    guard.x += Math.cos(angleToPlayer) * guard.speed;
    guard.z += Math.sin(angleToPlayer) * guard.speed;
  }
  
  if (alarm) {
    renderCube(guard.x, 0, guard.z, 0.4, 1.6, 0.4, [0.5, 0.1, 0.8, 1.0]);
    renderCube(guard.x, 1.6, guard.z, 0.15, 0.15, 0.15, [1.0, 0.0, 0.0, 1.0]);
  }

  if (!gameOver && !win) {
    // DERROTA: Si el guardia te toca 
    if (alarm && Math.hypot(player.x - guard.x, player.z - guard.z) < 0.8) {
      gameOver = true;
      alarm = false;
      playSound("gameover");

      let cartel = document.getElementById("cartelFinal");
      if(cartel) {
        cartel.innerHTML = "GAME OVER";
        cartel.style.color = "#ff0000"; 
        cartel.style.display = "block";
      }
    }

    // VICTORIA: Si tienes el diamante y tocas la puerta verde 
    if (hasDiamond && Math.hypot(player.x - 0, player.z - 12) < 1.8) {
      win = true;
      alarm = false;
      playSound("win");

      let cartel = document.getElementById("cartelFinal");
      if(cartel) {
        cartel.innerHTML = "YOU WIN";
        cartel.style.color = "#00ff00"; 
        cartel.style.display = "block";
      }
    }
  }

  // Física del salto y gravedad
  if (player.y > 0.5 || player.vy > 0) {
    player.y += player.vy; 
    player.vy -= 0.005;   
    if (player.y < 0.5) {  
      player.y = 0.5;
      player.vy = 0;
    }
  }


  // suelo
  renderCube(0, -0.05, 2.5, 15, 0.1, 20, [0,0,0,1]);

  // puerta de salida
  let colorPuerta = [1, 1, 1, 1.0];

  if (hasDiamond) {
    if (Math.sin(time * 8) > 0) {
      colorPuerta = [1.0, 1.0, 0.0, 1.0]; 
    } else {
      colorPuerta = [0.2, 0.2, 0.0, 1.0]; 
    }
  }

  renderCube(0, 0, 12, 3.0, 3.0, 0.5, colorPuerta);

   // drawGround
  renderGround(15, 16);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,
    null);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  //document.getElementById("debug").textContent = "y = " + player1.y.toFixed(2);

  // start animation loop
  window.requestAnimationFrame(render);
}

function renderCube(x, y, z, scaleX, scaleY, scaleZ, color) {
  glPushMatrix();
    mat4.translate(modelMatrix, modelMatrix, [x, y, z]);
    mat4.scale(modelMatrix, modelMatrix, [scaleX, scaleY, scaleZ]);
    mat4.translate(modelMatrix, modelMatrix, [-0.5, 0, -0.5]);
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
    // create vertices
    const arrayV = new Float32Array([0,0,0, 1,0,0, 1,1,0, 0,1,0,
      0,0,1, 1,0,1, 1,1,1, 0,1,1]);
    gl.bufferData(gl.ARRAY_BUFFER, arrayV, gl.STATIC_DRAW);
  
    // create edges
    const arrayI = new Uint16Array([0,1,1,2,2,3,3,0,
      4,5,5,6,6,7,7,4,
      0,4,1,5,2,6,3,7]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayI,
    gl.STATIC_DRAW);
    // draw wireframe cube
    gl.uniform4fv(colorLocation, [0,0,0,1]);
    gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);

    // create faces
    const arrayF = new Uint16Array([
      1,0,3, 1,3,2, // cara trasera
      4,5,6, 4,6,7, // cara delantera
      7,6,2, 7,2,3, // cara superior
      0,1,5, 0,5,4, // cara inferior
      5,1,2, 5,2,6, // cara derecha
      0,4,7, 0,7,3, // cara izquierda  
    ]);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
    arrayF, gl.STATIC_DRAW);
    // draw solid cube
    gl.uniform4fv(colorLocation, color);
    gl.drawElements(gl.TRIANGLES, 36,
    gl.UNSIGNED_SHORT, 0);
  glPopMatrix();
}

function renderDiamond(x, y, z, scale, color) {
  glPushMatrix();
    mat4.translate(modelMatrix, modelMatrix, [x, y, z]);
    mat4.rotateY(modelMatrix, modelMatrix, time); // Gira continuamente
    mat4.scale(modelMatrix, modelMatrix, [scale, scale * 1.5, scale]);
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);

    // Vértices
    const arrayV = new Float32Array([
       0,  1,  0, // Punta superior
       0, -1,  0, // Punta inferior
       0,  0,  1, // Frente
       1,  0,  0, // Derecha
       0,  0, -1, // Atrás
      -1,  0,  0  // Izquierda
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, arrayV, gl.STATIC_DRAW);

    // Bordes negros (12 aristas = 24 índices)
    const arrayI = new Uint16Array([
      0,2, 0,3, 0,4, 0,5, 
      1,2, 1,3, 1,4, 1,5, 
      2,3, 3,4, 4,5, 5,2  
    ]);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayI, gl.STATIC_DRAW);
    gl.uniform4fv(colorLocation, [0, 0, 0, 1]);
    gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);

    // 8 triángulos 
    const arrayF = new Uint16Array([
      0, 2, 3,
      0, 3, 4,
      0, 4, 5,
      0, 5, 2,
      1, 3, 2,
      1, 4, 3,
      1, 5, 4,
      1, 2, 5
    ]);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayF, gl.STATIC_DRAW);
    gl.uniform4fv(colorLocation, color);
    gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);

  glPopMatrix();
}

function onMouseDown(e) {
  if (e.buttons==1 && e.srcElement==canvas) {
    mouseX = e.pageX;
    mouseY = e.pageY;
  }
}
 
function onMouseMove(e) {
  if (e.srcElement==canvas && !gameOver && !win) {
    player.ori += e.movementX * 0.005;
    player.tilt -= e.movementY * 0.005;

    player.tilt = Math.max(-1.4, Math.min(1.4, player.tilt)); //max 80º
  }
}

// draw squared floor
function renderGround(size, n) {
  glPushMatrix();
      mat4.scale(modelMatrix, modelMatrix, [size, size, size]);
      mat4.translate(modelMatrix, modelMatrix, [-0.5, 0, -0.5]);
      gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
      // creamos vector vértices
      var k = 0;
      const arrayV = new Float32Array(12*n);
      for (i = 0; i < n; i++) {
      arrayV[k++] = i/(n-1);
      arrayV[k++] = 0;
      arrayV[k++] = 0;
      arrayV[k++] = i/(n-1);
      arrayV[k++] = 0;
      arrayV[k++] = 1;
      }
      for (var i = 0; i < n; i++) {
      arrayV[k++] = 0;
      arrayV[k++] = 0;
      arrayV[k++] = i/(n-1);
      arrayV[k++] = 1;
      arrayV[k++] = 0;
      arrayV[k++] = i/(n-1);
      }
      gl.bufferData(gl.ARRAY_BUFFER, arrayV, gl.STATIC_DRAW);
      gl.uniform4fv(colorLocation, [0, 0, 0, 1]);
      gl.drawArrays(gl.LINES, 0, 4*n);
    glPopMatrix();
 }

 function zoom(e) {
  if (e.deltaY<0)
    zoomFactor *= 1.1;
  else
    zoomFactor *= 0.9;
 }

 function onKeyDown(key) {
  teclas[key.keyCode] = true;

  switch (key.keyCode) {
    // espacio
    case 32: {
      if (player.y <= 0.5 && !gameOver && !win) { // Suelo
        player.vy = 0.08; // Salta
      }
      break;
    }
    // shift
    case 16: {
      player.y = 0.2; // Agachar
      break;
    }
    // r
    case 82: {
      if (gameOver ||win){
        resetGame();
      }
      break;
    }
  }
}

function onKeyUp(key) {
  teclas[key.keyCode] = false;

  if (key.keyCode == 16) {
    player.y = 0.5; 
  }
}

function resetGame() {
  //Estados iniciales
  gameOver = false;
  win = false;
  hasDiamond = false;
  alarm = false;
  alarmTimer = 0;
  teclas = {};

  // Posiciones iniciales
  player.x = 0;
  player.y = 0.5;
  player.z = 10;
  player.ori = -Math.PI / 2;
  player.vy = 0;
  player.tilt = 0;

  guard.x = 0;
  guard.z = 10;

  let cartel = document.getElementById("cartelFinal");
  if (cartel) {
    cartel.style.display = "none";
  }
  let inv = document.getElementById("inventario");
  if (inv) {
    inv.innerHTML = "";
    inv.style.borderColor = "#555";
  }

}

function playSound(tipo) {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  }
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  let duration = 0;

  switch (tipo) {
    case "alarm":
      osc.type = "sawtooth";
      osc.frequency.value = Math.sin(time * 5) > 0 ? 800 : 600;
      gain.gain.value = 0.01;
      duration = 0.08;
      break;

    case "gameover":
      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      duration = 1.0;
      break;

    case "win":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(784.00, now + 0.24);
      osc.frequency.setValueAtTime(1046.50, now + 0.36);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.12, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      duration = 0.9;
      break;

    case "diamond":
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      duration = 0.35;
      break;
  }

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function hayColision(nx, nz, ny) {
  // habitacion
  if (nx < -7.0 || nx > 7.0 || nz < -7.0 || nz > 11.5) {
    return true; 
  }

  // columnas
  for (let i = 0; i < columns.length; i++) {
    if (Math.hypot(nx - columns[i].x, nz - columns[i].z) < 0.6) {
      return true;
    }
  }

  //banco
  if (Math.abs(nx) < 2.5 && Math.abs(nz - 5.0) < 0.4 && ny <= 0.6) {
    return true;
  }

  //persiana
  if (Math.abs(nx) < 3.0 && Math.abs(nz - (-3.5)) < 0.3 && ny > 0.3) {
    return true;
  }

  return false;
}
 
 
 // CÓDIGO PRINCIPAL
init();
render();


// add mouse handlers

//document.onmousedown = onMouseDown;
document.onmousemove = onMouseMove;
//document.onwheel = zoom;

document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;
