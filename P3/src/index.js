import * as dat from "dat.gui";
import { mat4 } from "gl-matrix";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision mediump float;

      in vec2 aCoordinates;
      uniform mat4 uModelMatrix;

      void main(void) {
        gl_Position = uModelMatrix * vec4(aCoordinates, 0.0, 1.0);
        gl_PointSize = 0.1;
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
var stars = 400;
var starVertices;

var matrixStack = [];


var settings = {
  translateX: 0.0,
  translateY: 0.0,
  rotateX: 24.0,
  rotateY: 24.0,
  rotateZ: 0.0,
  zoom: -0.6,
};

var sun = {
  x: 0,
  y: 0,
  width: 0.2,
  height: 0.2,
  color: [1, 1, 0, 1],
};

var earth = {
  x: 0.6,
  y: 0,
  width: 0.1,
  height: 0.1,
  color: [0.2, 0.5, 0.9, 1],
  angle: 0.0,
  speed: 0.01,
  tiltX: 0.0,
  moons: [{
    x:0.2,
    y:0,
    width:0.05, height:0.05,
    color: [0.8, 0.8, 0.8, 1],
    angle:0,
    speed: 0.05,
    tiltX: 0.3
  }]
};  

var mercury = { 
  x: 0.3, 
  y: 0, 
  width: 0.04, 
  height: 0.04, 
  color: [0.6, 0.6, 0.6, 1], 
  angle: 0.0, 
  speed: 0.04,
  tiltX: 0.2,
};

var venus = { 
  x: 0.45, 
  y: 0, 
  width: 0.08, 
  height: 0.08, 
  color: [0.9, 0.7, 0.2, 1], 
  angle: 0.0, 
  speed: 0.015,
  tiltX: -0.1,
};

var mars = { 
  x: 0.8, 
  y: 0, 
  width: 0.06, 
  height: 0.06, 
  color: [0.9, 0.2, 0.1, 1], 
  angle: 0.0, 
  speed: 0.008,
  tiltX: 0.05,

};

var jupiter = { 
  x: 1.2, 
  y: 0, 
  width: 0.18, 
  height: 0.18, 
  color: [0.8, 0.6, 0.4, 1], 
  angle: 0.0, 
  speed: 0.004,
  tiltX: 0.0,
  moons: [
    { x: 0.22, y: 0, width: 0.02, height: 0.02, color: [0.9, 0.9, 0.5, 1], angle: 0.0, speed: 0.08, tiltX: 0.0 }, 
    { x: 0.28, y: 0, width: 0.025, height: 0.025, color: [0.8, 0.9, 1.0, 1], angle: 1.0, speed: 0.06, tiltX: 0.1 }, 
    { x: 0.35, y: 0, width: 0.035, height: 0.035, color: [0.5, 0.5, 0.5, 1], angle: 2.0, speed: 0.04, tiltX: 0.0 }, 
    { x: 0.45, y: 0, width: 0.03, height: 0.03, color: [0.4, 0.4, 0.4, 1], angle: 3.0, speed: 0.02, tiltX: 0.2 } 
  ]
};

var saturn = {
  x: 1.6, 
  y: 0, 
  width: 0.15, 
  height: 0.15, 
  color: [0.9, 0.8, 0.5, 1], 
  angle: 0.0, 
  speed: 0.002,
  tiltX: 0.3,
  ring: true,

};

var uranus = { 
  x: 2.0, 
  y: 0, 
  width: 0.12, 
  height: 0.12, 
  color: [0.5, 0.8, 0.9, 1], 
  angle: 0.0, 
  speed: 0.001 
};

var neptune = { 
  x: 2.4, 
  y: 0, 
  width: 0.12, 
  height: 0.12, 
  color: [0.1, 0.3, 0.8, 1], 
  angle: 0.0, 
  speed: 0.0008,
  tiltX: 0.0,
  moons: [
    { x: 0.18, y: 0, width: 0.025, height: 0.025, color: [0.85, 0.8, 0.8, 1], angle: 0.0, speed: -0.05, tiltX: 0.3 }, 
    { x: 0.26, y: 0, width: 0.015, height: 0.015, color: [0.4, 0.4, 0.4, 1], angle: 0.0, speed: 0.03, tiltX: 0.1 }  
  ]
};


function init() {
  // ============ STEP 1: Creating a canvas=================
  canvas = document.getElementById("my_Canvas");
  gl = canvas.getContext("webgl2", { antialias: true});

  // create GUI
  const gui = new dat.GUI({ autoPlace: false });
  gui.add(settings, "translateX", -1.1, 1.1, 0.01);
  gui.add(settings, "translateY", -1.1, 1.1, 0.01);
  gui.add(settings, "rotateX", -180, 180);
  gui.add(settings, "rotateY", -180, 180);
  gui.add(settings, "rotateZ", -180, 180);
  gui.add(settings, "zoom", -1, 3);

  const guiContainer = document.getElementById("gui-container");
  guiContainer.appendChild(gui.domElement);

  // Posicionar el GUI debajo del canvas
  const canvasRect = canvas.getBoundingClientRect();
  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = canvasRect.bottom + window.scrollY + 20 + "px";
  gui.domElement.style.left =
    canvasRect.left +
    window.scrollX +
    (canvasRect.width - gui.domElement.offsetWidth) / 2 +
    "px";

  const starsArray = [];
  for (let i = 0; i < stars; i++) {
    starsArray.push((Math.random() - 0.5) * 10.0); 
    starsArray.push((Math.random() - 0.5) * 10.0); 
   }
   starVertices = new Float32Array(starsArray

   );

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

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // Get the attribute location
  const coordLocation = gl.getAttribLocation(shaderProgram, "aCoordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coordLocation, 2, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coordLocation);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // look up uniform locations
  colorLocation = gl.getUniformLocation(shaderProgram, "uColor");
  // Set a random color.

  modelMatrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(0.1, 0.1, 0.15, 1.0);

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // Set the model Matrix.
  modelMatrix = mat4.create();
  mat4.identity(modelMatrix);
  mat4.translate(modelMatrix, modelMatrix, [
    settings.translateX,
    settings.translateY,
    0,
  ]);

  mat4.rotateZ(modelMatrix, modelMatrix, (settings.rotateZ / 180) * Math.PI);
  mat4.rotateX(modelMatrix, modelMatrix, (settings.rotateX / 180) * Math.PI);
  mat4.rotateY(modelMatrix, modelMatrix, (settings.rotateY / 180) * Math.PI);
  
  mat4.scale(modelMatrix, modelMatrix, [1+settings.zoom, 1+settings.zoom,1]);

  drawStars();

  // draw sun
  glPushMatrix();
    mat4.scale(modelMatrix, modelMatrix,
      [sun.width, sun.height, 1]);
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
    gl.uniform4fv(colorLocation, sun.color);
    drawCircle(true);
  glPopMatrix();

  drawPlanet(mercury);
  drawPlanet(venus);
  drawPlanet(earth);
  drawPlanet(mars);
  drawPlanet(jupiter);
  drawPlanet(saturn);
  drawPlanet(uranus);
  drawPlanet(neptune);


  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // start animation loop
  window.requestAnimationFrame(render);
}

// CÓDIGO PRINCIPAL
init();
render();

function glPushMatrix() {
  const matrix = mat4.create();
  mat4.copy(matrix, modelMatrix);
  matrixStack.push(matrix);
}

function glPopMatrix() {
  modelMatrix = matrixStack.pop();
}

function drawPlanet(planet) {
  glPushMatrix();

    if (planet.tiltX) {
      mat4.rotateX(modelMatrix, modelMatrix, planet.tiltX);
    }

    glPushMatrix();
      // El radio de la órbita es la distancia X del planeta
      mat4.scale(modelMatrix, modelMatrix, [planet.x, planet.x, 1]);
      gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
      gl.uniform4fv(colorLocation, [0.3, 0.3, 0.3, 1]); 
      drawCircle(false);
    glPopMatrix();

    // Aumentamos el ángulo según su velocidad
    planet.angle += planet.speed;
    
    mat4.rotateZ(modelMatrix, modelMatrix, planet.angle);
    mat4.translate(modelMatrix, modelMatrix, [planet.x, planet.y, 0]);

    if (planet.moons) {
      for (let i = 0; i < planet.moons.length; i++) {
        let moon = planet.moons[i];
        
        glPushMatrix();
          if (moon.tiltX) mat4.rotateX(modelMatrix, modelMatrix, moon.tiltX);
          
          glPushMatrix();
            mat4.scale(modelMatrix, modelMatrix, [moon.x, moon.x, 1]);
            gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
            gl.uniform4fv(colorLocation, [0.4, 0.4, 0.4, 1]);
            drawCircle(false);
          glPopMatrix();

          moon.angle += moon.speed;
          mat4.rotateZ(modelMatrix, modelMatrix, moon.angle);
          mat4.translate(modelMatrix, modelMatrix, [moon.x, moon.y, 0]);
          mat4.scale(modelMatrix, modelMatrix, [moon.width, moon.height, 1]);
          gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
          gl.uniform4fv(colorLocation, moon.color);
          drawCircle(true);
        glPopMatrix();
      }
    }
    mat4.scale(modelMatrix, modelMatrix, [planet.width, planet.height, 1]);
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
    gl.uniform4fv(colorLocation, planet.color);
    drawCircle(true);

    // Para saturno
    if (planet.ring) {
      glPushMatrix();
        mat4.scale(modelMatrix, modelMatrix, [2.0, 0.4, 1.0]); 
        gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
        gl.uniform4fv(colorLocation, [0.8, 0.7, 0.5, 0.6]); 
        drawCircle(false); 
        
        mat4.scale(modelMatrix, modelMatrix, [1.2, 1.2, 1.0]); 
        gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
        gl.uniform4fv(colorLocation, [0.6, 0.5, 0.4, 0.4]); 
        drawCircle(false);
      glPopMatrix();
    }
  
  glPopMatrix();
}

function drawCircle(relleno) {
  const numSegments = 70;
  const vertices = [];
  for (let i = 0; i < numSegments; i++) {
    const angle = (i * 2 * Math.PI) / numSegments;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  const v = new Float32Array(vertices);
  
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  
  // Diferenciar entre planeta u órbita/anillo
  if (relleno) {
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments); 
  } else {
    gl.drawArrays(gl.LINE_LOOP, 0, numSegments);    
  }
}

function drawStars() {
  gl.bufferData(gl.ARRAY_BUFFER, starVertices, gl.STATIC_DRAW);
  
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
  gl.uniform4fv(colorLocation, [1.0, 1.0, 1.0, 0.2]); 
  
  gl.drawArrays(gl.POINTS, 0, stars);
}