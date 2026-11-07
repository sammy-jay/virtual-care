import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic guard only: bounce requests without a session cookie away from the portals.
 * Real authorization happens in the Data Access Layer (src/lib/auth/dal.ts) on every page and action.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const has = req.cookies.has("vc_session");
  if (has) return NextResponse.next();
  if (pathname.startsWith("/doctor") && !pathname.startsWith("/doctor/sign-in")) {
    return NextResponse.redirect(new URL("/doctor/sign-in", req.url));
  }
  if (pathname.startsWith("/portal") || pathname.startsWith("/room")) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/doctor/:path*", "/room/:path*"],
};
