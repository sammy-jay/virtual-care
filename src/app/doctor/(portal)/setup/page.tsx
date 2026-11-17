import Link from "@/components/market";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { Button, Card, Eyebrow, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { cn } from "@/lib/format";
import { setBookingPublished } from "../../actions";

export const metadata: Metadata = { title: "Practice setup" };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SetupPage() {
  await requireDoctor();
  const practice = await getPractice();
  const [licenses, windows, types, plans] = await Promise.all([
    db.license.findMany({ where: { status: "ACTIVE" } }),
    db.availabilityWindow.findMany(),
    db.visitType.count({ where: { active: true } }),
    db.plan.count({ where: { active: true } }),
  ]);
  const days = [...new Set(windows.map((w) => w.weekday))].sort();
  const steps = [
    { done: licenses.length > 0, title: "Confirm your licensure", body: licenses.length ? `${licenses.map((l) => l.regionName.split(",")[0]).join(" and ")} added` : "Add the regions you can see patients in", href: "/doctor/settings/licensure" },
    { done: windows.length > 0, title: "Set weekly availability", body: windows.length ? `${DAYS[days[0]]} to ${DAYS[days[days.length - 1]]} windows added` : "Add the hours patients can book", href: "/doctor/availability" },
    { done: types > 0 && plans > 0, title: "Review visit types and plans", body: `${types} visit types, ${plans} plans`, href: "/doctor/settings" },
    { done: !!practice.payoutLast4, title: "Connect payouts", body: practice.payoutLast4 ? `${practice.payoutBank} ••${practice.payoutLast4}` : "Add a bank account to be paid", href: "/doctor/earnings?dialog=payout" },
    { done: practice.bookingPublished, title: "Publish your booking page", body: practice.bookingPublished ? "Patients can book now" : "Patients can book once this is on", href: "#publish" },
  ];
  const done = steps.filter((s) => s.done).length;
  const ready = steps.slice(0, 4).every((s) => s.done);
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageTitle title="Set up your practice" subtitle={`${done} of 5 steps done.${practice.bookingPublished ? "" : " Patients cannot book until you finish."}`} />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-0">
          {steps.map((s, i) => (
            <Link key={s.title} href={s.href} className="flex items-center gap-4 border-t border-line-soft px-6 py-4 first:border-t-0 hover:bg-canvas">
              <span className={cn("flex size-9 flex-none items-center justify-center rounded-full font-bold", s.done ? "bg-forest text-white" : "border-[1.5px] border-field text-muted")}>
                {s.done ? <Icon name="check" size={17} strokeWidth={2.4} /> : i + 1}
              </span>
              <span className="flex-1">
                <b className="block">{s.title}</b>
                <span className="text-[13px] text-muted">{s.body}</span>
              </span>
              <Icon name="chevronRight" size={16} className="text-muted" />
            </Link>
          ))}
        </Card>
        <Card id="publish" className="h-fit">
          <Eyebrow>{practice.bookingPublished ? "Live" : "Ready to launch"}</Eyebrow>
          <div className="mt-1.5 font-display text-[36px] leading-none">{Math.round((done / 5) * 100)}% complete</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-forest" style={{ width: `${(done / 5) * 100}%` }} />
          </div>
          <p className="mt-3 text-sm text-body">{practice.bookingPublished ? "Your booking page is live." : ready ? "Everything is set. Publish to open bookings." : `${4 - steps.slice(0, 4).filter((s) => s.done).length} more steps before your booking page can go live.`}</p>
          <form action={setBookingPublished} className="mt-4">
            <input type="hidden" name="on" value={practice.bookingPublished ? "0" : "1"} />
            <input type="hidden" name="returnTo" value="/doctor/setup" />
            <Button disabled={!practice.bookingPublished && !ready} variant={practice.bookingPublished ? "secondary" : "primary"} className="w-full">
              {practice.bookingPublished ? "Pause bookings" : "Publish booking page"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
