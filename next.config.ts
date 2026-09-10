import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  allowedDevOrigins: ["192.168.15.101", "localhost", "127.0.0.1"],
};

export default nextConfig;
