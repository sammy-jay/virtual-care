import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
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
  if (!session) redirect("/sign-in?expired=1");
  if (session.user.role !== "PATIENT") redirect("/doctor");
  if (!session.user.emailVerified) redirect("/verify-email");
  return session.user;
}

export async function requireDoctor() {
  const session = await getSession();
  if (!session) redirect("/doctor/sign-in");
  if (session.user.role === "PATIENT") redirect("/portal");
  return session.user;
}
