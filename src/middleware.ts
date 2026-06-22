export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/band/:path*",
    "/venue/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
