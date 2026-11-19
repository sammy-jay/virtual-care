"use client";

import Link from "@/components/market";
import { useActionState, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, FieldError, Tag } from "@/components/ui";
import { cn, money } from "@/lib/format";
import { bookVisit, type BookState } from "./actions";

export type BookingOption = {
  id: string;
  slug: string;
  name: string;
  durationMin: number;
  amountCents: number;
  standardCents: number;
  discountCents: number;
  reason: "FREE" | "INCLUDED" | "MEMBER_RATE" | "STANDARD";
  tag: string | null;
  pickerLine: string;
  planLine: string;
  why: string | null;
  disabled: boolean;
  description: string | null;
};
export type DaySlots = { key: string; dow: string; dom: string; month: string; label: string; slots: { iso: string; label: string; doctor: string }[] };

const STEPS = ["Visit", "Time", "Details", "Confirm"];

export function BookingForm({
  options,
  initialTypeId,
  initialSlot,
  slotsByType,
  zone,
  zoneAbbr,
  regions,
  defaultRegion,
  sideNote,
  planName,
  currency = "USD",
}: {
  options: BookingOption[];
  initialTypeId: string;
  initialSlot?: string;
  slotsByType: Record<string, DaySlots[]>;
  tz: string;
  zone: string;
  zoneAbbr: string;
  regions: { code: string; name: string }[];
  defaultRegion: string;
  sideNote: { title: string; body: string; cta?: boolean } | null;
  planName: string | null;
  /** What this account pays in (amounts in options are already in it). */
  currency?: "USD" | "NGN";
}) {
  const [state, action, pending] = useActionState<BookState, FormData>(bookVisit, {});
  const [typeId, setTypeId] = useState(initialTypeId);
  const days = useMemo(() => slotsByType[typeId] ?? [], [slotsByType, typeId]);
  const initialDay = initialSlot ? days.find((d) => d.slots.some((s) => s.iso === initialSlot))?.key : undefined;
  const [dayKey, setDayKey] = useState<string | undefined>(initialDay ?? days[0]?.key);
  const [slot, setSlot] = useState<string | undefined>(initialDay ? initialSlot : undefined);
  const [page, setPage] = useState(0);
  const [reason, setReason] = useState("");
  const [region, setRegion] = useState(defaultRegion);
  const [consent, setConsent] = useState(false);
  // Dialogs follow the latest action result until dismissed.
  const [dismissed, setDismissed] = useState<BookState | null>(null);
  const dialog: "none" | "reconfirm" | "unlicensed" = dismissed === state ? "none" : state.reconfirm ? "reconfirm" : state.unlicensed ? "unlicensed" : "none";
  const closeDialog = () => setDismissed(state);
  const formRef = useRef<HTMLFormElement>(null);
  const reconfirmRef = useRef<HTMLInputElement>(null);

  const opt = options.find((o) => o.id === typeId);
  const visibleDays = days.slice(page * 5, page * 5 + 5);
  const day = days.find((d) => d.key === dayKey);
  const chosen = day?.slots.find((s) => s.iso === slot);
  const e = state.errors ?? {};
  const free = opt && (opt.reason === "FREE" || opt.reason === "INCLUDED");
  const step = !opt ? 1 : !chosen ? 2 : !reason || !region || !consent ? 3 : 4;

  const pickType = (id: string) => {
    setTypeId(id);
    const d = slotsByType[id] ?? [];
    setPage(0);
    setDayKey(d[0]?.key);
    setSlot(undefined);
  };

  return (
    <form ref={formRef} action={action} className="mx-auto max-w-[1140px]" noValidate>
      <input type="hidden" name="visitTypeId" value={typeId} />
      <input type="hidden" name="slot" value={slot ?? ""} />
      <input ref={reconfirmRef} type="hidden" name="reconfirmed" defaultValue="0" />

      <h1 className="h-display text-[32px] md:text-[38px]">{opt?.slug === "intro" ? "Book your free intro call" : "Book a visit"}</h1>
      <ol className="mb-5 mt-3.5 flex flex-wrap items-center gap-3" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className={cn("flex size-[26px] items-center justify-center rounded-full border-[1.5px] text-[12px] font-extrabold", i < step ? "border-forest bg-forest text-white" : "border-field bg-white text-muted")}>{i + 1}</span>
              <span className={cn("text-[13.5px]", i < step ? "font-bold" : "font-medium text-muted")}>{s}</span>
            </span>
            {i < 3 && <span className="hidden h-[1.5px] w-7 bg-field sm:block" />}
          </li>
        ))}
      </ol>

      {state.message && (
        <Alert tone="error" className="mb-4">
          {state.message}
        </Alert>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* 1 · Visit */}
          <fieldset>
            <legend className="mb-3 text-base font-bold">1 · Choose your visit</legend>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {options.map((o) => {
                const on = o.id === typeId;
                return (
                  <button
                    type="button"
                    key={o.id}
                    disabled={o.disabled}
                    onClick={() => pickType(o.id)}
                    aria-pressed={on}
                    className={cn(
                      "min-w-0 rounded-[18px] bg-white px-5 py-[18px] text-left transition-shadow disabled:cursor-not-allowed disabled:opacity-55",
                      on ? "border-2 border-forest shadow-[0_10px_24px_-14px_rgba(23,96,75,.6)]" : "border-[1.5px] border-line hover:border-field",
                    )}
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <b className="text-[15.5px]">{o.name}</b>
                      {o.tag && <Tag tone={o.reason === "INCLUDED" ? "sage" : o.reason === "FREE" ? "sage" : "gold"}>{o.tag}</Tag>}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted">{o.durationMin} min</div>
                    <div className={cn("mt-2.5 text-[15px] font-extrabold", on ? "text-forest" : "text-ink", o.disabled && "font-semibold text-muted")}>{o.pickerLine}</div>
                  </button>
                );
              })}
            </div>
            <FieldError>{e.visitType}</FieldError>
          </fieldset>

          {/* 2 · Time */}
          <div className={cn("card", e.slot && "border-danger")}>
            <div className="flex items-baseline justify-between">
              <b className="text-base">2 · Pick a time</b>
              <span className="text-[13px] text-muted">{visibleDays[0]?.month}</span>
            </div>
            {days.length === 0 ? (
              <p className="mt-4 text-[14.5px] text-body">No open times in the next three weeks for this visit. Message the practice and we will find one.</p>
            ) : (
              <>
                <div className="my-3.5 flex items-stretch gap-2.5">
                  <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="flex w-9 flex-none items-center justify-center rounded-[14px] border-[1.5px] border-line disabled:opacity-30" aria-label="Earlier days">
                    <Icon name="chevronLeft" size={16} />
                  </button>
                  {visibleDays.map((d) => {
                    const on = d.key === dayKey;
                    return (
                      <button type="button" key={d.key} onClick={() => { setDayKey(d.key); setSlot(undefined); }} aria-pressed={on} className={cn("flex-1 rounded-[14px] py-3 text-center", on ? "bg-forest text-white" : "border-[1.5px] border-line bg-white")}>
                        <div className="text-[12px] opacity-80">{d.dow}</div>
                        <div className="text-lg font-extrabold">{d.dom}</div>
                      </button>
                    );
                  })}
                  <button type="button" disabled={(page + 1) * 5 >= days.length} onClick={() => setPage(page + 1)} className="flex w-9 flex-none items-center justify-center rounded-[14px] border-[1.5px] border-line disabled:opacity-30" aria-label="Later days">
                    <Icon name="chevronRight" size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {day?.slots.map((s) => (
                    <button type="button" key={s.iso} onClick={() => setSlot(s.iso)} aria-pressed={s.iso === slot} className={cn("num rounded-xl py-3 text-center text-sm font-semibold", s.iso === slot ? "bg-forest text-white" : "border-[1.5px] border-line bg-white hover:border-forest")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {e.slot && <FieldError>{e.slot}</FieldError>}
            <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-canvas px-3.5 py-2.5 text-[13.5px] text-body">
              <Icon name="globe" size={16} />
              {chosen ? (
                <span>
                  <b>
                    {day?.label} · {chosen.label} {zoneAbbr}
                  </b>{" "}
                  is <b>{chosen.doctor}</b> for Dr. Oparaji (US Central). Times shown in your zone.{" "}
                  <Link href={`/portal/book/time?type=${opt?.slug}&day=${dayKey}`} className="font-bold text-forest">
                    Compare
                  </Link>
                </span>
              ) : (
                <span>Pick a time. Shown in {zone}.</span>
              )}
            </div>
          </div>

          {/* 3 · Details */}
          <div className="card">
            <b className="text-base">3 · Your details</b>
            <div className="mt-3.5 flex flex-col gap-4 sm:flex-row">
              <div className="sm:flex-[1.4]">
                <label htmlFor="reason" className="label">Reason for visit</label>
                <input id="reason" name="reason" value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Briefly describe what you would like help with" className="field" aria-invalid={e.reason ? true : undefined} />
                <FieldError>{e.reason}</FieldError>
              </div>
              <div className="sm:flex-1">
                <label htmlFor="region" className="label">Where are you right now?</label>
                <select id="region" name="region" value={region} onChange={(ev) => setRegion(ev.target.value)} className="field" aria-invalid={e.region ? true : undefined}>
                  <option value="">Select region</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
                {e.region ? <FieldError>{e.region}</FieldError> : <div className="mt-1.5 text-[13px] text-muted">Telehealth rules depend on your location.</div>}
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" name="consent" checked={consent} onChange={(ev) => setConsent(ev.target.checked)} className="mt-0.5 size-[22px] flex-none accent-forest" aria-invalid={e.consent ? true : undefined} />
              <span>
                I accept the{" "}
                <Link href="/telehealth-consent" target="_blank" className="underline">telehealth consent</Link>{" "}
                for this visit. Not for emergencies.
              </span>
            </label>
            <FieldError>{e.consent}</FieldError>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4 lg:w-[350px] lg:flex-none">
          <div className="card lg:sticky lg:top-24">
            <div className="eyebrow">Summary</div>
            <div className="mb-1 mt-1.5 font-display text-2xl">{opt ? `${opt.name} · ${opt.durationMin} min` : "Choose a visit"}</div>
            <Line label="Visit">{opt ? `${opt.name} · ${opt.durationMin} min` : "—"}</Line>
            <Line label="When">{chosen ? `${day?.label} · ${chosen.label} ${zoneAbbr}` : <span className="text-muted">Not selected</span>}</Line>
            {chosen && opt?.reason !== "MEMBER_RATE" && <Line label="Doctor’s time">{chosen.doctor}</Line>}
            {opt?.reason === "MEMBER_RATE" ? (
              <>
                <Line label="Standard price">{money(opt.standardCents, currency)}</Line>
                <Line label={`${planName} member discount`}>−{money(opt.discountCents, currency)}</Line>
              </>
            ) : opt?.reason === "FREE" ? (
              <Line label="Price">Free</Line>
            ) : (
              opt && <Line label="Plan">{opt.planLine}</Line>
            )}
            <div className="mt-1 flex items-baseline justify-between border-t-2 border-ink pt-3.5">
              <b>Total today</b>
              <span className="num font-display text-[30px]">{money(opt?.amountCents ?? 0, currency)}</span>
            </div>
            <button disabled={pending || !opt} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-4 font-bold text-white disabled:opacity-60">
              {pending ? "Booking…" : !chosen ? "Select a time first" : free ? "Confirm booking" : "Continue to payment"}
            </button>
            <p className="mt-3 text-[13px] text-muted">
              {opt?.reason === "FREE"
                ? "No card needed. You will get a confirmation and reminders by email."
                : opt?.reason === "INCLUDED"
                  ? "Included in your plan — no payment needed. Free cancellation up to 12 hours before; your included visit returns if you cancel."
                  : opt?.reason === "MEMBER_RATE"
                    ? "Free cancellation up to 12 hours before, with automatic refund."
                    : "Free cancellation up to 12 hours before, with automatic refund."}
            </p>
          </div>

          {opt?.why ? (
            <div className="rounded-[20px] bg-gold-tint p-5">
              <b className="text-[15px]">Why am I paying?</b>
              <p className="mt-1 text-sm text-warning">{opt.why}</p>
            </div>
          ) : opt?.reason === "FREE" ? (
            <div className="rounded-[20px] bg-sage p-5">
              <b className="text-[15px]">What to expect</b>
              <p className="mt-1 text-sm text-sage-ink">{opt.description ?? "A short video call to see if we are a good fit."} Join from your browser — nothing to install.</p>
            </div>
          ) : sideNote ? (
            <div className={cn("rounded-[20px] p-5", sideNote.cta ? "bg-sky-tint" : "bg-sage")}>
              <b className="text-[15px]">{sideNote.title}</b>
              <p className={cn("mt-1 text-sm", sideNote.cta ? "text-sky-ink" : "text-sage-ink")}>{sideNote.body}</p>
              {sideNote.cta && (
                <Link href="/membership" className="mt-2 inline-block text-sm font-bold text-forest">
                  Compare plans
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {dialog === "reconfirm" && (
        <Dialog onClose={() => closeDialog()} title="Confirm telehealth consent" subtitle="Please confirm before this visit is booked." icon="shield">
          <ul className="flex flex-col gap-2.5 text-[15px]">
            {["Care is delivered by video and is not for emergencies.", "Visits are private and not recorded.", "I am in a region where Dr. Oparaji is licensed."].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Icon name="check" size={18} strokeWidth={2.4} className="mt-0.5 text-forest" />
                {t}
              </li>
            ))}
          </ul>
          <Link href="/telehealth-consent" target="_blank" className="mt-3 inline-block text-sm font-bold text-forest underline">Read the full consent</Link>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => closeDialog()} className="rounded-full border-[1.5px] border-forest px-6 py-3 font-bold text-forest">Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (reconfirmRef.current) reconfirmRef.current.value = "1";
                closeDialog();
                formRef.current?.requestSubmit();
              }}
              className="rounded-full bg-forest px-6 py-3 font-bold text-white"
            >
              Agree and book
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "unlicensed" && (
        <Dialog onClose={() => closeDialog()} title="We cannot see you from this location" subtitle={`Dr. Oparaji is licensed in Texas (USA) and Nigeria. Please choose a different location, or contact us and we will point you to care near you.`} icon="globe" tone="gold">
          <div className="rounded-xl bg-canvas px-4 py-3 text-sm">
            Where are you right now? <b>{state.unlicensed}</b>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/contact" className="rounded-full border-[1.5px] border-forest px-6 py-3 text-center font-bold text-forest">Contact us</Link>
            <button
              type="button"
              onClick={() => {
                closeDialog();
                setRegion("");
                document.getElementById("region")?.focus();
              }}
              className="rounded-full bg-forest px-6 py-3 font-bold text-white"
            >
              Change location
            </button>
          </div>
        </Dialog>
      )}
    </form>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line-soft py-[11px] text-[14.5px]">
      <span className="text-body">{label}</span>
      <span className="text-right font-bold">{children}</span>
    </div>
  );
}

function Dialog({ title, subtitle, icon, tone = "sage", onClose, children }: { title: string; subtitle: string; icon: "shield" | "globe"; tone?: "sage" | "gold"; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bk-dlg">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[linear-gradient(135deg,rgba(231,242,237,.92),rgba(232,239,251,.92))]" />
      <div className="relative w-full max-w-[520px] rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-30px_rgba(15,70,54,.45)] sm:p-[34px]">
        <div className={cn("mb-4 flex size-14 items-center justify-center rounded-[18px]", tone === "gold" ? "bg-gold-tint text-gold-ink" : "bg-sage text-forest")}>
          <Icon name={icon} size={26} />
        </div>
        <h2 id="bk-dlg" className="h-display text-[30px] leading-[1.1]">{title}</h2>
        <p className="mb-5 mt-2.5 text-[15.5px] text-body">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
