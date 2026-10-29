// Vertex shader source
const vertexShaderSource = `#version 300 es
      precision mediump float;

      in vec2 aCoordinates;

      void main(void) {
        gl_Position = vec4(aCoordinates, 0, 1);
        gl_PointSize = 10.0;
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

var gl;
var colorLocation;
var canvas;
var vertex_buffer;

var rect1 = {
  x: -0.2,
  y: 0.4,
  vx: 0.009,
  vy: -0.01,
  size: 0.3,
  color: [1, 0, 1, 1],
  crece: false,
};

var rect2 = {
  x: 0.2,
  y: -0.4,
  vx: -0.012,
  vy: 0.01,
  size: 0.3,
  color: [0, 1, 1, 1],
  crece: false,
};

var rect3 = {
  x: -0.4,
  y: -0.6,
  vx: -0.015,
  vy: -0.02,
  size: 0.3,
  color: [1, 1, 1, 1],
  crece: false,
};

var rect4 = {
  x: 0.6,
  y: 0.5,
  vx: 0.017,
  vy: 0.01,
  size: 0.3,
  color: [1, 0, 0, 1],
  crece: false,
};

function init() {
  // ============ STEP 1: Creating a canvas=================
  canvas = document.getElementById("my_Canvas");
  gl = canvas.getContext("webgl2");

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

  render();
}

function updateRectangle(rect) {
  rect.width = rect.size * (canvas.height / canvas.width);
  rect.height = rect.size;

  rect.x += rect.vx;
  rect.y += rect.vy;

  var rebote = false;

  if (rect.x <= -1.0 && rect.vx < 0) {
    rect.vx *= -1;
    rebote = true;
  } else if (rect.x + rect.width >= 1.0 && rect.vx > 0) {
    rect.vx *= -1;
    rebote = true;
  }

  if (rect.y <= -1.0 && rect.vy < 0) {
    rect.vy *= -1;
    rebote = true;
  } else if (rect.y + rect.height >= 1.0 && rect.vy > 0) {
    rect.vy *= -1;
    rebote = true;
  }

  if (rebote) {
    rect.color = getRandomColor();

    if (rect.crece) {
      rect.size *= 1.15;
      if (rect.size >= 0.3) {
        rect.crece = false;
      }
    } else {
      rect.size *= 0.85;
      if (rect.size <= 0.05) {
        rect.crece = true;
      }
    }
  }
}

function render() {
  //========= STEP 4: Create the geometry and draw ===============

  // Clear the canvas
  gl.clearColor(0.9, 0.85, 0.95, 1.0);

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  updateRectangle(rect1);
  updateRectangle(rect2);
  updateRectangle(rect3);
  updateRectangle(rect4);

  drawRectangle(rect1.x, rect1.y, rect1.width, rect1.height, rect1.color);
  drawRectangle(rect2.x, rect2.y, rect2.width, rect2.height, rect2.color);
  drawRectangle(rect3.x, rect3.y, rect3.width, rect3.height, rect3.color);
  drawRectangle(rect4.x, rect4.y, rect4.width, rect4.height, rect4.color);

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // start animation loop
  window.requestAnimationFrame(render);
}

function drawRectangle(x, y, width, height, color) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW
  );

  // Set a random color.
  gl.uniform4fv(colorLocation, color);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function getRandomColor() {
  return [Math.random(), Math.random(), Math.random(), 1];
}

// AQUÍ EMPIEZA MI CÓDIGO
init();
