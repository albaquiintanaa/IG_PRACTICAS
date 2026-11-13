import * as THREE from "three";
import { E } from "./estado.js";
import { incendios, coloresDanio, exageracion } from "./config.js";
import { LonLatAPixel, LonLatAEscena, AlturaZ } from "./terreno.js";
import { MarcasLineaTemporal } from "./interfaz.js";

// ----------------- CARGA DE LOS PERÍMETROS (Copernicus) -----------------

export function CargaIncendios() {
  const promesas = [];
  for (const inc of incendios) {
    inc.perimetros = [];
    inc.archivos.forEach((archivo, i) => {
      promesas.push(
        fetch("src/data/" + archivo)
          .then((response) => {
            if (!response.ok) throw new Error("Error: " + response.statusText);
            return response.json();
          })
          .then((geo) => {
            inc.perimetros[i] = {
              fecha: new Date(geo.fecha),
              hectareas: geo.hectareas,
              features: geo.features,
              grading: archivo.includes("grading"),
              aproximado: archivo.includes("first"),
            };
          })
      );
    });
  }
  Promise.all(promesas)
    .then(() => {
      E.incendiosCargados = true;
      console.log("Perímetros de incendios cargados");
      MarcasLineaTemporal();
    })
    .catch((error) => console.error("Error al cargar los incendios:", error));

  //Contornos 3D del frente de fuego
  E.matFrente = new THREE.LineBasicMaterial({ color: 0xff6a00 });
  E.scene.add(E.lineasFuego);
}

export function PerimetroActual(inc) {
  let idx = -1;
  inc.perimetros.forEach((p, i) => {
    if (p.fecha <= E.fechaActual) idx = i;
  });
  return idx;
}


// ----------------- DIBUJO EN EL LIENZO -----------------

//Traza en el lienzo los anillos de una geometría GeoJSON (MultiPolygon)
function TrazaGeometria(ctx, geom) {
  for (const poligono of geom.coordinates) {
    for (const anillo of poligono) {
      anillo.forEach((p, i) => {
        const [x, y] = LonLatAPixel(p[0], p[1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
  }
}


function RellenaPerimetro(perimetro, color) {
  const ctx = E.ctxLienzo;
  ctx.fillStyle = color;
  for (const f of perimetro.features) {
    ctx.beginPath();
    TrazaGeometria(ctx, f.geometry);
    ctx.fill("evenodd"); 
  }
}


export function ActualizaIncendios() {
  const indices = incendios.map(PerimetroActual);
  //Un incendio se considera extinguido 2 días después de su último perímetro
  const cenizas = incendios.map((inc, n) => {
    const i = indices[n];
    if (i < 0 || i !== inc.perimetros.length - 1 || inc.perimetros[i].grading) return false;
    return E.fechaActual - inc.perimetros[i].fecha > 2 * 24 * 3600 * 1000;
  });
  const estado = indices.join(",") + "|" + cenizas.join(",");
  if (estado === E.estadoAnterior) return;
  E.estadoAnterior = estado;

  const ctx = E.ctxLienzo;

  ctx.putImageData(E.baseColor, 0, 0);

  incendios.forEach((inc, n) => {
    const i = indices[n];
    if (i < 0) return;
    const actual = inc.perimetros[i];
    if (actual.grading) {
      for (const f of actual.features) {
        ctx.fillStyle = coloresDanio[f.properties.damage_gra] || "rgba(60,40,30,0.9)";
        ctx.beginPath();
        TrazaGeometria(ctx, f.geometry);
        ctx.fill("evenodd");
      }
      return;
    }
    if (cenizas[n]) {
      RellenaPerimetro(actual, "rgba(35, 25, 22, 0.92)");
      return;
    }
    if (actual.aproximado) {
      ctx.save();
      ctx.filter = "blur(8px)";
      RellenaPerimetro(actual, "rgba(255, 95, 20, 0.75)");
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.shadowColor = "rgba(255, 120, 0, 0.9)";
    ctx.shadowBlur = 12;
    RellenaPerimetro(actual, "rgba(255, 95, 20, 0.9)");
    ctx.restore();
    let j = i - 1;
    while (j >= 0 && inc.perimetros[j].aproximado) j--;
    if (j >= 0) RellenaPerimetro(inc.perimetros[j], "rgba(35, 25, 22, 0.92)");
  });
  E.texturaLienzo.needsUpdate = true;

  E.lineasFuego.children.forEach((l) => l.geometry.dispose());
  E.lineasFuego.clear();
  incendios.forEach((inc, n) => {
    const i = indices[n];
    if (i < 0 || inc.perimetros[i].grading || inc.perimetros[i].aproximado || cenizas[n]) return;
    for (const f of inc.perimetros[i].features) {
      for (const poligono of f.geometry.coordinates) {
        const anillo = poligono[0]; //solo el borde exterior
        const pts = anillo.map((p) => {
          const [x, y] = LonLatAEscena(p[0], p[1]);
          return new THREE.Vector3(x, y, AlturaZ(x, y) + 6 * E.metro * exageracion);
        });
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        E.lineasFuego.add(new THREE.Line(geo, E.matFrente));
      }
    }
  });
}


export function LatidoFrente() {
  const t = performance.now() / 1000;
  E.matFrente.color.setHSL(0.07, 1, 0.5 + 0.12 * Math.sin(t * 6));
}
