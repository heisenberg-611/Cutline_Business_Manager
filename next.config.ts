import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    '@react-pdf/renderer', 
    '@react-email/render', 
    '@react-email/components', 
    'resend'
  ],
};

export default nextConfig;
