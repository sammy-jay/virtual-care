import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

const MARK = { src: "/brand/nd-mark.png", w: 445, h: 322 };

/**
 * The ND mark from the practice logo (no tagline: it is unreadable at small sizes).
 * `size` is the height. `inverted` places it on a white tile for dark backgrounds,
 * since the navy mark has too little contrast on forest green.
 */
export function Monogram({ size = 42, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  if (inverted) {
    const inner = Math.round(size * 0.62);
    return (
      <span
        className={cn("inline-flex flex-none items-center justify-center bg-white", className)}
        style={{ width: Math.round(size * 1.18), height: size, borderRadius: Math.round(size * 0.28) }}
      >
        <Image src={MARK.src} alt="" width={MARK.w} height={MARK.h} style={{ height: inner, width: "auto" }} priority />
      </span>
    );
  }
  const h = Math.round(size * 0.82);
  return (
    <span className={cn("inline-flex flex-none items-center justify-center", className)} style={{ height: size }}>
      <Image src={MARK.src} alt="" width={MARK.w} height={MARK.h} style={{ height: h, width: "auto" }} priority />
    </span>
  );
}

export function Logo({ href = "/", subtitle = "Virtual care" }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <Monogram />
      <span className="leading-[1.15]">
        <span className="block font-display text-[19px] text-ink">Dr. Nneoma Oparaji</span>
        <span className="block text-[11px] font-bold uppercase tracking-[.16em] text-forest">{subtitle}</span>
      </span>
    </Link>
  );
}

export function EmergencyBar() {
  return (
    <div className="border-b border-gold-line bg-gold-tint px-4 py-[9px] text-center text-[13px] text-[#5B4210] sm:px-6">
      <span className="hidden sm:inline">Virtual care is not for emergencies. If you think you are having one, call 911 (US) or 112 (Nigeria).</span>
      <span className="sm:hidden">Emergency: 911 · 112 / 767</span>
    </div>
  );
}

/** Decorative circles used across hero and CTA panels. */
export function Dot({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className={cn("pointer-events-none absolute rounded-full", className)} style={style} />;
}
