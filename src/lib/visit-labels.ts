import type { Appointment, Membership, Plan, VisitType } from "@prisma/client";
import { money } from "./format";

type A = Appointment & { visitType: VisitType; membership?: (Membership & { plan: Plan }) | null };

/** "Included in Thrive" · "$95.00" · "Free" · "$119.00 · member rate" (naira for Nigeria accounts) */
export function priceLabel(a: A) {
  if (a.pricingReason === "FREE") return "Free";
  if (a.pricingReason === "INCLUDED") return `Included in ${a.membership?.plan.name ?? "your plan"}`;
  if (a.pricingReason === "MEMBER_RATE") return `${money(a.priceCents, a.currency)} · member rate`;
  return money(a.priceCents, a.currency);
}

export function shortPrice(a: A) {
  if (a.pricingReason === "FREE") return "Free";
  if (a.pricingReason === "INCLUDED") return "Included";
  return money(a.priceCents, a.currency);
}

/** Room opens 15 min before and closes 60 min after the end (07.6). */
export function roomWindow(a: Pick<Appointment, "startsAt" | "endsAt">, opensMin = 15, closesMin = 60) {
  const opens = new Date(a.startsAt.getTime() - opensMin * 60_000);
  const closes = new Date(a.endsAt.getTime() + closesMin * 60_000);
  const now = Date.now();
  return { opens, closes, isOpen: now >= opens.getTime() && now <= closes.getTime(), before: now < opens.getTime(), after: now > closes.getTime() };
}

export const canCancelFree = (a: Pick<Appointment, "startsAt">, hours = 12) => a.startsAt.getTime() - Date.now() > hours * 3600_000;
