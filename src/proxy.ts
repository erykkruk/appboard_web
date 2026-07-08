import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/demo"];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip API routes and Next.js internals
	if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
		return NextResponse.next();
	}

	const sessionToken =
		request.cookies.get("better-auth.session_token")?.value ??
		request.cookies.get("__Secure-better-auth.session_token")?.value;

	const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

	// No session cookie → redirect to login (unless already on public page)
	if (!sessionToken && !isPublic) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// Don't redirect authenticated users away from login —
	// if their session is stale, they need to be able to access /login
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
