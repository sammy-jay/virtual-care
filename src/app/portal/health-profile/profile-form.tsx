"use client";

import { useActionState } from "react";
import { Alert, Field } from "@/components/ui";
import { saveProfile, type ProfileState } from "./actions";

export function ProfileForm({ initial, sections }: { initial: Record<string, string>; sections: { label: string; done: boolean }[] }) {
  const [s, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const v = s.values ?? initial;
  const e = s.errors ?? {};
  const n = Object.keys(e).length;
  const done = sections.filter((x) => x.done).length;
  return (
    <form action={action} noValidate className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        {n > 0 && <Alert tone="error">Fix {n} field{n === 1 ? "" : "s"} before saving.</Alert>}
        {s.ok && <Alert tone="success">Profile saved. Dr. Oparaji will see the update.</Alert>}
        <section className="card">
          <b className="text-[16px]">About you</b>
          <p className="text-[13px] text-muted">Basic details</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Full name" name="name" defaultValue={v.name} error={e.name} autoComplete="name" />
            <Field label="Date of birth" name="dob" placeholder="DD / MM / YYYY" defaultValue={v.dob} error={e.dob} autoComplete="bday" />
            <Field label="Phone" name="phone" type="tel" defaultValue={v.phone} error={e.phone} autoComplete="tel" />
          </div>
        </section>
        <section className="card">
          <b className="text-[16px]">Medical</b>
          <p className="text-[13px] text-muted">Helps Dr. Oparaji prepare</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Medications" name="medications" defaultValue={v.medications} placeholder="e.g. Lisinopril 10 mg" />
            <Field label="Allergies" name="allergies" defaultValue={v.allergies} placeholder="e.g. Penicillin, or None" />
            <Field label="Conditions" name="conditions" defaultValue={v.conditions} placeholder="e.g. High blood pressure" className="sm:col-span-2" />
          </div>
        </section>
        <section className="card">
          <b className="text-[16px]">Goals</b>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field label="What would you like to change?" name="goals" defaultValue={v.goals} placeholder="e.g. Lose 4 kg in 8 weeks" />
            <Field label="Goal weight (kg)" name="goalWeight" inputMode="decimal" defaultValue={v.goalWeight} error={e.goalWeight} />
          </div>
        </section>
        <section className="card">
          <b className="text-[16px]">Emergency contact</b>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Name" name="ecName" defaultValue={v.ecName} />
            <Field label="Phone" name="ecPhone" type="tel" defaultValue={v.ecPhone} error={e.ecPhone} />
            <Field label="Relationship" name="ecRelation" defaultValue={v.ecRelation} placeholder="e.g. Husband" />
          </div>
        </section>
      </div>
      <div className="h-fit lg:sticky lg:top-24">
        <div className="card">
          <div className="eyebrow">Progress</div>
          <div className="mt-1.5 font-display text-2xl">
            {done} of {sections.length} sections done
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-forest" style={{ width: `${(done / sections.length) * 100}%` }} />
          </div>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {sections.map((x) => (
              <li key={x.label} className={x.done ? "font-semibold text-forest" : "text-muted"}>
                {x.done ? "✓" : "○"} {x.label}
              </li>
            ))}
          </ul>
          <button disabled={pending} className="mt-5 w-full rounded-full bg-forest px-6 py-3.5 font-bold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </form>
  );
}
