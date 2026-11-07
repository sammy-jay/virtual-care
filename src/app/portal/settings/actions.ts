"use server";

import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requirePatient, requireUser } from "@/lib/auth/dal";
import { hashPassword, MIN_PASSWORD, verifyPassword } from "@/lib/auth/password";
import { destroySession, revokeAllSessions } from "@/lib/auth/session";
import { refundPayment } from "@/lib/billing";
import { db } from "@/lib/db";
import { notifyDoctors } from "@/lib/notify";
import { TIME_ZONES } from "@/lib/time";

export async function saveSettings(form: FormData) {
  const user = await requirePatient();
  const tz = String(form.get("timeZone"));
  await db.user.update({
    where: { id: user.id },
    data: {
      timeZone: TIME_ZONES.some((z) => z.id === tz) ? tz : user.timeZone,
      notifyPrefs: {
        visitReminders: form.get("visitReminders") === "on",
        newMessages: form.get("newMessages") === "on",
        carePlans: form.get("carePlans") === "on",
        productNews: form.get("productNews") === "on",
      },
    },
  });
  revalidatePath("/portal", "layout");
  redirect("/portal/settings?saved=1");
}

export type PwState = { ok?: boolean; errors?: Record<string, string> };

/** 05.12 — change password; signs out every other device. */
export async function changePassword(_: PwState, form: FormData): Promise<PwState> {
  const user = await requireUser();
  const session = await getSession();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!(await verifyPassword(current, user.passwordHash))) errors.current = "That is not your current password.";
  if (next.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (Object.keys(errors).length) return { errors };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await revokeAllSessions(user.id, session?.id);
  return { ok: true };
}

export async function revokeOtherSessions() {
  const user = await requireUser();
  const session = await getSession();
  await revokeAllSessions(user.id, session?.id);
  redirect(user.role === "PATIENT" ? "/portal/settings/security?signedout=1" : "/doctor/settings?signedout=1");
}

export async function revokeSession(form: FormData) {
  const user = await requireUser();
  await db.session.updateMany({ where: { id: String(form.get("id")), userId: user.id }, data: { revokedAt: new Date() } });
  revalidatePath("/portal/settings/security");
}

export type TotpState = { qr?: string; secret?: string; error?: string; ok?: boolean };

/** Two-step sign-in with an authenticator app. Step 1 makes a secret; step 2 verifies a code. */
export async function startTotp(): Promise<TotpState> {
  const user = await requireUser();
  const secret = generateSecret();
  await db.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpEnabled: false } });
  const uri = generateURI({ issuer: "Dr. Oparaji Virtual Care", label: user.email, secret });
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 180 }) };
}

export async function confirmTotp(_: TotpState, form: FormData): Promise<TotpState> {
  const user = await requireUser();
  const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!fresh.totpSecret || token.length !== 6 || !(await verify({ secret: fresh.totpSecret, token, epochTolerance: 30 })).valid) return { error: "That code did not match. Try the current code." };
  await db.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
  revalidatePath("/portal/settings/security");
  return { ok: true };
}

export async function disableTotp() {
  const user = await requirePatient();
  await db.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
  revalidatePath("/portal/settings/security");
}

/** 05.13 — export request, answered by the practice within 30 days. */
export async function requestExport() {
  const user = await requirePatient();
  const open = await db.dataRequest.findFirst({ where: { patientId: user.id, kind: "EXPORT", status: "OPEN" } });
  if (!open) {
    await db.dataRequest.create({ data: { patientId: user.id, kind: "EXPORT", dueAt: new Date(Date.now() + 30 * 86400_000) } });
    await notifyDoctors({ category: "INQUIRIES", title: "New data request", body: `${user.name} asked to export their data`, href: "/doctor/settings/data-requests" });
  }
  redirect("/portal/settings/privacy?requested=1");
}

/** 05.14 — cancel plan, cancel + refund upcoming visits, remove profile and messages; keep medical records. */
export async function deleteAccount(form: FormData) {
  const user = await requirePatient();
  if (String(form.get("confirm")) !== "DELETE") redirect("/portal/settings/privacy?dialog=delete&error=1");
  const upcoming = await db.appointment.findMany({ where: { patientId: user.id, status: { in: ["SCHEDULED", "PENDING_PAYMENT"] }, startsAt: { gte: new Date() } } });
  for (const a of upcoming) {
    await db.appointment.update({ where: { id: a.id }, data: { status: "CANCELED", canceledAt: new Date(), canceledBy: "PATIENT" } });
    const paid = await db.payment.findFirst({ where: { appointmentId: a.id, status: "PAID" } });
    if (paid) await refundPayment(paid.id, paid.amountCents, "Account deleted — refunded in full");
  }
  await db.membership.updateMany({ where: { patientId: user.id, status: { in: ["ACTIVE", "PAST_DUE"] } }, data: { status: "CANCELED", canceledAt: new Date() } });
  await db.message.deleteMany({ where: { conversation: { patientId: user.id } } });
  await db.conversation.deleteMany({ where: { patientId: user.id } });
  await db.patientProfile.deleteMany({ where: { userId: user.id } });
  await db.paymentMethod.deleteMany({ where: { userId: user.id } });
  await db.dataRequest.create({ data: { patientId: user.id, kind: "DELETE", status: "COMPLETED", completedAt: new Date(), dueAt: new Date() } });
  await db.user.update({ where: { id: user.id }, data: { deletedAt: new Date(), email: `deleted+${user.id}@invalid`, phone: null, totpSecret: null } });
  await revokeAllSessions(user.id);
  await destroySession();
  redirect("/?deleted=1");
}
