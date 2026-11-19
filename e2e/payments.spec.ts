import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { db, pickFirstSlot, signIn } from "./helpers";

/**
 * Real gateway checks against the Stripe and Paystack TEST environments (no real money).
 * Skipped unless E2E_PAYMENTS=test, which runs the app with PAYMENTS_PROVIDER=test and the
 * STRIPE_SECRET_KEY / PAYSTACK_SECRET_KEY test keys from .env:
 *   E2E_PAYMENTS=test npx playwright test e2e/payments.spec.ts
 *
 * Stripe is paid on its real hosted Checkout page. Paystack's hosted page sits behind a Cloudflare
 * bot check that blocks automated browsers, so the test pays the app's own Paystack transaction
 * through Paystack's test charge API instead, then follows the normal return and webhook paths.
 */
test.skip(process.env.E2E_PAYMENTS !== "test", "Set E2E_PAYMENTS=test to run against the Stripe and Paystack test gateways.");
test.setTimeout(240_000);

const PAYSTACK_TEST_CARD = { number: "4084084084084081", cvv: "408", expiry_month: "12", expiry_year: "2030" };

/** The Paystack test key, from the environment or .env (the test runner does not load .env itself). */
function paystackKey() {
  let key = process.env.PAYSTACK_SECRET_KEY;
  if (!key && existsSync(".env")) key = readFileSync(".env", "utf8").match(/^PAYSTACK_SECRET_KEY="?([^"\r\n]*)"?/m)?.[1];
  if (!key?.startsWith("sk_test_")) throw new Error("e2e/payments.spec.ts needs a Paystack TEST key (sk_test_…).");
  return key;
}

async function paystack<T = Record<string, unknown>>(path: string, body?: unknown): Promise<{ status: boolean; message: string; data: T }> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${paystackKey()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function bookPaidVisit(page: Page, type: string, region: string) {
  await page.goto(`/portal/book?type=${type}`);
  await pickFirstSlot(page);
  await page.getByLabel("Reason for visit").fill("Gateway check");
  await page.getByLabel("Where are you right now?").selectOption(region);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/pay$/);
}

test("US account pays in dollars on Stripe Checkout", async ({ page }) => {
  await signIn(page, "chidi@example.com");
  await bookPaidVisit(page, "initial-consultation", "US-TX");
  await expect(page.getByText("You'll pay on Stripe's secure page")).toBeVisible();
  await page.getByRole("button", { name: /^Pay \$/ }).click();

  await page.waitForURL(/checkout\.stripe\.com/);
  const form = page.frameLocator("iframe").first();
  await form.getByRole("textbox", { name: "Card number" }).fill("4242 4242 4242 4242");
  await form.getByRole("textbox", { name: /Expiration/ }).fill("12 / 34");
  await form.getByRole("textbox", { name: "Security code" }).fill("123");
  const name = form.getByRole("textbox", { name: /Cardholder name|Name on card/ });
  if (await name.isVisible().catch(() => false)) await name.fill("Chidi Okafor");
  const zip = form.getByRole("textbox", { name: /ZIP|Postal/ });
  if (await zip.isVisible().catch(() => false)) await zip.fill("77002");
  const link = form.getByRole("checkbox", { name: /Save my information/ });
  if (await link.isChecked().catch(() => false)) await link.uncheck();
  await form.getByRole("button", { name: /^(Pay|Subscribe|Complete)/ }).last().click();

  await page.waitForURL(/localhost:\d+\/portal\/visits\/.+\/confirmed/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "You are booked" })).toBeVisible();

  const user = await db.user.findUniqueOrThrow({ where: { email: "chidi@example.com" } });
  const pay = await db.payment.findFirstOrThrow({ where: { patientId: user.id }, orderBy: { createdAt: "desc" } });
  expect(pay.status).toBe("PAID");
  expect(pay.currency).toBe("USD");
  expect(pay.amountCents).toBe(18000);
  expect(pay.providerRef).toMatch(/^pi_/);
  const card = await db.paymentMethod.findFirst({ where: { userId: user.id, provider: "stripe" } });
  expect(card?.last4).toBe("4242");
  expect(card?.providerRef).toMatch(/^pm_/);
});

test("Nigeria account pays in naira through Paystack", async ({ page }) => {
  await signIn(page, "adaeze@example.com");
  await bookPaidVisit(page, "family-coaching", "NG");
  await expect(page.getByText("You'll pay on Paystack's secure page")).toBeVisible();
  await page.getByRole("button", { name: /^Pay ₦/ }).click();
  await page.waitForURL(/checkout\.paystack\.com/);

  // The transaction the app created on Paystack.
  const user = await db.user.findUniqueOrThrow({ where: { email: "adaeze@example.com" } });
  const co = await db.checkout.findFirstOrThrow({ where: { userId: user.id, provider: "paystack", status: "OPEN" }, orderBy: { createdAt: "desc" } });
  expect(co.currency).toBe("NGN");
  const tx = await paystack<{ status: string; amount: number; currency: string }>(`/transaction/verify/${co.ref}`);
  expect(tx.data.status).toBe("abandoned"); // initialized, not paid yet
  expect(tx.data.amount).toBe(co.amountCents);

  // Pay with Paystack's success test card, standing in for the hosted page. Paystack will not take a
  // second payment on the same reference, so this one gets its own, with the same checkout metadata.
  const ref = `${co.ref}_api`;
  const paid = await paystack<{ status: string }>("/charge", {
    email: user.email,
    amount: co.amountCents,
    currency: "NGN",
    reference: ref,
    metadata: { checkoutId: co.id },
    card: PAYSTACK_TEST_CARD,
  });
  expect(paid.status, paid.message).toBe(true);
  expect(paid.data.status).toBe("success");
  await db.checkout.update({ where: { id: co.id }, data: { ref } });

  // Paystack then sends the patient back here; the app re-verifies with Paystack before confirming.
  await page.goto(`/ng/portal/billing/return/paystack?trxref=${ref}&reference=${ref}`);
  await page.waitForURL(/\/portal\/visits\/.+\/confirmed/);
  await expect(page.getByRole("heading", { name: "You are booked" })).toBeVisible();

  const pay = await db.payment.findFirstOrThrow({ where: { patientId: user.id }, orderBy: { createdAt: "desc" } });
  expect(pay.status).toBe("PAID");
  expect(pay.currency).toBe("NGN");
  expect(pay.amountCents).toBe(co.amountCents);
  const card = await db.paymentMethod.findFirst({ where: { userId: user.id, provider: "paystack" } });
  expect(card?.last4).toBe("4081");
  expect(card?.providerRef).toMatch(/^AUTH_/);

  // The signed webhook for the same payment arrives later and must not double-fulfil.
  const body = JSON.stringify({ event: "charge.success", data: { reference: ref } });
  const sig = createHmac("sha512", paystackKey()).update(body).digest("hex");
  const hook = await page.request.post("/api/webhooks/paystack", { data: body, headers: { "content-type": "application/json", "x-paystack-signature": sig } });
  expect(hook.status()).toBe(200);
  expect(await db.payment.count({ where: { patientId: user.id, providerRef: pay.providerRef } })).toBe(1);

  // Saved card: the next visit is charged server-side with the Paystack authorization, no redirect.
  await bookPaidVisit(page, "initial-consultation", "NG");
  await page.getByLabel(/Visa ending 4081/).check();
  await page.getByRole("button", { name: /^Pay ₦/ }).click();
  await page.waitForURL(/\/portal\/visits\/.+\/confirmed/);
  const second = await db.payment.findFirstOrThrow({ where: { patientId: user.id }, orderBy: { createdAt: "desc" } });
  expect(second.id).not.toBe(pay.id);
  expect(second.status).toBe("PAID");
  const check = await paystack<{ status: string }>(`/transaction/verify/${second.providerRef}`);
  expect(check.data.status).toBe("success");
});
