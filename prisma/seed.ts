/**
 * Recreates the world drawn on the design boards, relative to "now".
 * Wipes every collection first. Run: npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { explicitNulls } from "./explicit-nulls";
import { US_STATES } from "../src/lib/regions";
import { usdToNgnKobo } from "../src/lib/pricing";

/** Nigeria accounts pay in naira (Paystack) at the practice rate; amounts in kobo. */
const NGN_PER_USD = 1500;
const ngn = (usdCents: number) => usdToNgnKobo(usdCents, NGN_PER_USD);

const db = new PrismaClient().$extends(explicitNulls);
const CDT = "America/Chicago";
const WAT = "Africa/Lagos";
const PASSWORD = "password1234";
const DOCTOR_TOTP = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"; // add to an authenticator app for the doctor sign-in

const day = 86400_000;
const now = new Date();
/** Practice-zone wall time `daysFromToday` days away at hh:mm. */
function at(daysFromToday: number, hh: number, mm = 0) {
  const d = new Date(now.getTime() + daysFromToday * day);
  const key = formatInTimeZone(d, CDT, "yyyy-MM-dd");
  return fromZonedTime(`${key}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, CDT);
}
const plus = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);
let receiptSeq = 400;
const receipt = () => `NO-${now.getFullYear()}-${String(++receiptSeq).padStart(4, "0")}`;

async function wipe() {
  const models = [
    "emailOutbox", "dataRequest", "accessLog", "notification", "messageTemplate", "inquiry", "message", "conversation",
    "feedback", "carePlan", "visitNote", "refund", "payment", "appointment", "paymentMethod", "membership",
    "timeOff", "availabilityWindow", "license", "plan", "visitType", "practice", "measurement", "patientProfile",
    "authToken", "session", "user",
  ] as const;
  for (const m of models) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)[m].deleteMany({});
  }
}

async function main() {
  await wipe();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await db.practice.create({
    data: {
      doctorName: "Dr. Nneoma Oparaji",
      doctorShortName: "Dr. Oparaji",
      timeZone: CDT,
      bookingPublished: true,
      payoutBank: "Chase",
      payoutLast4: "4410",
      payoutSchedule: "Weekly",
    },
  });

  // ── Visit types (01.6) ──
  const intro = await db.visitType.create({ data: { slug: "intro", name: "Intro call", durationMin: 15, priceCents: 0, alwaysFree: true, sortOrder: 0, tagline: "A relaxed first hello. Share your goals, ask about the practice and see whether we are a good fit.", description: "A short video call to see if we are a good fit." } });
  const followUp = await db.visitType.create({ data: { slug: "follow-up", name: "Follow-up", durationMin: 30, priceCents: 9500, requiresPriorVisit: true, sortOrder: 1, tagline: "Check progress, adjust your plan and troubleshoot what is getting in the way.", description: "Progress check and plan adjustments" } });
  const initial = await db.visitType.create({ data: { slug: "initial-consultation", name: "Initial consultation", durationMin: 60, priceCents: 18000, sortOrder: 2, tagline: "A full history, review of your foods, routines and family, and a first written care plan.", description: "Full history and first care plan" } });
  const coaching = await db.visitType.create({ data: { slug: "family-coaching", name: "Family coaching", durationMin: 45, priceCents: 14000, sortOrder: 3, tagline: "Bring a spouse, parent or child. Build shared meals and habits the whole household can keep.", description: "For couples and families" } });

  // ── Plans (01.6 is the single rule set; see PLAN.md "Conflicts") ──
  const connect = await db.plan.create({ data: { slug: "connect", name: "Connect", tagline: "Stay in touch between visits.", monthlyPriceCents: 5900, monthlyPriceNgn: 88500, discountPct: 15, includedVisits: 0, includedLabel: "None", sortOrder: 0, features: ["Secure messaging with Dr. Oparaji", "Replies within 1 business day", "15% off every visit", "Access to care plans and receipts"] } });
  const thrive = await db.plan.create({ data: { slug: "thrive", name: "Thrive", tagline: "Ongoing care with a monthly visit.", monthlyPriceCents: 12900, monthlyPriceNgn: 193500, discountPct: 15, includedVisits: 1, includedVisitTypeIds: [followUp.id], includedLabel: "1 follow-up", popular: true, sortOrder: 1, features: ["Everything in Connect", "1 follow-up visit included each month", "Priority scheduling", "15% off other visits"] } });
  const family = await db.plan.create({ data: { slug: "family-focus", name: "Family Focus", tagline: "For households building habits together.", monthlyPriceCents: 22900, monthlyPriceNgn: 343500, discountPct: 15, includedVisits: 3, includedVisitTypeIds: [followUp.id, coaching.id], includedLabel: "3 visits + coaching", maxFamilyMembers: 4, sortOrder: 2, features: ["Everything in Thrive", "3 visits included each month", "Family coaching included", "Add up to 3 family members"] } });

  // ── Licensure (09.17) ──
  // US states Dr. Oparaji is licensed in (from the practice). Numbers and renewal dates are entered
  // by the doctor in Settings → Licensure; none are invented here.
  const LICENSED_STATES = ["OR", "WA", "TX", "NY", "GA", "VA", "FL", "CA", "MI", "OH", "MA", "WI", "CO", "AL", "PA", "HI", "ID", "MO", "TN", "NC", "UT", "IN", "NJ", "IL", "KS", "MD", "OK", "AZ", "NV"];
  await db.license.createMany({
    data: [
      ...LICENSED_STATES.map((abbr) => ({ regionCode: `US-${abbr}`, regionName: US_STATES.find((s) => s.code === `US-${abbr}`)!.name, credential: "State medical license", status: "ACTIVE" as const })),
      { regionCode: "NG", regionName: "Nigeria", credential: "MDCN registration", status: "ACTIVE" },
    ],
  });

  // ── Availability (10.3), practice time (US Central) ──
  await db.availabilityWindow.createMany({
    data: [
      { weekday: 1, startMin: 13 * 60, endMin: 18 * 60 },
      { weekday: 2, startMin: 12 * 60, endMin: 16 * 60 },
      { weekday: 2, startMin: 17 * 60, endMin: 19 * 60 },
      { weekday: 4, startMin: 12 * 60, endMin: 18 * 60 },
      { weekday: 5, startMin: 12 * 60, endMin: 15 * 60 },
    ],
  });
  await db.timeOff.createMany({
    data: [
      { startAt: at(21, 0), endAt: at(26, 0), note: "Conference" },
      { startAt: at(40, 0), endAt: at(41, 0), note: "Holiday" },
    ],
  });

  // ── People ──
  const doctor = await db.user.create({ data: { email: "doctor@example.com", passwordHash, name: "Dr. Nneoma Oparaji", role: "DOCTOR", timeZone: CDT, emailVerified: now, totpSecret: DOCTOR_TOTP, totpEnabled: true, consentAt: now } });
  await db.user.create({ data: { email: "support@example.com", passwordHash, name: "Care team", role: "STAFF", timeZone: CDT, emailVerified: now, consentAt: now } });

  type P = { email: string; name: string; phone: string; tz: string; city: string; region: string; joinedDaysAgo: number };
  const mk = async (p: P, profile: Partial<Prisma.PatientProfileCreateWithoutUserInput> = {}) =>
    db.user.create({
      data: {
        email: p.email, passwordHash, name: p.name, phone: p.phone, timeZone: p.tz, emailVerified: now, consentAt: now,
        market: p.region === "NG" ? "NG" : "US",
        createdAt: new Date(now.getTime() - p.joinedDaysAgo * day),
        notifyPrefs: { visitReminders: true, newMessages: true, carePlans: true, productNews: false },
        profile: { create: { city: p.city, region: p.region, ...profile } },
      },
    });

  const adaeze = await mk(
    { email: "adaeze@example.com", name: "Adaeze Nwosu", phone: "+234 803 555 0142", tz: WAT, city: "Lagos", region: "NG", joinedDaysAgo: 56 },
    { dateOfBirth: new Date("1987-03-14"), medications: "Lisinopril 10 mg", allergies: "Penicillin", goals: "Lose 4 kg in 8 weeks", goalWeightKg: 80 },
  );
  const tunde = await mk({ email: "tunde@example.com", name: "Tunde Bello", phone: "+1 713 555 0190", tz: CDT, city: "Houston", region: "US-TX", joinedDaysAgo: 80 }, { medications: "Metformin 500 mg", allergies: "None", goals: "Family meals" });
  const chidi = await mk({ email: "chidi@example.com", name: "Chidi Okafor", phone: "+1 832 555 0114", tz: CDT, city: "Houston", region: "US-TX", joinedDaysAgo: 20 });
  const ngozi = await mk({ email: "ngozi@example.com", name: "Ngozi Eze", phone: "+234 809 555 0177", tz: WAT, city: "Abuja", region: "NG", joinedDaysAgo: 120 }, { medications: "Amlodipine 5 mg", allergies: "None" });
  const mercy = await mk({ email: "mercy@example.com", name: "Mercy Adeyemi", phone: "+234 802 555 0123", tz: WAT, city: "Lagos", region: "NG", joinedDaysAgo: 95 }, { allergies: "None" });
  const ife = await mk({ email: "ife@example.com", name: "Ife Adebayo", phone: "+234 805 555 0101", tz: WAT, city: "Lagos", region: "NG", joinedDaysAgo: 1 });
  // A brand-new patient for the empty overview (05.2)
  await mk({ email: "new@example.com", name: "Amaka Obi", phone: "", tz: WAT, city: "Lagos", region: "NG", joinedDaysAgo: 0 });

  // ── Payment methods (06.11) ──
  const visa = await db.paymentMethod.create({ data: { userId: adaeze.id, brand: "Visa", last4: "4242", expMonth: 8, expYear: 2028, isDefault: true, providerRef: "pm_mock_4242_a" } });
  await db.paymentMethod.create({ data: { userId: adaeze.id, brand: "Verve", last4: "4421", expMonth: 3, expYear: 2029, country: "NG", providerRef: "pm_mock_4421_a" } });
  const pmFor = async (userId: string, last4: string) => db.paymentMethod.create({ data: { userId, brand: "Visa", last4, expMonth: 5, expYear: 2028, isDefault: true, providerRef: `pm_mock_${last4}_${userId.slice(-4)}` } });
  const tundePm = await pmFor(tunde.id, "4242");
  const chidiPm = await pmFor(chidi.id, "1881");
  const ngoziPm = await pmFor(ngozi.id, "5100");
  const mercyPm = await pmFor(mercy.id, "3005");

  // ── Memberships ──
  const periodStart = new Date(now.getTime() - 8 * day);
  const periodEnd = new Date(periodStart.getTime() + 30 * day);
  const mAdaeze = await db.membership.create({ data: { patientId: adaeze.id, planId: thrive.id, currency: "NGN", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, paymentMethodId: visa.id, createdAt: periodStart } });
  const mTunde = await db.membership.create({ data: { patientId: tunde.id, planId: family.id, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, paymentMethodId: tundePm.id } });
  const mNgozi = await db.membership.create({ data: { patientId: ngozi.id, planId: connect.id, currency: "NGN", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, paymentMethodId: ngoziPm.id } });
  const mMercy = await db.membership.create({ data: { patientId: mercy.id, planId: thrive.id, currency: "NGN", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, paymentMethodId: mercyPm.id } });

  // ── Appointments ──
  type A = Omit<Prisma.AppointmentUncheckedCreateInput, "endsAt" | "consentAt" | "standardCents" | "patientTimeZone" | "region"> & { durationMin: number; region?: string; patientTimeZone?: string };
  const appt = async ({ durationMin, ...a }: A, tz = WAT, region = "NG") => {
    // Nigeria visits are priced and paid in naira.
    const naira = (a.region ?? region) === "NG";
    const priceCents = naira ? ngn(a.priceCents) : a.priceCents;
    return db.appointment.create({
      data: {
        ...a,
        priceCents,
        currency: naira ? "NGN" : "USD",
        endsAt: plus(a.startsAt as Date, durationMin),
        consentAt: new Date((a.startsAt as Date).getTime() - 3 * day),
        standardCents: priceCents,
        patientTimeZone: a.patientTimeZone ?? tz,
        region: a.region ?? region,
        roomName: `room-${Math.random().toString(36).slice(2, 10)}`,
        backupUrl: "https://meet.example.com/backup",
      },
    });
  };

  // Adaeze's journey: intro → initial → follow-up → upcoming included follow-up
  const aIntro = await appt({ patientId: adaeze.id, visitTypeId: intro.id, startsAt: at(-56, 13), durationMin: 15, status: "COMPLETED", priceCents: 0, pricingReason: "FREE", reason: "Getting started" });
  const aInitial = await appt({ patientId: adaeze.id, visitTypeId: initial.id, startsAt: at(-42, 13), durationMin: 60, status: "COMPLETED", priceCents: 18000, pricingReason: "STANDARD", reason: "Weight and energy" });
  const aFollow = await appt({ patientId: adaeze.id, visitTypeId: followUp.id, startsAt: at(-28, 13), durationMin: 30, status: "COMPLETED", priceCents: 9500, pricingReason: "STANDARD", reason: "Check-in" });
  const aNext = await appt({ patientId: adaeze.id, visitTypeId: followUp.id, startsAt: at(3, 13), durationMin: 30, status: "SCHEDULED", priceCents: 0, pricingReason: "INCLUDED", usesAllowance: true, membershipId: mAdaeze.id, reason: "Appetite and sleep. Check-in on meal plan. Snack questions." });

  // Today's list for the doctor dashboard (09.1)
  const tToday = await appt({ patientId: tunde.id, visitTypeId: coaching.id, startsAt: at(0, 14), durationMin: 45, status: "SCHEDULED", priceCents: 0, pricingReason: "INCLUDED", usesAllowance: true, membershipId: mTunde.id, reason: "Family meal planning" }, CDT, "US-TX");
  const cToday = await appt({ patientId: chidi.id, visitTypeId: initial.id, startsAt: at(0, 16), durationMin: 60, status: "SCHEDULED", priceCents: 18000, pricingReason: "STANDARD", reason: "Blood pressure and weight" }, CDT, "US-TX");
  await appt({ patientId: ife.id, visitTypeId: intro.id, startsAt: at(0, 17, 30), durationMin: 15, status: "SCHEDULED", priceCents: 0, pricingReason: "FREE", reason: "Family coaching for two" });
  await appt({ patientId: mercy.id, visitTypeId: followUp.id, startsAt: at(1, 14), durationMin: 30, status: "SCHEDULED", priceCents: 0, pricingReason: "INCLUDED", usesAllowance: true, membershipId: mMercy.id });
  await appt({ patientId: ngozi.id, visitTypeId: followUp.id, startsAt: at(2, 15), durationMin: 30, status: "SCHEDULED", priceCents: 8075, pricingReason: "MEMBER_RATE", membershipId: mNgozi.id });
  const mercyPast = await appt({ patientId: mercy.id, visitTypeId: followUp.id, startsAt: at(-1, 14), durationMin: 30, status: "COMPLETED", priceCents: 9500, pricingReason: "STANDARD" });
  const ngoziPast = await appt({ patientId: ngozi.id, visitTypeId: initial.id, startsAt: at(-30, 15), durationMin: 60, status: "COMPLETED", priceCents: 18000, pricingReason: "STANDARD" });
  const tundePast = await appt({ patientId: tunde.id, visitTypeId: initial.id, startsAt: at(-60, 16), durationMin: 60, status: "COMPLETED", priceCents: 18000, pricingReason: "STANDARD" }, CDT, "US-TX");
  await appt({ patientId: chidi.id, visitTypeId: followUp.id, startsAt: at(-3, 13), durationMin: 30, status: "CANCELED", priceCents: 9500, pricingReason: "STANDARD", canceledAt: at(-5, 9), canceledBy: "PATIENT" }, CDT, "US-TX");
  // older history for insights
  for (let i = 0; i < 14; i++) {
    const who = [ngozi, tunde, mercy][i % 3];
    await appt({ patientId: who.id, visitTypeId: [followUp, coaching, initial][i % 3].id, startsAt: at(-10 - i * 5, 13 + (i % 4)), durationMin: 30, status: i === 6 ? "NO_SHOW" : "COMPLETED", priceCents: 9500, pricingReason: "STANDARD" });
  }

  // ── Visit notes + care plans ──
  await db.visitNote.create({ data: { appointmentId: aNext.id, subjective: "Reports better energy. Evening snacking continues.", objective: "Weight 81.2 kg (−1.4). BP 128/82 at home.", assessment: "Progressing. Snack triggers are evening stress.", plan: "Continue plan. Add protein snack. Review in 4 weeks.", followUpWeeks: 4 } });
  await db.carePlan.create({
    data: {
      patientId: adaeze.id, appointmentId: aInitial.id, status: "PUBLISHED", publishedAt: plus(aInitial.endsAt, 120),
      summary: "A strong start. We agreed to build meals around the foods your family already loves and to add gentle movement.",
      goals: ["Lose 4 kg over 8 weeks", "Walk 15 minutes, 3 days a week"],
      nutrition: ["Half the plate vegetables or egusi", "Water before every meal"],
      movement: ["Short walk after dinner"],
      nextSteps: ["Log weight weekly", "Book a follow-up in 2 weeks"],
    },
  });
  const plan30 = await db.carePlan.create({
    data: {
      patientId: adaeze.id, appointmentId: aFollow.id, status: "PUBLISHED", publishedAt: plus(aFollow.endsAt, 90),
      summary: "Good progress on evening meals and sleep. Energy is improving. We will focus on portion balance at family meals and a gentle walking routine.",
      goals: ["Lose 4 kg over 8 weeks", "Walk 20 minutes, 5 days a week", "Sleep 7 hours on weeknights"],
      nutrition: ["Half the plate vegetables or egusi", "Swap one white-rice meal for beans", "Water before every meal"],
      movement: ["Evening walk after dinner with family", "Stretch for 5 minutes each morning", "Phone away 30 minutes before bed"],
      nextSteps: ["Log blood pressure morning and evening", "Send readings by message on Friday", "Bring snack questions to your visit"],
    },
  });
  await db.carePlan.create({ data: { patientId: mercy.id, appointmentId: mercyPast.id, status: "DRAFT", summary: "Steady progress. Keep going with the walking routine.", goals: ["Walk 30 minutes, 4 days a week"], nutrition: [], movement: [], nextSteps: [] } });
  await db.carePlan.create({ data: { patientId: ngozi.id, appointmentId: ngoziPast.id, status: "PUBLISHED", publishedAt: ngoziPast.endsAt, summary: "Blood pressure plan.", goals: ["Home BP under 130/85"], nutrition: ["Less salt in stews"], movement: ["Walk daily"], nextSteps: ["Send readings weekly"] } });
  await db.carePlan.create({ data: { patientId: tunde.id, appointmentId: tundePast.id, status: "PUBLISHED", publishedAt: tundePast.endsAt, summary: "Family-wide habits.", goals: ["Family dinner 5 nights"], nutrition: ["Swap fried plantain for roasted"], movement: ["Weekend family walk"], nextSteps: ["Book family coaching"] } });
  // Adaeze's follow-up awaits a plan → "2 care plans to publish" (Adaeze, Mercy)
  await db.carePlan.create({ data: { patientId: adaeze.id, appointmentId: aNext.id, status: "DRAFT", summary: "Good progress on evening meals. Energy improving. Focus next on family meal portions and a gentle walking routine.", goals: ["Lose 4 kg over 8 weeks", "Walk 20 minutes, 5 days a week", "Sleep 7 hours"], nutrition: ["Half the plate vegetables", "Swap one rice meal for beans", "Water before meals"], movement: [], nextSteps: ["Log blood pressure morning and evening", "Send readings Friday"] } });

  await db.feedback.createMany({ data: [{ appointmentId: aFollow.id, rating: 5, comment: "Felt heard." }, { appointmentId: aInitial.id, rating: 5 }, { appointmentId: ngoziPast.id, rating: 5 }, { appointmentId: tundePast.id, rating: 4 }] });

  // ── Payments ──
  const pay = (d: Omit<Prisma.PaymentUncheckedCreateInput, "receiptNo">) => db.payment.create({ data: { receiptNo: receipt(), ...d } });
  await pay({ patientId: adaeze.id, kind: "VISIT", status: "FREE", amountCents: 0, description: "Intro call", note: "Always free", appointmentId: aIntro.id, createdAt: aIntro.startsAt });
  const declined = await pay({ patientId: adaeze.id, kind: "VISIT", status: "REFUNDED", currency: "NGN", amountCents: ngn(9500), refundedCents: ngn(9500), description: "Follow-up visit", note: "Card declined, retried", paymentMethodId: visa.id, createdAt: at(-60, 10) });
  await db.refund.create({ data: { paymentId: declined.id, amountCents: ngn(9500), reason: "Dr. Oparaji had to reschedule your follow-up, so you were refunded in full.", reference: `RF-${now.getFullYear()}-0087`, createdAt: at(-59, 10) } });
  await pay({ patientId: adaeze.id, kind: "VISIT", status: "PAID", currency: "NGN", amountCents: ngn(18000), description: "Initial consultation", note: "Pay per visit", paymentMethodId: visa.id, appointmentId: aInitial.id, createdAt: plus(aInitial.startsAt, -2000) });
  await pay({ patientId: adaeze.id, kind: "VISIT", status: "PAID", currency: "NGN", amountCents: ngn(9500), description: "Follow-up visit", note: "Before joining Thrive", paymentMethodId: visa.id, appointmentId: aFollow.id, createdAt: plus(aFollow.startsAt, -2000) });
  await pay({ patientId: adaeze.id, kind: "MEMBERSHIP", status: "PAID", currency: "NGN", amountCents: thrive.monthlyPriceNgn * 100, description: "Thrive monthly", note: "Card ending 4242", paymentMethodId: visa.id, membershipId: mAdaeze.id, createdAt: periodStart });
  await pay({ patientId: tunde.id, kind: "MEMBERSHIP", status: "PAID", amountCents: 22900, description: "Family Focus monthly", paymentMethodId: tundePm.id, membershipId: mTunde.id, createdAt: periodStart });
  await pay({ patientId: tunde.id, kind: "VISIT", status: "PAID", amountCents: 11900, description: "Coaching · member rate", paymentMethodId: tundePm.id, createdAt: at(-2, 9) });
  await pay({ patientId: mercy.id, kind: "MEMBERSHIP", status: "PAID", currency: "NGN", amountCents: thrive.monthlyPriceNgn * 100, description: "Thrive monthly", paymentMethodId: mercyPm.id, membershipId: mMercy.id, createdAt: at(-1, 8) });
  await pay({ patientId: chidi.id, kind: "VISIT", status: "PAID", amountCents: 18000, description: "Initial consultation", paymentMethodId: chidiPm.id, appointmentId: cToday.id, createdAt: at(-1, 11) });
  await pay({ patientId: ngozi.id, kind: "MEMBERSHIP", status: "PAID", currency: "NGN", amountCents: connect.monthlyPriceNgn * 100, description: "Connect monthly", paymentMethodId: ngoziPm.id, membershipId: mNgozi.id, createdAt: at(-2, 7) });
  const chidiCancel = await pay({ patientId: chidi.id, kind: "VISIT", status: "REFUNDED", amountCents: 9500, refundedCents: 9500, description: "Follow-up visit", paymentMethodId: chidiPm.id, createdAt: at(-6, 9) });
  await db.refund.create({ data: { paymentId: chidiCancel.id, amountCents: 9500, reason: "Cancelled more than 12 hours before", reference: `RF-${now.getFullYear()}-0091`, createdAt: at(-5, 9) } });
  void tToday;

  // ── Measurements (05.9) ──
  const weights = [84.0, 83.6, 83.1, 82.9, 82.4, 82.0, 81.7, 81.2];
  for (let i = 0; i < weights.length; i++) {
    await db.measurement.create({ data: { patientId: adaeze.id, kind: "WEIGHT", value: weights[i], takenAt: new Date(now.getTime() - (56 - i * 8) * day) } });
  }
  const bp = [[138, 88], [136, 87], [134, 86], [133, 85], [131, 84], [130, 83], [129, 83], [128, 82]];
  for (let i = 0; i < bp.length; i++) {
    await db.measurement.create({ data: { patientId: adaeze.id, kind: "BLOOD_PRESSURE", systolic: bp[i][0], diastolic: bp[i][1], takenAt: new Date(now.getTime() - (56 - i * 8) * day) } });
  }
  await db.measurement.create({ data: { patientId: adaeze.id, kind: "WALK_DAYS", value: 4, takenAt: now } });

  // ── Messages (05.3, 09.8) ──
  const convo = async (patientId: string, msgs: [boolean, string, number][], title = "Dr. Oparaji", kind = "doctor", read = true) => {
    const c = await db.conversation.create({ data: { patientId, title, kind } });
    let last = now;
    for (const [fromDoctor, body, minsAgo] of msgs) {
      last = new Date(now.getTime() - minsAgo * 60_000);
      await db.message.create({ data: { conversationId: c.id, fromDoctor, senderId: fromDoctor ? doctor.id : patientId, body, createdAt: last, readAt: read || fromDoctor ? last : null } });
    }
    await db.conversation.update({ where: { id: c.id }, data: { lastMessageAt: last } });
    return c;
  };
  const ac = await db.conversation.create({ data: { patientId: adaeze.id, title: "Dr. Oparaji" } });
  const m = (fromDoctor: boolean, body: string, minsAgo: number, read: boolean) =>
    db.message.create({ data: { conversationId: ac.id, fromDoctor, senderId: fromDoctor ? doctor.id : adaeze.id, body, createdAt: new Date(now.getTime() - minsAgo * 60_000), readAt: read ? new Date() : null } });
  await m(true, "Hello Adaeze, how are you finding the meal plan?", 60 * 50, true);
  await m(false, "Going well. Can we go over snacks at my next visit?", 60 * 49.5, false);
  await m(true, "Of course. I will add it to your agenda.", 60 * 49, false);
  await db.message.create({ data: { conversationId: ac.id, fromDoctor: true, kind: "CARE_PLAN", body: "Your care plan was updated", carePlanId: plan30.id, createdAt: new Date(now.getTime() - 60 * 48 * 60_000) } });
  await db.conversation.update({ where: { id: ac.id }, data: { lastMessageAt: new Date(now.getTime() - 60 * 49 * 60_000) } });
  await convo(adaeze.id, [[true, "Reminder: log readings morning and evening this week.", 60 * 24 * 4]], "Care team", "care_team");
  await convo(tunde.id, [[false, "Is Friday evening possible?", 180]], undefined, undefined, false);
  await convo(mercy.id, [[true, "Your plan is coming soon.", 600], [false, "Thank you doctor!", 400]], undefined, undefined, false);
  await convo(ngozi.id, [[false, "Readings attached", 60 * 26]]);

  await db.messageTemplate.createMany({
    data: [
      { title: "Welcome", body: "Welcome! Your intro call is booked. Here is what to expect: a short video call from your browser, nothing to install.", sortOrder: 0 },
      { title: "Great progress", body: "Great progress this week. Keep going with your walking routine and evening meals.", sortOrder: 1 },
      { title: "Log readings", body: "Please log your readings morning and evening, and send them on Friday.", sortOrder: 2 },
      { title: "Rebook", body: "It is time to book your next follow-up. You can pick a time in your own time zone from the portal.", sortOrder: 3 },
      { title: "Out of office", body: "I am away until Monday. For urgent needs call 911 (US) or 112 (Nigeria).", sortOrder: 4 },
      { title: "Refund sent", body: "I have refunded your visit. It will arrive in 3 to 5 days.", sortOrder: 5 },
    ],
  });

  // ── Inquiries (09.9) ──
  await db.inquiry.createMany({
    data: [
      { name: "Ife Adebayo", email: "ife@example.com", topic: "Family coaching for two", body: "Hello Dr. Oparaji, my husband and I would like to join a coaching session together. Do you offer it as one visit, and is it covered by a membership?", createdAt: at(0, 8, 14) },
      { name: "Kelechi Obi", email: "kelechi@example.com", topic: "Do you see patients in Abuja?", body: "I live in Abuja. Can I book with you?", createdAt: at(0, 7, 2) },
      { name: "Sandra Mark", email: "sandra@example.com", topic: "Membership question", body: "Can I pause my membership while travelling?", status: "REPLIED", replies: [{ body: "Yes, you can pause or cancel any time from your account.", sentAt: at(-2, 12) }], createdAt: at(-3, 10) },
      { name: "Dayo Ajayi", email: "dayo@example.com", topic: "Telehealth consent", body: "What does the consent cover?", status: "REPLIED", replies: [{ body: "It covers video care across Texas and Nigeria. The full text is on our site.", sentAt: at(-4, 12) }], createdAt: at(-5, 10) },
      { name: "Amara Eze", email: "amara@example.com", topic: "Insurance and receipts", body: "Do your receipts work for my insurer?", status: "CLOSED", createdAt: at(-6, 10) },
    ],
  });

  // ── Notifications ──
  const n = (userId: string, d: Omit<Prisma.NotificationUncheckedCreateInput, "userId">) => db.notification.create({ data: { userId, ...d } });
  await n(adaeze.id, { category: "VISITS", title: "Visit reminder", body: `Follow-up with Dr. Oparaji · ${formatInTimeZone(aNext.startsAt, WAT, "EEE d MMM, h:mm a")} WAT`, href: "/portal/visits", createdAt: now });
  await n(adaeze.id, { category: "MESSAGES", title: "New message", body: "Dr. Oparaji: “Of course. I will add it to your agenda.”", href: "/portal/messages", createdAt: new Date(now.getTime() - 49 * 3600_000) });
  await n(adaeze.id, { category: "CARE_PLANS", title: "Care plan published", body: "Follow-up", href: `/portal/care-plans/${plan30.id}`, createdAt: plus(aFollow.endsAt, 90), readAt: now });
  await n(adaeze.id, { category: "BILLING", title: "Payment received", body: "Thrive monthly · $129.00", href: "/portal/billing", createdAt: periodStart, readAt: now });
  await n(adaeze.id, { category: "VISITS", title: "Visit completed", body: "Follow-up", href: "/portal/visits", createdAt: aFollow.endsAt, readAt: now });
  await n(doctor.id, { category: "MESSAGES", title: "New message from Adaeze N.", body: "“Can we go over snacks…”", href: "/doctor/messages", createdAt: new Date(now.getTime() - 2 * 3600_000) });
  await n(doctor.id, { category: "VISITS", title: "Booking confirmed", body: "Tunde B. · Family coaching · today 2:00 PM", href: "/doctor/appointments", createdAt: new Date(now.getTime() - 3 * 3600_000) });
  await n(doctor.id, { category: "PAYMENTS", title: "Payment received", body: "Tunde Bello · Family coaching", amount: "$119.00", href: "/doctor/earnings", createdAt: new Date(now.getTime() - 3 * 3600_000) });
  await n(doctor.id, { category: "VISITS", title: "Visit cancelled", body: "Chidi O. cancelled a follow-up · refunded $95.00", href: "/doctor/appointments", createdAt: new Date(now.getTime() - 26 * 3600_000), readAt: now });
  await n(doctor.id, { category: "INQUIRIES", title: "New inquiry", body: "Ife A. asked about family coaching", href: "/doctor/inquiries", createdAt: new Date(now.getTime() - 27 * 3600_000), readAt: now });
  await n(doctor.id, { category: "CARE_PLANS", title: "Care plan draft saved", body: "Mercy Adeyemi · Follow-up", href: "/doctor/patients", createdAt: new Date(now.getTime() - 4 * day), readAt: now });

  // ── Compliance ──
  await db.accessLog.createMany({
    data: [
      { actorId: doctor.id, actorLabel: "Dr. Oparaji", action: "Opened record · Adaeze Nwosu", patientId: adaeze.id, location: "Houston", createdAt: new Date(now.getTime() - 3600_000) },
      { actorId: doctor.id, actorLabel: "Dr. Oparaji", action: "Published care plan · Mercy A.", patientId: mercy.id, location: "Houston", createdAt: new Date(now.getTime() - 3 * 3600_000) },
      { actorLabel: "System", action: "Exported receipt · Tunde Bello", patientId: tunde.id, location: "Server", createdAt: new Date(now.getTime() - 2 * day) },
      { actorId: doctor.id, actorLabel: "Dr. Oparaji", action: "Opened record · Chidi Okafor", patientId: chidi.id, location: "Houston", createdAt: new Date(now.getTime() - 2 * day - 3600_000) },
      { actorLabel: "Support", action: "Viewed profile · Ngozi Eze", patientId: ngozi.id, location: "Lagos", createdAt: new Date(now.getTime() - 3 * day) },
      { actorLabel: "Care team", action: "Viewed profile · Adaeze Nwosu", patientId: adaeze.id, location: "Houston", createdAt: new Date(now.getTime() - 3 * day) },
    ],
  });
  await db.dataRequest.create({ data: { patientId: mercy.id, kind: "EXPORT", dueAt: new Date(now.getTime() + 12 * day), createdAt: new Date(now.getTime() - 18 * day) } });

  console.log(`
Seeded. Sign in with any of these (password: ${PASSWORD})
  Patient (Thrive member): adaeze@example.com
  Patient (new, empty):    new@example.com
  Patient (pay per visit): chidi@example.com
  Doctor:                  doctor@example.com  + TOTP secret ${DOCTOR_TOTP}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
