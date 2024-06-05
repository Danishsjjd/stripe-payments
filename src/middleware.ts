import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session");

  if (!session) return NextResponse.redirect(new URL("/auth", request.url));

  // Call the authentication endpoint
  const responseAPI = await fetch(`${request.nextUrl.origin}/api/auth`, {
    headers: {
      Cookie: `session=${session?.value}`,
    },
  });

  //Return to /auth if token is not authorized
  if (responseAPI.status !== 200) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

//Add your protected routes
export const config = {
  matcher: ["/app/:path*"],
};
