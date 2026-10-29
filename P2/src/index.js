// Vertex shader source
const vertexShaderSource = `#version 300 es
      precision mediump float;

      in vec2 aCoordinates;

      void main(void) {
        gl_Position = vec4(aCoordinates, 0, 1);
        gl_PointSize = 30.0;
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

var reset;
var canvas, gl;
var colorLocation;
var vertex_buffer;
var isGameOver = false;
var inicio = 0;

var ball1 = {
  x: -0.5,
  y: 0.3,
  width: 0.1,
  height: 0.1,
  color: [1, 1, 0, 1],
  speedX: 1.5,
  speedY: -1.5,
};

var ball2 = {
  x: 0.5,
  y: -0.3,
  width: 0.1,
  height: 0.1,
  color: [1, 0, 1, 1],
  speedX: -2.0,
  speedY: 2.0,
};

var ball3 = {
  x: -0.5,
  y: 0.8,
  width: 0.1,
  height: 0.1,
  color: [0, 1, 1, 1],
  speedX: 2.5,
  speedY: 2.5,
};

var player1 = {
  x: -0.9,
  y: 0,
  width: 0.1,
  height: 0.4,
  color: [1, 1, 1, 1],
  movementX: 0,
  movementY: 0,
};

// para calcular el delta time entre fotogramas
var lastTimestamp = 0;

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
  // Set a random color.
}

function render(timeStamp) {
  //========= STEP 4: Create the geometry and draw ===============

  if (reset) {
    inicio = timeStamp;
    lastTimestamp = timeStamp;
    reset = false;
  }

  var jugando = (timeStamp - inicio) / 1000;

  if (isGameOver) {
    gl.clearColor(0.5, 0.0, 0.0, 1.0);
  } else if (jugando > 20) {
    gl.clearColor(0.0, 0.4, 0.0, 1.0);
  } else {
    gl.clearColor(0.05, 0.05, 0.15, 1.0);
  }

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  // draw ball1 and player1
  drawRectangle(ball1);

  if (jugando > 10) {
    drawRectangle(ball2);
  }
  if (jugando > 15) {
    drawRectangle(ball3);
  }

  drawRectangle(player1);

  if (!isGameOver && jugando <= 20) {
    document.getElementById("mensaje").style.display = "block";

    if (jugando <= 10) {
      document.getElementById("mensaje").textContent = "Level 1";
      document.getElementById("mensaje").style.color = "#ffff00"; // Amarillo (ball1)
    } else if (jugando <= 15) {
      document.getElementById("mensaje").textContent = "Level 2";
      document.getElementById("mensaje").style.color = "#ff00ff"; // Rosa (ball2)
    } else {
      document.getElementById("mensaje").textContent = "Level 3";
      document.getElementById("mensaje").style.color = "#00ffff"; // Azul (ball3)
    }

    player1.x += player1.movementX;
    player1.y += player1.movementY;

    const deltaTime = (timeStamp - lastTimestamp) / 1000;

    ball1.x += ball1.speedX * deltaTime;
    ball1.y += ball1.speedY * deltaTime;

    if (jugando > 10) {
      ball2.x += ball2.speedX * deltaTime;
      ball2.y += ball2.speedY * deltaTime;
    }

    if (jugando > 15) {
      ball3.x += ball3.speedX * deltaTime;
      ball3.y += ball3.speedY * deltaTime;
    }

    var choca1 =
      player1.x + player1.width > ball1.x &&
      player1.x < ball1.x + ball1.width &&
      player1.y + player1.height > ball1.y &&
      player1.y < ball1.y + ball1.height;
    var choca2 =
      jugando > 10 &&
      player1.x + player1.width > ball2.x &&
      player1.x < ball2.x + ball2.width &&
      player1.y + player1.height > ball2.y &&
      player1.y < ball2.y + ball2.height;
    var choca3 =
      jugando > 15 &&
      player1.x + player1.width > ball3.x &&
      player1.x < ball3.x + ball3.width &&
      player1.y + player1.height > ball3.y &&
      player1.y < ball3.y + ball3.height;

    // DERROTA (choque de alguna de las pelotas)
    if (choca1 || choca2 || choca3) {
      isGameOver = true;
      document.getElementById("mensaje").textContent = "¡GAME OVER!";
      document.getElementById("mensaje").style.color = "#ff0000";
      document.getElementById("mensaje").style.display = "block";
      document.getElementById("btnRestart").style.display = "block";
    }
  }
  lastTimestamp = timeStamp;

  // calculo rebotes
  rebote(ball1);
  rebote(ball2);
  rebote(ball3);

  if (player1.x <= -1.0) {
    player1.x = -1.0;
  } else if (player1.x + player1.width >= 1.0) {
    player1.x = 1.0 - player1.width;
  }

  if (player1.y <= -1.0) {
    player1.y = -1.0;
  } else if (player1.y + player1.height >= 1.0) {
    player1.y = 1.0 - player1.height;
  }

  // VICTORIA
  if (jugando > 20 && !isGameOver) {
    document.getElementById("mensaje").style.color = "#2ecc71";
    document.getElementById("mensaje").textContent = "¡YOU WIN!";
    document.getElementById("mensaje").style.display = "block";
    document.getElementById("btnRestart").style.display = "block";
  }

  // Unbind the buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // start animation loop
  window.requestAnimationFrame(render);
}

function rebote(bola) {
  if (bola.y <= -1.0 && bola.speedY < 0) bola.speedY *= -1;
  else if (bola.y + bola.height >= 1.0 && bola.speedY > 0) bola.speedY *= -1;

  if (bola.x <= -1.0 && bola.speedX < 0) bola.speedX *= -1;
  else if (bola.x + bola.width >= 1.0 && bola.speedX > 0) bola.speedX *= -1;
}

function restartGame() {
  isGameOver = false;
  reset = true;

  document.getElementById("btnRestart").style.display = "none";
  document.getElementById("mensaje").style.display = "none";
  document.getElementById("mensaje").style.color = "#ff4757";

  function randomPos(min, max) {
    return Math.random() * (max - min) + min;
  }

  ball1.x = randomPos(0.0, 0.8);
  ball1.y = randomPos(-0.8, 0.8);
  ball1.speedX = 1.5;
  ball1.speedY = -1.5;

  ball2.x = randomPos(0.0, 0.8);
  ball2.y = randomPos(-0.8, 0.8);
  ball2.speedX = -2.0;
  ball2.speedY = 2.0;

  ball3.x = randomPos(0.0, 0.8);
  ball3.y = randomPos(-0.8, 0.8);
  ball3.speedX = 2.5;
  ball3.speedY = 2.5;

  player1.x = -0.9;
  player1.y = 0;
  player1.movementX = 0;
  player1.movementY = 0;
}

function drawRectangle(r) {
  var x1 = r.x;
  var x2 = r.x + r.width;
  var y1 = r.y;
  var y2 = r.y + r.height;

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW
  );
  gl.uniform4fv(colorLocation, r.color);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

document.getElementById("btnRestart").onclick = restartGame;

// CÓDIGO PRINCIPAL
init();
render(0);

// Invoke `processKey` on the `onkeydown` event
document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;

// recogemos las teclas
function onKeyDown(key) {
  if (isGameOver) return;
  switch (key.keyCode) {
    // up arrow
    case 38: {
      player1.movementY = 0.02;
      break;
    }
    // w
    case 87: {
      player1.movementY = 0.02;
      break;
    }
    // down arrow
    case 40: {
      player1.movementY = -0.02;
      break;
    }
    // s
    case 83: {
      player1.movementY = -0.02;
      break;
    }
    // left arrow
    case 37: {
      player1.movementX = -0.02;
      break;
    }
    // a
    case 65: {
      player1.movementX = -0.02;
      break;
    }
    // rigth arrow
    case 39: {
      player1.movementX = 0.02;
      break;
    }
    // d
    case 68: {
      player1.movementX = 0.02;
      break;
    }
  }
}

function onKeyUp(key) {
  player1.movementX = 0;
  player1.movementY = 0;
}

// listeners for mobile events
canvas.addEventListener("touchstart", onTouchStart, { passive: false });
canvas.addEventListener("touchmove", onTouchMove, { passive: false });
canvas.addEventListener("touchend", onTouchEnd, { passive: false });

var prevTouchY;
var prevTouchX;

// eventos en el móvil
function onTouchStart(e) {
  if (isGameOver) return;
  e.preventDefault();
  const touchobj = e.changedTouches[0]; // first finger
  prevTouchX = parseInt(touchobj.clientX);
  prevTouchY = parseInt(touchobj.clientY);
}

function onTouchMove(e) {
  if (isGameOver) return;
  e.preventDefault();
  const touchobj = e.changedTouches[0]; // first touch
  const touchX = parseInt(touchobj.clientX);
  const touchY = parseInt(touchobj.clientY);
  const difX = touchX - prevTouchX;
  const difY = touchY - prevTouchY;
  player1.movementX = difX * 0.005;
  player1.movementY = -difY * 0.005;
  prevTouchX = touchX;
  prevTouchY = touchY;
}

function onTouchEnd(e) {
  e.preventDefault();
  player1.movementX = 0;
  player1.movementY = 0;
}
