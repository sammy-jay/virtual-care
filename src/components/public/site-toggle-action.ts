"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isMarket, SITE_COOKIE, stripMarket, withMarket } from "@/lib/market";

/**
 * Footer site toggle: remember the visitor's pick (src/proxy.ts then uses it instead of their
 * location) and show them the same page on the other site.
 */
export async function chooseSite(form: FormData) {
  const site = form.get("site");
  if (!isMarket(site)) return;
  const raw = String(form.get("path") ?? "/");
  // Only a path on this site: never "//host" or "/\host", which browsers treat as another site.
  const path = /^\/(?![/\\])/.test(raw) ? stripMarket(raw) : "/";
  (await cookies()).set(SITE_COOKIE, site, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect(withMarket(path, site));
}
