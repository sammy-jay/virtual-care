import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LineChart } from "@/components/charts";
import { Button, Card, Eyebrow, PageTitle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmtShort } from "@/lib/time";

export const metadata: Metadata = { title: "Progress" };

async function logReading(form: FormData) {
  "use server";
  const user = await requirePatient();
  const kind = String(form.get("kind"));
  if (kind === "WEIGHT") {
    const v = Number(form.get("weight"));
    if (!(v > 20 && v < 400)) redirect("/portal/progress?error=weight");
    await db.measurement.create({ data: { patientId: user.id, kind: "WEIGHT", value: Math.round(v * 10) / 10 } });
  } else if (kind === "BLOOD_PRESSURE") {
    const s = Number(form.get("systolic"));
    const d = Number(form.get("diastolic"));
    if (!(s > 60 && s < 260 && d > 30 && d < 160)) redirect("/portal/progress?error=bp");
    await db.measurement.create({ data: { patientId: user.id, kind: "BLOOD_PRESSURE", systolic: s, diastolic: d } });
  } else if (kind === "WALK_DAYS") {
    const v = Number(form.get("walk"));
    if (!(v >= 0 && v <= 7)) redirect("/portal/progress?error=walk");
    await db.measurement.create({ data: { patientId: user.id, kind: "WALK_DAYS", value: v } });
  }
  revalidatePath("/portal/progress");
  redirect("/portal/progress?saved=1");
}

export default async function ProgressPage({ searchParams }: PageProps<"/portal/progress">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const tz = user.timeZone;
  const [ms, profile] = await Promise.all([
    db.measurement.findMany({ where: { patientId: user.id }, orderBy: { takenAt: "asc" } }),
    db.patientProfile.findUnique({ where: { userId: user.id } }),
  ]);
  const w = ms.filter((m) => m.kind === "WEIGHT");
  const bp = ms.filter((m) => m.kind === "BLOOD_PRESSURE");
  const walk = ms.filter((m) => m.kind === "WALK_DAYS").at(-1);
  const since = ms[0]?.takenAt;
  const lastW = w.at(-1);
  const delta = w.length > 1 ? (lastW!.value ?? 0) - (w[0].value ?? 0) : null;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageTitle title="Progress" subtitle={since ? `Your numbers since ${fmtShort(since, tz)}. Dr. Oparaji sees these too.` : "Log your numbers. Dr. Oparaji sees these too."} />
      {sp.saved === "1" && <p className="mb-4 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold text-success">Saved and shared with Dr. Oparaji.</p>}
      {sp.error && <p className="mb-4 rounded-2xl bg-coral-tint px-4 py-3 text-sm font-semibold text-danger">That reading looks out of range. Check the number and try again.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Eyebrow>Weight</Eyebrow>
          <div className="mt-1.5 num font-display text-[36px]">{lastW?.value ? `${lastW.value.toFixed(1)} kg` : "—"}</div>
          <div className="text-sm text-body">
            {delta != null ? `${delta.toFixed(1).replace("-", "−")} kg` : "No trend yet"}
            {profile?.goalWeightKg ? ` · goal ${profile.goalWeightKg} kg` : ""}
          </div>
        </Card>
        <Card>
          <Eyebrow>Blood pressure</Eyebrow>
          <div className="mt-1.5 num font-display text-[36px]">{bp.at(-1) ? `${bp.at(-1)!.systolic}/${bp.at(-1)!.diastolic}` : "—"}</div>
          <div className="text-sm text-body">{bp.length > 1 ? `Down from ${bp[0].systolic}/${bp[0].diastolic}` : "Log twice a day this week"}</div>
        </Card>
        <Card>
          <Eyebrow>Walking</Eyebrow>
          <div className="mt-1.5 num font-display text-[36px]">{walk ? `${walk.value} days` : "—"}</div>
          <div className="text-sm text-body">Goal 5 days a week</div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <b>Weight (kg)</b>
          <div className="mt-3">
            <LineChart label="Weight" unit=" kg" points={w.map((m) => ({ x: fmtShort(m.takenAt, tz), y: m.value ?? 0 }))} />
          </div>
        </Card>
        <Card>
          <b>Systolic pressure</b>
          <div className="mt-3">
            <LineChart label="Systolic pressure" color="#E2674A" points={bp.map((m) => ({ x: fmtShort(m.takenAt, tz), y: m.systolic ?? 0 }))} />
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <b className="text-[16px]">Log today</b>
        <p className="text-sm text-muted">Quick entries are shared with Dr. Oparaji.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <form action={logReading} className="flex items-end gap-2">
            <input type="hidden" name="kind" value="WEIGHT" />
            <div className="flex-1">
              <label htmlFor="weight" className="label">Weight (kg)</label>
              <input id="weight" name="weight" inputMode="decimal" placeholder="81.0" className="field" required />
            </div>
            <Button>Add weight</Button>
          </form>
          <form action={logReading} className="flex items-end gap-2">
            <input type="hidden" name="kind" value="BLOOD_PRESSURE" />
            <div className="flex-1">
              <label htmlFor="systolic" className="label">Blood pressure</label>
              <div className="flex gap-1.5">
                <input id="systolic" name="systolic" inputMode="numeric" placeholder="128" aria-label="Systolic" className="field" required />
                <input name="diastolic" inputMode="numeric" placeholder="82" aria-label="Diastolic" className="field" required />
              </div>
            </div>
            <Button variant="secondary">Add</Button>
          </form>
          <form action={logReading} className="flex items-end gap-2">
            <input type="hidden" name="kind" value="WALK_DAYS" />
            <div className="flex-1">
              <label htmlFor="walk" className="label">Walking days this week</label>
              <input id="walk" name="walk" type="number" min={0} max={7} placeholder="4" className="field" required />
            </div>
            <Button variant="secondary">Save</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
