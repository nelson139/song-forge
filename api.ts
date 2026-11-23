/**
 * Feasibility spike: Spotify track ID -> audio features -> similar tracks -> verified playable preview.
 * Run:  npx tsx spike.ts 0VjIjW4GlUZAMYd2vXMi3b
 * Needs Node 18+ (built-in fetch). No API keys.
 * Exit code 0 = at least one recommended track has a verified playable preview. 1 = core idea dead.
 */

const RB = "https://api.reccobeats.com/v1";
const id = process.argv[2];
if (!id || !/^[A-Za-z0-9]{22}$/.test(id)) {
  console.error("Usage: npx tsx spike.ts <22-char Spotify track ID>");
  process.exit(2);
}

type RbTrack = { id: string; trackTitle: string; artists?: { name: string }[]; isrc?: string };
const artistOf = (t: RbTrack) => t.artists?.[0]?.name ?? "";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}\n   ${text.slice(0, 200)}`);
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON response from ${url}\n   ${text.slice(0, 200)}`); }
}

// ---------- Step 3 helpers: resolve + verify a preview ----------

type Preview = { url: string; via: string; kind: "mp3" | "m4a" };

async function findPreview(t: RbTrack): Promise<Preview | null> {
  const clean = (s: string) => s.replace(/["]/g, "");

  // 1) Deezer by ISRC (exact match when ReccoBeats gives us one)
  if (t.isrc) {
    const d = await getJson(`https://api.deezer.com/track/isrc:${t.isrc}`).catch(() => null);
    if (d?.preview) return { url: d.preview, via: "deezer (isrc)", kind: "mp3" };
  }
  // 2) Deezer text search
  const q = encodeURIComponent(`artist:"${clean(artistOf(t))}" track:"${clean(t.trackTitle)}"`);
  const dz = await getJson(`https://api.deezer.com/search?q=${q}&limit=1`).catch(() => null);
  if (dz?.data?.[0]?.preview) return { url: dz.data[0].preview, via: "deezer (search)", kind: "mp3" };

  // 3) iTunes fallback (30s AAC .m4a, not MP3, but plays in every browser)
  const term = encodeURIComponent(`${t.trackTitle} ${artistOf(t)}`);
  const it = await getJson(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`).catch(() => null);
  if (it?.results?.[0]?.previewUrl) return { url: it.results[0].previewUrl, via: "itunes (search)", kind: "m4a" };

  return null;
}

/** Actually downloads the first 2 KB and checks the bytes look like real audio. */
async function verifyAudio(p: Preview): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(p.url, { headers: { Range: "bytes=0-2047" }, redirect: "follow" });
    if (res.status !== 200 && res.status !== 206) return { ok: false, detail: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    const b = new Uint8Array(await res.arrayBuffer());
    if (b.length < 64) return { ok: false, detail: `only ${b.length} bytes returned` };

    const isMp3 = (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0); // ID3 tag or frame sync
    const isMp4 = String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp";
    const ok = p.kind === "mp3" ? isMp3 : isMp4;
    return { ok, detail: `HTTP ${res.status}, content-type "${type}", magic bytes ${ok ? "OK" : "NOT audio"}` };
  } catch (e) {
    return { ok: false, detail: `fetch error: ${(e as Error).message}` };
  }
}

// ---------- Main ----------

async function main() {
  console.log(`\nSeed Spotify ID: ${id}\n`);

  // Step 1: audio features
  console.log("STEP 1: audio features");
  const seedRes = await getJson(`${RB}/track?ids=${id}`);
  const seed: RbTrack | undefined = seedRes?.content?.[0];
  if (!seed) throw new Error("ReccoBeats has no record of this track, so there are no features and no seed for recommendations.");
  console.log(`  track: ${seed.trackTitle} by ${artistOf(seed)} (ReccoBeats id ${seed.id})`);
  const features = await getJson(`${RB}/track/${seed.id}/audio-features`);
  const keys = ["acousticness", "danceability", "energy", "instrumentalness", "liveness", "speechiness", "valence", "tempo", "loudness"];
  console.log("  " + keys.filter((k) => typeof features[k] === "number").map((k) => `${k}=${features[k]}`).join("  "));
  console.log("  PASS\n");

  // Step 2: similar tracks
  console.log("STEP 2: similar tracks");
  const recRes = await getJson(`${RB}/track/recommendation?seeds=${id}&size=8`);
  const recs: RbTrack[] = (recRes?.content ?? []).filter((r: RbTrack) => r.id !== seed.id);
  if (!recs.length) throw new Error(`No recommendations returned. Raw: ${JSON.stringify(recRes).slice(0, 300)}`);
  recs.slice(0, 5).forEach((r, i) => console.log(`  ${i + 1}. ${r.trackTitle} (${artistOf(r)}) isrc=${r.isrc ?? "n/a"}`));
  console.log(`  ${recs.length >= 3 ? "PASS" : "WEAK"} (${recs.length} returned)\n`);

  // Step 3: playable preview
  console.log("STEP 3: playable preview");
  let playable = 0;
  for (const r of recs) {
    const p = await findPreview(r);
    if (!p) { console.log(`  x ${r.trackTitle}: no preview found`); continue; }
    const v = await verifyAudio(p);
    console.log(`  ${v.ok ? "OK" : "x "} ${r.trackTitle}: ${p.via}, ${p.kind}, ${v.detail}`);
    if (v.ok) { playable++; console.log(`     ${p.url}`); }
  }

  console.log(`\nRESULT: ${playable}/${recs.length} recommended tracks have a verified playable preview.`);
  if (playable === 0) { console.log("FAIL: core idea is dead with these sources."); process.exit(1); }
  console.log("PASS: core idea is viable. Open a printed URL in a browser to confirm by ear.");
}

main().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });