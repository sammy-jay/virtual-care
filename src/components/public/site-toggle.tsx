import { Icon } from "@/components/icons";
import { cn } from "@/lib/format";
import { MARKETS, type Market } from "@/lib/market";
import { currentPath, getMarket } from "@/lib/market-server";
import { chooseSite } from "./site-toggle-action";

/**
 * "United States | Nigeria" in the footer. Visitors land on the site for where they are; this lets
 * them switch to the other one, and the choice sticks (vc_site cookie) until they switch back.
 * A plain form, so it also works before JavaScript loads.
 */
export async function SiteToggle() {
  const [market, path] = await Promise.all([getMarket(), currentPath()]);
  return (
    <form action={chooseSite} className="flex items-center gap-2.5">
      <input type="hidden" name="path" value={path ?? "/"} />
      <span id="site-toggle-label" className="flex items-center gap-1.5 font-semibold text-sage-ink">
        <Icon name="globe" size={16} />
        Site
      </span>
      <div role="group" aria-labelledby="site-toggle-label" className="inline-flex rounded-full border border-[#C9DDD3] bg-white p-1">
        {(["us", "ng"] as Market[]).map((m) => {
          const on = m === market;
          return (
            <button
              key={m}
              name="site"
              value={m}
              aria-pressed={on}
              disabled={on}
              className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors", on ? "bg-forest text-white" : "text-forest hover:bg-sage")}
            >
              {MARKETS[m].name}
            </button>
          );
        })}
      </div>
    </form>
  );
}
