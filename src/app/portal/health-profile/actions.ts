"use server";

import { revalidatePath } from "next/cache";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export type ProfileState = { ok?: boolean; errors?: Record<string, string>; values?: Record<string, string> };

const PHONE = /^\+?[\d\s()-]{10,20}$/;

function parseDob(v: string) {
  const m = v.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/) ?? v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [d, mo, y] = v.includes("-") ? [Number(m[3]), Number(m[2]), Number(m[1])] : [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCDate() !== d || y < 1900 || date > new Date()) return null;
  return date;
}

/** 05.5 / 05.6 */
export async function saveProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requirePatient();
  const keys = ["name", "dob", "phone", "medications", "allergies", "conditions", "goals", "ecName", "ecPhone", "ecRelation", "goalWeight"];
  const v = Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "").trim()]));
  const errors: Record<string, string> = {};
  if (v.name.length < 2) errors.name = "Enter your full name.";
  const dob = v.dob ? parseDob(v.dob) : null;
  if (!v.dob) errors.dob = "Date of birth is required";
  else if (!dob) errors.dob = "Pick a real date of birth, not in the future";
  if (v.phone && !PHONE.test(v.phone)) errors.phone = "Enter a valid phone number, for example +234 803 555 0142";
  if (v.ecPhone && !PHONE.test(v.ecPhone)) errors.ecPhone = "Enter a valid phone number for your contact.";
  const goalWeight = v.goalWeight ? Number(v.goalWeight) : null;
  if (v.goalWeight && !(goalWeight! > 20 && goalWeight! < 400)) errors.goalWeight = "Enter a weight in kg.";
  if (Object.keys(errors).length) return { errors, values: v };

  await db.user.update({ where: { id: user.id }, data: { name: v.name, phone: v.phone || null } });
  const data = {
    dateOfBirth: dob,
    medications: v.medications || null,
    allergies: v.allergies || null,
    conditions: v.conditions || null,
    goals: v.goals || null,
    goalWeightKg: goalWeight,
    emergencyContact: v.ecName || v.ecPhone ? { name: v.ecName || null, phone: v.ecPhone || null, relation: v.ecRelation || null } : null,
  };
  await db.patientProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath("/portal", "layout");
  return { ok: true };
}
