import { NextResponse } from "next/server";
import { parseTrackId, getSeed, oembed, findPlayable, close, type Recommendation, type SimilarPayload } from "@/lib/music";
import { suggestSimilar, aiConfigured, AiError } from "@/lib/ai";

export const maxDuration = 30;
const MAX_RESULTS = 5;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({ url: "" }));
  const id = typeof url === "string" ? parseTrackId(url) : null;
  if (!id) return fail("That doesn't look like a Spotify track link. Try copying it from the Share menu.", 400);
  if (!aiConfigured()) return fail("Server is missing AI_API_KEY (see .env.local.example).", 500);

  // 1) Identify the seed track
  const [seedMeta, embed] = await Promise.all([getSeed(id), oembed(id)]);
  const seed = seedMeta ?? (embed.title ? { title: embed.title, artist: "", features: null } : null);
  if (!seed) return fail("We couldn't identify that track. Check the link and try again.", 404);

  // 2) Ask the AI for sonically similar songs
  let suggestions;
  try {
    suggestions = await suggestSimilar(seed);
  } catch (e) {
    console.error("AI error", e);
    if (e instanceof AiError && e.status === 429) return fail("Our AI crook is catching their breath (free-tier rate limit). Try again in a few seconds.", 429);
    if (e instanceof AiError && (e.status === 401 || e.status === 403)) return fail("The AI API key was rejected. Check AI_API_KEY.", 500);
    const generic = "Our AI crook went quiet. Try again in a moment.";
    const detail = e instanceof Error ? e.message : String(e);
    return fail(process.env.NODE_ENV === "production" ? generic : `${generic} [dev detail: ${detail}]`, 502);
  }
  if (!suggestions.recognized) {
    return fail("The AI doesn't recognize this track well enough to match it. Try a more well-known song.", 404);
  }

  // 3) Resolve each suggestion to a real, playable preview (this also filters out invented songs)
  const resolved = await Promise.all(suggestions.tracks.map((s) => findPlayable(s.title, s.artist)));

  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();
  resolved.forEach((p, i) => {
    if (!p) return;
    const key = `${p.title}|${p.artist}`.toLowerCase();
    const isSeed = close(p.title, seed.title) && (!seed.artist || close(p.artist, seed.artist));
    if (seen.has(key) || isSeed || recommendations.length >= MAX_RESULTS) return;
    seen.add(key);
    recommendations.push({
      id: p.id, title: p.title, artist: p.artist, art: p.art, previewUrl: p.previewUrl,
      reason: suggestions.tracks[i].reason,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${p.title} ${p.artist}`)}`,
    });
  });

  if (!recommendations.length) return fail("The AI had ideas, but none had a playable preview. Try another track.", 404);

  const payload: SimilarPayload = {
    seed: { id, title: seed.title, artist: seed.artist, art: embed.art, spotifyUrl: `https://open.spotify.com/track/${id}`, features: seed.features },
    recommendations,
  };
  return NextResponse.json(payload);
}