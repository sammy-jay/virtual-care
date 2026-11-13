import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Dot, Monogram } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { FieldError } from "@/components/ui";
import { DOCTOR } from "@/lib/doctor-profile";
import { cn } from "@/lib/format";

const PERKS: [IconName, string, string][] = [
  ["video", "Free 15-minute intro call", "Meet Dr. Oparaji before you commit."],
  ["globe", "Times in your own time zone", "Houston, Lagos or anywhere between."],
  ["shield", "Private by design", "Encrypted records. Every access is logged."],
];

/** Boards 03.x — forest brand panel + form column. */
export function AuthSplit({ children, perks = false }: { children: ReactNode; perks?: boolean }) {
  return (
    <div className="flex min-h-screen bg-white text-[17px] leading-[1.55] text-ink">
      <div className="relative hidden w-1/2 flex-none flex-col justify-between overflow-hidden bg-forest px-12 py-12 text-white lg:flex xl:px-16">
        <Dot className="-right-[90px] -top-[90px] size-80 bg-forest-deep" />
        <Dot className="bottom-[130px] right-[70px] size-[120px] bg-gold" />
        <Dot className="bottom-[60px] right-[230px] size-11 bg-coral" />
        <Link href="/" className="relative flex items-center gap-3">
          <Monogram size={40} inverted />
          <span className="font-display text-xl">Dr. Nneoma Oparaji</span>
        </Link>
        <div className="relative">
          <h2 className="h-display max-w-[560px] text-[48px] leading-[1.02] tracking-[-.025em] xl:text-[58px]">Care rooted in faith, culture and family.</h2>
          <p className="mt-4 max-w-[480px] text-white/70">
            {DOCTOR.name}, {DOCTOR.postnominals} · Board certified in internal, obesity and lifestyle medicine.
          </p>
          {perks &&
            PERKS.map(([icon, t, b]) => (
              <div key={t} className="mt-[22px] flex gap-3.5">
                <span className="flex size-[30px] flex-none items-center justify-center rounded-full border border-white/30">
                  <Icon name={icon} size={15} />
                </span>
                <div>
                  <div className="font-bold">{t}</div>
                  <div className="text-[15px] text-white/65">{b}</div>
                </div>
              </div>
            ))}
        </div>
        <div className="relative text-[13px] text-white/60">Not for emergencies. Call 911 (US) or 112 (Nigeria).</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col lg:w-1/2 lg:flex-none">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <Monogram size={36} />
            <span className="font-display text-lg">Dr. Oparaji · Virtual Care</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:p-12">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
        <div className="px-4 pb-4 text-center text-[13px] text-muted lg:hidden">Not for emergencies. Call 911 (US) or 112 (Nigeria).</div>
      </div>
    </div>
  );
}

export function AuthTitle({ title, lead, icon, iconTone = "forest" }: { title: ReactNode; lead?: ReactNode; icon?: IconName; iconTone?: "forest" | "coral" | "gold" }) {
  const tone = { forest: "bg-forest text-white", coral: "bg-coral-tint text-danger", gold: "bg-gold-tint text-gold-ink" }[iconTone];
  return (
    <div>
      {icon && (
        <div className={cn("mb-[22px] flex size-16 items-center justify-center rounded-[20px]", tone)}>
          <Icon name={icon} size={30} strokeWidth={1.7} />
        </div>
      )}
      <h1 className="h-display text-[38px] sm:text-[44px]">{title}</h1>
      {lead && <p className="mt-3 text-[16.5px] text-[#4A5262]">{lead}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-[14px] border-[1.5px] border-field bg-white px-4 py-[15px] text-base text-ink focus:border-forest focus:outline-none focus:ring-3 focus:ring-forest/15 aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#FFF8F6]";

export function AuthInput({ label, name, error, hint, right, ...rest }: ComponentProps<"input"> & { label: string; name: string; error?: string; hint?: ReactNode; right?: ReactNode }) {
  const id = rest.id ?? name;
  return (
    <div>
      <div className="mb-[7px] flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {right}
      </div>
      <input id={id} name={name} className={inputCls} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : hint ? <div className="mt-[7px] text-[13px] text-[#5A6272]">{hint}</div> : null}
    </div>
  );
}

export const authSelectCls = inputCls;

export function SubmitButton({ children, pending, className }: { children: ReactNode; pending?: boolean; className?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("flex w-full items-center justify-center gap-2.5 rounded-full bg-forest px-7 py-4 text-base font-bold text-white transition-colors hover:bg-forest-deep disabled:opacity-60", className)}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
