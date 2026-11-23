import type { Features } from "./music";

// Provider-agnostic: any OpenAI-compatible chat endpoint works (Groq, Gemini, OpenRouter...).
// Defaults to Groq's free tier. No SDK needed.
const BASE = () => (process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
const KEY = () => process.env.AI_API_KEY ?? process.env.GROQ_API_KEY;
const MODEL = () => process.env.AI_MODEL ?? "openai/gpt-oss-120b";

export const aiConfigured = () => !!KEY();

export class AiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export type Suggestion = { title: string; artist: string; reason: string };
type Result = { recognized: boolean; tracks: Suggestion[] };

const SYSTEM = `You are an expert music curator with deep knowledge of production, arrangement and genre history.
Given a song, you recommend other songs that SOUND like it: similar production style, tempo and groove, instrumentation, vocal character, mood and era. Sonic similarity matters, not popularity or shared genre labels.

Rules:
- Only recommend real, released songs you are highly confident exist, with the exact title and primary artist.
- Never recommend the input song itself, and never more than one song per artist. Avoid the input song's artist.
- Rank from closest sonic match to loosest.
- If you do not genuinely recognize the input song, set "recognized" to false and return an empty list. Do not guess.
- "reason" is one short phrase (max 14 words) naming the specific sonic traits shared.
- Respond with ONLY a JSON object, no markdown, no commentary:
{"recognized": true, "tracks": [{"title": "...", "artist": "...", "reason": "..."}]}`;

function describe(f: Features | null) {
  if (!f) return "";
  const pct = (n: number) => Math.round(n * 100);
  return `\nMeasured audio profile (0-100): energy ${pct(f.energy)}, danceability ${pct(f.danceability)}, mood/valence ${pct(f.valence)}, acousticness ${pct(f.acousticness)}, instrumentalness ${pct(f.instrumentalness)}, speechiness ${pct(f.speechiness)}.`;
}

// Tiny in-memory cache so repeat searches don't burn free-tier quota (per warm server instance).
const cache = new Map<string, { at: number; value: Result }>();
const TTL = 60 * 60 * 1000;

export async function suggestSimilar(
  seed: { title: string; artist: string; features: Features | null },
  count = 12
): Promise<Result> {
  const key = `${seed.title}|${seed.artist}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const body = {
    model: MODEL(),
    temperature: 0.4,
    max_tokens: 4000, // reasoning models spend part of this budget thinking
    ...(MODEL().includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Input song: "${seed.title}"${seed.artist ? ` by ${seed.artist}` : ""}.${describe(seed.features)}\nGive me ${count} songs that sound most like it.` },
    ],
  };
  const call = (extra: object) =>
    fetch(`${BASE()}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY()}` },
      body: JSON.stringify({ ...body, ...extra }),
      cache: "no-store",
    });

  let res = await call({ response_format: { type: "json_object" } });
  if (res.status === 400) res = await call({}); // some models/providers don't support JSON mode
  if (!res.ok) throw new AiError((await res.text()).slice(0, 200), res.status);

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new AiError("AI returned an unreadable answer", 502);

  let parsed: { recognized?: boolean; tracks?: Partial<Suggestion>[] };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AiError(`AI returned invalid JSON: ${text.slice(0, 120)}`, 502);
  }
  const tracks = (parsed.tracks ?? []).flatMap((t) =>
    typeof t.title === "string" && typeof t.artist === "string"
      ? [{ title: t.title, artist: t.artist, reason: typeof t.reason === "string" ? t.reason : "" }]
      : []
  );
  const value = { recognized: parsed.recognized !== false && tracks.length > 0, tracks };
  if (value.recognized) cache.set(key, { at: Date.now(), value });
  return value;
}