import { NextResponse, type NextRequest } from "next/server";
import { isMarket, MARKET_COOKIE, MARKET_HEADER, marketFromPath, PATH_HEADER, stripMarket, withMarket, type Market } from "@/lib/market";

const YEAR = 60 * 60 * 24 * 365;
const SIGNED_IN_ONLY = /^\/(portal|room)(\/|$)/;

/**
 * 1. Site selection. The Nigeria site lives under /ng and the US site at the root.
 *    - Public and sign-in pages follow the visitor's current location (x-vercel-ip-country on
 *      Vercel): in Nigeria → /ng, anywhere else → the root. When the location is unknown (local
 *      development) the URL is respected.
 *    - The patient portal follows the account instead, so a patient who travels keeps their own
 *      portal. The vc_market cookie (set at sign-in) and src/lib/auth/dal.ts take care of that.
 *    /ng/* is rewritten onto the shared routes with the market in the x-market request header.
 * 2. Optimistic auth guard: requests without a session cookie are bounced from the portals. Real
 *    authorization happens in src/lib/auth/dal.ts.
 */
export function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;
  const hasSession = req.cookies.has("vc_session");

  // ── Doctor portal: shared, never prefixed ──
  if (pathname.startsWith("/doctor")) {
    if (!hasSession && !pathname.startsWith("/doctor/sign-in")) return NextResponse.redirect(new URL("/doctor/sign-in", req.url));
    return NextResponse.next();
  }

  const onNg = marketFromPath(pathname);
  const route = stripMarket(pathname);
  if (onNg === "ng" && /^\/(doctor|api)(\/|$)/.test(route)) return NextResponse.redirect(new URL(route + search, req.url));
  const portal = SIGNED_IN_ONLY.test(route);

  // ── ?market= is set by the DAL when a patient opens the other site's portal: pin their account's site ──
  const explicit = searchParams.get("market");
  if (portal && isMarket(explicit)) {
    const clean = new URL(withMarket(route, explicit), req.url);
    searchParams.forEach((v, k) => k !== "market" && clean.searchParams.append(k, v));
    return remember(NextResponse.redirect(clean), explicit);
  }

  if (portal) {
    // The portal follows the account (cookie set at sign-in), not the visitor's location.
    const account = req.cookies.get(MARKET_COOKIE)?.value;
    if (isMarket(account) && account !== onNg) return NextResponse.redirect(new URL(withMarket(route, account) + search, req.url));
    if (!hasSession) {
      const url = new URL(withMarket("/sign-in", onNg), req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  } else {
    // Public and sign-in pages follow where the visitor is right now.
    const country = req.headers.get("x-vercel-ip-country");
    const located: Market | null = country ? (country.toUpperCase() === "NG" ? "ng" : "us") : null;
    if (located && located !== onNg) return NextResponse.redirect(new URL(withMarket(route, located) + search, req.url));
  }

  const headers = new Headers(req.headers);
  headers.set(MARKET_HEADER, onNg);
  headers.set(PATH_HEADER, route);
  return onNg === "ng" ? NextResponse.rewrite(new URL(route + search, req.url), { request: { headers } }) : NextResponse.next({ request: { headers } });
}

function remember(res: NextResponse, market: Market) {
  res.cookies.set(MARKET_COOKIE, market, { path: "/", maxAge: YEAR, sameSite: "lax" });
  return res;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (images, fonts, icons…).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
