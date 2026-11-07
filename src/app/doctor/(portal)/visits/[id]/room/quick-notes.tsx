"use client";

import { useEffect, useRef, useState } from "react";
import { saveQuickNotes } from "../../../../actions";

/** Autosaves 1 s after typing stops. */
export function QuickNotes({ id, initial }: { id: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("quickNotes", text);
      await saveQuickNotes(fd);
      setStatus("saved");
    }, 1000);
    return () => clearTimeout(t);
  }, [text, id]);
  return (
    <>
      <label htmlFor="qn" className="sr-only">Quick notes</label>
      <textarea id="qn" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Type notes…" className="field mt-2 resize-y" />
      <p className="mt-1 text-[12px] text-muted" aria-live="polite">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Private to you"}
      </p>
    </>
  );
}
