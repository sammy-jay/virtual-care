/**
 * Delivery. EMAIL_PROVIDER picks it:
 *   smtp    : any SMTP server (Hostinger: smtp.hostinger.com, port 465, SSL). Uses SMTP_* below.
 *   resend  : Resend HTTP API (RESEND_API_KEY).
 *   console : default; prints to the terminal (the EmailOutbox collection keeps a copy either way).
 * No server-only import, so scripts/send-test-email.mts can use it.
 */
import nodemailer, { type Transporter } from "nodemailer";

export type Outgoing = { to: string; subject: string; html: string; text: string; replyTo?: string };

export const emailProvider = () => (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();

/** The From header. Hostinger only accepts mail sent from the mailbox you sign in with. */
export function fromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  const user = process.env.SMTP_USER?.trim();
  return user ? `Dr. Oparaji · Virtual Care <${user}>` : "Dr. Oparaji · Virtual Care <care@example.com>";
}

let smtp: Transporter | null = null;
function smtpTransport() {
  if (smtp) return smtp;
  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("EMAIL_PROVIDER=smtp needs SMTP_USER and SMTP_PASS");
  smtp = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL from the start; 587 = STARTTLS
    requireTLS: port !== 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return smtp;
}

/** Sends one email. Throws on failure; the caller records the error. */
export async function deliver(m: Outgoing): Promise<void> {
  const provider = emailProvider();
  const replyTo = m.replyTo ?? (process.env.EMAIL_REPLY_TO || undefined);
  if (provider === "smtp") {
    await smtpTransport().sendMail({ from: fromAddress(), to: m.to, replyTo, subject: m.subject, html: m.html, text: m.text });
    return;
  }
  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: m.to, reply_to: replyTo, subject: m.subject, html: m.html, text: m.text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  console.info(`\n[email] to=${m.to} subject="${m.subject}"\n${m.text}\n`);
}

/** Checks the SMTP login without sending anything. */
export async function verifySmtp() {
  await smtpTransport().verify();
}
