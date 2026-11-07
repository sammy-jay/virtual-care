"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { PUBLIC_NAV } from "./nav-items";


export function NavLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const path = usePathname();
  return (
    <div className={className}>
      {PUBLIC_NAV.map((l) => {
        const active = path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(linkClassName, active && "border-b-2 border-forest pb-1 font-bold text-ink")}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
