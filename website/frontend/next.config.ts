import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js dev server blocks requests whose Host header isn't localhost
  // by default (since 15.2.2, CVE-2025-48068 fix). Wildcards are
  // supported with a leading dot, so this covers every ngrok subdomain
  // you get handed, not just today's one-off URL.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
    "*"
  ],
};

export default nextConfig;