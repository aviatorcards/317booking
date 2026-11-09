const appTimeZone = process.env.APP_TIMEZONE || "America/Indiana/Indianapolis";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_TIMEZONE: appTimeZone,
  },
};

export default nextConfig;
