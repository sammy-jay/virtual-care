import Link from "@/components/market";
import { AppShell } from "@/components/portal/app-shell";
import { Icon } from "@/components/icons";
import { requirePatient } from "@/lib/auth/dal";
import { badgeCounts } from "@/lib/badges";
import { allowanceUsed, getActiveMembership } from "@/lib/care";
import { initials, shortName } from "@/lib/format";
import { fmtShort, zoneChip } from "@/lib/time";
import { signOut } from "../(auth)/actions";

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const user = await requirePatient();
  const [membership, badges] = await Promise.all([getActiveMembership(user.id), badgeCounts(user)]);
  const used = membership ? await allowanceUsed(membership, new Date()) : 0;
  const left = membership ? Math.max(0, membership.plan.includedVisits - used) : 0;
  const caption = membership ? `${membership.plan.name} member` : "Pay per visit";

  const nav = [
    { href: "/portal", label: "Overview", icon: "home" as const },
    { href: "/portal/visits", label: "My visits", icon: "calendar" as const },
    { href: "/portal/care-plans", label: "Care plans", icon: "doc" as const },
    { href: "/portal/progress", label: "Progress", icon: "heart" as const },
    { href: "/portal/messages", label: "Messages", icon: "chat" as const, live: "messages" as const },
    { href: "/portal/membership", label: "Membership", icon: "card" as const, match: ["/portal/billing", "/portal/checkout"] },
    { href: "/portal/health-profile", label: "Health profile", icon: "user" as const },
    { href: "/portal/settings", label: "Settings", icon: "gear" as const, match: ["/portal/notifications", "/portal/help"] },
  ];
  const mobileNav = [
    { href: "/portal", label: "Home", icon: "home" as const },
    { href: "/portal/visits", label: "Visits", icon: "calendar" as const },
    { href: "/portal/messages", label: "Messages", icon: "chat" as const, live: "messages" as const },
    { href: "/portal/membership", label: "Plan", icon: "card" as const, match: ["/portal/billing", "/portal/checkout"] },
    { href: "/portal/settings", label: "Profile", icon: "user" as const, match: ["/portal/health-profile"] },
  ];

  return (
    <AppShell
      root="/portal"
      portalLabel="Patient portal"
      subtitle="Patient portal"
      cta={
        <Link href="/portal/book" className="mb-5 flex items-center justify-center gap-2 rounded-[14px] bg-forest p-3.5 text-[15px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(23,96,75,.6)]">
          <Icon name="plus" size={18} strokeWidth={2.2} />
          Book a visit
        </Link>
      }
      nav={nav}
      mobileNav={mobileNav}
      statusCard={
        membership ? (
          <Link href="/portal/membership" className="mb-3.5 block rounded-2xl bg-sage px-4 py-3.5">
            <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-forest">{caption}</div>
            <div className="mt-1 text-sm font-bold">
              {membership.plan.includedVisits
                ? `${membership.plan.includedVisits} visit${membership.plan.includedVisits === 1 ? "" : "s"} included${left === 0 ? " · used" : ""}`
                : "Messaging included"}
            </div>
            <div className="text-[12.5px] text-body">
              {membership.cancelAtPeriodEnd ? "Ends" : "Renews"} {fmtShort(membership.currentPeriodEnd, user.timeZone)}
            </div>
          </Link>
        ) : (
          <Link href="/membership" className="mb-3.5 block rounded-2xl bg-gold-tint px-4 py-3.5">
            <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-gold-ink">No plan</div>
            <div className="mt-1 text-sm font-bold">Pay per visit</div>
            <div className="text-[12.5px] font-bold text-forest">See membership plans →</div>
          </Link>
        )
      }
      user={{ initials: initials(user.name), name: shortName(user.name), caption }}
      zoneChip={zoneChip(user.timeZone)}
      searchHref="/portal/search"
      searchLabel="Search visits, messages"
      helpHref="/portal/help"
      bellHref="/portal/notifications"
      badges={badges}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
