import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { logAccess } from "@/lib/audit";
import { requireDoctor } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";

/** Load a patient for the record pages and write one access-log entry per request. */
export const loadPatientRecord = cache(async (id: string) => {
  const doc = await requireDoctor();
  const patient = await db.user.findUnique({ where: { id }, include: { profile: true } });
  if (!patient || patient.role !== "PATIENT") notFound();
  const membership = await getActiveMembership(patient.id);
  await logAccess(doc, `Opened record · ${patient.name}`, patient.id);
  return { doc, patient, membership };
});
