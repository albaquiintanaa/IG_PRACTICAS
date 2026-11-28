import * as THREE from "three";

export const PALETA = {
  rosa: 0xf7c6d9,
  rosaFuerte: 0xee9bbb,
  lavanda: 0xcdb4f0,
  lavandaOscura: 0x4a4270,
  menta: 0xbde5d4,
  celeste: 0xbfe3f7,
  melocoton: 0xffd3b4,
  crema: 0xfff4e0,
  amarillo: 0xffe9a8,
  dorado: 0xf5d27a,
  madera: 0xe8c9a8,
  noche: 0x2e2a4f,
};

export const ARCOIRIS = [
  PALETA.rosa,
  PALETA.melocoton,
  PALETA.amarillo,
  PALETA.menta,
  PALETA.celeste,
  PALETA.lavanda,
];


let gradiente = null;
function mapaDegradado() {
  if (!gradiente) {
    const tonos = new Uint8Array([90, 170, 255]);
    gradiente = new THREE.DataTexture(tonos, tonos.length, 1, THREE.RedFormat);
    gradiente.minFilter = THREE.NearestFilter;
    gradiente.magFilter = THREE.NearestFilter;
    gradiente.needsUpdate = true;
  }
  return gradiente;
}

const cache = new Map();

/**
 * Devuelve un material pastel.
 * @param {number} color  color hexadecimal (por ejemplo PALETA.rosa)
 * @param {object} op     { toon = true, emisivo = 0x000000 }
 */
export function material(color, { toon = true, emisivo = 0x000000 } = {}) {
  const clave = `${color}-${toon}-${emisivo}`;
  if (cache.has(clave)) return cache.get(clave);

  const mat = toon
    ? new THREE.MeshToonMaterial({ color, emissive: emisivo, gradientMap: mapaDegradado() })
    : new THREE.MeshStandardMaterial({ color, emissive: emisivo, roughness: 0.8, metalness: 0 });

  cache.set(clave, mat);
  return mat;
}
