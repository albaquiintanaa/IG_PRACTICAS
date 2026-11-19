import * as THREE from "three";

export function crearConstelaciones(grupoConstelaciones) {
  const radioCielo = 600; 

  function punto(x, y, z) {
    return new THREE.Vector3(x, y, z).normalize().multiplyScalar(radioCielo);
  }

  function trazarConstelacion(nombre, puntos, colorHex) {
    let geometry = new THREE.BufferGeometry().setFromPoints(puntos);
    let material = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.4 });
    let linea = new THREE.Line(geometry, material);
    grupoConstelaciones.add(linea);

    const canvas = document.createElement('canvas');
    canvas.width = 512; 
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.font = "bold 40px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#" + colorHex.toString(16).padStart(6, '0'); 
    ctx.shadowBlur = 10; 
    ctx.fillText(nombre, 256, 80);
    
    const tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }); 
    const sprite = new THREE.Sprite(spriteMat);
    
    sprite.scale.set(120, 30, 1);
    
    let posTexto = puntos[0].clone().multiplyScalar(1.05);
    sprite.position.copy(posTexto);
    
    grupoConstelaciones.add(sprite);
  }

  // CASIOPEA
  const casiopeaPuntos = [
    punto(2.0, 4.0, -4.0), punto(2.4, 3.5, -3.8), punto(2.8, 4.2, -3.6), 
    punto(3.2, 3.8, -3.4), punto(3.6, 4.3, -3.2)
  ];
  trazarConstelacion("CASIOPEA", casiopeaPuntos, 0x00ffff);

  // OSA MAYOR
  const osaMayorPuntos = [
    punto(-10.0, -0.50, -4.5), punto(-9.00, -0.30, -4.5), punto(-8.20, -0.40, -4.5), 
    punto(-7.40, -0.60, -4.5), punto(-7.08, -1.40, -4.5), punto(-5.72, -1.40, -4.5), 
    punto(-5.40, -0.60, -4.5), punto(-7.40, -0.60, -4.5)
  ];
  trazarConstelacion("OSA MAYOR", osaMayorPuntos, 0x00ff88);

  // OSA MENOR
  const osaMenorPuntos = [
    punto(-3.40,  4.40, -4.5), punto(-3.90,  4.05, -4.5), punto(-4.40,  3.80, -4.5), 
    punto(-5.00,  3.70, -4.5), punto(-4.80,  4.30, -4.5), punto(-6.20,  4.30, -4.5), 
    punto(-6.00,  3.70, -4.5), punto(-5.00,  3.70, -4.5)
  ];
  trazarConstelacion("OSA MENOR", osaMenorPuntos, 0xaaaaff);

  // ORIÓN
  const orionPuntos = [
    punto(-1.65, -0.05, -4.5), punto(-1.40, -0.30, -4.5), punto(-1.15, -0.10, -4.5), 
    punto(-0.90, -0.30, -4.5), punto(-1.00, -0.90, -4.5), punto(-0.85, -1.50, -4.5), 
    punto(-1.40, -1.45, -4.5), punto(-1.25, -1.05, -4.5), punto(-1.40, -0.30, -4.5), 
    punto(-1.25, -1.05, -4.5), punto(-1.15, -0.95, -4.5), punto(-1.00, -0.90, -4.5), 
    punto(-0.90, -0.30, -4.5), punto(-0.65, -0.30, -4.5), punto(-0.75,  0.05, -4.5), 
    punto(-0.65, -0.30, -4.5), punto(-0.72, -0.65, -4.5)
  ];
  trazarConstelacion("ORI\u00d3N", orionPuntos, 0xffaaff);

  // CAN MAYOR
  const canMayorPuntos = [
    punto(-2.4, -3.0, -4.5), punto(-2.9, -2.8, -4.5), punto(-3.0, -2.1, -4.5), 
    punto(-3.4, -2.4, -4.5), punto(-2.9, -2.8, -4.5), punto(-3.4, -3.6, -4.5), 
    punto(-3.7, -4.0, -4.5), punto(-4.0, -4.3, -4.5), punto(-3.7, -4.0, -4.5), 
    punto(-3.4, -3.6, -4.5), punto(-3.1, -4.1, -4.5), punto(-2.8, -4.6, -4.5), 
    punto(-3.1, -4.1, -4.5), punto(-2.3, -4.3, -4.5)
  ];
  trazarConstelacion("CAN MAYOR", canMayorPuntos, 0x00aaff);

  // PISCIS
  const piscisPuntos = [
    punto(1.40, 2.40, -4.8), punto(1.35, 2.25, -4.8), punto(1.45, 2.15, -4.8), 
    punto(1.35, 1.75, -4.8), punto(1.30, 1.40, -4.8), punto(1.20, 1.00, -4.8), 
    punto(1.50, 1.20, -4.8), punto(1.70, 1.35, -4.8), punto(1.95, 1.50, -4.8), 
    punto(2.20, 1.60, -4.8), punto(2.30, 1.80, -4.8), punto(2.50, 1.85, -4.8), 
    punto(2.65, 1.65, -4.8), punto(2.50, 1.45, -4.8), punto(2.20, 1.60, -4.8)
  ];
  trazarConstelacion("PISCIS", piscisPuntos, 0xaaddff);
}