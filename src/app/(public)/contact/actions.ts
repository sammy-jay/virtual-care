"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { notifyDoctors } from "@/lib/notify";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.email("Enter a valid email address, like name@example.com."),
  topic: z.string().trim().min(2, "Add a topic.").max(120),
  body: z.string().trim().min(5, "Tell us how we can help.").max(4000),
  ack: z.literal("on", { error: "Please confirm this is not an emergency." }),
});

export type ContactState = { ok?: boolean; errors?: Partial<Record<keyof z.infer<typeof schema>, string>>; values?: Record<string, string> };

export async function sendInquiry(_: ContactState, form: FormData): Promise<ContactState> {
  const values = Object.fromEntries(["name", "email", "topic", "body"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = schema.safeParse({ ...values, ack: form.get("ack") ?? undefined });
  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as keyof typeof errors] ??= i.message;
    return { errors, values };
  }
  const { name, email, topic, body } = parsed.data;
  await db.inquiry.create({ data: { name, email: email.toLowerCase(), topic, body } });
  await notifyDoctors({ category: "INQUIRIES", title: "New inquiry", body: `${name.split(" ")[0]} asked about ${topic.toLowerCase()}`, href: "/doctor/inquiries" });
  return { ok: true };
}
