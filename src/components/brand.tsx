import Link from "next/link";
import { cn } from "@/lib/format";

export function Monogram({ size = 42, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-flex flex-none items-center justify-center font-display font-medium", inverted ? "bg-white text-forest" : "bg-forest text-white", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), fontSize: Math.round(size * 0.45) }}
    >
      NO
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
