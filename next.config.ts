import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admin deliverable uploads (PDF/ZIP up to 90 MB) pass through the proxy; the upload
    // service enforces the real per-kind caps after sniffing the bytes.
    proxyClientMaxBodySize: "95mb",
  },
};

export default nextConfig;
