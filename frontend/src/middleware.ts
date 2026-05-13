import { NextResponse, type NextRequest } from "next/server";

const isProtectedPath = (pathname: string) =>
  pathname.startsWith("/dashboard") ||
  pathname.startsWith("/room") ||
  pathname.startsWith("/quiz");

const isAuthPath = (pathname: string) => pathname === "/login" || pathname === "/register";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("qb_access_token")?.value;
  const refreshToken = request.cookies.get("qb_refresh_token")?.value;

  // 1. Nếu đang vào trang bảo mật
  if (isProtectedPath(pathname)) {
    // Nếu không có Access Token VÀ không có Refresh Token -> Chuyển về Login
    if (!accessToken && !refreshToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = `?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
      return NextResponse.redirect(loginUrl);
    }
    // Nếu có ít nhất 1 trong 2 -> Cho phép đi qua, Client-side sẽ xử lý tiếp
    return NextResponse.next();
  }

  // 2. Nếu đã có Access Token mà cố vào trang Auth (Login/Register)
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
