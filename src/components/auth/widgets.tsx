"use client";

import { useEffect, useRef, useState } from "react";

/** Four-bar strength meter under password fields (03.1). */
export function PasswordStrength({ name = "password", label = "Password", error, placeholder = "At least 10 characters", autoComplete = "new-password" }: { name?: string; label?: string; error?: string; placeholder?: string; autoComplete?: string }) {
  const [v, setV] = useState("");
  const score = !v ? 0 : v.length < 10 ? 1 : [/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length >= 2 || v.length >= 14 ? 4 : 3;
  const text = !v
    ? "Use 10 or more characters."
    : v.length < 10
      ? `Too short. ${10 - v.length} more character${10 - v.length === 1 ? "" : "s"}.`
      : score === 4
        ? "Very strong."
        : "Strong. Use 10 or more characters.";
  return (
    <div>
      <label htmlFor={name} className="mb-[7px] block text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${name}-hint`}
        className="w-full rounded-[14px] border-[1.5px] border-field bg-white px-4 py-[15px] text-base focus:border-forest focus:outline-none focus:ring-3 focus:ring-forest/15 aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#FFF8F6]"
      />
      <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-[5px] flex-1 rounded-[3px] ${i <= score ? (score < 3 ? "bg-coral" : "bg-forest") : "bg-[#E6E8EC]"}`} />
        ))}
      </div>
      <div id={`${name}-hint`} className={`mt-[7px] text-[13px] ${error ? "font-semibold text-danger" : "text-[#5A6272]"}`}>
        {error ?? text}
      </div>
    </div>
  );
}

/** Six boxes for the email code (03.8) or TOTP (03.11); submits a single hidden field. */
export function CodeInput({ name = "code", length = 6, error }: { name?: string; length?: number; error?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = [...digits];
      clean.slice(0, length - i).split("").forEach((d, k) => (next[i + k] = d));
      setDigits(next);
      refs.current[Math.min(length - 1, i + clean.length)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  };
  return (
    <div>
      <input type="hidden" name={name} value={digits.join("")} />
      <div className="flex gap-2.5" role="group" aria-label={`${length}-digit code`}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
            }}
            className={`h-16 w-full min-w-0 flex-1 rounded-[14px] border-[1.5px] text-center font-display text-[30px] focus:outline-none focus:ring-3 focus:ring-forest/15 ${error ? "border-danger" : d ? "border-forest" : "border-field"}`}
          />
        ))}
      </div>
    </div>
  );
}

/** mm:ss countdown. Renders `done` when it reaches zero. */
export function Countdown({ until, done, prefix }: { until: number; done?: React.ReactNode; prefix?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((until - now) / 1000));
  if (left === 0 && done) return <>{done}</>;
  return (
    <span suppressHydrationWarning>
      {prefix}
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}
