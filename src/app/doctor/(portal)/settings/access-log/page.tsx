import Link from "next/link";
import type { Metadata } from "next";
import { Alert, ButtonLink, Card, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmt, PRACTICE_TZ, relativeLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Access log" };

export default async function AccessLogPage({ searchParams }: PageProps<"/doctor/settings/access-log">) {
  await requireDoctor();
  const { page } = await searchParams;
  const p = Math.max(0, Number(page) || 0);
  const [rows, total] = await Promise.all([db.accessLog.findMany({ orderBy: { createdAt: "desc" }, skip: p * 50, take: 50 }), db.accessLog.count()]);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageTitle
        title="Access log"
        subtitle="Every view of patient data, kept for 7 years."
        actions={
          <ButtonLink href="/api/doctor/access-log.csv" variant="secondary" icon="download" prefetch={false}>
            Download CSV
          </ButtonLink>
        }
      />
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-[14.5px]">
          <thead>
            <tr className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-muted">
              <th className="px-6 py-3">Who</th>
              <th className="px-3">Action</th>
              <th className="px-3">When</th>
              <th className="px-6">Where</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line-soft">
                <td className="px-6 py-3.5">{r.actorLabel}</td>
                <td className="px-3">{r.action}</td>
                <td className="px-3" title={fmt(r.createdAt, PRACTICE_TZ, "d MMM yyyy h:mm a")}>
                  {relativeLabel(r.createdAt, PRACTICE_TZ)}
                </td>
                <td className="px-6">{r.location ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          {total} entries · page {p + 1}
        </span>
        <span className="flex gap-3">
          {p > 0 && <Link href={`?page=${p - 1}`} className="font-bold text-forest">← Newer</Link>}
          {(p + 1) * 50 < total && <Link href={`?page=${p + 1}`} className="font-bold text-forest">Older →</Link>}
        </span>
      </div>
      <Alert tone="info" className="mt-4">
        Entries cannot be edited or deleted.
      </Alert>
    </div>
  );
}
