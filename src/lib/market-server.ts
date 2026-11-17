import "server-only";
import { cookies, headers } from "next/headers";
import { MARKET_COOKIE, MARKET_HEADER, MARKETS, PATH_HEADER, withMarket, type Market } from "./market";

/** Which site this request is for, as set by src/proxy.ts. */
export async function getMarket(): Promise<Market> {
  return (await headers()).get(MARKET_HEADER) === "ng" ? "ng" : "us";
}

export async function getMarketConfig() {
  return MARKETS[await getMarket()];
}

/** The route path without the /ng prefix, as set by src/proxy.ts (null outside proxied routes). */
export async function currentPath(): Promise<string | null> {
  return (await headers()).get(PATH_HEADER);
}

/** Prefix an app path for the current request's site. */
export async function marketHref(path: string) {
  return withMarket(path, await getMarket());
}

/**
 * Pin the visitor to an account's site (server actions / route handlers only), so later links and
 * redirects land on the right site without a detour through the proxy.
 */
export async function rememberMarket(market: Market) {
  (await cookies()).set(MARKET_COOKIE, market, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
