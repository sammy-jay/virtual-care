"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refreshes the waiting room every 4 s so "is ready" appears when the patient joins. */
export function LiveRefresh({ every = 4000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
