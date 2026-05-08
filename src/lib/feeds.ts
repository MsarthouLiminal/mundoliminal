import { XMLParser } from 'fast-xml-parser';

export type Platform = 'youtube' | 'substack' | 'spotify';

export interface LatestItem {
  platform: Platform;
  title: string;
  url: string;
  pubDate: Date;
  thumbnail: string | null;
  author?: string;
  durationLabel?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; LiminalBot/1.0; +https://mundoliminal.com)';

const FEED_TIMEOUT_MS = 8_000;

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
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
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
      typeof e?.title === 'string' && e.title.includes(' | T1 |'),
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
        title: cleanFeedTitle(String(e.title)),
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
      const thumbnail =
        (typeof it?.enclosure?.['@_url'] === 'string' ? it.enclosure['@_url'] : null) ??
        extractFirstImg(html);
      result.push({
        platform: 'substack',
        title: String(it?.title ?? '').trim(),
        url: link,
        pubDate,
        thumbnail,
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
        title: cleanFeedTitle(String(it?.title ?? '').trim()),
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
