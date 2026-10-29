import * as dat from "dat.gui";
import { mat4 } from "gl-matrix";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision mediump float;

      in vec3 aCoordinates;
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;

      in vec3 aVertexNormals;

      out vec3 vNormal;
      out vec3 vEyeVector;

      // 2 luces por coche y 1 farola
      out vec3 vLightDir1;
      out vec3 vLightDir2;
      out vec3 vLightDir3;
      out vec3 vLightDir4;
      out vec3 vLightDir5;

      uniform vec3 uLightPos1;
      uniform vec3 uLightPos2;
      uniform vec3 uLightPos3;
      uniform vec3 uLightPos4;
      uniform vec3 uLightPos5;

      void main(void) {
        // saving vertex after transformations BEFORE PERSPECTIVE
        vec4 vertex = uModelMatrix * vec4(aCoordinates, 1.0);
        gl_Position = uViewMatrix * vertex;

        // compute normal vector
        vNormal = vec3(uModelMatrix * vec4(aVertexNormals, 0.0));

        // compute vector from vertex to viewer
        vEyeVector = -vertex.xyz;

        vLightDir1 = uLightPos1 - vertex.xyz;
        vLightDir2 = uLightPos2 - vertex.xyz;
        vLightDir3 = uLightPos3 - vertex.xyz;
        vLightDir4 = uLightPos4 - vertex.xyz;
        vLightDir5 = uLightPos5 - vertex.xyz;
       }
`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
precision mediump float;

      out vec4 fragColor;

      uniform vec3 uLightColor1;
      uniform vec3 uLightColor2;
      uniform vec3 uLightColor3;
      uniform vec3 uLightColor4;
      uniform vec3 uLightColor5;

      uniform vec3 uDifColor; 
      uniform float uShininess;
          
      in vec3 vNormal;
      in vec3 vEyeVector;
      
      in vec3 vLightDir1;
      in vec3 vLightDir2;
      in vec3 vLightDir3; 
      in vec3 vLightDir4; 
      in vec3 vLightDir5; 
      
      uniform bool uIsLightBulb;
          
      void main(void) {
        
        if (uIsLightBulb) {
          fragColor = vec4(uDifColor, 1.0);
          return;
      }

        vec3 N = normalize(vNormal);
        vec3 V = normalize(vEyeVector);
        //vec3 specularMaterial = vec3(1.0, 1.0, 1.0); 

        vec3 totalDiffuse = vec3(0.0);
        vec3 totalSpecular = vec3(0.0);

        // LUZ 1
        vec3 L1 = normalize(vLightDir1);
        float diff1 = max(dot(N, L1), 0.0);
        totalDiffuse += diff1 * uLightColor1;
        if(diff1 > 0.0) {
            vec3 R1 = 2.0 * N * diff1 - L1;
            totalSpecular += pow(max(dot(R1, V), 0.0), uShininess) * uLightColor1;
        }

        // LUZ 2
        vec3 L2 = normalize(vLightDir2);
        float diff2 = max(dot(N, L2), 0.0);
        totalDiffuse += diff2 * uLightColor2;
        if(diff2 > 0.0) {
            vec3 R2 = 2.0 * N * diff2 - L2;
            totalSpecular += pow(max(dot(R2, V), 0.0), uShininess) * uLightColor2;
        }

        // LUZ 3
        vec3 L3 = normalize(vLightDir3);
        float diff3 = max(dot(N, L3), 0.0);
        totalDiffuse += diff3 * uLightColor3;
        if(diff3 > 0.0) {
            vec3 R3 = 2.0 * N * diff3 - L3;
            totalSpecular += pow(max(dot(R3, V), 0.0), uShininess) * uLightColor3;
        }

        // LUZ 4
        vec3 L4 = normalize(vLightDir4);
        float diff4 = max(dot(N, L4), 0.0);
        totalDiffuse += diff4 * uLightColor4;
        if(diff4 > 0.0) {
            vec3 R4 = 2.0 * N * diff4 - L4;
            totalSpecular += pow(max(dot(R4, V), 0.0), uShininess) * uLightColor4;
        }

        // LUZ 5
        vec3 L5 = normalize(vLightDir5);
        float diff5 = max(dot(N, L5), 0.0);
        totalDiffuse += diff5 * uLightColor5;
        if(diff5 > 0.0) {
            vec3 R5 = 2.0 * N * diff5 - L5;
            totalSpecular += pow(max(dot(R5, V), 0.0), uShininess) * uLightColor5;
        }

        vec3 ambient = vec3(0.05, 0.05, 0.1); 
        vec3 finalColor = ambient + (totalDiffuse * uDifColor) + totalSpecular;
        
        fragColor = vec4(min(finalColor, vec3(1.0)), 1.0);
      }
`;

var canvas, gl;
var colorLocation;
var vertex_buffer;
var modelMatrixLoc;
var modelMatrix;
var index_buffer;
//var rotateX = 0, rotateY = 0;
//var mouseX, mouseY;
//var zoomFactor = 1;
var viewMatrixLoc;
var normalsLoc;
var normal_buffer;

var difColorLoc;
var shininessLoc;

var coordLocation;

var lightPos1Loc, lightPos2Loc, lightPos3Loc, lightPos4Loc, lightPos5Loc;
var lightCol1Loc, lightCol2Loc, lightCol3Loc, lightCol4Loc, lightCol5Loc;

var time = 0;

var isLightBulbLoc;

var player = {
  x: 0, 
  y: 1.5, 
  z: 10.0,
  ori: -Math.PI / 2, 
  tilt: 0 
};
var teclas = {};

var settings = {
  difColor: "#990000", 
  shininess: 60.0,
  speed: 25.0,
  lightbulb: "#ffb233",
  spotlight: "#ffffff"
}

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

  gl.enable(gl.DEPTH_TEST);

  // create GUI
  var gui = new dat.GUI();
  gui.addColor(settings, "difColor").name("Color Coches");
  gui.addColor(settings, "lightbulb").name("Luz Farolas");
  gui.addColor(settings, "spotlight").name("Focos Coches");
  gui.add(settings, "shininess", 1.0, 100.0).name("Brillo Coches");
  gui.add(settings, "speed", 1.0, 100.0).name("Velocidad Coches");

  document.getElementById("gui-container").appendChild(gui.domElement);
  
/*
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

  normal_buffer = gl.createBuffer();

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // Get the attribute location
  coordLocation = gl.getAttribLocation(shaderProgram, "aCoordinates");

  normalsLoc = gl.getAttribLocation(shaderProgram,"aVertexNormals");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coordLocation, 3, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coordLocation);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // look up uniform locations
  colorLocation = gl.getUniformLocation(shaderProgram, "uColor");

  modelMatrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
  viewMatrixLoc = gl.getUniformLocation(shaderProgram, "uViewMatrix");

  difColorLoc = gl.getUniformLocation(shaderProgram, "uDifColor");
  shininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");

  lightPos1Loc = gl.getUniformLocation(shaderProgram, "uLightPos1");
  lightPos2Loc = gl.getUniformLocation(shaderProgram, "uLightPos2");
  lightPos3Loc = gl.getUniformLocation(shaderProgram, "uLightPos3");
  lightPos4Loc = gl.getUniformLocation(shaderProgram, "uLightPos4");
  lightPos5Loc = gl.getUniformLocation(shaderProgram, "uLightPos5");
  
  lightCol1Loc = gl.getUniformLocation(shaderProgram, "uLightColor1");
  lightCol2Loc = gl.getUniformLocation(shaderProgram, "uLightColor2");
  lightCol3Loc = gl.getUniformLocation(shaderProgram, "uLightColor3");
  lightCol4Loc = gl.getUniformLocation(shaderProgram, "uLightColor4");
  lightCol5Loc = gl.getUniformLocation(shaderProgram, "uLightColor5");

  isLightBulbLoc = gl.getUniformLocation(shaderProgram, "uIsLightBulb");

  gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
  gl.vertexAttribPointer(normalsLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalsLoc)
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(0.05, 0.05, 0.08, 1.0);

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // perspective
  const viewMatrix = mat4.create();
  mat4.perspective(
    viewMatrix,
    Math.PI / 4, // vertical opening angle
    1, // ratio width-height
    0.5, // z-near
    50 // z-far
  );
  gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix);

  // Set the model Matrix.
  modelMatrix = mat4.create();
  mat4.identity(modelMatrix);

  // Enviamos el color y el brillo actuales al Shader
  //gl.uniform3fv(difColorLoc, hexToRgb(settings.difColor));
  //gl.uniform1f(shininessLoc, settings.shininess);

  time += 0.02;

  // Coches
  let speedCar = settings.speed;
  let colorFocos = hexToRgb(settings.spotlight);

  let car1Z = 40.0 - ((time * speedCar) % 80.0);
  let car1X = 1.5;

  let car2Z = -40.0 + (((time * speedCar) +50.00) % 80.0);
  let car2X = -1.5;

  gl.uniform3fv(lightPos1Loc, [car1X - 0.7, 0.6, car1Z - 2.5]);
  gl.uniform3fv(lightPos2Loc, [car1X + 0.7, 0.6, car1Z - 2.5]);
  gl.uniform3fv(lightCol1Loc, colorFocos); 
  gl.uniform3fv(lightCol2Loc, colorFocos);

  gl.uniform3fv(lightPos3Loc, [car2X - 0.7, 0.6, car2Z + 2.5]);
  gl.uniform3fv(lightPos4Loc, [car2X + 0.7, 0.6, car2Z + 2.5]);
  gl.uniform3fv(lightCol3Loc, colorFocos); 
  gl.uniform3fv(lightCol4Loc, colorFocos);

  // Farola que parpadea
  let blink = Math.abs(Math.sin(time * 8.0)) > 0.3 ? 1.0 : 0.1;
  let colorLight = hexToRgb(settings.lightbulb);
  gl.uniform3fv(lightPos5Loc, [2.0, 5.0, 0.0]);
  gl.uniform3fv(lightCol5Loc, [colorLight[0] * blink, colorLight[1] * blink, colorLight[2] * blink]);

  let speed = 0.15;
  let moveX = 0;
  let moveZ = 0;

  if (teclas[87] || teclas[38]) { moveX += speed * Math.cos(player.ori); moveZ += speed * Math.sin(player.ori); } // W
  if (teclas[83] || teclas[40]) { moveX -= speed * Math.cos(player.ori); moveZ -= speed * Math.sin(player.ori); } // S
  if (teclas[65]) { moveX += speed * Math.cos(player.ori - Math.PI/2); moveZ += speed * Math.sin(player.ori - Math.PI/2); } // A
  if (teclas[68]) { moveX += speed * Math.cos(player.ori + Math.PI/2); moveZ += speed * Math.sin(player.ori + Math.PI/2); } // D

  let nextX = player.x + moveX;
  let nextZ = player.z + moveZ;

  if (nextX > -15.0 && nextX < 15.0) { player.x += moveX; }
  if (nextZ > -40.0 && nextZ <40.0) { player.z += moveZ; } 

  if (Math.abs(player.z - 5.0) < 0.5 && Math.abs(player.x) > 1.0) {
      player.x -= moveX; // Te escupe hacia atrás
      player.z -= moveZ;
  }

  const eye = [player.x, player.y, player.z];
  const center = [
    player.x + Math.cos(player.tilt) * Math.cos(player.ori),
    player.y + Math.sin(player.tilt),
    player.z + Math.cos(player.tilt) * Math.sin(player.ori)
  ];
  
  mat4.lookAt(modelMatrix, eye, center, [0, 1, 0]);
  
  gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix); 

  //renderGround(9, 10);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);

  renderCube(0, 0, 0, 20.0, 0.2, 80.0, [0.05, 0.1, 0.2], 5.0);

  // Líneas reflectantes de la carretera
  for (let i = -35; i <= 35; i += 3) {
    renderCube(0, 0.11, i, 0.15, 0.05, 1.5, [0.8, 0.8, 0.8], 100.0);
    renderCube( 3.5, 0.11, i, 0.15, 0.05, 3.0, [0.8, 0.8, 0.8], 100.0);
    renderCube(-3.5, 0.11, i, 0.15, 0.05, 3.0, [0.8, 0.8, 0.8], 100.0);
  }

  // Farolas
  for (let i = -30; i <= 30; i += 15) {
    renderCube(4.0, 2.5, i, 0.2, 5.0, 0.2, [0.15, 0.15, 0.15], 10.0); 
    renderCube(3.0, 5.0, i, 2.0, 0.1, 0.2, [0.1, 0.1, 0.1], 5.0);     
  }

  for (let i = -20; i <= 20; i += 15) {
    renderCube(-4.0, 2.5, i, 0.2, 5.0, 0.2, [0.15, 0.15, 0.15], 10.0); 
    renderCube(-3.0, 5.0, i, 2.0, 0.1, 0.2, [0.1, 0.1, 0.1], 5.0);     
  }

  let colorCoche = hexToRgb(settings.difColor);
  let brilloCoche = settings.shininess;
  
  //Coches
  renderCube(car1X, 0.6, car1Z, 2.0, 0.8, 4.5, colorCoche, brilloCoche);
  renderCube(car1X, 1.2, car1Z + 0.5, 1.8, 0.6, 2.2, [0.05, 0.05, 0.05], 90.0);
  renderCube(car1X - 0.7, 0.6, car1Z + 2.25, 0.4, 0.2, 0.1, [1.0, 0.0, 0.0], 10.0);
  renderCube(car1X + 0.7, 0.6, car1Z + 2.25, 0.4, 0.2, 0.1, [1.0, 0.0, 0.0], 10.0);

  renderCube(car2X, 0.6, car2Z, 2.0, 0.8, 4.5, colorCoche, brilloCoche);
  renderCube(car2X, 1.2, car2Z - 0.5, 1.8, 0.6, 2.2, [0.05, 0.05, 0.05], 90.0); 
  renderCube(car2X - 0.7, 0.6, car2Z - 2.25, 0.4, 0.2, 0.1, [1.0, 0.0, 0.0], 10.0);
  renderCube(car2X + 0.7, 0.6, car2Z - 2.25, 0.4, 0.2, 0.1, [1.0, 0.0, 0.0], 10.0);

  gl.uniform1i(isLightBulbLoc, 1);

  glPushMatrix(); 
    mat4.translate(modelMatrix, modelMatrix, [car1X - 0.7, 0.6, car1Z - 2.3]); 
    mat4.scale(modelMatrix, modelMatrix, [0.2, 0.1, 0.05]); 
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); 
    gl.uniform3fv(difColorLoc, colorFocos); 
    renderSphere(10); 
  glPopMatrix();

  glPushMatrix(); 
    mat4.translate(modelMatrix, modelMatrix, [car1X + 0.7, 0.6, car1Z - 2.3]); 
    mat4.scale(modelMatrix, modelMatrix, [0.2, 0.1, 0.05]); 
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); 
    gl.uniform3fv(difColorLoc, colorFocos); 
    renderSphere(10); 
  glPopMatrix();

  glPushMatrix(); 
    mat4.translate(modelMatrix, modelMatrix, [car2X - 0.7, 0.6, car2Z - 2.3]); 
    mat4.scale(modelMatrix, modelMatrix, [0.2, 0.1, 0.05]); 
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); 
    gl.uniform3fv(difColorLoc, colorFocos); 
    renderSphere(10); 
  glPopMatrix();

  glPushMatrix(); 
    mat4.translate(modelMatrix, modelMatrix, [car2X + 0.7, 0.6, car2Z - 2.3]); 
    mat4.scale(modelMatrix, modelMatrix, [0.2, 0.1, 0.05]); 
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); 
    gl.uniform3fv(difColorLoc, colorFocos); 
    renderSphere(10); 
  glPopMatrix();
  
  for (let i = -30; i <= 30; i += 15) {
    glPushMatrix(); 
    mat4.translate(modelMatrix, modelMatrix, [2.0, 5.0, i]); 
    mat4.scale(modelMatrix, modelMatrix, [0.4, 0.1, 0.2]); 
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); 
    if (i === 0) {
       gl.uniform3fv(difColorLoc, [colorLight[0] * blink, colorLight[1] * blink, colorLight[2] * blink]); 
    } else {
       gl.uniform3fv(difColorLoc, colorLight); 
    }
    renderSphere(10); 
    glPopMatrix();
}

for (let i = -20; i <= 20; i += 15) {
  glPushMatrix(); 
  mat4.translate(modelMatrix, modelMatrix, [-2.0, 5.0, i]); 
  mat4.scale(modelMatrix, modelMatrix, [0.4, 0.1, 0.2]); 
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix); 
  gl.uniform3fv(difColorLoc, colorLight); 
  renderSphere(10); 
  glPopMatrix();
}

  gl.uniform1i(isLightBulbLoc, 0); 
  
  gl.uniform3fv(difColorLoc, hexToRgb(settings.difColor));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  //document.getElementById("debug").textContent = "y = " + player1.y.toFixed(2);

  // start animation loop
  window.requestAnimationFrame(render);
}

function renderCube(x, y, z, scaleX, scaleY, scaleZ, colorArray, shine) {
  glPushMatrix();
    mat4.translate(modelMatrix, modelMatrix, [x, y, z]);
    mat4.scale(modelMatrix, modelMatrix, [scaleX, scaleY, scaleZ]);
    mat4.translate(modelMatrix, modelMatrix, [-0.5, -0.5, -0.5]);
    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);

    // 36 vértices (6 caras * 6 vértices por cara)
    const arrayV = new Float32Array([
      0,0,1,  1,0,1,  1,1,1,   0,0,1,  1,1,1,  0,1,1,
      0,0,0,  0,1,0,  1,1,0,   0,0,0,  1,1,0,  1,0,0,
      0,1,0,  0,1,1,  1,1,1,   0,1,0,  1,1,1,  1,1,0,
      0,0,0,  1,0,0,  1,0,1,   0,0,0,  1,0,1,  0,0,1,
      1,0,0,  1,1,0,  1,1,1,   1,0,0,  1,1,1,  1,0,1,
      0,0,0,  0,0,1,  0,1,1,   0,0,0,  0,1,1,  0,1,0
    ]);

    // Normales 
    const arrayN = new Float32Array([
      0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
      0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
      1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, arrayV, gl.STATIC_DRAW);
    gl.vertexAttribPointer(coordLocation, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, arrayN, gl.STATIC_DRAW);
    gl.vertexAttribPointer(normalsLoc, 3, gl.FLOAT, false, 0, 0);

    gl.uniform3fv(difColorLoc, colorArray);

    gl.uniform1f(shininessLoc, shine);
    
    // PINTAMOS SIN ÍNDICES (drawArrays en vez de drawElements)
    gl.drawArrays(gl.TRIANGLES, 0, 36);

  glPopMatrix();
}

// CÓDIGO PRINCIPAL
init();
render();


function onKeyDown(e) { 
  teclas[e.keyCode] = true; 
}

function onKeyUp(e) { 
  teclas[e.keyCode] = false; 
}

function onMouseMove(e) {
  if (e.buttons == 1 && e.target == canvas) {
    player.ori += e.movementX * 0.005; // A los lados
    player.tilt -= e.movementY * 0.005; // Arriba/abajo
    player.tilt = Math.max(-1.4, Math.min(1.4, player.tilt)); 
  }
}

document.onmousemove = onMouseMove;
document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;



function renderSphere(n) {
  glPushMatrix();

    gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix);
    
    // compute vertices
    const numVertices = (n + 1) * (2 * n);

    const coords = new Float32Array(numVertices * 3);
    const step = Math.PI / n;
    const R = 1;
    var k = 0;
    for (let i = 0; i <= n; i++) {
      const tita = -Math.PI / 2 + i * step;
      for (let j = 0; j < 2 * n; j++) {
        const alpha = j * step;
        coords[k++] = R * Math.cos(tita) * Math.cos(alpha);
        coords[k++] = R * Math.cos(tita) * Math.sin(alpha);
        coords[k++] = R * Math.sin(tita);
      }
    }

    // compute faces
    const arrayIFaces = new Uint16Array((4 * n + 2) * n);
    var k = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 2 * n; j++) {
        arrayIFaces[k++] = 2 * n * (i + 1) + j;
        arrayIFaces[k++] = 2 * n * i + j;
      }
      arrayIFaces[k++] = 2 * n * (i + 1);
      arrayIFaces[k++] = 2 * n * i;
    }

    // compute normals
    const normals = coords;

    // pass data to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayIFaces, gl.STATIC_DRAW);

    // draw meshes
    for (let i=0; i<n; i++)
      gl.drawElements(gl.TRIANGLE_STRIP, 4*n+2,
        gl.UNSIGNED_SHORT, 2*i*(4*n+2));

  glPopMatrix();
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

