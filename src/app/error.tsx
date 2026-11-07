"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/icons";

/** Board 08.4 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[480px] rounded-[28px] bg-white p-8 shadow-[0_40px_80px_-30px_rgba(15,70,54,.35)]">
        <div className="mb-5 flex size-16 items-center justify-center rounded-[20px] bg-coral-tint text-danger">
          <Icon name="alert" size={30} />
        </div>
        <h1 className="h-display text-[40px]">Something went wrong</h1>
        <p className="mt-3 text-[16.5px] text-[#4A5262]">We are on it. Your information is safe. Try again in a minute.</p>
        <div className="mt-5 rounded-[14px] bg-gold-tint px-4 py-3 text-sm text-warning">If you were paying, check Billing before trying again. You will not be charged twice.</div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={reset} className="rounded-full bg-forest px-7 py-4 font-bold text-white">
            Try again
          </button>
          <Link href="/" className="rounded-full border-[1.5px] border-ink px-7 py-4 font-bold">
            Back to home
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-xs text-muted">Reference {error.digest}</p>}
      </div>
    </div>
  );
}
