"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

const tabCls = (active: boolean) =>
  cn("relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px]", active ? "font-bold text-forest" : "font-medium text-muted");

/**
 * Mobile tab bar. With `more`, a final "More" tab opens a sheet holding the remaining pages,
 * the signed-in user and Sign out (the sidebar that carries them is hidden below lg).
 */
export function BottomTabs({
  items,
  root,
  more,
}: {
  items: NavItem[];
  root: string;
  more?: { items: NavItem[]; user: { initials: string; name: string; caption: string }; signOut: () => Promise<void> };
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(path);
  // Close the sheet after navigating (derived from the path, not an effect).
  if (open && openedAt !== path) {
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const moreActive = !!more && more.items.some((i) => isActive(path, i, root));
  const moreBadge = more?.items.some((i) => i.badge);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        {items.map((item) => {
          const active = isActive(path, item, root);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabCls(active)}>
              <Icon name={item.icon} size={21} />
              {item.label}
              {!!item.badge && <span className="absolute right-[calc(50%-18px)] top-2 size-2 rounded-full bg-coral" />}
            </Link>
          );
        })}
        {more && (
          <button
            type="button"
            onClick={() => {
              setOpenedAt(path);
              setOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={tabCls(moreActive || open)}
          >
            <Icon name="more" size={21} />
            More
            {moreBadge && <span className="absolute right-[calc(50%-18px)] top-2 size-2 rounded-full bg-coral" />}
          </button>
        )}
      </nav>

      {more && open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-field" />
            <div className="flex flex-col gap-1">
              {more.items.map((item) => {
                const active = isActive(path, item, root);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn("flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px]", active ? "bg-sage font-bold text-forest" : "font-medium text-body")}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                    {!!item.badge && <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-line px-1.5 pt-3.5">
              <span className="flex size-9 flex-none items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white">{more.user.initials}</span>
              <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight">
                <span className="block truncate">{more.user.name}</span>
                <span className="block text-[12px] font-medium text-muted">{more.user.caption}</span>
              </span>
              <form action={more.signOut}>
                <button className="flex items-center gap-2 rounded-full border-[1.5px] border-field px-4 py-2 text-[14px] font-bold text-ink">
                  <Icon name="logout" size={17} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
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
