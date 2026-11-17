"use client";

import { useRef, useState, type ReactNode } from "react";

type Tip = { name: string; licensed: boolean; x: number; y: number };

/**
 * Hover tooltip for the server-rendered state map: reads data-name / data-licensed from the shape
 * under the pointer (event delegation, so the map paths stay server-only).
 */
export function MapHover({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  return (
    <div
      ref={box}
      className="relative"
      onPointerMove={(e) => {
        const el = (e.target as Element).closest<SVGElement>("[data-name]");
        const rect = box.current?.getBoundingClientRect();
        if (!el || !rect) return setTip(null);
        setTip({ name: el.dataset.name!, licensed: el.dataset.licensed === "1", x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerLeave={() => setTip(null)}
    >
      {children}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-xl border border-line bg-white px-3 py-2 text-[13px] shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          <b className="block text-ink">{tip.name}</b>
          <span className="flex items-center gap-1.5 text-body">
            <span className={tip.licensed ? "size-2 rounded-full bg-forest" : "size-2 rounded-full bg-[#D3DAD6]"} />
            {tip.licensed ? "Licensed: book a visit" : "Not licensed yet"}
          </span>
        </div>
      )}
    </div>
  );
}
