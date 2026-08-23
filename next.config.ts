import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
