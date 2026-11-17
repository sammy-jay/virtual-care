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
  await expect(page.getByRole("link", { name: /Switch to/ })).toHaveCount(0); // no manual switch
  await ng.close();

  // Anywhere else: /ng pages move to the root.
  const us = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": "US" } });
  const usPage = await us.newPage();
  await usPage.goto("/ng/membership");
  await expect(usPage).toHaveURL(/:\d+\/membership$/);
  await expect(usPage.getByText(/call 911/)).toBeVisible();
  await us.close();
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
