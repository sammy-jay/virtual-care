"use client";

import type { ReactNode } from "react";

/** Inserts a saved template or the suggested answer into the reply box. */
export function TemplatePicker({ templates, suggestion, children }: { templates: { id: string; title: string; body: string }[]; suggestion: string | null; children: ReactNode }) {
  const insert = (text: string) => {
    const el = document.getElementById("reply") as HTMLTextAreaElement | null;
    if (!el) return;
    el.value = el.value ? `${el.value}\n\n${text}` : text;
    el.focus();
  };
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestion && (
          <button type="button" onClick={() => insert(suggestion)} className="rounded-full bg-gold-tint px-3 py-1.5 text-[13px] font-bold text-gold-ink">
            Use suggested answer
          </button>
        )}
        {templates.map((t) => (
          <button type="button" key={t.id} onClick={() => insert(t.body)} className="rounded-full bg-sage px-3 py-1.5 text-[13px] font-semibold text-forest">
            {t.title}
          </button>
        ))}
      </div>
      {children}
    </>
  );
}
