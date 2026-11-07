import type { Metadata } from "next";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { Alert, ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Password updated" };

export default function PasswordUpdatedPage() {
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle icon="check" title="Password updated" lead="You are signed out everywhere else. Sign in with your new password." />
        <Alert tone="warning">If this was not you, contact support right away.</Alert>
        <ButtonLink href="/sign-in" size="lg">
          Sign in
        </ButtonLink>
      </div>
    </AuthSplit>
  );
}
