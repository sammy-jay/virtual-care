/**
 * Check the mail setup without touching the app:
 *   npm run email:test -- you@example.com            sends the "welcome" sample
 *   npm run email:test -- you@example.com all        sends every template (24 emails)
 *   npm run email:test -- you@example.com verify ng  one template, as a Nigeria patient
 * Uses EMAIL_PROVIDER and SMTP_* from .env, exactly like the app.
 */
import { renderEmail, SAMPLES, type Audience } from "../src/lib/email/templates";
import { deliver, emailProvider, fromAddress, verifySmtp } from "../src/lib/email/transport";

const [to, which = "welcome", m = "us"] = process.argv.slice(2);
if (!to || !to.includes("@")) {
  console.error("Usage: npm run email:test -- you@example.com [template|all] [us|ng]");
  process.exit(1);
}
const market = m === "ng" ? "ng" : "us";
const app = process.env.APP_URL ?? "http://localhost:3000";
const picked = which === "all" ? SAMPLES : SAMPLES.filter((s) => s.t.template === which);
if (!picked.length) {
  console.error(`Unknown template "${which}". Options: all, ${SAMPLES.map((s) => s.t.template).join(", ")}`);
  process.exit(1);
}

console.log(`Provider: ${emailProvider()} · From: ${fromAddress()} · Links: ${app}`);
if (emailProvider() === "smtp") {
  await verifySmtp();
  console.log(`SMTP login OK (${process.env.SMTP_HOST || "smtp.hostinger.com"}:${process.env.SMTP_PORT || 465})`);
}
for (const s of picked) {
  const audience: Audience = s.audience === "patient" ? { kind: "patient", market } : s.audience === "doctor" ? { kind: "doctor" } : { kind: "public", market };
  const r = renderEmail(s.t, audience, app);
  await deliver({ to, ...r, subject: picked.length > 1 ? `[test] ${r.subject}` : r.subject });
  console.log(`sent ${s.t.template}`);
}
