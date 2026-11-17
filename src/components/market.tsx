"use client";

import NextLink from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { MARKETS, withMarket, type Market } from "@/lib/market";

const MarketContext = createContext<Market>("us");

/** Provided by the root layout from the proxy's x-market header, so server and client agree. */
export function MarketProvider({ market, children }: { market: Market; children: ReactNode }) {
  return <MarketContext.Provider value={market}>{children}</MarketContext.Provider>;
}

export const useMarket = () => useContext(MarketContext);
export const useMarketConfig = () => MARKETS[useContext(MarketContext)];

/** Prefix an app path for the current site (client components). */
export function useMarketHref() {
  const market = useContext(MarketContext);
  return (href: string) => withMarket(href, market);
}

/** "Not for emergencies. Call 911." with this site's number. */
export function EmergencyNote({ className }: { className?: string }) {
  const site = MARKETS[useContext(MarketContext)];
  return <span className={className}>Not for emergencies. Call {site.emergency}.</span>;
}

/**
 * next/link that keeps visitors on their site: on the Nigeria site "/portal" becomes "/ng/portal".
 * "/doctor", "/api" and external links are left alone.
 */
export function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const market = useContext(MarketContext);
  return <NextLink href={typeof href === "string" ? withMarket(href, market) : href} {...rest} />;
}

export default Link;
