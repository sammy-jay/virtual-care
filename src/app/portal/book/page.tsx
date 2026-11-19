import type { Metadata } from "next";
import { requirePatient } from "@/lib/auth/dal";
import { bookingRegions, loadOpenSlots } from "@/lib/booking";
import { allowanceUsed, getActiveMembership, getPlans, getVisitTypes, hasPriorVisit, quoteVisit } from "@/lib/care";
import { db } from "@/lib/db";
import { moneyShort } from "@/lib/format";
import { dayKey, fmt, fmtTime, PRACTICE_TZ, utcOffsetLabel, zoneAbbr, zoneCity } from "@/lib/time";
import { BookingForm, type BookingOption, type DaySlots } from "./booking-form";

export const metadata: Metadata = { title: "Book a visit" };

export default async function BookPage({ searchParams }: PageProps<"/portal/book">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const tz = user.timeZone;
  const [types, plans, membership, prior, profile, introCount] = await Promise.all([
    getVisitTypes(),
    getPlans(),
    getActiveMembership(user.id),
    hasPriorVisit(user.id),
    db.patientProfile.findUnique({ where: { userId: user.id } }),
    db.appointment.count({ where: { patientId: user.id, visitType: { alwaysFree: true }, status: { in: ["SCHEDULED", "COMPLETED"] } } }),
  ]);

  const introDone = introCount > 0;
  // Which visit types this patient can see (04.1 vs 04.2): intro only until it is used.
  const visible = types.filter((t) => (t.alwaysFree ? !introDone : true));
  const options: BookingOption[] = await Promise.all(
    visible.map(async (t) => {
      const q = await quoteVisit(user.id, t);
      const locked = t.requiresPriorVisit && !prior;
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        durationMin: t.durationMin,
        amountCents: q.amountCents,
        standardCents: q.standardCents,
        discountCents: q.discountCents,
        reason: q.reason,
        tag: q.tag,
        pickerLine: locked ? "Available after your first visit" : q.pickerLine,
        planLine: q.planLine,
        why: q.why,
        disabled: locked,
        description: t.description,
      };
    }),
  );

  const requested = typeof sp.type === "string" ? options.find((o) => o.slug === sp.type && !o.disabled) : undefined;
  const fallback = options.find((o) => !o.disabled && o.reason === "INCLUDED") ?? options.find((o) => !o.disabled);
  const selected = requested ?? fallback;

  // Slots for every bookable type, next 21 days, grouped by the patient's day.
  const slotsByType: Record<string, DaySlots[]> = {};
  for (const o of options.filter((x) => !x.disabled)) {
    const slots = await loadOpenSlots({ id: o.id, durationMin: o.durationMin }, new Date(), 21);
    const days = new Map<string, DaySlots>();
    for (const s of slots) {
      const k = dayKey(s, tz);
      if (!days.has(k)) days.set(k, { key: k, dow: fmt(s, tz, "EEE"), dom: fmt(s, tz, "d"), month: fmt(s, tz, "MMMM yyyy"), label: fmt(s, tz, "EEE d MMM"), slots: [] });
      days.get(k)!.slots.push({ iso: s.toISOString(), label: fmtTime(s, tz), doctor: `${fmtTime(s, PRACTICE_TZ)} ${zoneAbbr(PRACTICE_TZ, s)}` });
    }
    slotsByType[o.id] = [...days.values()];
  }

  const used = membership ? await allowanceUsed(membership, new Date()) : 0;
  const thrive = plans.find((p) => p.popular);
  const currency = user.market === "NG" ? "NGN" : "USD";
  const sideNote = membership
    ? membership.plan.includedVisits > 0
      ? {
          title: `Your ${fmt(new Date(), tz, "MMMM")} allowance`,
          body: `${membership.plan.includedLabel ?? membership.plan.includedVisits + " visits"} included${used ? `, ${used} used` : ""}. Resets on ${fmt(membership.currentPeriodEnd, tz, "d MMM")}, no rollover.`,
        }
      : null
    : thrive
      ? { title: "Visit often?", body: `${thrive.name} is ${currency === "NGN" ? moneyShort(thrive.monthlyPriceNgn * 100, "NGN") : moneyShort(thrive.monthlyPriceCents)}/mo and includes one follow-up each month plus ${thrive.discountPct}% off every other visit.`, cta: true }
      : null;

  return (
    <BookingForm
      options={options}
      initialTypeId={selected?.id ?? ""}
      initialSlot={typeof sp.slot === "string" ? sp.slot : undefined}
      slotsByType={slotsByType}
      tz={tz}
      zone={`${zoneAbbr(tz)} (${zoneCity(tz)}, ${utcOffsetLabel(tz)})`}
      zoneAbbr={zoneAbbr(tz)}
      regions={await bookingRegions()}
      defaultRegion={profile?.region ?? ""}
      sideNote={sideNote}
      planName={membership?.plan.name ?? null}
      currency={currency}
    />
  );
}
