"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/format";
import { MARKETS, type Market } from "@/lib/market";
import { chooseSite } from "./site-toggle-action";

const SITES: Market[] = ["us", "ng"];

/**
 * The US / Nigeria switch: a pill with a thumb that slides to the site you tap, then the same page
 * loads on that site. "hero" is the compact one at the top of the homepage (flags with "US"/"NG");
 * "footer" spells the names out. Still a plain form underneath, so it works before JavaScript loads.
 */
export function SiteSwitch({ market, path, variant }: { market: Market; path: string; variant: "hero" | "footer" }) {
  // Slide the thumb as soon as a site is tapped; once that site has loaded, `market` takes over again.
  const [picked, setPicked] = useState<{ from: Market; to: Market } | null>(null);
  const shown = picked?.from === market ? picked.to : market;
  const hero = variant === "hero";

  const group = (
    <div
      role="group"
      aria-label={hero ? "Choose your site" : undefined}
      aria-labelledby={hero ? undefined : "site-switch-label"}
      className="relative inline-grid grid-cols-2 rounded-full border border-[#E1ECE6] bg-white p-[3px] shadow-[0_1px_2px_rgba(16,24,40,.05)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-forest shadow-[0_6px_14px_-6px_rgba(23,96,75,.7)] transition-transform duration-300 ease-[cubic-bezier(.3,.8,.3,1)] motion-reduce:transition-none"
        style={{ transform: shown === "ng" ? "translateX(100%)" : "none" }}
      />
      {SITES.map((m) => {
        const on = m === shown;
        return (
          <button
            key={m}
            name="site"
            value={m}
            aria-label={hero ? MARKETS[m].name : undefined}
            title={hero ? `${MARKETS[m].name} site` : undefined}
            aria-pressed={on}
            // Only the site you're already on is a no-op. (Never disable the button being tapped: the
            // browser would then drop its submit.)
            disabled={m === market}
            onClick={() => setPicked({ from: market, to: m })}
            className={cn(
              "relative flex items-center justify-center rounded-full font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-default",
              hero ? "h-7 gap-1.5 px-2.5 text-[12.5px] tracking-[.04em]" : "h-8 gap-2 px-3.5 text-[13px]",
              on ? "text-white" : "text-[#5A6272] hover:text-forest",
            )}
          >
            <Flag market={m} className={cn(hero ? "size-[18px]" : "size-4", on ? "ring-white/60" : "ring-black/10")} />
            <span>{hero ? MARKETS[m].short : MARKETS[m].name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <form action={chooseSite} className="flex items-center gap-2.5">
      <input type="hidden" name="path" value={path} />
      {!hero && (
        <span id="site-switch-label" className="flex items-center gap-1.5 font-semibold text-sage-ink">
          <Icon name="globe" size={16} />
          Site
        </span>
      )}
      {group}
    </form>
  );
}

const STRIPE = 24 / 13;
const US_STRIPES = Array.from({ length: 7 }, (_, i) => `M0 ${(i * 2 * STRIPE).toFixed(2)}h24v${STRIPE.toFixed(2)}H0z`).join("");
const US_STARS = [2.4, 6.4, 10.4].flatMap((y, row) => (row % 2 ? [3.4, 6.6, 9.8] : [1.8, 5, 8.2, 11.4]).map((x) => [x, y] as const));

/** A round flag, drawn inline so it looks the same on every device (Windows has no flag emoji). */
function Flag({ market, className }: { market: Market; className?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-full ring-1 transition-shadow duration-300", className)}>
      <svg viewBox="0 0 24 24" className="block size-full" aria-hidden>
        <rect width="24" height="24" fill="#fff" />
        {market === "us" ? (
          <>
            <path d={US_STRIPES} fill="#B22234" />
            <rect width="12.4" height={(7 * STRIPE).toFixed(2)} fill="#3C3B6E" />
            {US_STARS.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r=".75" fill="#fff" />
            ))}
          </>
        ) : (
          <path d="M0 0h8v24H0zM16 0h8v24h-8z" fill="#008751" />
        )}
      </svg>
    </span>
  );
}
