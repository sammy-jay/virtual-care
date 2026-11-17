import Link from "@/components/market";
import type { Metadata } from "next";
import type { InquiryStatus } from "@prisma/client";
import { ButtonLink, Card, PageTitle, StatusTag } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { cn } from "@/lib/format";
import { listDateLabel, PRACTICE_TZ } from "@/lib/time";

export const metadata: Metadata = { title: "Inquiries" };

export default async function InquiriesPage({ searchParams }: PageProps<"/doctor/inquiries">) {
  await requireDoctor();
  const { f } = await searchParams;
  const filter = (["NEW", "REPLIED", "CLOSED"] as InquiryStatus[]).find((s) => s.toLowerCase() === f);
  const list = await db.inquiry.findMany({ where: filter ? { status: filter } : {}, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageTitle title="Inquiries" subtitle="From your website contact form" />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "All"], ["new", "New"], ["replied", "Replied"], ["closed", "Closed"]].map(([k, l]) => (
          <Link key={k} href={`/doctor/inquiries${k ? `?f=${k}` : ""}`} className={cn("rounded-full px-4 py-2 text-sm font-bold", (f ?? "") === k ? "bg-forest text-white" : "bg-white text-body")}>
            {l}
          </Link>
        ))}
      </div>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[620px] text-left text-[14.5px]">
          <thead>
            <tr className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-muted">
              <th className="px-6 py-3">From</th>
              <th className="px-3 py-3">Subject</th>
              <th className="px-3 py-3">Received</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.id} className="border-t border-line-soft">
                <td className="px-6 py-3.5 font-bold">{q.name}</td>
                <td className="px-3">{q.topic}</td>
                <td className="px-3">{listDateLabel(q.createdAt, PRACTICE_TZ).includes(":") ? "Today" : listDateLabel(q.createdAt, PRACTICE_TZ)}</td>
                <td className="px-3">
                  <StatusTag status={q.status} />
                </td>
                <td className="px-6 text-right">
                  <ButtonLink href={`/doctor/inquiries/${q.id}`} size="sm" variant="secondary">
                    Open
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-sm text-body">No inquiries here.</p>}
      </Card>
    </div>
  );
}
