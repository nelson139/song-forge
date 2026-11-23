// Seed lookup + preview resolution. Keyless: ReccoBeats (seed metadata/features only),
// Spotify oEmbed (cover art), Deezer / iTunes (playable 30s previews).

const RB = "https://api.reccobeats.com/v1";

export type Features = {
  acousticness: number; danceability: number; energy: number; instrumentalness: number;
  liveness: number; speechiness: number; valence: number;
};
const FEATURE_KEYS = ["acousticness", "danceability", "energy", "instrumentalness", "liveness", "speechiness", "valence"] as const;

export type Recommendation = {
  id: string;
  title: string;
  artist: string;
  art: string | null;
  previewUrl: string;
  reason: string; // AI's one-line explanation of why it sounds similar
  spotifyUrl: string;
};
export type SimilarPayload = {
  seed: { id: string; title: string; artist: string; art: string | null; spotifyUrl: string; features: Features | null };
  recommendations: Recommendation[];
};

export function parseTrackId(input: string): string | null {
  const s = input.trim();
  const uri = s.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uri) return uri[1];
  try {
    const url = new URL(s);
    if (!url.hostname.endsWith("spotify.com")) return null;
    return url.pathname.match(/\/track\/([A-Za-z0-9]{22})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

// revalidate = 0 means never cache (required for signed, expiring preview URLs)
async function getJson<T>(url: string, revalidate = 3600): Promise<T | null> {
  try {
    const init: RequestInit & { next?: { revalidate: number } } =
      revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } };
    const res = await fetch(url, { ...init, headers: { Accept: "application/json" } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

// ---------- Seed ----------

type RbTrack = { id: string; trackTitle: string; artists?: { name: string }[] };

async function getFeatures(reccoId: string): Promise<Features | null> {
  const d = await getJson<Record<string, unknown>>(`${RB}/track/${reccoId}/audio-features`);
  if (!d) return null;
  const out = {} as Features;
  for (const k of FEATURE_KEYS) {
    if (typeof d[k] !== "number") return null;
    out[k] = d[k] as number;
  }
  return out;
}

/** Best-effort fallback: read title/artist from the public Spotify track page's meta tags. */
async function scrapeSeed(id: string): Promise<{ title: string; artist: string } | null> {
  try {
    const res = await fetch(`https://open.spotify.com/track/${id}`, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const html = await res.text();
    const meta = (p: string) => html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`))?.[1];
    const title = meta("og:title");
    const artist = meta("og:description")?.split(" · ")[0];
    return title ? { title, artist: artist ?? "" } : null;
  } catch {
    return null;
  }
}

export async function oembed(spotifyId: string): Promise<{ art: string | null; title: string | null }> {
  const d = await getJson<{ thumbnail_url?: string; title?: string }>(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${spotifyId}`)}`, 86400
  );
  return { art: d?.thumbnail_url ?? null, title: d?.title ?? null };
}

export async function getSeed(id: string): Promise<{ title: string; artist: string; features: Features | null } | null> {
  const rb = (await getJson<{ content?: RbTrack[] }>(`${RB}/track?ids=${id}`))?.content?.[0];
  if (rb) {
    return { title: rb.trackTitle, artist: rb.artists?.map((a) => a.name).join(", ") ?? "", features: await getFeatures(rb.id) };
  }
  const page = await scrapeSeed(id);
  return page ? { ...page, features: null } : null;
}

// ---------- Resolving an AI suggestion to a playable preview ----------

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, "").replace(/\b(feat|ft)\b.*$/, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Loose equality so "Song - Remastered" matches "Song", but unrelated songs don't. */
export const close = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

export type Playable = { id: string; title: string; artist: string; previewUrl: string; art: string | null };

type DzItem = { id: number; title: string; preview?: string; artist?: { name: string }; album?: { cover_big?: string } };
type ItItem = { trackId: number; trackName: string; artistName: string; previewUrl?: string; artworkUrl100?: string };

/**
 * Finds a real, playable track matching the AI's suggestion. Returns null if nothing matches,
 * which also filters out songs the AI made up.
 */
export async function findPlayable(title: string, artist: string): Promise<Playable | null> {
  const clean = (s: string) => s.replace(/["]/g, "");
  const queries = [`artist:"${clean(artist)}" track:"${clean(title)}"`, `${clean(title)} ${clean(artist)}`];

  for (const q of queries) {
    const d = await getJson<{ data?: DzItem[] }>(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`, 0);
    for (const h of d?.data ?? []) {
      if (h.preview && close(h.title, title) && close(h.artist?.name ?? "", artist)) {
        return { id: `dz-${h.id}`, title: h.title, artist: h.artist?.name ?? artist, previewUrl: h.preview, art: h.album?.cover_big ?? null };
      }
    }
  }

  const it = await getJson<{ results?: ItItem[] }>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&limit=5`, 0
  );
  for (const r of it?.results ?? []) {
    if (r.previewUrl && close(r.trackName, title) && close(r.artistName, artist)) {
      return { id: `it-${r.trackId}`, title: r.trackName, artist: r.artistName, previewUrl: r.previewUrl, art: r.artworkUrl100?.replace("100x100", "400x400") ?? null };
    }
  }
  return null;
}