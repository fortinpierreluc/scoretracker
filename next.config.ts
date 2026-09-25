import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d1yykh3c16sa22.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
