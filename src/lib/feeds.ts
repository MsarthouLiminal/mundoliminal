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

function cleanYouTubeTitle(raw: string): string {
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

export async function getYouTubeLatest(): Promise<LatestItem | null> {
  try {
    const xml = await fetchXml(YOUTUBE_FEED);
    const parsed = parser.parse(xml);
    const entries = asArray(parsed?.feed?.entry);
    const filtered = entries.filter((e: any) =>
      typeof e?.title === 'string' && e.title.includes(' | T1 |'),
    );
    if (filtered.length === 0) return null;
    filtered.sort((a: any, b: any) => {
      const da = safeDate(a.published)?.getTime() ?? 0;
      const db = safeDate(b.published)?.getTime() ?? 0;
      return db - da;
    });
    const e = filtered[0];
    const pubDate = safeDate(e?.published);
    if (!pubDate) return null;
    const linkArr = asArray(e?.link);
    const link =
      linkArr.find((l: any) => l?.['@_rel'] === 'alternate')?.['@_href'] ??
      linkArr[0]?.['@_href'] ??
      null;
    if (typeof link !== 'string') return null;
    const thumb = e?.['media:group']?.['media:thumbnail']?.['@_url']
      ?? e?.['media:thumbnail']?.['@_url']
      ?? null;
    return {
      platform: 'youtube',
      title: cleanYouTubeTitle(String(e.title)),
      url: link,
      pubDate,
      thumbnail: typeof thumb === 'string' ? thumb : null,
      author: typeof e?.author?.name === 'string' ? e.author.name : undefined,
    };
  } catch (err) {
    console.warn('[feeds] youtube fallback:', err);
    return null;
  }
}

export async function getSubstackLatest(): Promise<LatestItem | null> {
  try {
    const xml = await fetchXml(SUBSTACK_FEED);
    const parsed = parser.parse(xml);
    const items = asArray(parsed?.rss?.channel?.item);
    if (items.length === 0) return null;
    const it: any = items[0];
    const pubDate = safeDate(it?.pubDate);
    if (!pubDate) return null;
    const link = typeof it?.link === 'string' ? it.link : null;
    if (!link) return null;
    const html =
      (typeof it?.['content:encoded'] === 'string' ? it['content:encoded'] : '') ||
      (typeof it?.description === 'string' ? it.description : '');
    const thumbnail =
      (typeof it?.enclosure?.['@_url'] === 'string' ? it.enclosure['@_url'] : null) ??
      extractFirstImg(html);
    return {
      platform: 'substack',
      title: String(it?.title ?? '').trim(),
      url: link,
      pubDate,
      thumbnail,
      author: typeof it?.['dc:creator'] === 'string' ? it['dc:creator'] : undefined,
    };
  } catch (err) {
    console.warn('[feeds] substack fallback:', err);
    return null;
  }
}

export async function getSpotifyLatest(): Promise<LatestItem | null> {
  try {
    const xml = await fetchXml(SPOTIFY_FEED);
    const parsed = parser.parse(xml);
    const items = asArray(parsed?.rss?.channel?.item);
    if (items.length === 0) return null;
    const it: any = items[0];
    const pubDate = safeDate(it?.pubDate);
    if (!pubDate) return null;
    const link = typeof it?.link === 'string' ? it.link : null;
    if (!link) return null;
    const thumb =
      (typeof it?.['itunes:image']?.['@_href'] === 'string'
        ? it['itunes:image']['@_href']
        : null) ??
      (typeof parsed?.rss?.channel?.['itunes:image']?.['@_href'] === 'string'
        ? parsed.rss.channel['itunes:image']['@_href']
        : null);
    const duration =
      typeof it?.['itunes:duration'] === 'string' ? it['itunes:duration'] : undefined;
    return {
      platform: 'spotify',
      title: String(it?.title ?? '').trim(),
      url: link,
      pubDate,
      thumbnail: thumb,
      durationLabel: duration,
    };
  } catch (err) {
    console.warn('[feeds] spotify fallback:', err);
    return null;
  }
}
