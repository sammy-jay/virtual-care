import { expect, test } from "@playwright/test";
import { db, latestEmail, PASSWORD, pickFirstSlot, signIn } from "./helpers";

test("new patient: sign up → verify → profile → free intro call → confirmed", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;
  // A Nigeria-based patient signs up on the Nigeria site.
  await page.goto("/ng/sign-up");
  // Errors state (03.2)
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Please fix the \d items? below/)).toBeVisible();

  await page.getByLabel("Full name").fill("Funmi Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByLabel("Time zone").selectOption("Africa/Lagos");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/verify-email/);

  const mail = await latestEmail(email, "Your verification code");
  const code = mail.text.match(/\d{6}/)![0];
  await page.getByLabel("Digit 1").fill(code);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL(/health-profile/);
  await expect(page.getByText("Your email is verified")).toBeVisible();

  // Profile validation (05.6)
  await page.getByLabel("Date of birth").fill("2099-03-14");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Fix 1 field before saving.")).toBeVisible();
  await page.getByLabel("Date of birth").fill("1990-03-14");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  // Empty overview (05.2)
  await page.goto("/portal");
  await expect(page.getByText("Three quick steps to get started.")).toBeVisible();

  // Free intro call (04.1)
  await page.goto("/portal/book?type=intro");
  await expect(page.getByText("Free · no card needed")).toBeVisible();
  await expect(page.getByText("Available after your first visit")).toBeVisible();
  await pickFirstSlot(page);
  await page.getByLabel("Reason for visit").fill("Getting started");
  await page.getByLabel("Where are you right now?").selectOption("NG");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL(/confirmed/);
  await expect(page.getByRole("heading", { name: "You are booked" })).toBeVisible();
  await latestEmail(email, "Booking confirmed");
});

test("booking from an unlicensed region is blocked (04.8)", async ({ page }) => {
  await signIn(page, "chidi@example.com");
  await page.goto("/portal/book?type=initial-consultation");
  await pickFirstSlot(page);
  await page.getByLabel("Reason for visit").fill("Second opinion");
  // Kentucky is not one of the states Dr. Oparaji is licensed in.
  await page.getByLabel("Where are you right now?").selectOption("US-KY");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByRole("heading", { name: "We cannot see you from this location" })).toBeVisible();
});

test("member pays the member rate; a declined card is not charged (04.3, 06.5, 06.7)", async ({ page }) => {
  await signIn(page, "adaeze@example.com");
  await page.goto("/portal/book?type=family-coaching");
  await expect(page.getByText("Why am I paying?")).toBeVisible();
  await expect(page.getByText("₦178,500").first()).toBeVisible();
  await pickFirstSlot(page);
  await page.getByLabel("Reason for visit").fill("Family meals");
  await page.getByLabel("Where are you right now?").selectOption("NG");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/pay$/);

  // Declined card
  await page.getByLabel("Use a new card").check();
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByLabel("Expiry").fill("08 / 29");
  await page.getByLabel("CVC").fill("123");
  await page.getByRole("button", { name: "Pay ₦178,500" }).click();
  await page.waitForURL(/billing\/failed/);
  await expect(page.getByText("You have not been charged.")).toBeVisible();

  // Retry with the saved Visa
  await page.getByRole("link", { name: "Try another card" }).click();
  await page.getByLabel("Visa ending 4242").check();
  await page.getByRole("button", { name: "Pay ₦178,500" }).click();
  await page.waitForURL(/confirmed/);
  await expect(page.getByText("₦178,500 · member rate")).toBeVisible();
});

test("cancel more than 12 h ahead returns the included visit (04.13)", async ({ page }) => {
  await signIn(page, "adaeze@example.com");
  const user = await db.user.findUniqueOrThrow({ where: { email: "adaeze@example.com" } });
  const a = await db.appointment.findFirstOrThrow({ where: { patientId: user.id, status: "SCHEDULED", usesAllowance: true } });
  await page.goto(`/portal/visits?id=${a.id}&dialog=cancel`);
  await expect(page.getByText("Your included visit returns")).toBeVisible();
  await page.getByRole("button", { name: "Cancel visit" }).click();
  await page.waitForURL(/cancelled=1/);
  // Allowance is back: a follow-up is included again
  await page.goto("/portal/book?type=follow-up");
  await expect(page.getByText(/Included · 1 of 1 this month/)).toBeVisible();
});

test("five wrong passwords pause sign-in (03.4, 03.5)", async ({ page }) => {
  for (let i = 0; i < 4; i++) {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("mercy@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/incorrect/)).toBeVisible();
  }
  await expect(page.getByText(/1 attempt left/)).toBeVisible();
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/locked/);
  await expect(page.getByRole("heading", { name: "Too many attempts" })).toBeVisible();
});
