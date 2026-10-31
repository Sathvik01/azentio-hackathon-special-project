import { NextResponse, type NextRequest } from "next/server";

// Coarse UX redirect only. Authority is decided per request by getActor() + policy on the server.
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/portal/:path*", "/workspace"] };
