import type { PatientProfile, User } from "@prisma/client";

/** Five sections drive the "3 of 5 sections done" meter (05.5). */
export function profileSections(user: Pick<User, "name" | "phone">, p: PatientProfile | null) {
  const sections = [
    { key: "basic", label: "Basic details", done: !!(user.name && p?.dateOfBirth && user.phone) },
    { key: "medical", label: "Medications and allergies", done: !!(p?.medications && p?.allergies) },
    { key: "history", label: "Conditions", done: !!p?.conditions },
    { key: "goals", label: "Goals", done: !!p?.goals },
    { key: "emergency", label: "Emergency contact", done: !!(p?.emergencyContact?.name && p?.emergencyContact?.phone) },
  ];
  const done = sections.filter((s) => s.done).length;
  return { sections, done, total: sections.length, pct: Math.round((done / sections.length) * 100) };
}
