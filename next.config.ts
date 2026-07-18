import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Temporarily enabled in development so OneSignal can test the Service Worker
  // disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: [
    '@prisma/client',
    '@react-pdf/renderer', 
    '@react-email/render', 
    '@react-email/components', 
    'resend'
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
