import { currentPath, getMarket } from "@/lib/market-server";
import { SiteSwitch } from "./site-switch";

/**
 * The US / Nigeria switch: at the top of the homepage ("hero") and in the footer of every public
 * page. Visitors land on the site for where they are; this lets them switch to the other one, and
 * the choice sticks (vc_site cookie) until they switch back.
 */
export async function SiteToggle({ variant = "footer" }: { variant?: "hero" | "footer" }) {
  const [market, path] = await Promise.all([getMarket(), currentPath()]);
  return <SiteSwitch market={market} path={path ?? "/"} variant={variant} />;
}
