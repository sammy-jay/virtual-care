"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

const QA: [string, string, string][] = [
  ["Getting started", "Is this service for emergencies?", "No. If you think you are having a medical emergency, call 911 in the US or 112 in Nigeria. Messages and visits are not monitored for urgent care."],
  ["Getting started", "What does the intro call cost?", "It is free, 15 minutes, and a good way to see whether the practice is right for you before an initial consultation."],
  ["Getting started", "Where are you licensed to see patients?", "Dr. Oparaji sees patients located in Texas, USA and in Nigeria. You confirm where you are when you book, because the rules depend on your location."],
  ["Visits", "How do video visits work?", "You get a private link in your portal. It opens in your browser on a phone or laptop — nothing to install. You can test your camera and microphone before you join."],
  ["Visits", "Which time zone are times shown in?", "Your own. Houston is the practice’s time zone, and we show both when they differ, for example 7:00 PM in Lagos and 1:00 PM in Houston."],
  ["Visits", "Can I cancel or reschedule?", "Yes, free of charge up to 12 hours before your visit. Memberships can be paused or cancelled from your account at any time."],
  ["Billing", "Can I pay in naira?", "Yes. Nigerian patients can pay in naira by card or bank transfer. The amount is shown before you confirm."],
  ["Billing", "What does a membership include?", "Secure messaging, member pricing and, on higher plans, visits included each month. See the Membership page for details."],
  ["Privacy", "How is my information protected?", "Your health profile, messages and care plans are encrypted and visible only to you and Dr. Oparaji. Every access to your record is logged."],
  ["Privacy", "Are my visits recorded?", "No. Visits are private rooms and are not recorded."],
];
const CATS = ["All", "Getting started", "Visits", "Billing", "Privacy"];

/** Board 02.5 — category chips + single-open accordion. */
export function FaqList() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState(0);
  const list = QA.filter((x) => cat === "All" || x[0] === cat);
  return (
    <>
      <div className="mb-10 flex flex-wrap gap-2.5" role="tablist" aria-label="FAQ categories">
        {CATS.map((n) => (
          <button
            key={n}
            role="tab"
            aria-selected={n === cat}
            onClick={() => {
              setCat(n);
              setOpen(0);
            }}
            className={`rounded-full border-[1.5px] px-5 py-[11px] text-[14.5px] font-bold ${n === cat ? "border-forest bg-forest text-white" : "border-field bg-white text-ink"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="max-w-[900px]">
        {list.map(([, q, a], i) => {
          const isOpen = i === open;
          return (
            <div key={q} className="border-b border-[#E6E8EC]">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-5 py-[26px] text-left font-display text-[22px] md:text-[26px]"
              >
                {q}
                <span
                  className={`flex size-11 flex-none items-center justify-center rounded-full border transition-transform duration-200 ${isOpen ? "rotate-45 border-forest bg-forest text-white" : "border-field"}`}
                >
                  <Icon name="plus" size={18} strokeWidth={2} />
                </span>
              </button>
              {isOpen && <div className="pb-7 pr-16 text-[16.5px] text-[#4A5262]">{a}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
