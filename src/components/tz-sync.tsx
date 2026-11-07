"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Stores the browser's time zone in a cookie so server-rendered times match the visitor. */
export function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const has = document.cookie.split("; ").find((c) => c.startsWith("vc_tz="));
    if (tz && (!has || decodeURIComponent(has.split("=")[1]) !== tz)) {
      document.cookie = `vc_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      if (!has) router.refresh();
    }
  }, [router]);
  return null;
}
