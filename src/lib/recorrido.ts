/**
 * Recorrido de Señales: cuentas y datos que comparten el monitor de /senales
 * y el hero de la portada. Todo sale del JSON de la edición; acá no se
 * escribe ninguna lectura, solo se cuenta lo que ya está cargado.
 */
import { type Edicion, type Senal, type Tendencia, ediciones } from './senales';

export type Cuenta = Record<Tendencia, number>;

export function cuenta(senales: Pick<Senal, 'tendencia'>[]): Cuenta {
  const c: Cuenta = { escala: 0, estable: 0, afloja: 0 };
  for (const s of senales) c[s.tendencia] += 1;
  return c;
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
export const dos = (n: number) => String(n).padStart(2, '0');
export const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Lo que no escala, en palabras: "2 aflojan y 1 se sostiene". Vacío si todas escalan. */
export function resto(c: Cuenta): string {
  const partes: string[] = [];
  if (c.afloja) partes.push(plural(c.afloja, 'afloja', 'aflojan'));
  if (c.estable) partes.push(plural(c.estable, 'se sostiene', 'se sostienen'));
  return partes.join(' y ');
}

/** "5 de 5 escalan", "1 de 3 escala", "Ninguna escala". */
export function titularEje(c: Cuenta, total: number): string {
  if (!c.escala) return 'Ninguna escala';
  return `${c.escala} de ${total} ${c.escala === 1 ? 'escala' : 'escalan'}`;
}

/** "3 señales: 1 escala, 2 aflojan." */
export function conteoEje(c: Cuenta, total: number): string {
  const partes = [c.escala ? plural(c.escala, 'escala', 'escalan') : '', resto(c)].filter(Boolean);
  return `${plural(total, 'señal', 'señales')}: ${partes.join(', ')}.`;
}

/** Nombre corto del eje para el índice de casillas. */
const EJE_CORTO: Record<string, string> = { min: 'Minerales', cho: 'Chokepoints', ia: 'IA', con: 'Conflictos' };
export const ejeCorto = (eje: { id: string; nombre: string }) => EJE_CORTO[eje.id] ?? eje.nombre.split(' ')[0];

/** Las ediciones del historial de una edición: hasta siete, de la más vieja a ella misma. */
export function historial(edicion: Edicion, cuantas = 7): Edicion[] {
  const viejasPrimero = [...ediciones()].reverse();
  const i = viejasPrimero.findIndex((e) => e.id === edicion.id);
  return i < 0 ? [edicion] : viejasPrimero.slice(Math.max(0, i - cuantas + 1), i + 1);
}

const NUMERO = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'];
/** La frase que explica el historial, según cuántas semanas hay. */
export function notaHistorial(semanas: number, archivada: boolean): string {
  const esta = archivada ? 'la de esta edición' : 'esta semana';
  if (semanas <= 1) return `Cada cuadro es una señal de ${archivada ? 'esta edición' : 'esta semana'}.`;
  const otras = semanas === 2 ? 'la otra es la anterior' : `las otras son las ${NUMERO[semanas - 1] ?? semanas - 1} anteriores`;
  return `Cada cuadro es una señal. La columna de la derecha es ${esta} y ${otras}.`;
}

/** Lo que necesita el globo en el navegador: dónde está cada señal y hacia dónde va. */
export function datosGlobo(edicion: Edicion) {
  return {
    semana: edicion.semana,
    ejes: edicion.ejes.map((e) => ({ id: e.id, nombre: e.nombre, slug: e.slug })),
    senales: edicion.ejes.flatMap((eje) =>
      eje.senales.map((s) => ({
        n: s.n,
        lat: Number(s.lat),
        lon: Number(s.lon),
        t: s.tendencia,
        eje: eje.id,
        corto: s.corto ?? s.lugarMapa,
        lugar: s.lugar,
        arco: s.arco ? { lat: Number(s.arco.lat), lon: Number(s.arco.lon), nombre: s.arco.nombre } : null,
      })),
    ),
    focos: edicion.focos.map((f) => ({ nombre: f.nombre, lat: Number(f.lat), lon: Number(f.lon) })),
  };
}
