export const minlon = -16.15441,
  maxlon = -14.97199;
export const minlat = 27.7291,
  maxlat = 28.20178;

export const scale = 5;
export const maxElev = 1901;

// Kilómetros que cubre el mapa de sur a norte (1 grado de latitud ~ 111.32 km)
export const kmAlto = (maxlat - minlat) * 111.32;

// Exageración del relieve (1 = real). Se aplica igual a terreno y edificios
export const exageracion = 2;

export const exageracionEdificios = 4; 
export const escalaPlanta = 2; 

export const verMalla = false;


// ----------------- COLORES DEL TERRENO -----------------

export const colorMar = [6, 22, 52]; 
export const brilloTerreno = 0.6; 
export const paletaRealista = true;

export const paletaSeca = [
  [0.0, [128, 112, 86]], 
  [0.08, [160, 138, 104]],
  [0.15, [170, 146, 108]], 
  [0.4, [150, 124, 92]], 
  [0.6, [96, 104, 72]], 
  [0.8, [128, 116, 98]], 
  [1.0, [170, 160, 148]], 
];
export const paletaHumeda = [
  [0.0, [92, 98, 70]], 
  [0.08, [100, 116, 76]], 
  [0.15, [104, 122, 78]],
  [0.4, [78, 104, 62]], 
  [0.6, [58, 84, 52]], 
  [0.8, [110, 104, 86]], 
  [1.0, [170, 160, 148]],
];

export const tramosColor = [
  [0.0, [38, 64, 44]], 
  [0.25, [78, 98, 56]], 
  [0.5, [120, 112, 72]], 
  [0.75, [150, 132, 104]], 
  [1.0, [222, 216, 204]], 
];


// ----------------- INCENDIOS (Copernicus EMS: EMSR379, EMSR381, EMSR382) -----------------

export const incendios = [
  { nombre: "Artenara", archivos: ["fuego_artenara.geojson"] },
  { nombre: "Cazadores", archivos: ["fuego_cazadores.geojson"] },
  {
    nombre: "Valleseco",
    archivos: [
      "fuego_valleseco_1_first.geojson",
      "fuego_valleseco_2_del.geojson",
      "fuego_valleseco_3_monit01.geojson",
      "fuego_valleseco_4_monit02.geojson",
      "fuego_valleseco_5_grading.geojson",
    ],
  },
];

// Colores del grado de daño (Grading)
export const coloresDanio = {
  Destroyed: "rgba(120, 10, 5, 0.92)",
  Damaged: "rgba(205, 70, 15, 0.88)",
  "Possibly damaged": "rgba(235, 170, 40, 0.80)",
};

export const fichas = [
  {
    inicio: "10 de agosto de 2019",
    lugar: "Municipio de Artenara, oeste de Gran Canaria",
    extra: "Cientos de vecinos desalojados.",
    fuente: "Copernicus EMSR379",
  },
  {
    inicio: "12 de agosto de 2019",
    lugar: "Los Cazadores, Hoya de la Perra (Telde)",
    extra: "Avanzó hacia Guayadeque y El Lerete por el viento fuerte.",
    fuente: "Copernicus EMSR381",
  },
  {
    inicio: "17 de agosto de 2019",
    lugar: "Municipio de Valleseco",
    extra:
      "Desalojos en Valleseco, Moya, Tejeda y Gáldar. Llegó al Parque Natural de Tamadaba. Más de 13.000 habitantes afectados.",
    danios: "Destruido 1.609 ha · Dañado 5.323 ha · Posiblemente dañado 2.782 ha",
    fuente: "Copernicus EMSR382",
  },
];

export const zonas = [
  { nombre: "GRAN CANARIA", incendio: -1 },
  { nombre: "ARTENARA", incendio: 0 },
  { nombre: "CAZADORES", incendio: 1 },
  { nombre: "VALLESECO", incendio: 2 },
];


// ----------------- TIEMPO  -----------------

export const fechaInicio = new Date("2019-08-10T00:00:00Z");
export const fechaFin = new Date("2019-08-25T00:00:00Z");
export const minutosPorFotograma = 20; // 15 días en ~18 s a 60 fps (velocidad x1)

export const opcionesfecha = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Atlantic/Canary",
};


// ----------------- FOCOS NASA FIRMS -----------------

export const horasDestello = 1; 
export const horasBrasa = 36; 
export const horasVisible = 72; 