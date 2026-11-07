import Link from "next/link";
import type { Notification } from "@prisma/client";
import { Icon, type IconName } from "./icons";
import { cn } from "@/lib/format";
import { relativeLabel } from "@/lib/time";

const ICON: Record<string, [IconName, string]> = {
  VISITS: ["calendar", "bg-sky-tint text-sky"],
  MESSAGES: ["chat", "bg-sage text-forest"],
  BILLING: ["card", "bg-gold-tint text-gold-ink"],
  PAYMENTS: ["card", "bg-gold-tint text-gold-ink"],
  INQUIRIES: ["mail", "bg-coral-tint text-coral-ink"],
  CARE_PLANS: ["doc", "bg-sage text-forest"],
};

/** Shared by 05.10 and 09.2. Tabs filter by category via ?tab=. */
export function NotificationList({ items, tz, base, tabs, active }: { items: Notification[]; tz: string; base: string; tabs: [string, string][]; active: string }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {tabs.map(([key, label]) => (
          <Link key={key} href={`${base}${key === "all" ? "" : `?tab=${key}`}`} role="tab" aria-selected={active === key} className={cn("rounded-full px-4 py-2 text-sm font-bold", active === key ? "bg-forest text-white" : "bg-white text-body")}>
            {label}
          </Link>
        ))}
      </div>
      <div className="card !p-0">
        {items.length === 0 && <p className="p-6 text-sm text-body">Nothing here yet.</p>}
        {items.map((n) => {
          const [icon, tone] = ICON[n.category] ?? ["bell", "bg-line-soft text-body"];
          const inner = (
            <>
              <span className={cn("flex size-10 flex-none items-center justify-center rounded-xl", tone)}>
                <Icon name={icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="flex items-center gap-2 text-[15px]">
                  {n.title}
                  {n.amount && <span className="font-semibold text-forest">{n.amount}</span>}
                  {!n.readAt && <span className="size-2 rounded-full bg-coral" aria-label="Unread" />}
                </b>
                <span className="block truncate text-[13.5px] text-muted">{n.body}</span>
              </span>
              <span className="flex-none text-[12.5px] text-muted">{relativeLabel(n.createdAt, tz)}</span>
            </>
          );
          return n.href ? (
            <Link key={n.id} href={n.href} className="flex items-center gap-3.5 border-t border-line-soft px-5 py-4 first:border-t-0 hover:bg-canvas">
              {inner}
            </Link>
          ) : (
            <div key={n.id} className="flex items-center gap-3.5 border-t border-line-soft px-5 py-4 first:border-t-0">
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
