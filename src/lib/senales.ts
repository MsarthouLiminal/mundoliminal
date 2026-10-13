/**
 * Señales: el monitor semanal de LIMINAL.
 *
 * Cada edición es un archivo JSON en src/data/senales/ (uno por semana,
 * con nombre AAAA-sNN.json). La edición con fecha más reciente es la que
 * se muestra en la home y en /senales. Todas quedan archivadas en
 * /senales/AAAA-sNN.
 *
 * Para publicar una edición nueva: copiar el JSON de la semana anterior,
 * cambiar id, semana, fechas y contenido, y publicar el sitio.
 */
import { K, LAT_TOP, MAPA_W, MAPA_H } from '../data/mapa-mundo';

export type Tendencia = 'escala' | 'estable' | 'afloja';
export type Lado = 'der' | 'izq' | 'arriba';

export interface Senal {
  n: number;
  titulo: string;
  lugar: string;
  lugarMapa: string;
  lat: number;
  lon: number;
  etiqueta?: Lado;
  arco?: { lat: number; lon: number; nombre: string };
  fecha: string;
  hecho: string;
  lectura: string;
  tendencia: Tendencia;
  intensidad: 1 | 2 | 3;
  fuente: { nombre: string; url: string };
  analisis?: { titulo: string; url: string };
  /** Si la señal se actualizó después de publicada: "2026-10-14T16:20" (hora de Montevideo). */
  actualizado?: string;
  /** Señal agregada a mitad de semana, antes de la edición siguiente. */
  ultimoMomento?: boolean;
  /**
   * La versión publicada el lunes, cuando una actualización cambió el texto.
   * Se carga la primera vez que se actualiza la señal y no se vuelve a pisar:
   * siempre guarda lo que salió en la edición. Se muestra plegada bajo la señal.
   */
  anterior?: {
    /** Solo si el título cambió. */
    titulo?: string;
    fecha: string;
    hecho: string;
    lectura: string;
    fuente: { nombre: string; url: string };
  };
}

export interface Eje {
  id: string;
  slug: string;
  nombre: string;
  alcance: string;
  senales: Senal[];
  tambienTitulo: string;
  tambien: { etiqueta: string; texto: string }[];
}

export interface Foco {
  nombre: string;
  lugarMapa: string;
  lat: number;
  lon: number;
  etiqueta?: Lado;
  eje: string;
}

export interface Edicion {
  id: string;
  semana: number;
  fechaEdicion: string;
  corteDatos: string;
  ejes: Eje[];
  focos: Foco[];
  agenda: { fecha?: string; texto: string; eje: string; detalle: string }[];
}

const archivos = import.meta.glob<Edicion>('../data/senales/*.json', {
  eager: true,
  import: 'default',
});

/** Todas las ediciones, de la más nueva a la más vieja. */
export function ediciones(): Edicion[] {
  return Object.values(archivos).sort((a, b) => b.fechaEdicion.localeCompare(a.fechaEdicion));
}

export function edicionVigente(): Edicion {
  const todas = ediciones();
  if (!todas.length) throw new Error('No hay ediciones de Señales en src/data/senales/');
  return todas[0];
}

export function contarSenales(e: Edicion): number {
  return e.ejes.reduce((n, eje) => n + eje.senales.length, 0);
}

/* ---------- Fechas (siempre en UTC para que no corra el día) ---------- */

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

function aFecha(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

/** "2026-10-08" → "8 oct" */
export function fechaCorta(iso: string): string {
  const f = aFecha(iso);
  return `${f.getUTCDate()} ${MESES_CORTOS[f.getUTCMonth()]}`;
}

/** "2026-10-12" → "lunes 12 de octubre de 2026" */
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(aFecha(iso))
    .replace(',', '');
}

/** "2026-10-12" → "del 12 de octubre de 2026" (fila del archivo de ediciones) */
export function delFecha(iso: string): string {
  const fecha = new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(aFecha(iso));
  return `del ${fecha}`;
}

/** "2026-10-12" → "Semana del 12 de octubre de 2026" (fecha de cada edición) */
export function semanaDel(iso: string): string {
  return `Semana ${delFecha(iso)}`;
}

/** "2026-10-14T16:20" → "14 oct, 16:20" (la hora ya viene en hora de Montevideo) */
export function fechaHora(isoLocal: string): string {
  const [dia, hora] = isoLocal.split('T');
  return hora ? `${fechaCorta(dia)}, ${hora.slice(0, 5)}` : fechaCorta(dia);
}

/** La actualización más reciente de la edición, si hubo alguna. */
export function ultimaActualizacion(e: Edicion): string | null {
  const marcas = e.ejes.flatMap((eje) => eje.senales.map((s) => s.actualizado).filter(Boolean)) as string[];
  return marcas.length ? marcas.sort().at(-1)! : null;
}

/** "2026-10-10" → "sábado 10 de octubre" */
export function fechaSinAnio(iso: string): string {
  return fechaLarga(iso).replace(/ de \d{4}$/, '');
}

/* ---------- Mapa ---------- */

export function proyectar(lat: number, lon: number): [number, number] {
  return [Math.round((lon + 180) * K * 10) / 10, Math.round((LAT_TOP - lat) * K * 10) / 10];
}

/** "26,57° N · 56,25° E" */
export function coordenadas(lat: number, lon: number): string {
  const f = (v: number) => Math.abs(v).toFixed(2).replace('.', ',');
  return `${f(lat)}° ${lat >= 0 ? 'N' : 'S'} · ${f(lon)}° ${lon >= 0 ? 'E' : 'O'}`;
}

/** Curva suave entre dos puntos del mapa, combada hacia el norte. */
export function arco(a: [number, number], b: [number, number]): string {
  const mx = (a[0] + b[0]) / 2;
  const my = Math.min(a[1], b[1]) - Math.abs(a[0] - b[0]) * 0.18;
  return `M${a[0]} ${a[1]} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b[0]} ${b[1]}`;
}

/** Recorte del mapa para pantallas chicas: solo la zona con puntos. */
export function recorteMovil(puntos: [number, number][]): string {
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const pad = 46;
  const x0 = Math.max(0, Math.min(...xs) - pad);
  const x1 = Math.min(MAPA_W, Math.max(...xs) + pad);
  const y0 = Math.max(0, Math.min(...ys) - pad);
  const y1 = Math.min(MAPA_H, Math.max(...ys) + pad);
  return `${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`;
}

export const TENDENCIA: Record<Tendencia, string> = {
  escala: '↑ Escala',
  estable: '→ Se sostiene',
  afloja: '↓ Afloja',
};

export const INTENSIDAD = ['', 'Baja', 'Media', 'Alta'] as const;
