/**
 * Big board de Señales: la geometría del tablero y los datos que usa el navegador.
 *
 * El tablero es un mapa del mundo en puntos, inclinado en perspectiva, con un haz
 * de luz por señal: la altura es la intensidad y el color, la tendencia. Todo sale
 * de la edición vigente (src/data/senales/AAAA-sNN.json): no hay un segundo
 * archivo que mantener. La geometría se calcula en el build y llega al navegador
 * como trazados SVG ya hechos.
 */
import {
  type Edicion,
  type Senal,
  type Tendencia,
  umHasta,
  fechaCorta,
  fechaHora,
  activas,
  INTENSIDAD,
} from './senales';
import { GRILLA_FILAS, GRILLA_PASO, GRILLA_LAT0, GRILLA_LON0, GRILLA_COLS } from '../data/big-board-grilla';

/** Lienzo del tablero, en unidades del viewBox. */
export const VW = 1000;
export const VH = 560;
/** Cuánto se acerca la cámara al elegir una señal. */
export const ZOOM = 2.3;

const CX = 500;
const CY = 330;
const INCLINACION = (55 * Math.PI) / 180;
const DISTANCIA = 900;
const ANCHO_PLANO = 1010;
const ALTO_HAZ: Record<number, number> = { 1: 45, 2: 85, 3: 135 };

interface Encuadre {
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
}

/** El encuadre de siempre deja afuera el Pacífico. Si una señal cae fuera, se usa el mundo entero. */
const ENCUADRE_BASE: Encuadre = { lon0: -130, lon1: 150, lat0: 71, lat1: -49 };
const ENCUADRE_MUNDO: Encuadre = { lon0: -180, lon1: 180, lat0: 72, lat1: -50 };

type Proyectar = (lat: number, lon: number, h?: number) => [number, number, number];

function elegirEncuadre(puntos: [number, number][]): Encuadre {
  const b = ENCUADRE_BASE;
  const dentro = puntos.every(([lat, lon]) => lon > b.lon0 + 3 && lon < b.lon1 - 3 && lat < b.lat0 - 2 && lat > b.lat1 + 2);
  return dentro ? ENCUADRE_BASE : ENCUADRE_MUNDO;
}

function crearProyeccion(enc: Encuadre): { p: Proyectar; k: number } {
  const k = ANCHO_PLANO / (enc.lon1 - enc.lon0);
  const clon = (enc.lon0 + enc.lon1) / 2;
  const clat = (enc.lat0 + enc.lat1) / 2;
  const cos = Math.cos(INCLINACION);
  const sin = Math.sin(INCLINACION);
  const p: Proyectar = (lat, lon, h = 0) => {
    const x = (lon - clon) * k;
    const w = (clat - lat) * k;
    const y = w * cos - h * sin;
    const z = w * sin + h * cos;
    const f = DISTANCIA / (DISTANCIA - z);
    return [CX + x * f, CY + y * f, f];
  };
  return { p, k };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface PuntoBoard {
  n: number;
  base: [number, number];
  tope: [number, number];
  /** Corrimiento horizontal de la etiqueta para que no se pise con otra (unidades del viewBox). */
  dx: number;
  /** Traslado de cámara para acercarse a esta señal. */
  cam: { tx: number; ty: number };
}

export interface GeometriaBoard {
  tierra: string;
  grilla: string;
  arcos: string;
  focos: string;
  haces: { alta: string; escala: string; afloja: string; estable: string };
  nucleos: Record<Tendencia, string>;
  brillo: string;
  puntos: PuntoBoard[];
}

/** Las señales activas de la edición, en el orden de los ejes. Las que bajaron a "Antes en la semana" no van al tablero. */
export function senalesEnOrden(e: Edicion): (Senal & { eje: string; ejeNombre: string })[] {
  return e.ejes.flatMap((eje) => activas(eje).map((s) => ({ ...s, eje: eje.id, ejeNombre: eje.nombre })));
}

export function geometriaBoard(e: Edicion): GeometriaBoard {
  const senales = senalesEnOrden(e);
  const enc = elegirEncuadre([
    ...senales.map((s) => [s.lat, s.lon] as [number, number]),
    ...senales.filter((s) => s.arco).map((s) => [s.arco!.lat, s.arco!.lon] as [number, number]),
    ...e.focos.map((f) => [f.lat, f.lon] as [number, number]),
  ]);
  const { p, k } = crearProyeccion(enc);

  let tierra = '';
  GRILLA_FILAS.forEach((fila, r) => {
    const lat = GRILLA_LAT0 - (r + 0.5) * GRILLA_PASO;
    if (lat > enc.lat0 || lat < enc.lat1) return;
    for (let c = 0; c < GRILLA_COLS; c++) {
      if (!((parseInt(fila[c >> 2], 16) >> (3 - (c & 3))) & 1)) continue;
      const lon = GRILLA_LON0 + (c + 0.5) * GRILLA_PASO;
      if (lon < enc.lon0 || lon > enc.lon1) continue;
      const [x, y, f] = p(lat, lon);
      const s = 0.36 * GRILLA_PASO * k * f;
      tierra += `M${r1(x - s / 2)} ${r1(y - s * 0.3)}h${r1(s)}v${r1(s * 0.6)}h-${r1(s)}z`;
    }
  });

  let grilla = '';
  for (let lon = Math.ceil(enc.lon0 / 30) * 30; lon <= enc.lon1; lon += 30) {
    for (let i = 0; i <= 12; i++) {
      const [x, y] = p(enc.lat0 - ((enc.lat0 - enc.lat1) * i) / 12, lon);
      grilla += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
    }
  }
  for (let lat = 60; lat >= enc.lat1; lat -= 30) {
    for (let i = 0; i <= 16; i++) {
      const [x, y] = p(lat, enc.lon0 + ((enc.lon1 - enc.lon0) * i) / 16);
      grilla += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
    }
  }

  let arcos = '';
  for (const s of senales) {
    if (!s.arco) continue;
    const a = p(s.lat, s.lon);
    const b = p(s.arco.lat, s.arco.lon);
    const alto = Math.min(170, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.32);
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const [x, y] = p(s.lat + (s.arco.lat - s.lat) * t, s.lon + (s.arco.lon - s.lon) * t, Math.sin(Math.PI * t) * alto);
      arcos += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
    }
  }

  let focos = '';
  for (const f of e.focos) {
    const [x, y, z] = p(f.lat, f.lon);
    const s = 9 * z;
    focos += `M${r1(x - s / 2)} ${r1(y - s * 0.3)}h${r1(s)}v${r1(s * 0.6)}h-${r1(s)}z`;
  }

  const haces = { alta: '', escala: '', afloja: '', estable: '' };
  const nucleos: Record<Tendencia, string> = { escala: '', afloja: '', estable: '' };
  let brillo = '';
  const puntos: PuntoBoard[] = [];
  for (const s of senales) {
    const b = p(s.lat, s.lon);
    const t = p(s.lat, s.lon, ALTO_HAZ[s.intensidad]);
    const w0 = 4.2 * b[2];
    const poligono = `M${r1(b[0] - w0)} ${r1(b[1])}L${r1(b[0] + w0)} ${r1(b[1])}L${r1(t[0] + 0.8)} ${r1(t[1])}L${r1(t[0] - 0.8)} ${r1(t[1])}Z`;
    const linea = `M${r1(b[0])} ${r1(b[1])}L${r1(t[0])} ${r1(t[1])}`;
    if (s.tendencia === 'escala' && s.intensidad === 3) {
      haces.alta += poligono;
      brillo += linea;
    } else {
      haces[s.tendencia] += poligono;
    }
    nucleos[s.tendencia] += linea;
    const fy = (b[1] + t[1]) / 2;
    puntos.push({
      n: s.n,
      base: [r1(b[0]), r1(b[1])],
      tope: [r1(t[0]), r1(t[1])],
      dx: 0,
      cam: { tx: r1(VW / 2 - b[0] * ZOOM), ty: r1(VH / 2 - fy * ZOOM) },
    });
  }

  // Etiquetas: si dos quedan muy cerca, se corren de costado para no pisarse.
  const orden = [...puntos].sort((a, b) => {
    const sa = senales.find((s) => s.n === a.n)!;
    const sb = senales.find((s) => s.n === b.n)!;
    return sb.intensidad - sa.intensidad;
  });
  const ubicadas: PuntoBoard[] = [];
  for (const q of orden) {
    for (const dx of [0, 46, -46, 92, -92]) {
      const choca = ubicadas.some((o) => Math.abs(q.tope[0] + dx - (o.tope[0] + o.dx)) < 44 && Math.abs(q.tope[1] - o.tope[1]) < 30);
      if (!choca) {
        q.dx = dx;
        break;
      }
    }
    ubicadas.push(q);
  }

  return { tierra, grilla, arcos, focos, haces, nucleos, brillo, puntos };
}

/* ---------- Datos de cada señal para la ficha ---------- */

function dms(v: number, pos: string, neg: string, ancho: number): string {
  const g = Math.abs(v);
  let d = Math.floor(g);
  let m = Math.round((g - d) * 600) / 10;
  if (m >= 60) {
    d += 1;
    m = 0;
  }
  return `${v >= 0 ? pos : neg} ${String(d).padStart(ancho, '0')}°${m.toFixed(1).padStart(4, '0')}'`;
}

const RAD = Math.PI / 180;

function rumbo(la1: number, lo1: number, la2: number, lo2: number): number {
  const p1 = la1 * RAD;
  const p2 = la2 * RAD;
  const dl = (lo2 - lo1) * RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.round(((Math.atan2(y, x) / RAD) + 360) % 360);
}

function distanciaKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const a = Math.sin(((la2 - la1) * RAD) / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin(((lo2 - lo1) * RAD) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(a)));
}

/** Nombre corto para el cartel de letras: el campo `corto` o, si falta, el lugar del mapa. */
function nombreCorto(s: Senal): string {
  if (s.corto) return s.corto.toUpperCase().slice(0, 13);
  const base = s.lugarMapa.split(',')[0].trim();
  const corto = base.length > 13 ? base.split(' ').at(-1)! : base;
  return corto.toUpperCase().slice(0, 13);
}

export interface SenalBoard {
  n: number;
  eje: string;
  ejeNombre: string;
  titulo: string;
  lugar: string;
  fecha: string;
  hecho: string;
  lectura: string;
  fuente: { nombre: string; url: string };
  analisis: { titulo: string; url: string } | null;
  tendencia: Tendencia;
  intensidad: number;
  intensidadNombre: string;
  /** Hasta cuándo vale "Último momento" (ms), o null. */
  umHasta: number | null;
  /** "7 nov, 08:39" si la señal se actualizó después de publicada. */
  actualizado: string | null;
  tieneAnterior: boolean;
  corto: string;
  dato: string | null;
  objetivo: string;
  lat: string;
  lon: string;
  arco: { nombre: string; rumbo: number; km: number } | null;
}

export function senalesBoard(e: Edicion): SenalBoard[] {
  return senalesEnOrden(e).map((s) => ({
    n: s.n,
    eje: s.eje,
    ejeNombre: s.ejeNombre,
    titulo: s.titulo,
    lugar: s.lugar.replace(/\s*·\s*/g, ', '),
    fecha: fechaCorta(s.fecha),
    hecho: s.hecho,
    lectura: s.lectura,
    fuente: s.fuente,
    analisis: s.analisis ?? null,
    tendencia: s.tendencia,
    intensidad: s.intensidad,
    intensidadNombre: INTENSIDAD[s.intensidad],
    umHasta: umHasta(s),
    actualizado: s.actualizado ? fechaHora(s.actualizado) : null,
    tieneAnterior: Boolean(s.anterior),
    corto: nombreCorto(s),
    dato: s.dato ?? null,
    objetivo: (s.objetivo ?? s.ejeNombre).toUpperCase(),
    lat: dms(s.lat, 'N', 'S', 2),
    lon: dms(s.lon, 'E', 'O', 3),
    arco: s.arco
      ? {
          nombre: s.arco.nombre.toUpperCase(),
          rumbo: rumbo(s.lat, s.lon, s.arco.lat, s.arco.lon),
          km: distanciaKm(s.lat, s.lon, s.arco.lat, s.arco.lon),
        }
      : null,
  }));
}

/** La señal que se muestra al abrir: la de último momento vigente o, si no hay, la más intensa y reciente. */
export function senalInicial(e: Edicion, ahora = Date.now()): number {
  const todas = senalesEnOrden(e);
  const um = todas.find((s) => {
    const h = umHasta(s);
    return h !== null && ahora < h;
  });
  if (um) return um.n;
  return [...todas].sort((a, b) => b.intensidad - a.intensidad || b.fecha.localeCompare(a.fecha))[0].n;
}
