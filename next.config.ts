import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
