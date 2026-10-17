import { XMLParser } from 'fast-xml-parser';
import titulosCorregidos from '../data/titulos-corregidos.json';

export type Platform = 'youtube' | 'substack' | 'spotify';

export interface LatestItem {
  platform: Platform;
  title: string;
  url: string;
  pubDate: Date;
  thumbnail: string | null;
  /** Imagen alternativa si la principal no carga (hoy, solo Substack). */
  thumbnailRespaldo?: string;
  author?: string;
  durationLabel?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; LiminalBot/1.0; +https://mundoliminal.com)';

const FEED_TIMEOUT_MS = 8_000;

// Un video de la playlist cuenta como episodio si su titulo trae marca de
// temporada (T1, T2...) o de episodio (E39). Antes esto era un
// `includes(' | T1 |')` que exigia una barra DESPUES de "T1", asi que el E39
// ("... | LIMINAL | E39 | T1", sin sufijo "| TRIMAX LIVE") quedaba afuera y no
// aparecia en la home. La marca puede ir al final del titulo o en el medio.
const ES_EPISODIO = /\|\s*(?:T\d+|E\d+)\b/i;

const YOUTUBE_FEED =
  'https://www.youtube.com/feeds/videos.xml?playlist_id=PLQSbB4OqWGEF-G3RJ4gk0ejlNxTyV06FJ';
const SUBSTACK_FEED = 'https://mundoliminal.substack.com/feed';
const SPOTIFY_FEED = 'https://anchor.fm/s/10c8b6fc0/podcast/rss';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  trimValues: true,
});

async function fetchXml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml,text/xml,*/*' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function safeDate(input: unknown): Date | null {
  if (typeof input !== 'string' && !(input instanceof Date)) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// Limpia títulos de feeds que incluyen sufijos editoriales tipo
// "| LIMINAL T1 E22" o "| TRIMAX LIVE". Corta en el primer " | " (con espacios).
// Aplica a YouTube y Spotify; Substack tiene títulos limpios desde origen.
function cleanFeedTitle(raw: string): string {
  const idx = raw.indexOf(' | ');
  return (idx === -1 ? raw : raw.slice(0, idx))
    .replace(/\s*:(\s*:)+/g, ':') // "Uruguay: : US$" pasa a "Uruguay: US$"
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// El canal sube los títulos en mayúsculas; la web los muestra en caja mixta,
// como pide el Brand Kit v2.1 (mayúsculas solo en overlays de video). La
// conversión automática necesita saber qué palabras son nombres propios o
// siglas: si una sale mal, se corrige en src/data/titulos-corregidos.json,
// que siempre tiene prioridad.
const NOMBRES_PROPIOS = [
  // Lugares y regiones
  'Uruguay', 'Montevideo', 'Punta del Este', 'Río de la Plata', 'Brasil', 'Argentina', 'Buenos Aires',
  'Chile', 'Paraguay', 'Bolivia', 'Perú', 'Ecuador', 'Colombia', 'Venezuela', 'México', 'Cuba',
  'Panamá', 'Canadá', 'Groenlandia', 'Estados Unidos', 'Washington', 'Nueva York', 'América Latina',
  'Latinoamérica', 'Sudamérica', 'América', 'Europa', 'Unión Europea', 'Alemania', 'Francia',
  'España', 'Italia', 'Reino Unido', 'Londres', 'Bruselas', 'Davos', 'Rusia', 'Moscú', 'Ucrania',
  'China', 'Pekín', 'Beijing', 'Taiwán', 'Hong Kong', 'Japón', 'Corea del Sur', 'Corea del Norte',
  'Corea', 'India', 'Pakistán', 'Indonesia', 'Vietnam', 'Australia', 'Asia', 'África', 'Medio Oriente',
  'Irán', 'Irak', 'Israel', 'Gaza', 'Cisjordania', 'Líbano', 'Siria', 'Turquía', 'Egipto', 'Yemen',
  'Catar', 'Qatar', 'Emiratos Árabes Unidos', 'Emiratos', 'Arabia Saudita', 'Ormuz', 'Suez',
  'Malaca', 'Bab el-Mandeb', 'Mar Rojo', 'Atlántico', 'Pacífico', 'Antártida', 'Amazonia', 'Amazonía',
  // Personas
  'Trump', 'Xi', 'Putin', 'Lula', 'Flávio', 'Bolsonaro', 'Milei', 'Orsi', 'Lacalle Pou', 'Lacalle',
  'Netanyahu', 'Jamenei', 'Zelenski', 'Maduro', 'Petro', 'Sheinbaum', 'Biden', 'Vance', 'Rubio',
  'Modi', 'Kim Jong-un', 'Musk', 'Tim Payne',
  // Instituciones, empresas y eventos
  'Mercosur', 'Cancillería', 'Casa Blanca', 'Kremlin', 'Pentágono', 'Google', 'Microsoft', 'Amazon',
  'Nvidia', 'OpenAI', 'Anthropic', 'Apple', 'Tesla', 'TikTok', 'YouTube', 'Huawei', 'Starlink',
  'Copa América', 'Juegos Olímpicos',
];
const SIGLAS = [
  'EEUU', 'EE.UU.', 'EE. UU.', 'IA', 'ONU', 'OTAN', 'OEA', 'FMI', 'BID', 'CEPAL', 'OPEP', 'BRICS', 'UE',
  'PBI', 'PIB', 'BCU', 'INE', 'UTE', 'ANCAP', 'OSE', 'ANP', 'OMC', 'OMS', 'G7', 'G20', 'TLC', 'CPTPP',
  'LIMINAL', 'US$', 'USD',
];

/** Pasa a caja mixta un título que viene todo en mayúsculas. Si ya tiene minúsculas, no lo toca. */
export function cajaMixta(titulo: string): string {
  if (/\p{Ll}/u.test(titulo)) return titulo;
  let t = titulo.toLocaleLowerCase('es-UY');
  const formas = [...NOMBRES_PROPIOS, ...SIGLAS].sort((a, b) => b.length - a.length);
  for (const forma of formas) {
    const patron = forma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${patron}(?![\\p{L}\\p{N}])`, 'giu'), forma);
  }
  // "el Mundial", "del Mundial 2026": el torneo, no el adjetivo ("guerra mundial").
  t = t.replace(/(?<![\p{L}])(el|del|al) mundial(?![\p{L}])/giu, '$1 Mundial');
  t = t.replace(/(?<![\p{L}])mundial (\d{4})/giu, 'Mundial $1');
  // Mayúscula al principio y después de punto, cierre de pregunta o de exclamación.
  return t.replace(/(^|[.?!]\s+)([¿¡"«(]*)(\p{L})/gu, (_m, antes, signos, letra) => antes + signos + letra.toLocaleUpperCase('es-UY'));
}

/** Evita que la moneda quede en una línea y la cifra en la otra ("US$ 5.700", "USD 105"). */
function sinCortarCifras(titulo: string): string {
  return titulo.replace(/\b(US\$|USD|U\$S)\s+(?=\d)/g, '$1 ');
}

/** Título corregido a mano para un video (src/data/titulos-corregidos.json), si lo hay. */
function tituloCorregidoYouTube(link: string): string | null {
  try {
    const id = new URL(link).searchParams.get('v');
    const tabla = (titulosCorregidos as { youtube?: Record<string, string> }).youtube ?? {};
    return id && tabla[id] ? tabla[id] : null;
  } catch {
    return null;
  }
}

function extractFirstImg(html: string | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

export function formatPubDate(d: Date): string {
  return new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// ============================================================
// FUNCIONES EXISTENTES — devuelven el último item (una pieza)
// Usadas por la home en src/pages/index.astro
// NO MODIFICAR sin chequear impacto en home.
// ============================================================

export async function getYouTubeLatest(): Promise<LatestItem | null> {
  const list = await getYouTubeLatestList(1);
  return list[0] ?? null;
}

export async function getSubstackLatest(): Promise<LatestItem | null> {
  const list = await getSubstackLatestList(1);
  return list[0] ?? null;
}

export async function getSpotifyLatest(): Promise<LatestItem | null> {
  const list = await getSpotifyLatestList(1);
  return list[0] ?? null;
}

// ============================================================
// FUNCIONES NUEVAS — devuelven lista de últimos N items
// Usadas por /catalogo
// Si un feed falla, devuelven [] en lugar de romper el build.
// ============================================================

export async function getYouTubeLatestList(limit = 5): Promise<LatestItem[]> {
  try {
    const xml = await fetchXml(YOUTUBE_FEED);
    const parsed = parser.parse(xml);
    const entries = asArray(parsed?.feed?.entry);
    const filtered = entries.filter((e: any) =>
      typeof e?.title === 'string' && ES_EPISODIO.test(e.title),
    );
    if (filtered.length === 0) return [];
    filtered.sort((a: any, b: any) => {
      const da = safeDate(a.published)?.getTime() ?? 0;
      const db = safeDate(b.published)?.getTime() ?? 0;
      return db - da;
    });
    const items: LatestItem[] = [];
    for (const e of filtered.slice(0, limit)) {
      const pubDate = safeDate(e?.published);
      if (!pubDate) continue;
      const linkArr = asArray(e?.link);
      const link =
        linkArr.find((l: any) => l?.['@_rel'] === 'alternate')?.['@_href'] ??
        linkArr[0]?.['@_href'] ??
        null;
      if (typeof link !== 'string') continue;
      const thumb = e?.['media:group']?.['media:thumbnail']?.['@_url']
        ?? e?.['media:thumbnail']?.['@_url']
        ?? null;
      items.push({
        platform: 'youtube',
        title: sinCortarCifras(tituloCorregidoYouTube(link) ?? cajaMixta(cleanFeedTitle(String(e.title)))),
        url: link,
        pubDate,
        thumbnail: typeof thumb === 'string' ? thumb : null,
        author: typeof e?.author?.name === 'string' ? e.author.name : undefined,
      });
    }
    return items;
  } catch (err) {
    console.warn('[feeds] youtube list fallback:', err);
    return [];
  }
}

/**
 * Substack firma las URLs de su CDN ("$s_!...!") y algunos navegadores
 * reciben un 404 con la versión firmada. Se arma la misma imagen sin firma,
 * a 800 px (unos 60 KB), y se guarda el original de S3 como respaldo.
 */
export function imagenSubstack(url: string | null): { src: string | null; respaldo?: string } {
  if (!url) return { src: null };
  const corte = url.search(/\/https?(%3A|:)/i);
  const original = url.includes('substackcdn.com/image/fetch/') && corte > -1
    ? decodeURIComponent(url.slice(corte + 1))
    : url;
  if (!/^https:\/\/substack-post-media\.s3\.amazonaws\.com\//.test(original)) return { src: url };
  return {
    src: `https://substackcdn.com/image/fetch/w_800,c_limit,f_auto,q_auto:good,fl_progressive:steep/${encodeURIComponent(original)}`,
    respaldo: original,
  };
}

export async function getSubstackLatestList(limit = 5): Promise<LatestItem[]> {
  try {
    const xml = await fetchXml(SUBSTACK_FEED);
    const parsed = parser.parse(xml);
    const items = asArray(parsed?.rss?.channel?.item);
    if (items.length === 0) return [];
    const result: LatestItem[] = [];
    for (const it of items.slice(0, limit) as any[]) {
      const pubDate = safeDate(it?.pubDate);
      if (!pubDate) continue;
      const link = typeof it?.link === 'string' ? it.link : null;
      if (!link) continue;
      const html =
        (typeof it?.['content:encoded'] === 'string' ? it['content:encoded'] : '') ||
        (typeof it?.description === 'string' ? it.description : '');
      const imagen = imagenSubstack(
        (typeof it?.enclosure?.['@_url'] === 'string' ? it.enclosure['@_url'] : null) ??
          extractFirstImg(html),
      );
      result.push({
        platform: 'substack',
        title: sinCortarCifras(String(it?.title ?? '').trim()),
        url: link,
        pubDate,
        thumbnail: imagen.src,
        thumbnailRespaldo: imagen.respaldo,
        author: typeof it?.['dc:creator'] === 'string' ? it['dc:creator'] : undefined,
      });
    }
    return result;
  } catch (err) {
    console.warn('[feeds] substack list fallback:', err);
    return [];
  }
}

export async function getSpotifyLatestList(limit = 5): Promise<LatestItem[]> {
  try {
    const xml = await fetchXml(SPOTIFY_FEED);
    const parsed = parser.parse(xml);
    const items = asArray(parsed?.rss?.channel?.item);
    if (items.length === 0) return [];
    const channelImg =
      typeof parsed?.rss?.channel?.['itunes:image']?.['@_href'] === 'string'
        ? parsed.rss.channel['itunes:image']['@_href']
        : null;
    const result: LatestItem[] = [];
    for (const it of items.slice(0, limit) as any[]) {
      const pubDate = safeDate(it?.pubDate);
      if (!pubDate) continue;
      const link = typeof it?.link === 'string' ? it.link : null;
      if (!link) continue;
      const thumb =
        (typeof it?.['itunes:image']?.['@_href'] === 'string'
          ? it['itunes:image']['@_href']
          : null) ?? channelImg;
      const duration =
        typeof it?.['itunes:duration'] === 'string' ? it['itunes:duration'] : undefined;
      result.push({
        platform: 'spotify',
        title: sinCortarCifras(cleanFeedTitle(String(it?.title ?? '').trim())),
        url: link,
        pubDate,
        thumbnail: thumb,
        durationLabel: duration,
      });
    }
    return result;
  } catch (err) {
    console.warn('[feeds] spotify list fallback:', err);
    return [];
  }
}
