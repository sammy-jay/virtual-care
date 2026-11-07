import { expect, test } from "@playwright/test";
import { db, doctorSignIn, latestEmail, signIn } from "./helpers";

test("doctor's day: TOTP sign-in → publish care plan → reply to a message", async ({ page, browser }) => {
  await doctorSignIn(page);
  await expect(page.getByRole("heading", { name: /Dr\. Oparaji/ })).toBeVisible();
  await expect(page.getByText(/care plans? to publish/)).toBeVisible();

  // Publish Mercy's draft plan (09.11 → 10.10)
  const mercy = await db.user.findUniqueOrThrow({ where: { email: "mercy@example.com" } });
  const draft = await db.carePlan.findFirstOrThrow({ where: { patientId: mercy.id, status: "DRAFT" } });
  await page.goto(`/doctor/care-plans/${draft.id}`);
  await page.getByLabel("Nutrition").fill("More vegetables\nWater before meals");
  await page.getByLabel("Next steps").fill("Walk daily");
  await page.getByRole("button", { name: "Publish to patient" }).click();
  await expect(page.getByRole("heading", { name: "Publish this care plan?" })).toBeVisible();
  await page.getByRole("button", { name: "Publish now" }).click();
  await page.waitForURL(/published=1/);
  await latestEmail("mercy@example.com", "Your care plan is ready");

  // Reply to Tunde (09.8)
  const tunde = await db.user.findUniqueOrThrow({ where: { email: "tunde@example.com" } });
  const c = await db.conversation.findFirstOrThrow({ where: { patientId: tunde.id, kind: "doctor" } });
  await page.goto(`/doctor/messages?c=${c.id}`);
  await page.getByLabel("Message").fill("Yes, Friday at 6 PM works.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Yes, Friday at 6 PM works.")).toBeVisible();

  // Patient sees the plan and the reply
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await signIn(p, "mercy@example.com");
  await p.goto("/portal/care-plans");
  await expect(p.getByText("Follow-up plan")).toBeVisible();
  await ctx.close();
});

test("patients cannot open the doctor portal", async ({ page }) => {
  await signIn(page, "adaeze@example.com");
  await page.goto("/doctor");
  await page.waitForURL(/\/portal$/);
});
