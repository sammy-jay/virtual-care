"use client";

import { useEffect, useState } from "react";

export function VisitTimer({ since, durationMin }: { since: string | null; durationMin: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = since ? Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000)) : 0;
  const over = secs > durationMin * 60;
  return (
    <div>
      <div className={`num font-display text-[44px] leading-none ${over ? "text-coral" : ""}`} suppressHydrationWarning>
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
      </div>
      <div className="text-sm text-muted">of {durationMin} min</div>
    </div>
  );
}
