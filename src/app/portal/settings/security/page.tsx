import type { Metadata } from "next";
import { Alert, Button, Card, Eyebrow, PageTitle } from "@/components/ui";
import { getSession, requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { relativeLabel } from "@/lib/time";
import { disableTotp, revokeOtherSessions, revokeSession } from "../actions";
import { PasswordForm, TotpSetup } from "./security-forms";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage({ searchParams }: PageProps<"/portal/settings/security">) {
  const user = await requirePatient();
  const current = await getSession();
  const { signedout } = await searchParams;
  const sessions = await db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } });
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      <PageTitle title="Security" subtitle="Keep your account and records protected." />
      {signedout === "1" && <Alert tone="success">Other devices were signed out.</Alert>}
      <Card>
        <Eyebrow>Password</Eyebrow>
        <PasswordForm />
      </Card>
      <Card>
        <Eyebrow>Two-step sign-in</Eyebrow>
        <div className="mb-3 mt-2 flex items-center justify-between gap-4">
          <div>
            <b>Authenticator app</b>
            <div className="text-[13px] text-muted">Ask for a code when signing in on a new device</div>
          </div>
          {user.totpEnabled && (
            <form action={disableTotp}>
              <Button variant="ghost" size="sm">
                Turn off
              </Button>
            </form>
          )}
        </div>
        <TotpSetup enabled={user.totpEnabled} />
      </Card>
      <Card>
        <Eyebrow>Where you are signed in</Eyebrow>
        <div className="mt-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 first:border-t-0">
              <div>
                <b>
                  {s.device ?? "Browser"}
                  {s.city ? ` · ${s.city}` : ""}
                </b>
                <div className="text-[13px] text-muted">{s.id === current?.id ? "This device · now" : relativeLabel(s.lastSeenAt, user.timeZone)}</div>
              </div>
              {s.id !== current?.id && (
                <form action={revokeSession}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
        {sessions.length > 1 && (
          <form action={revokeOtherSessions} className="mt-3">
            <Button variant="secondary">Sign out other devices</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
