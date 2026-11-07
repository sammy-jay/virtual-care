"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/format";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number; match?: string[] };

const isActive = (path: string, item: NavItem, root: string) =>
  item.href === root ? path === root : [item.href, ...(item.match ?? [])].some((h) => path === h || path.startsWith(h + "/"));

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((item) => {
        const active = isActive(path, item, root);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-[14.5px]",
              active ? "bg-sage font-bold text-forest" : "font-medium text-body hover:bg-canvas",
            )}
          >
            <Icon name={item.icon} />
            {item.label}
            {!!item.badge && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold text-white", root === "/doctor" ? "bg-coral" : "bg-forest")}>{item.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomTabs({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
      {items.map((item) => {
        const active = isActive(path, item, root);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px]", active ? "font-bold text-forest" : "font-medium text-muted")}
          >
            <Icon name={item.icon} size={21} />
            {item.label}
            {!!item.badge && <span className="absolute right-[calc(50%-18px)] top-2 size-2 rounded-full bg-coral" />}
          </Link>
        );
      })}
    </nav>
  );
}

const CRUMBS: [RegExp, string][] = [
  [/^\/portal$/, "Overview"],
  [/^\/portal\/book\/time/, "Scheduling"],
  [/^\/portal\/book/, "Book a visit"],
  [/^\/portal\/visits\/[^/]+\/confirmed/, "Booking confirmed"],
  [/^\/portal\/visits\/[^/]+\/pay/, "Pay for visit"],
  [/^\/portal\/visits\/[^/]+\/feedback/, "Feedback"],
  [/^\/portal\/visits/, "My visits"],
  [/^\/portal\/next-steps/, "Next steps"],
  [/^\/portal\/care-plans\/.+/, "Care plan"],
  [/^\/portal\/care-plans/, "Care plans"],
  [/^\/portal\/progress/, "Progress"],
  [/^\/portal\/messages/, "Messages"],
  [/^\/portal\/membership/, "Membership"],
  [/^\/portal\/checkout/, "Checkout"],
  [/^\/portal\/billing\/failed/, "Payment"],
  [/^\/portal\/billing\/refunds/, "Refund"],
  [/^\/portal\/billing\/.+/, "Receipt"],
  [/^\/portal\/billing/, "Billing"],
  [/^\/portal\/health-profile/, "Health profile"],
  [/^\/portal\/settings\/security/, "Security"],
  [/^\/portal\/settings\/privacy/, "Data and privacy"],
  [/^\/portal\/settings\/payment-methods/, "Payment methods"],
  [/^\/portal\/settings/, "Settings"],
  [/^\/portal\/notifications/, "Notifications"],
  [/^\/portal\/help/, "Help"],
  [/^\/portal\/search/, "Search"],
  [/^\/doctor$/, "Dashboard"],
  [/^\/doctor\/notifications/, "Notifications"],
  [/^\/doctor\/search/, "Search"],
  [/^\/doctor\/appointments/, "Appointments"],
  [/^\/doctor\/patients\/.+/, "Patient record"],
  [/^\/doctor\/patients/, "Patients"],
  [/^\/doctor\/messages\/templates/, "Templates"],
  [/^\/doctor\/messages/, "Messages"],
  [/^\/doctor\/inquiries\/.+/, "Inquiry"],
  [/^\/doctor\/inquiries/, "Inquiries"],
  [/^\/doctor\/care-plans/, "Care plan"],
  [/^\/doctor\/visits\/[^/]+\/notes/, "Visit notes"],
  [/^\/doctor\/visits\/[^/]+\/waiting/, "Waiting room"],
  [/^\/doctor\/visits\/[^/]+\/room/, "Visit in progress"],
  [/^\/doctor\/earnings/, "Earnings"],
  [/^\/doctor\/insights/, "Insights"],
  [/^\/doctor\/settings\/licensure/, "Licensure"],
  [/^\/doctor\/settings\/access-log/, "Access log"],
  [/^\/doctor\/settings\/data-requests/, "Data requests"],
  [/^\/doctor\/settings/, "Settings"],
  [/^\/doctor\/availability/, "Availability"],
  [/^\/doctor\/setup/, "Setup"],
];

export function Breadcrumb({ portal }: { portal: string }) {
  const path = usePathname();
  const crumb = CRUMBS.find(([r]) => r.test(path))?.[1] ?? "";
  return (
    <div className="truncate text-sm text-muted">
      <span className="hidden sm:inline">{portal} / </span>
      <b className="text-ink">{crumb}</b>
    </div>
  );
}
