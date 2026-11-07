"use client";

import { useState } from "react";
import { cn } from "@/lib/format";

export function StarRating({ name = "rating", initial = 5 }: { name?: string; initial?: number }) {
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="flex gap-1" onMouseLeave={() => setHover(0)}>
      <legend className="sr-only">Rating out of 5</legend>
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => setValue(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
          className={cn("text-[40px] leading-none transition-colors", n <= shown ? "text-gold" : "text-field")}
        >
          ★
        </button>
      ))}
    </fieldset>
  );
}
