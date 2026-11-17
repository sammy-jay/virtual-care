"use client";

import Link from "@/components/market";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

export function RecordTabs({ id }: { id: string }) {
  const path = usePathname();
  const base = `/doctor/patients/${id}`;
  const tabs = [
    ["", "Overview"],
    ["/visits", "Visits"],
    ["/care-plans", "Care plans"],
    ["/messages", "Messages"],
    ["/billing", "Billing"],
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Patient record">
      {tabs.map(([seg, label]) => {
        const href = base + seg;
        const on = path === href;
        return (
          <Link key={seg} href={href} aria-current={on ? "page" : undefined} className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-[14.5px] font-bold", on ? "border-forest text-forest" : "border-transparent text-muted hover:text-ink")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
