/**
 * The practice runs two patient-facing sites from one codebase:
 *   - United States at the root ("/", "/portal", …)
 *   - Nigeria under "/ng" ("/ng", "/ng/portal", …)
 * src/proxy.ts picks the site (explicit choice → cookie → IP country), rewrites "/ng/*" onto the shared
 * routes and passes the market down in the `x-market` request header. Each patient account belongs to
 * one market; the doctor portal ("/doctor") is shared and never prefixed.
 */
export type Market = "us" | "ng";
export type DbMarket = "US" | "NG";

export const MARKET_COOKIE = "vc_market";
export const MARKET_HEADER = "x-market";
export const PATH_HEADER = "x-pathname";

export const MARKETS = {
  us: {
    id: "us",
    prefix: "",
    name: "United States",
    short: "US",
    lang: "en-US",
    defaultTimeZone: "America/New_York",
    emergency: "911",
    emergencyLine: "call 911",
    phonePlaceholder: "+1 …",
    planCurrency: "USD",
  },
  ng: {
    id: "ng",
    prefix: "/ng",
    name: "Nigeria",
    short: "NG",
    lang: "en-NG",
    defaultTimeZone: "Africa/Lagos",
    emergency: "112 or 767",
    emergencyLine: "call 112 or 767",
    phonePlaceholder: "+234 …",
    planCurrency: "NGN",
  },
} as const satisfies Record<Market, unknown>;

export const toDbMarket = (m: Market): DbMarket => (m === "ng" ? "NG" : "US");
export const fromDbMarket = (m: DbMarket | null | undefined): Market => (m === "NG" ? "ng" : "us");
export const isMarket = (v: unknown): v is Market => v === "us" || v === "ng";

const NG_PREFIX = /^\/ng(?=\/|\?|#|$)/;
/** Routes shared by both sites that must never carry the /ng prefix. */
const UNPREFIXED = /^\/(doctor|api|_next)(\/|\?|#|$)/;

export const marketFromPath = (path: string): Market => (NG_PREFIX.test(path) ? "ng" : "us");

/** "/ng/portal/visits" → "/portal/visits"; "/ng" → "/". */
export const stripMarket = (path: string) => path.replace(NG_PREFIX, "") || "/";

/** Prefix an app-relative href for a market: withMarket("/portal", "ng") → "/ng/portal". */
export function withMarket(href: string, market: Market): string {
  if (market === "us" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (NG_PREFIX.test(href) || UNPREFIXED.test(href)) return href;
  if (href === "/") return "/ng";
  if (href.startsWith("/?") || href.startsWith("/#")) return `/ng${href.slice(1)}`;
  return `/ng${href}`;
}
