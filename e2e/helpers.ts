import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { generate } from "otplib";

export const db = new PrismaClient();
export const PASSWORD = "password1234";

export async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/portal/);
}

export async function doctorSignIn(page: Page) {
  await page.goto("/doctor/sign-in");
  await page.getByLabel("Email").fill("doctor@example.com");
  await page.getByLabel("Password").fill(PASSWORD);
  const code = await generate({ secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" });
  await page.getByLabel("Digit 1").fill(code); // CodeInput spreads pasted digits
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/doctor$/);
}

export async function latestEmail(to: string, subject: string) {
  const row = await db.emailOutbox.findFirst({ where: { to, subject }, orderBy: { createdAt: "desc" } });
  expect(row, `email "${subject}" to ${to}`).toBeTruthy();
  return row!;
}

/** Pick the first open time on the booking page. */
export async function pickFirstSlot(page: Page) {
  const grid = page.locator("button[aria-pressed]").filter({ hasText: /^\d{1,2}:\d{2} [AP]M$/ });
  await grid.first().click();
}
