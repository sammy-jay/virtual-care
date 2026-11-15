"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { Badges } from "@/lib/badges";

/** Which live count a nav item shows. "inbox" is messages + inquiries (doctor mobile tab). */
export type BadgeKey = "messages" | "inquiries" | "notifications" | "inbox";

const POLL_MS = 15_000;
const Ctx = createContext<Badges | null>(null);

export function badgeValue(b: Badges | null, key: BadgeKey | undefined): number | undefined {
  if (!b || !key) return undefined;
  return key === "inbox" ? b.messages + b.inquiries : b[key];
}

export const useBadges = () => useContext(Ctx);

/**
 * Keeps badge counts fresh: polls /api/badges every 15 s while the tab is visible, and right away
 * on navigation and when the tab regains focus (layouts don't re-render on client navigation, so
 * server-rendered counts would otherwise go stale). When a count changes, the current page is
 * refreshed so lists and stats on it match the badges.
 */
export function LiveBadgesProvider({ initial, children }: { initial: Badges; children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [badges, setBadges] = useState(initial);
  // Adopt fresh server values when the layout re-renders (derived during render, not in an effect).
  const [seed, setSeed] = useState(initial);
  if (seed !== initial && JSON.stringify(seed) !== JSON.stringify(initial)) {
    setSeed(initial);
    setBadges(initial);
  }
  const latest = useRef(badges);
  useEffect(() => {
    latest.current = badges;
  }, [badges]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inflight: AbortController | undefined;

    const poll = async () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      inflight?.abort();
      inflight = new AbortController();
      try {
        const res = await fetch("/api/badges", {
          cache: "no-store",
          signal: inflight.signal,
        });
        if (res.ok) {
          const next = (await res.json()) as Badges;
          const prev = latest.current;
          if (next.messages !== prev.messages || next.inquiries !== prev.inquiries || next.notifications !== prev.notifications) {
            latest.current = next;
            setBadges(next);
            router.refresh();
          }
        }
      } catch {
        // Offline or aborted: try again on the next tick.
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };

    const onWake = () => document.visibilityState === "visible" && poll();
    poll();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      inflight?.abort();
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [path, router]);

  return <Ctx.Provider value={badges}>{children}</Ctx.Provider>;
}

/** Header bell with a live unread dot. */
export function BellLink({ href }: { href: string }) {
  const b = useBadges();
  const dot = (b?.notifications ?? 0) > 0;
  return (
    <Link href={href} className="relative flex size-10 items-center justify-center rounded-full" aria-label={dot ? "Notifications (unread)" : "Notifications"}>
      <Icon name="bell" size={20} />
      {dot && <span className="absolute right-2 top-2 size-[9px] rounded-full bg-coral" />}
    </Link>
  );
}
