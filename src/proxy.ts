import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "unikl_session";

const PUBLIC_PATHS = new Set([
  "/welcome",
  "/login",
  "/signup",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/bootstrap-admin",
  "/api/public/course-options",
  "/student/login",
  "/student/signup",
  "/api/student/auth/login",
  "/api/student/auth/signup",
  "/api/student/auth/logout",
  "/api/student/auth/me",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export function proxy(req: NextRequest) {
  if (req.method === "TRACE") {
    return new NextResponse(null, {
      status: 405,
      headers: { Allow: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
    });
  }

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const raw = req.cookies.get(COOKIE_NAME)?.value;
  const parts = raw?.split(".") ?? [];
  
  // New format: type.id.exp.sig
  const hasValidShape = parts.length === 4;
  const type = hasValidShape ? parts[0] : null;
  const exp = hasValidShape ? Number(parts[2]) : NaN;
  const notExpired = hasValidShape && Number.isFinite(exp) && Date.now() <= exp;

  const isStudentPath = pathname.startsWith("/student");
  const isApiStudentPath = pathname.startsWith("/api/student");

  if (!notExpired) {
    const url = req.nextUrl.clone();
    // Redirect to welcome page for root, otherwise to appropriate login
    if (pathname === "/") {
      url.pathname = "/welcome";
    } else {
      url.pathname = isStudentPath || isApiStudentPath ? "/student/login" : "/login";
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Check session type matches path
  if (isStudentPath || isApiStudentPath) {
    if (type !== "student") {
      const url = req.nextUrl.clone();
      url.pathname = "/student/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  } else {
    if (type !== "lecturer") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
