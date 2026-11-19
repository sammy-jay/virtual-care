import { expect, test } from "@playwright/test";
import { db, doctorSignIn, signIn } from "./helpers";

test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

test("video visit: precheck → waiting → doctor admits → doctor ends → patient sees ended (07.x, 10.1–10.2)", async ({ page, browser }) => {
  const ngozi = await db.user.findUniqueOrThrow({ where: { email: "ngozi@example.com" } });
  const vt = await db.visitType.findUniqueOrThrow({ where: { slug: "follow-up" } });
  const start = new Date(Date.now() + 5 * 60_000);
  const a = await db.appointment.create({
    data: {
      patientId: ngozi.id, visitTypeId: vt.id, startsAt: start, endsAt: new Date(start.getTime() + 30 * 60_000), status: "SCHEDULED",
      region: "NG", consentAt: new Date(), patientTimeZone: ngozi.timeZone, priceCents: 8075, standardCents: 9500, pricingReason: "MEMBER_RATE", reason: "BP check",
    },
  });

  await signIn(page, "ngozi@example.com");
  await page.goto(`/portal/visits/${a.id}/precheck`);
  await expect(page.getByRole("heading", { name: "Check your camera and microphone" })).toBeVisible();
  await page.getByRole("button", { name: "Join visit" }).click();
  await page.waitForURL(new RegExp(`/room/${a.id}`));
  await expect(page.getByText("Waiting for Dr. Oparaji to join")).toBeVisible();

  const ctx = await browser.newContext();
  const doc = await ctx.newPage();
  await doctorSignIn(doc);
  await doc.goto(`/doctor/visits/${a.id}/waiting`);
  await expect(doc.getByText(/In waiting room/)).toBeVisible();
  await doc.getByRole("button", { name: "Admit patient" }).click();
  await doc.waitForURL(/\/room$/);

  await expect(page.getByText(/elapsed/)).toBeVisible({ timeout: 15_000 });
  // Peer-to-peer call: both browsers connect to each other.
  await expect(page.locator('[data-peer="connected"]')).toBeVisible({ timeout: 30_000 });
  await expect(doc.locator('[data-peer="connected"]')).toBeVisible({ timeout: 30_000 });
  await doc.getByLabel("Quick notes").fill("BP 126/80 today");
  await expect(doc.getByText("Saved")).toBeVisible();
  await doc.getByRole("button", { name: "End visit" }).first().click();
  await doc.waitForURL(/\/notes$/);
  await expect(doc.getByText("BP 126/80 today")).toBeVisible();

  await page.waitForURL(/\/ended$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "You have left the visit" })).toBeVisible();
  expect((await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("COMPLETED");
  await ctx.close();
});
