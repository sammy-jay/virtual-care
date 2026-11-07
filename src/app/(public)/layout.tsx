import { Suspense } from "react";
import { CookieBanner } from "@/components/public/cookie-banner";
import { PublicFooter, PublicPage } from "@/components/public/shell";
import { TimeZoneSync } from "@/components/tz-sync";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <PublicPage>
      {children}
      <PublicFooter />
      <Suspense>
        <CookieBanner />
      </Suspense>
      <TimeZoneSync />
    </PublicPage>
  );
}
