import Link from "@/components/market";
import type { Plan } from "@prisma/client";
import { moneyShort } from "@/lib/format";
import { Check } from "./shell";

/** Membership cards shared by Home (02.1) and Membership (02.3). Nigeria shows naira prices. A single plan shows as one centered card. */
export function PlanCards({ plans, currency = "USD", ctaHref = (p: Plan) => `/sign-up?plan=${p.slug}` }: { plans: Plan[]; currency?: "USD" | "NGN"; ctaHref?: (p: Plan) => string }) {
  const price = (p: Plan) => (currency === "NGN" ? moneyShort(p.monthlyPriceNgn * 100, "NGN") : moneyShort(p.monthlyPriceCents));
  const single = plans.length === 1;
  return (
    <div className={single ? "mx-auto grid max-w-[520px]" : "grid items-stretch gap-[22px] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"}>
      {plans.map((p) =>
        p.popular ? (
          <div key={p.id} className="flex flex-col rounded-[28px] bg-forest p-8 text-white shadow-[0_40px_70px_-40px_rgba(23,96,75,.7)] md:p-9">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[30px] font-medium">{p.name}</h3>
              {!single && <span className="rounded-full bg-gold px-3 py-[5px] text-[12px] font-bold text-ink">Most popular</span>}
            </div>
            <p className="mt-1.5 text-[15px] text-white/80">{p.tagline}</p>
            <div className={`mb-6 mt-7 whitespace-nowrap font-display leading-none ${currency === "NGN" ? "text-[44px]" : "text-[60px]"}`}>
              {price(p)}
              <span className="font-sans text-[15px] text-white/80"> /month</span>
            </div>
            <ul className="flex flex-1 flex-col gap-[13px] text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check light />
                  {f}
                </li>
              ))}
            </ul>
            <Link href={ctaHref(p)} className="mt-8 block rounded-full bg-gold p-[15px] text-center font-bold text-ink">
              Choose {p.name}
            </Link>
          </div>
        ) : (
          <div key={p.id} className="flex flex-col rounded-[28px] border border-field bg-white p-8 md:p-9">
            <h3 className="font-display text-[30px] font-medium">{p.name}</h3>
            <p className="mt-1.5 text-[15px] text-[#5A6272]">{p.tagline}</p>
            <div className={`mb-6 mt-7 whitespace-nowrap font-display leading-none ${currency === "NGN" ? "text-[44px]" : "text-[60px]"}`}>
              {price(p)}
              <span className="font-sans text-[15px] text-[#5A6272]"> /month</span>
            </div>
            <ul className="flex flex-1 flex-col gap-[13px] text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <Link href={ctaHref(p)} className="mt-8 block rounded-full border-[1.5px] border-forest p-[15px] text-center font-bold text-forest">
              Choose {p.name}
            </Link>
          </div>
        ),
      )}
    </div>
  );
}
