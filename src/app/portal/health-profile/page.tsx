import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { Alert, PageTitle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { profileSections } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Health profile" };

export default async function HealthProfilePage({ searchParams }: PageProps<"/portal/health-profile">) {
  const user = await requirePatient();
  const { welcome } = await searchParams;
  const p = await db.patientProfile.findUnique({ where: { userId: user.id } });
  const { sections } = profileSections(user, p);
  const initial = {
    name: user.name,
    dob: p?.dateOfBirth ? formatInTimeZone(p.dateOfBirth, "UTC", "yyyy-MM-dd") : "",
    phone: user.phone ?? "",
    medications: p?.medications ?? "",
    allergies: p?.allergies ?? "",
    conditions: p?.conditions ?? "",
    goals: p?.goals ?? "",
    goalWeight: p?.goalWeightKg ? String(p.goalWeightKg) : "",
    ecName: p?.emergencyContact?.name ?? "",
    ecPhone: p?.emergencyContact?.phone ?? "",
    ecRelation: p?.emergencyContact?.relation ?? "",
  };
  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle title="Health profile" subtitle="Shared only with Dr. Oparaji." />
      {welcome === "1" && (
        <Alert tone="success" className="mb-5">
          Your email is verified. A few details now help Dr. Oparaji prepare — then book your free intro call.
        </Alert>
      )}
      <ProfileForm initial={initial} sections={sections} today={formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd")} />
    </div>
  );
}
