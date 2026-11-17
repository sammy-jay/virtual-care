import Link from "@/components/market";
import type { ReactNode } from "react";
import { Monogram } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/format";
import type { Badges } from "@/lib/badges";
import { BellLink, LiveBadgesProvider } from "./live-badges";
import { BottomTabs, Breadcrumb, SideNav, type NavItem } from "./side-nav";

/**
 * Shared chrome for the patient (264px) and doctor (248px) portals:
 * sidebar with primary CTA, nav, status card and user; top bar with breadcrumb, search, zone chip, bell.
 */
export function AppShell({
  root,
  portalLabel,
  subtitle,
  subtitleClass,
  cta,
  nav,
  mobileNav,
  mobileMore,
  statusCard,
  user,
  zoneChip,
  searchHref,
  searchLabel,
  helpHref,
  bellHref,
  badges,
  signOut,
  width = 264,
  children,
}: {
  root: string;
  portalLabel: string;
  subtitle: string;
  subtitleClass?: string;
  cta: ReactNode;
  nav: NavItem[];
  mobileNav: NavItem[];
  /** Pages for the mobile "More" sheet, which also holds the user and Sign out. */
  mobileMore?: NavItem[];
  statusCard: ReactNode;
  user: { initials: string; name: string; caption: string };
  zoneChip: string;
  searchHref: string;
  searchLabel: string;
  helpHref?: string;
  bellHref: string;
  /** Initial counts for the nav badges and bell; kept fresh on the client by LiveBadgesProvider. */
  badges: Badges;
  signOut: () => Promise<void>;
  width?: number;
  children: ReactNode;
}) {
  return (
    <LiveBadgesProvider initial={badges}>
      <div className="flex min-h-screen bg-white text-[15px] leading-normal text-ink">
        <aside className="sticky top-0 hidden h-screen flex-none flex-col overflow-y-auto border-r border-line bg-white px-[18px] py-[26px] lg:flex" style={{ width }}>
          <Link href={root} className="flex items-center gap-2.5 px-1.5 pb-[22px]">
            <Monogram size={40} />
            <span className="leading-[1.15]">
              <span className="block font-display text-lg">Dr. Oparaji</span>
              <span className={cn("block text-[11px]", subtitleClass ?? "text-muted")}>{subtitle}</span>
            </span>
          </Link>
          {cta}
          <SideNav items={nav} root={root} />
          <div className="mt-auto pt-6">
            {statusCard}
            <div className="flex items-center gap-2.5 border-t border-line pt-3.5">
              <Avatar initials={user.initials} />
              <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-[1.3]">
                <span className="block truncate">{user.name}</span>
                <span className="block text-[12px] font-medium text-muted">{user.caption}</span>
              </span>
              <form action={signOut}>
                <button className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label="Sign out" title="Sign out">
                  <Icon name="logout" size={18} />
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-white px-4 py-3 sm:px-10 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={root} className="lg:hidden" aria-label="Home">
                <Monogram size={34} />
              </Link>
              <Breadcrumb portal={portalLabel} />
            </div>
            <Link href={searchHref} className="hidden w-[300px] items-center gap-2 rounded-full border border-field bg-canvas px-3.5 py-[9px] text-sm text-muted md:flex">
              <Icon name="search" size={16} />
              {searchLabel}
            </Link>
            <div className="flex flex-none items-center gap-3.5">
              <span className="hidden rounded-full bg-sky-tint px-3 py-1.5 text-[13px] font-semibold text-sky sm:inline">{zoneChip}</span>
              {helpHref && (
                <Link href={helpHref} className="hidden text-[13px] font-bold text-forest sm:inline">
                  Help
                </Link>
              )}
              <Link href={searchHref} className="flex size-10 items-center justify-center rounded-full md:hidden" aria-label="Search">
                <Icon name="search" size={20} />
              </Link>
              <BellLink href={bellHref} />
            </div>
          </header>
          <main className="flex-1 bg-canvas px-4 pb-28 pt-6 sm:px-10 sm:pt-8 lg:pb-10">{children}</main>
        </div>
        <BottomTabs items={mobileNav} root={root} more={mobileMore ? { items: mobileMore, user, signOut } : undefined} />
      </div>
    </LiveBadgesProvider>
  );
}
