import Link from "next/link";
import { AppShell } from "@/components/portal/app-shell";
import { Icon } from "@/components/icons";
import { requireDoctor } from "@/lib/auth/dal";
import { loadOpenSlots } from "@/lib/booking";
import { badgeCounts } from "@/lib/badges";
import { getPractice, getVisitTypes } from "@/lib/care";
import { db } from "@/lib/db";
import { initials } from "@/lib/format";
import { fmt, PRACTICE_TZ, zoneAbbr, zoneChip } from "@/lib/time";
import { signOut } from "../../(auth)/actions";

export default async function DoctorLayout({ children }: LayoutProps<"/doctor">) {
  const user = await requireDoctor();
  const practice = await getPractice();
  const [badges, next, types] = await Promise.all([
    badgeCounts(user),
    db.appointment.findFirst({ where: { status: "SCHEDULED", endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    getVisitTypes(),
  ]);
  const followUp = types.find((t) => t.slug === "follow-up") ?? types[0];
  const nextOpen = followUp ? (await loadOpenSlots(followUp, new Date(), 21))[0] : undefined;

  const nav = [
    { href: "/doctor", label: "Dashboard", icon: "home" as const },
    { href: "/doctor/appointments", label: "Appointments", icon: "calendar" as const, match: ["/doctor/visits"] },
    { href: "/doctor/patients", label: "Patients", icon: "user" as const, match: ["/doctor/care-plans"] },
    { href: "/doctor/messages", label: "Messages", icon: "chat" as const, live: "messages" as const },
    { href: "/doctor/inquiries", label: "Inquiries", icon: "mail" as const, live: "inquiries" as const },
    { href: "/doctor/availability", label: "Availability", icon: "clock" as const },
    { href: "/doctor/earnings", label: "Earnings", icon: "card" as const },
    { href: "/doctor/insights", label: "Insights", icon: "doc" as const },
    { href: "/doctor/settings", label: "Settings", icon: "gear" as const, match: ["/doctor/setup"] },
  ];
  const mobileNav = [
    { href: "/doctor", label: "Today", icon: "home" as const },
    { href: "/doctor/appointments", label: "Visits", icon: "calendar" as const, match: ["/doctor/visits"] },
    { href: "/doctor/patients", label: "Patients", icon: "user" as const },
    { href: "/doctor/messages", label: "Inbox", icon: "inbox" as const, live: "inbox" as const, match: ["/doctor/inquiries"] },
  ];
  const mobileMore = [
    { href: "/doctor/inquiries", label: "Inquiries", icon: "mail" as const, live: "inquiries" as const },
    { href: "/doctor/availability", label: "Availability", icon: "clock" as const },
    { href: "/doctor/earnings", label: "Earnings", icon: "card" as const },
    { href: "/doctor/insights", label: "Insights", icon: "chart" as const },
    { href: "/doctor/settings", label: "Settings", icon: "gear" as const, match: ["/doctor/setup"] },
  ];

  return (
    <AppShell
      root="/doctor"
      portalLabel="Doctor portal"
      subtitle="Doctor portal"
      subtitleClass="font-extrabold uppercase tracking-[.12em] text-gold-ink"
      width={248}
      cta={
        <Link
          href={next ? `/doctor/visits/${next.id}/waiting` : "/doctor/appointments"}
          className="mb-[18px] flex items-center justify-center gap-2 rounded-[14px] bg-gold p-[13px] text-[15px] font-extrabold text-ink"
        >
          <Icon name="video" size={18} strokeWidth={2.2} />
          Start next visit
        </Link>
      }
      nav={nav}
      mobileNav={mobileNav}
      mobileMore={mobileMore}
      statusCard={
        <Link href="/doctor/availability" className="mb-3.5 block rounded-2xl bg-sage px-4 py-3.5">
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-forest">
            <span className={`size-2 rounded-full ${practice.bookingPublished ? "bg-forest" : "bg-coral"}`} />
            {practice.bookingPublished ? "Accepting bookings" : "Booking paused"}
          </div>
          <div className="mt-1 text-[13.5px] font-bold">Houston · {zoneAbbr(PRACTICE_TZ)}</div>
          <div className="text-[12.5px] text-body">{nextOpen ? `Next open: ${fmt(nextOpen, PRACTICE_TZ, "EEE d MMM")}` : "No open times"}</div>
        </Link>
      }
      user={{ initials: initials(user.name), name: "Dr. N. Oparaji", caption: user.role === "STAFF" ? "Care team" : "Physician" }}
      zoneChip={zoneChip(PRACTICE_TZ)}
      searchHref="/doctor/search"
      searchLabel="Search patients, visits, messages"
      bellHref="/doctor/notifications"
      badges={badges}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
