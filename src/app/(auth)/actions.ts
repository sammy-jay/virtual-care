"use server";

import { redirect } from "next/navigation";
import { verify as verifyTotp } from "otplib";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSession } from "@/lib/auth/dal";
import { hashPassword, LOCK_MINUTES, MAX_FAILED_LOGINS, MIN_PASSWORD, verifyPassword } from "@/lib/auth/password";
import { cookies } from "next/headers";
import { createSession, destroySession, randomToken, revokeAllSessions, sha256 } from "@/lib/auth/session";
import { consumeEmailCode, findResetToken, issueEmailCode, issueResetToken } from "@/lib/auth/tokens";
import { TIME_ZONES } from "@/lib/time";
import { fromDbMarket, toDbMarket, withMarket } from "@/lib/market";
import { getMarket, rememberMarket } from "@/lib/market-server";

export type FormState = { errors?: Record<string, string>; message?: string; values?: Record<string, string>; attemptsLeft?: number };

const collect = (form: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
function issues(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
}
const safeNext = (n: FormDataEntryValue | null, fallback: string) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
};

// ─── Sign up (03.1 / 03.2) ───────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^\+?[\d\s()-]{8,20}$/.test(v), "Enter a valid phone number, for example +234 803 555 0142"),
  email: z.email("Enter a valid email address, like name@example.com."),
  password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters.`),
  timeZone: z.string().refine((tz) => TIME_ZONES.some((z) => z.id === tz), "Choose your time zone."),
  consent: z.literal("on", { error: "Please accept to continue." }),
});

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const values = collect(form, ["name", "phone", "email", "timeZone"]);
  const parsed = signUpSchema.safeParse({ ...values, password: form.get("password"), consent: form.get("consent") ?? undefined });
  if (!parsed.success) {
    const errors = issues(parsed.error);
    return { errors, values, message: `Please fix the ${Object.keys(errors).length} item${Object.keys(errors).length === 1 ? "" : "s"} below to continue.` };
  }
  const { name, phone, email, password, timeZone } = parsed.data;
  const lower = email.toLowerCase();
  if (await db.user.findUnique({ where: { email: lower } })) {
    return { errors: { email: "An account with this email already exists. Sign in instead." }, values, message: "Please fix the 1 item below to continue." };
  }
  // The account belongs to the site it was created on (US at the root, Nigeria under /ng).
  const market = await getMarket();
  const user = await db.user.create({
    data: {
      market: toDbMarket(market),
      name,
      phone: phone || null,
      email: lower,
      passwordHash: await hashPassword(password),
      timeZone,
      consentAt: new Date(),
      notifyPrefs: { visitReminders: true, newMessages: true, carePlans: true, productNews: false },
      // Nigeria accounts are in Nigeria; US patients confirm their state when they book.
      profile: { create: { region: market === "ng" ? "NG" : null } },
    },
  });
  const code = await issueEmailCode(user.id);
  await sendEmail(user.email, { template: "verify", code });
  await createSession(user.id, false);
  await rememberMarket(market);
  redirect(withMarket(`/verify-email${form.get("next") ? `?next=${encodeURIComponent(String(form.get("next")))}` : ""}`, market));
}

// ─── Verify email (03.8) ─────────────────────────────────────────────────────

export async function verifyEmail(_: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { message: "Enter all 6 digits." };
  const r = await consumeEmailCode(session.userId, code);
  if (r === "expired") return { message: "That code has expired. We can send a new one." };
  if (r === "invalid") return { message: "That code is not right. Check the email and try again." };
  await db.user.update({ where: { id: session.userId }, data: { emailVerified: new Date() } });
  await sendEmail(session.user.email, { template: "welcome", name: session.user.name.split(" ")[0] });
  redirect(safeNext(form.get("next"), "/portal/health-profile?welcome=1"));
}

export async function resendCode() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const code = await issueEmailCode(session.userId);
  await sendEmail(session.user.email, { template: "verify", code });
  redirect("/verify-email?resent=1");
}

// ─── Sign in (03.3 / 03.4 / 03.5) ────────────────────────────────────────────

async function checkCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || user.deletedAt) return { kind: "bad" as const, attemptsLeft: undefined };
  if (user.lockedUntil && user.lockedUntil > new Date()) return { kind: "locked" as const, until: user.lockedUntil };
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    if (failed >= MAX_FAILED_LOGINS) {
      const until = new Date(Date.now() + LOCK_MINUTES * 60_000);
      await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: until } });
      return { kind: "locked" as const, until };
    }
    await db.user.update({ where: { id: user.id }, data: { failedLogins: failed } });
    return { kind: "bad" as const, attemptsLeft: MAX_FAILED_LOGINS - failed };
  }
  return { kind: "ok" as const, user };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const values = collect(form, ["email"]);
  const r = await checkCredentials(values.email, String(form.get("password") ?? ""));
  if (r.kind === "locked") redirect(`/sign-in/locked?until=${r.until.getTime()}`);
  if (r.kind === "bad")
    return {
      values,
      attemptsLeft: r.attemptsLeft,
      message:
        r.attemptsLeft != null && r.attemptsLeft <= 3
          ? `The email or password is incorrect. You have ${r.attemptsLeft} attempt${r.attemptsLeft === 1 ? "" : "s"} left before sign-in pauses for 15 minutes.`
          : "The email or password is incorrect.",
      errors: { password: "Check your password and try again." },
    };
  const { user } = r;
  if (user.role !== "PATIENT") return { values, message: "This is the patient sign-in. Doctors sign in from the doctor portal.", errors: {} };
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  if (user.totpEnabled && user.totpSecret) {
    // Password is right; hold the sign-in until the authenticator code is entered.
    const raw = randomToken();
    await db.authToken.create({ data: { userId: user.id, purpose: "TWO_FACTOR", tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 10 * 60_000) } });
    (await cookies()).set("vc_2fa", raw, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
    redirect(`/sign-in/code?remember=${form.get("remember") === "on" ? 1 : 0}&next=${encodeURIComponent(safeNext(form.get("next"), "/portal"))}`);
  }
  await createSession(user.id, form.get("remember") === "on");
  const home = fromDbMarket(user.market);
  await rememberMarket(home);
  if (!user.emailVerified) {
    const code = await issueEmailCode(user.id);
    await sendEmail(user.email, { template: "verify", code });
    redirect(withMarket("/verify-email", home));
  }
  redirect(withMarket(safeNext(form.get("next"), "/portal"), home));
}

/** Second step for patients with two-step sign-in on (05.12). */
export async function verifySignInCode(_: FormState, form: FormData): Promise<FormState> {
  const jar = await cookies();
  const raw = jar.get("vc_2fa")?.value;
  const pending = raw ? await db.authToken.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } }) : null;
  if (!pending || pending.purpose !== "TWO_FACTOR" || pending.usedAt || pending.expiresAt < new Date()) redirect("/sign-in?expired=1");
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  const ok = token.length === 6 && !!pending.user.totpSecret && (await verifyTotp({ secret: pending.user.totpSecret, token, epochTolerance: 30 })).valid;
  if (!ok) return { message: "That code did not match. Use the current code from your authenticator app." };
  await db.authToken.update({ where: { id: pending.id }, data: { usedAt: new Date() } });
  jar.delete("vc_2fa");
  await createSession(pending.userId, form.get("remember") === "1");
  const home = fromDbMarket(pending.user.market);
  await rememberMarket(home);
  redirect(withMarket(safeNext(form.get("next"), "/portal"), home));
}

export async function doctorSignIn(_: FormState, form: FormData): Promise<FormState> {
  const values = collect(form, ["email"]);
  const r = await checkCredentials(values.email, String(form.get("password") ?? ""));
  if (r.kind === "locked") redirect(`/sign-in/locked?until=${r.until.getTime()}`);
  if (r.kind === "bad") return { values, message: "The email or password is incorrect.", errors: { password: "Check your password and try again." } };
  const { user } = r;
  if (user.role === "PATIENT") return { values, message: "This sign-in is for the care team. Patients sign in from the patient portal." };
  if (user.totpEnabled && user.totpSecret) {
    const token = String(form.get("code") ?? "").replace(/\D/g, "");
    const ok = token.length === 6 && (await verifyTotp({ secret: user.totpSecret, token, epochTolerance: 30 })).valid;
    if (!ok) return { values, errors: { code: "That code did not match. Use the current code from your authenticator app." } };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession(user.id, false);
  redirect(safeNext(form.get("next"), "/doctor"));
}

// ─── Reset password (03.6 / 03.7 / 03.9 / 03.10) ─────────────────────────────

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { values: { email }, errors: { email: "Enter a valid email address, like name@example.com." } };
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.deletedAt) {
    const raw = await issueResetToken(user.id);
    await sendEmail(user.email, { template: "reset_password", url: `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${raw}` });
  }
  // Same response whether or not the account exists.
  redirect(`/forgot-password/sent?email=${encodeURIComponent(email)}`);
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const raw = String(form.get("token") ?? "");
  const pw = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const token = await findResetToken(raw);
  if (!token) redirect("/reset-password?expired=1");
  const errors: Record<string, string> = {};
  if (pw.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (pw !== confirm) errors.confirm = "The passwords do not match.";
  if (Object.keys(errors).length) return { errors };
  await db.user.update({ where: { id: token.userId }, data: { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null } });
  await db.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  await revokeAllSessions(token.userId);
  await destroySession();
  redirect("/reset-password/done");
}

export async function signOut() {
  const session = await getSession();
  const doctor = session && session.user.role !== "PATIENT";
  await destroySession();
  redirect(doctor ? "/doctor/sign-in" : "/sign-in");
}
