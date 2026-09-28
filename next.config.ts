import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@supabase/ssr'],
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
        ? [process.env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, '')]
        : [],
    },
  },
};

export default nextConfig;
