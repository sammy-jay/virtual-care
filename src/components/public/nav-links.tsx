"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/format";
import { PUBLIC_NAV } from "./nav-items";

/**
 * Mobile menu for the sticky public header. The header stays mounted across pages, so the menu
 * closes itself on navigation, on a tap outside, and on Escape.
 */
export function MobileMenu({ children, className }: { children: ReactNode; className?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(path);
  if (open && openedOn !== path) setOpen(false); // navigated: close (derived during render)
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        if (next) setOpenedOn(path);
        setOpen(next);
      }}
      className={cn("group relative", className)}
    >
      <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-field bg-white" aria-label={open ? "Close menu" : "Menu"}>
        <Icon name={open ? "x" : "menu"} />
      </summary>
      <div className="absolute right-0 mt-2 flex w-64 flex-col gap-1 rounded-2xl border border-line bg-white p-3 shadow-xl" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {children}
      </div>
    </details>
  );
}

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
