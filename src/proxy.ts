import { NextResponse, type NextRequest } from "next/server";

// /editor is the free no-account screenshot editor (client-only, nothing is
// persisted server-side); /register must be reachable for its sign-up CTA.
const PUBLIC_PATHS = ["/login", "/register", "/demo", "/editor"];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip API routes, Next.js internals and static assets (paths with a file extension)
	if (
		pathname.startsWith("/api") ||
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon") ||
		pathname.includes(".")
	) {
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
