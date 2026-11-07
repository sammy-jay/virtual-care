"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Consent = { essential: true; analytics: boolean; preferences: boolean };
const COOKIE = "vc_consent";

function read(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.split("=")[1]));
  } catch {
    return null;
  }
}
function write(c: Consent) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(c))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Board 02.7 — first-visit banner and the manage-preferences dialog. */
export function CookieBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"hidden" | "banner" | "manage">("hidden");
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(true);

  // The consent cookie is read in the browser after hydration so the server render stays cache-friendly.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const existing = read();
    if (params.get("cookies") === "manage") {
      if (existing) {
        setAnalytics(existing.analytics);
        setPreferences(existing.preferences);
      }
      setState("manage");
    } else if (!existing) setState("banner");
  }, [params]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = (c: Omit<Consent, "essential">) => {
    write({ essential: true, ...c });
    setState("hidden");
    if (params.get("cookies")) router.replace(window.location.pathname, { scroll: false });
  };

  if (state === "hidden") return null;

  if (state === "banner")
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-8 sm:bottom-8" role="region" aria-label="Cookie consent">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-3xl border border-[#E1ECE6] bg-white px-5 py-5 shadow-[0_30px_60px_-20px_rgba(12,17,27,.35)] sm:px-7 sm:py-6">
          <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-[15px] bg-gold-tint text-2xl">
            🍪
          </span>
          <div className="min-w-0 flex-[1_1_380px]">
            <div className="text-[17px] font-bold">We use cookies to keep you signed in and the site working.</div>
            <div className="mt-1 text-[14.5px] text-[#4A5262]">
              With your permission we also measure how the site is used. See our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => setState("manage")} className="rounded-full border-[1.5px] border-ink px-5 py-[13px] text-[14.5px] font-semibold">
              Manage
            </button>
            <button onClick={() => save({ analytics: false, preferences: false })} className="rounded-full border-[1.5px] border-ink px-5 py-[13px] text-[14.5px] font-semibold">
              Essential only
            </button>
            <button onClick={() => save({ analytics: true, preferences: true })} className="rounded-full bg-forest px-[22px] py-[13px] text-[14.5px] font-bold text-white">
              Accept all
            </button>
          </div>
        </div>
      </div>
    );

  const Switch = ({ on, set, label, disabled }: { on: boolean; set?: (v: boolean) => void; label: string; disabled?: boolean }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => set?.(!on)}
      className={`relative h-7 w-[50px] flex-none rounded-full transition-colors ${on ? "bg-forest" : "bg-field"} ${disabled ? "opacity-60" : ""}`}
    >
      <span className={`absolute top-[3px] size-[22px] rounded-full bg-white transition-all ${on ? "left-[25px]" : "left-[3px]"}`} />
    </button>
  );

  const rows: [string, string, boolean, ((v: boolean) => void) | undefined][] = [
    ["Essential", "Sign-in, security and booking. Always on.", true, undefined],
    ["Analytics", "Helps us see which pages are useful.", analytics, setAnalytics],
    ["Preferences", "Remembers your time zone and language.", preferences, setPreferences],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-6" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
      <div className="w-[560px] max-w-full rounded-[28px] bg-white p-[34px] shadow-[0_40px_80px_-30px_rgba(12,17,27,.5)]">
        <h3 id="cookie-title" className="font-display text-[32px] font-medium">
          Cookie preferences
        </h3>
        <p className="mb-2.5 mt-2 text-[15px] text-[#4A5262]">Choose what we may store. You can change this any time from the footer.</p>
        {rows.map(([title, body, on, set]) => (
          <div key={title} className="flex items-center justify-between gap-5 border-b border-[#E6E8EC] py-[18px]">
            <div>
              <div className="font-bold">{title}</div>
              <div className="text-sm text-[#5A6272]">{body}</div>
            </div>
            <Switch on={on} set={set} label={title} disabled={!set} />
          </div>
        ))}
        <div className="mt-[26px] flex flex-wrap justify-end gap-2.5">
          <button onClick={() => save({ analytics: false, preferences: false })} className="rounded-full border-[1.5px] border-ink px-[22px] py-[13px] font-semibold">
            Reject optional
          </button>
          <button onClick={() => save({ analytics, preferences })} className="rounded-full bg-forest px-6 py-[13px] font-bold text-white">
            Save choices
          </button>
        </div>
      </div>
    </div>
  );
}
