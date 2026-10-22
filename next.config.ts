import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./reference/**/*", "./src/data/**/*"],
  },
};

export default nextConfig;
