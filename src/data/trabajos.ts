/**
 * Trabajos de LIMINAL Talks: marcas, casos y agenda.
 *
 * Para sumar una foto: guardarla en public/images/talks/ en dos tamaños,
 * 1200x800 (nombre.jpg) y 720x480 (nombre-720.jpg), y poner la ruta del
 * grande en `foto` del caso (por ejemplo '/images/talks/wtc.jpg').
 * Para sumar un logo: copiarlo a public/brand/clientes/ y poner la ruta en
 * `logo` de la marca. Se muestra en un solo tono, sin importar el color original.
 */

export interface Marca {
  nombre: string;
  logo?: string;
}

export interface Caso {
  cliente: string;
  etiqueta: string;
  formato: 'Presentación analítica' | 'Conversación y conducción' | 'Presentación y conversación';
  fecha?: string;
  lugar?: string;
  texto: string;
  foto?: string;
  fotoAlt?: string;
}

export type Acceso = 'invitacion' | 'abierto';

export interface Evento {
  fecha: string;
  hora?: string;
  ciudad: string;
  lugar?: string;
  titulo: string;
  formato: 'Charla' | 'Conversación' | 'Moderación' | 'Conducción';
  detalle: string;
  organiza: string;
  acceso: Acceso;
  /** Enlace de inscripción, solo para eventos abiertos. */
  inscripcion?: string;
}

/** Con quiénes trabajó LIMINAL Talks. */
export const MARCAS: Marca[] = [
  { nombre: 'WTC Uruguay' },
  { nombre: 'WTC Punta del Este' },
  { nombre: 'REF Uruguay' },
  { nombre: 'Sancor Seguros' },
  { nombre: 'Randstad' },
  { nombre: 'Amber Latam' },
  { nombre: 'MBRF' },
  { nombre: 'Fenicio' },
  { nombre: 'Nantas' },
  { nombre: "L'Oréal Uruguay" },
  { nombre: 'BMI' },
  { nombre: 'Segura Bank' },
  { nombre: 'Club del Inversor' },
];

export const CASOS: Caso[] = [
  {
    cliente: 'WTC Punta del Este',
    etiqueta: 'Leading Sessions',
    formato: 'Presentación analítica',
    fecha: '22 oct 2026',
    lugar: 'WTC Free Zone, Punta del Este',
    texto:
      'Charla "El Cono Sur después del 25 de octubre": qué cambia en la región si en Brasil gana Lula o Flávio Bolsonaro, el contexto de Argentina y los movimientos de Estados Unidos y China, leídos desde las decisiones de las empresas que invierten en Uruguay.',
    foto: '/images/talks/wtc-punta-del-este.jpg',
    fotoAlt: 'Martín Sarthou da la charla de Leading Sessions en WTC Punta del Este, con la sala de espaldas en primer plano.',
  },
  {
    cliente: 'Lanzamiento de I WILL',
    etiqueta: "Giorgio Armani, L'Oréal Uruguay",
    formato: 'Conversación y conducción',
    fecha: '19 oct 2026',
    texto:
      'Conducción de la noche y conversación con el actor Agustín Della Corte, protagonista del short film de la fragancia, y el psicólogo Alejandro De Barbieri sobre la voluntad y la disciplina, ante clientes e invitados de la marca.',
    foto: '/images/talks/iwill-giorgio-armani.jpg',
    fotoAlt: 'Martín Sarthou conversa con Agustín Della Corte y Alejandro De Barbieri en el lanzamiento de I WILL, de Giorgio Armani.',
  },
  {
    cliente: 'Nantas',
    etiqueta: 'Puntos de Inflexión',
    formato: 'Conversación y conducción',
    fecha: '16 oct 2026',
    lugar: 'WTC Free Zone, Montevideo',
    texto:
      'Encuentro para clientes e invitados de Nantas: una conversación con María Noel Riccetto, directora artística del Ballet Nacional del Sodre, sobre las decisiones detrás de los cambios de etapa en la vida.',
    foto: '/images/talks/nantas-puntos-de-inflexion.jpg',
    fotoAlt: 'Martín Sarthou conversa con María Noel Riccetto en Puntos de Inflexión, el encuentro de Nantas.',
  },
  {
    cliente: 'WTC Uruguay',
    etiqueta: 'Leading Sessions',
    formato: 'Presentación analítica',
    fecha: '17 jun 2026',
    lugar: 'WTC Free Zone, Montevideo',
    texto:
      'Charla "El nuevo mapa del poder mundial" para unos 100 CEOs y gerentes senior del ecosistema WTC: los cambios que van a pesar en la economía, las alianzas y las decisiones estratégicas de los próximos años. WTC es cliente recurrente de LIMINAL Talks.',
    foto: '/images/talks/wtc-leading-sessions.jpg',
    fotoAlt: 'Pieza de difusión de Leading Sessions: "El nuevo mapa del poder mundial", con Martín Sarthou.',
  },
  {
    cliente: 'El ahorro cambió de dirección',
    etiqueta: 'BMI · Segura Bank · Club del Inversor',
    formato: 'Presentación y conversación',
    fecha: '20 ago 2026',
    lugar: 'WTC, Montevideo',
    texto:
      'Apertura analítica, "El miedo también decide", y conducción de la conversación entre BMI, Segura Bank y Club del Inversor sobre el nuevo mapa del ahorro en América Latina.',
    foto: '/images/talks/el-ahorro-cambio-de-direccion.jpg',
    fotoAlt: 'Martín Sarthou durante la apertura "El miedo también decide".',
  },
  {
    cliente: 'Sancor Seguros',
    etiqueta: 'Coyuntura y riesgo país',
    formato: 'Presentación y conversación',
    texto:
      'Dos encuentros: una presentación analítica de coyuntura y la Country Risk Conference Uruguay 2025, junto a Coface, con entrevista a la presidenta de la Unión de Exportadores del Uruguay.',
    foto: '/images/talks/sancor-seguros.jpg',
    fotoAlt: 'Martín Sarthou entrevista en escena a la presidenta de la Unión de Exportadores en la Country Risk Conference Uruguay 2025.',
  },
  {
    cliente: 'Randstad',
    etiqueta: 'Talento y empresas',
    formato: 'Conversación y conducción',
    texto:
      'Moderación de la presentación del estudio de Randstad sobre las empresas que mejor gestionan el talento, con una entrevista en escena.',
    foto: '/images/talks/randstad.jpg',
    fotoAlt: 'Martín Sarthou en el escenario de Randstad, durante la presentación del estudio.',
  },
  {
    cliente: 'Amber Latam',
    etiqueta: 'Mercados e inversión',
    formato: 'Conversación y conducción',
    fecha: '29 abr 2026',
    lugar: 'En línea',
    texto:
      '"El mundo en juego: una conversación con BlackRock". Entrevista a Benjamin Souza, Managing Director de BlackRock, para la comunidad de Amber Latam.',
    foto: '/images/talks/amber-latam.jpg',
    fotoAlt: 'Benjamin Souza, de BlackRock, y Martín Sarthou en el webinar de Amber Latam.',
  },
  {
    cliente: 'Fenicio Talks 2026',
    etiqueta: 'Fenicio',
    formato: 'Conversación y conducción',
    fecha: '8 oct 2026',
    lugar: 'WTC, Montevideo',
    texto: 'Conducción del encuentro anual de Fenicio con grandes marcas del retail uruguayo.',
    foto: '/images/talks/fenicio-talks.jpg',
    fotoAlt: 'Martín Sarthou conduce Fenicio Talks 2026.',
  },
  {
    cliente: 'REF Uruguay',
    etiqueta: 'Foros de empresarios y gerentes',
    formato: 'Presentación analítica',
    fecha: '2026',
    lugar: 'Montevideo y Colonia',
    texto:
      'Charlas para foros de REF Uruguay sobre minerales críticos, "La Cuenca del Plata cambió de manos" y "¿En qué mundo vivimos?", con un caso por rubro para cada sala.',
  },
  {
    cliente: 'MBRF',
    etiqueta: 'Evento corporativo',
    formato: 'Conversación y conducción',
    texto: 'Maestro de ceremonias en un evento con público de alto nivel.',
  },
];

/**
 * Agenda. Los eventos con fecha pasada pasan solos a "Encuentros recientes"
 * en cada publicación del sitio (se reconstruye cada 6 horas).
 */
export const AGENDA: Evento[] = [
  {
    fecha: '2026-10-16',
    hora: '9:15',
    ciudad: 'Montevideo',
    lugar: 'WTC Free Zone, piso 22',
    titulo: 'Puntos de Inflexión',
    formato: 'Conversación',
    detalle:
      'Con María Noel Riccetto, directora artística del Ballet Nacional del Sodre: los desafíos y las decisiones detrás de los cambios de etapa en la vida.',
    organiza: 'Nantas',
    acceso: 'invitacion',
  },
  {
    fecha: '2026-10-20',
    hora: '20:30',
    ciudad: 'Montevideo',
    titulo: 'Mercosur y la Unión Europea: ¿un acuerdo comercial en un nuevo mapa geopolítico?',
    formato: 'Moderación',
    detalle:
      'Serie Degustación de conocimientos. Con la embajadora Valeria Csukasi, subsecretaria de Relaciones Exteriores, y el economista Marcel Vaillant.',
    organiza: 'Degustación de conocimientos',
    acceso: 'invitacion',
  },
  {
    fecha: '2026-10-22',
    hora: '18:00 a 20:30',
    ciudad: 'Punta del Este',
    lugar: 'WTC Punta del Este',
    titulo: 'El Cono Sur después del 25 de octubre',
    formato: 'Charla',
    detalle:
      'Leading Sessions. Qué cambia en la región si en Brasil gana Lula o Flavio Bolsonaro, y qué ya cambió; el contexto de Argentina y los movimientos de Estados Unidos y China. Presencial, con cupos limitados.',
    organiza: 'World Trade Center Punta del Este',
    acceso: 'abierto',
    inscripcion: 'https://lnkd.in/dSP2hp-F',
  },
  {
    fecha: '2026-10-28',
    ciudad: 'Montevideo',
    lugar: 'Hyatt',
    titulo: '15 años de Hormetal',
    formato: 'Conversación',
    detalle: 'Conversación con un economista en el aniversario de la empresa.',
    organiza: 'Hormetal',
    acceso: 'invitacion',
  },
  {
    fecha: '2026-11-27',
    ciudad: 'Minas',
    lugar: 'Parque UTE-Antel',
    titulo: 'Charla para el directorio de UTE',
    formato: 'Charla',
    detalle: 'Para el directorio y las gerencias estratégicas.',
    organiza: 'UTE',
    acceso: 'invitacion',
  },
];

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

/** "2026-10-16" → { dia: 'vie', num: '16', mes: 'oct' } */
export function partesFecha(iso: string) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return { dia: DIAS[f.getUTCDay()], num: String(d), mes: MESES[m - 1], anio: String(a) };
}

/** Fecha de hoy en Montevideo, como "AAAA-MM-DD". */
export function hoyMontevideo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' }).format(new Date());
}

export function proximos(): Evento[] {
  const hoy = hoyMontevideo();
  return AGENDA.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function recientes(): Evento[] {
  const hoy = hoyMontevideo();
  return AGENDA.filter((e) => e.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));
}
