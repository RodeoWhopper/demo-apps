import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/jwt";

/**
 * Route protection:
 *  - /dashboard/*  -> any signed-in user
 *  - /admin/*      -> role === "admin" (others get a 403 page)
 * Unauthenticated requests are redirected (307) to /login?next=<original path>.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE_NAME); // drop expired/invalid tokens
    return res;
  }

  if (pathname.startsWith("/admin") && session.role !== "admin") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      // Server Action / API style requests get a plain 403 instead of the HTML page.
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.rewrite(url, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
