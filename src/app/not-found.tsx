import { AuthSplit } from "@/components/auth/auth-split";
import { ButtonLink } from "@/components/ui";

/** Board 08.3 */
export default function NotFound() {
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <div className="font-display text-[96px] leading-none text-forest">404</div>
        <h1 className="h-display text-[40px]">We could not find that page</h1>
        <p className="text-[16.5px] text-[#4A5262]">The link may be old, or the page may have moved.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">
            Contact us
          </ButtonLink>
        </div>
      </div>
    </AuthSplit>
  );
}
