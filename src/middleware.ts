import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken, gateEnabled } from "@/lib/auth";

// Gate every page/route behind the passphrase cookie, except the login screen,
// the unlock endpoint, and static assets.
export async function middleware(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.webmanifest";
  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const ok = cookie && cookie === (await expectedToken());
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
