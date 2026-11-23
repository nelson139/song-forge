"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import type { Recommendation, SimilarPayload } from "@/lib/music";

gsap.registerPlugin(ScrollToPlugin);

const STATUS = [
  "Analyzing song…",
  "Searching through tracks…",
  "Dissecting DNA…",
  "Retrieving samples…",
];

// The one audio element allowed to play right now. Any card that starts playing
// pauses this one first.
let currentAudio: HTMLAudioElement | null = null;

function VaultLoader() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  // Cycle the status text
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STATUS.length), 1500);
    return () => clearInterval(t);
  }, []);

  // GSAP animations — scoped, and auto-cleaned up on unmount
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Vinyl spin: outer dashed ring + grooves, continuous, linear
      gsap.to(".vinyl-spin", {
        rotation: 360,
        transformOrigin: "50% 50%",
        duration: 3.5,
        ease: "none",
        repeat: -1,
      });

      // Center label breathes in and out
      gsap.to(".vinyl-label", {
        scale: 1.18,
        transformOrigin: "50% 50%",
        duration: 0.85,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // Skeleton-style dot pulse with a stagger
      gsap.to(".vault-dot", {
        scale: 1.5,
        opacity: 0.35,
        duration: 0.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.15,
      });
    }, scopeRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={scopeRef}
      className="pointer-events-none absolute inset-0 grid place-items-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 120 120" className="size-24" aria-hidden="true">
          {/* Spinning dashed outer ring */}
          <g className="vinyl-spin">
            <circle
              cx="60"
              cy="60"
              r="56"
              fill="none"
              stroke="#D4A24C"
              strokeWidth="1.5"
              strokeDasharray="2 5"
            />
          </g>

          {/* Record body */}
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="#1A1210"
            stroke="#D4A24C"
            strokeWidth="2.5"
          />

          {/* Groove rings (spin with record) */}
          <g
            className="vinyl-spin"
            fill="none"
            stroke="#C17D4A"
            strokeDasharray="1 3"
          >
            <circle cx="60" cy="60" r="34" opacity="0.6" />
            <circle cx="60" cy="60" r="24" opacity="0.6" />
          </g>

          {/* Pulsing center label */}
          <circle
            className="vinyl-label"
            cx="60"
            cy="60"
            r="14"
            fill="#7A1F1F"
            stroke="#D4A24C"
            strokeWidth="1"
          />

          {/* Center hole */}
          <circle cx="60" cy="60" r="2.5" fill="#F5E9D3" />
        </svg>

        {/* Pulsing dots */}
        <div className="mt-2.5 flex gap-1.5">
          <span className="vault-dot h-1 w-1 rounded-full bg-[#D4A24C]" />
          <span className="vault-dot h-1 w-1 rounded-full bg-[#D4A24C]" />
          <span className="vault-dot h-1 w-1 rounded-full bg-[#D4A24C]" />
        </div>

        <p className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-[#D4A24C]">
          {STATUS[i]}
        </p>
      </div>
    </div>
  );
}

function Card({ r, index }: { r: Recommendation; index: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // Stop and release on unmount (e.g. a new search replaces the results)
  useEffect(
    () => () => {
      const a = audioRef.current;
      a?.pause();
      if (currentAudio === a) currentAudio = null;
    },
    [],
  );

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  }

  return (
    <li
      className="flex flex-col items-center overflow-hidden"
      style={{ ["--i" as string]: index + 2 }}
    >
      {/* Hidden audio element: one per card */}
      <audio
        ref={audioRef}
        src={r.previewUrl}
        preload="none"
        hidden
        onPlay={() => {
          const a = audioRef.current;
          if (currentAudio && currentAudio !== a) currentAudio.pause(); // enforce one-at-a-time
          currentAudio = a;
          setPlaying(true);
          setFailed(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <div className="relative flex flex-col justify-center items-center size-40 bg-[url('../public/song-frame.svg')] bg-cover bg-no-repeat bg-center">
        {r.art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.art}
            alt=""
            loading="lazy"
            className="size-[65%] object-cover border-2 rounded sm"
          />
        )}
        <span className="absolute top-6 left-4 px-2 py-1 rounded-lg text-xs backdrop-blur border">
          #{index + 1} pick
        </span>
        <button
          onClick={toggle}
          aria-pressed={playing}
          aria-label={`${playing ? "Pause" : "Play"} preview of ${r.title}`}
          className="absolute mt-4 items-center justify-center rounded-full text-5xl text-[#FFDFA3] [-webkit-text-stroke:1.5px_black] hover:cursor-pointer"
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
      <div className="w-40">
        <div className="flex flex-col items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/title-frame.svg"
            alt=""
            className="size-full object-fill pointer-events-none"
          />
          <div className="absolute w-[10%] truncate text-center">
            <h1 className="text-xs font-bold" title={r.title}>
              {r.title}
            </h1>
            <p className="text-[0.7rem]">By {r.artist}</p>
          </div>
        </div>
        {r.reason && (
          <p className="mt-2 text-center text-white text-[0.6rem] italic">
            {r.reason}
          </p>
        )}
        <div className="flex justify-center mt-2">
          <a
            href={r.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[0.6rem] text-white text-center underline underline-offset-4"
          >
            Open in Spotify ↗
          </a>
          {failed && <span role="alert">Preview failed to load</span>}
        </div>
      </div>
    </li>
  );
}

function SkeletonCard() {
  return (
    <li className="flex flex-col items-center overflow-hidden">
      <div className="relative flex flex-col justify-center items-center size-40 bg-[url('../public/song-frame.svg')] bg-cover bg-no-repeat bg-center" />
      <div className="w-40">
        <div className="flex flex-col items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/title-frame.svg"
            alt=""
            className="size-full object-fill pointer-events-none"
          />
          <div className="absolute w-[10%] truncate text-center">
            <h1 className="text-xs font-bold">&nbsp;</h1>
            <p className="text-[0.7rem]">&nbsp;</p>
          </div>
        </div>
        <p className="mt-2 text-center text-white text-[0.6rem] italic">
          &nbsp;
        </p>
        <div className="flex justify-center mt-2">
          <span className="text-[0.6rem] text-white">&nbsp;</span>
        </div>
      </div>
    </li>
  );
}

const Bottom = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimilarPayload | null>(null);

  const scrollToSection = (id: string, duration = 2) => {
  const element = document.getElementById(id);
  if (!element) return;

  gsap.to(window, {
    duration,
    scrollTo: { y: element, autoKill: true },
    ease: "power2.inOut",
  });
};

  useEffect(() => {
    if (!data) return;

    const timer = setTimeout(() => {
      scrollToSection('results-section', 1)
    }, 400);

    return () => clearTimeout(timer);
  }, [data]);

  async function run(link: string) {
    currentAudio?.pause();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "The job went sideways. Try again.");
      setData(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The job went sideways. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const statusLine = data
    ? `${data.recommendations.length} playable tracks, closest first`
    : loading
      ? "Finding similar tracks…"
      : 'Start by pasting a Spotify track link above and clicking "Find similar tracks"';

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-14 sm:px-8">
      <div className="w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(url);
            scrollToSection('pipes-section', 0.5)
          }}
          className="w-full"
          id="input-section"
        >
          <div className="flex flex-col items-center justify-center w-full h-132 bg-[url('../public/search-frame.svg')] bg-contain bg-no-repeat bg-center">
            <label htmlFor="link" className="w-[75%] text-2xl text-gray-400">
              Spotify Track Link:
            </label>
            <input
              id="link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              type="text"
              placeholder="https://open.spotify.com/track/..."
              className="w-[75%] h-32 mt-2 px-8 rem bg-[url('../public/input-text-frame.svg')] bg-contain bg-no-repeat bg-center text-center text-xl outline-none"
            />
            <button
              disabled={loading || !url.trim()}
              className="w-[75%] h-28 mt-4 rem bg-[url('../public/long-yellow-button.svg')] bg-contain bg-no-repeat bg-center text-center text-xl text-gray-800 outline-none hover:cursor-pointer"
            >
              {loading ? "Searching..." : "Find similar tracks"}
            </button>
          </div>
        </form>
        <div id="pipes-section" className="relative flex justify-center w-full min-h-[90vh] mt-[-92] bg-[url('../public/pipes.svg')] bg-contain bg-no-repeat bg-center">
          {loading && <VaultLoader/>}

          {error && (
            <div
              role="alert"
              className="panel mx-auto mt-10 max-w-2xl p-5 text-sm"
            >
              <p className="display text-lg font-bold">Search failed</p>
              <p className="mt-1">{error}</p>
            </div>
          )}
          
          {data && (
            <section
              className="size-36 mt-63 border rounded-md"
              aria-label="Target track"
            >
              {data.seed.art ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.seed.art}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover shadow-xl"
                />
              ) : (
                <div className="aspect-square w-full rounded-lg" />
              )}
            </section>
          )}
        </div>
        <div id="results-section" className="relative flex flex-col items-center w-full min-h-[90vh] mt-[-62] bg-[url('../public/results.svg')] bg-contain bg-no-repeat bg-center">
          <h1 className="text-xl mt-17 font-bold text-white min-h-7">
            {data?.seed.title ?? "\u00A0"}
          </h1>
          <p className="text-xs text-white min-h-4">
            {data?.seed.artist ?? "\u00A0"}
          </p>

          <section className="mt-16">
            <div className="flex justify-center min-h-7">
              <span className="text-lg text-white text-center">
                {statusLine}
              </span>
            </div>

            <ul className="inline-flex gap-x-2 mt-4">
              {data
                ? data.recommendations.map((r, i) => (
                    <Card key={r.id} r={r} index={i} />
                  ))
                : Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Bottom;