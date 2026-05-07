import { NextResponse, type NextRequest } from "next/server";

const isProtectedPath = (pathname: string) =>
  pathname.startsWith("/dashboard") ||
  pathname.startsWith("/room") ||
  pathname.startsWith("/quiz");

const isAuthPath = (pathname: string) => pathname === "/login" || pathname === "/register";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && isAuthPath(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/room/:path*", "/quiz/:path*", "/login", "/register"],
};
