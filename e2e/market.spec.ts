import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("the site follows the visitor's current location", async ({ browser }) => {
  // In Nigeria: root pages move to /ng.
  const ng = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": "NG" } });
  const page = await ng.newPage();
  await page.goto("/services");
  await expect(page).toHaveURL(/\/ng\/services$/);
  await expect(page.getByText(/call 112 or 767/)).toBeVisible();
  await expect(page.getByText(/about ₦/).first()).toBeVisible(); // naira estimate on visit prices
  await expect(page.getByRole("button", { name: "Nigeria" })).toHaveAttribute("aria-pressed", "true"); // footer toggle shows the current site
  await ng.close();

  // Anywhere else: /ng pages move to the root.
  const us = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": "US" } });
  const usPage = await us.newPage();
  await usPage.goto("/ng/membership");
  await expect(usPage).toHaveURL(/:\d+\/membership$/);
  await expect(usPage.getByText(/call 911/)).toBeVisible();
  await us.close();
});

test("the footer toggle switches sites, and the choice sticks over location", async ({ browser }) => {
  // Someone in Nigeria lands on the Nigeria site…
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": "NG" } });
  const page = await ctx.newPage();
  await page.goto("/membership");
  await expect(page).toHaveURL(/\/ng\/membership$/);
  await expect(page.getByText("₦200,000").first()).toBeVisible();

  // …switches to the US site from the footer and gets the same page there.
  await page.getByRole("button", { name: "United States" }).click();
  await expect(page).toHaveURL(/:\d+\/membership$/);
  await expect(page.getByText(/call 911/)).toBeVisible();
  await expect(page.getByText("$149").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "United States" })).toHaveAttribute("aria-pressed", "true");

  // The choice sticks while browsing, even though they are still in Nigeria.
  await page.goto("/services");
  await expect(page).toHaveURL(/:\d+\/services$/);
  await page.goto("/ng/about");
  await expect(page).toHaveURL(/:\d+\/about$/);

  // Switching back works the same way.
  await page.getByRole("button", { name: "Nigeria" }).click();
  await expect(page).toHaveURL(/\/ng\/about$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/ng$/);
  await ctx.close();
});

test("US visitors stay at the root and see the licensure map", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.getByRole("img", { name: /licensed in 29 states/ }).first()).toBeVisible();
  await expect(page.getByText("Houston")).toHaveCount(0);
});

test("an account always opens its own site's portal", async ({ page }) => {
  // Adaeze is a Nigeria patient; signing in from the US site takes her to /ng/portal.
  await signIn(page, "adaeze@example.com");
  await expect(page).toHaveURL(/\/ng\/portal/);
  // Following a US portal link sends her to the same page on her site.
  await page.goto("/portal/visits?market=us");
  await expect(page).toHaveURL(/\/ng\/portal\/visits/);
  await expect(page.getByRole("heading", { name: "My visits" })).toBeVisible();
});
