"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "./icons";
import { cn } from "@/lib/format";

export type ThreadMessage = { id: string; mine: boolean; body: string; meta: string; kind: "TEXT" | "CARE_PLAN" | "SYSTEM"; href?: string };

/** Message bubbles (05.3 / 09.8). Refreshes every 15 s so replies show up without reload. */
export function Thread({ messages, empty = "No messages yet. Say hello." }: { messages: ThreadMessage[]; empty?: string }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  // Scroll the thread itself to the newest message; scrollIntoView would also scroll the page.
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain p-4 sm:p-5" aria-live="polite">
      {messages.length === 0 && <p className="m-auto text-sm text-muted">{empty}</p>}
      {messages.map((m) =>
        m.kind === "CARE_PLAN" ? (
          <div key={m.id} className="mx-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl bg-gold-tint px-4 py-3">
            <Icon name="doc" size={18} className="flex-none text-gold-ink" />
            <div className="min-w-0 flex-1 text-sm">
              <b className="block">{m.body}</b>
              <span className="text-muted">{m.meta}</span>
            </div>
            {m.href && (
              <Link href={m.href} className="text-sm font-bold text-forest">
                View
              </Link>
            )}
          </div>
        ) : (
          <div key={m.id} className={cn("flex max-w-[85%] flex-col sm:max-w-[78%]", m.mine ? "items-end self-end" : "items-start self-start")}>
            <div className={cn("whitespace-pre-wrap break-words rounded-[18px] px-4 py-3 text-[15px]", m.mine ? "rounded-br-md bg-forest text-white" : "rounded-bl-md bg-canvas text-ink")}>{m.body}</div>
            <span className="mt-1 text-[12px] text-muted">{m.meta}</span>
          </div>
        ),
      )}
    </div>
  );
}

export function Composer({
  action,
  conversationId,
  placeholder = "Write a message…",
  templates,
  note,
}: {
  action: (form: FormData) => Promise<void>;
  conversationId: string;
  placeholder?: string;
  templates?: { title: string; body: string }[];
  note?: string;
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex-none border-t border-line bg-white p-3 sm:p-4">
      {templates && templates.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1 rounded-full border border-field px-3 py-1.5 text-[13px] font-bold">
            Insert template <Icon name="chevronDown" size={14} />
          </button>
          {(open ? templates : templates.slice(0, 3)).map((t) => (
            <button type="button" key={t.title} onClick={() => setText((v) => (v ? v + "\n" : "") + t.body)} className="rounded-full bg-sage px-3 py-1.5 text-[13px] font-semibold text-forest">
              {t.title}
            </button>
          ))}
        </div>
      )}
      <form
        action={(fd) => {
          if (!text.trim()) return;
          start(async () => {
            await action(fd);
            setText("");
          });
        }}
        className="flex items-end gap-2.5"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <textarea
          id="msg"
          name="body"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          className="field max-h-40 min-h-12 min-w-0 flex-1 resize-none"
        />
        <button disabled={pending || !text.trim()} className="flex size-12 flex-none items-center justify-center rounded-full bg-forest text-white disabled:opacity-50" aria-label="Send">
          <Icon name="arrow" size={20} strokeWidth={2.2} />
        </button>
      </form>
      {note && <p className="mt-2 text-[12.5px] text-muted">{note}</p>}
    </div>
  );
}
