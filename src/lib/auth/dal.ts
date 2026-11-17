import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { fromDbMarket, withMarket } from "@/lib/market";
import { currentPath, getMarket } from "@/lib/market-server";
import { readSession } from "./session";

/** Data Access Layer: the only place pages and actions learn who is signed in. */
export const getSession = cache(readSession);

export const getUser = cache(async () => (await getSession())?.user ?? null);

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in?expired=1");
  return session.user;
}

export async function requirePatient() {
  const session = await getSession();
  const market = await getMarket();
  if (!session) redirect(withMarket("/sign-in?expired=1", market));
  if (session.user.role !== "PATIENT") redirect("/doctor");
  // Each account belongs to one site. Send a patient who lands on the other site to the same page on
  // theirs; ?market= makes the proxy remember the switch.
  const home = fromDbMarket(session.user.market);
  if (home !== market) redirect(`${withMarket((await currentPath()) ?? "/portal", home)}?market=${home}`);
  if (!session.user.emailVerified) redirect(withMarket("/verify-email", home));
  return session.user;
}

export async function requireDoctor() {
  const session = await getSession();
  if (!session) redirect("/doctor/sign-in");
  if (session.user.role === "PATIENT") redirect("/portal");
  return session.user;
}
