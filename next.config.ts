import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["chrome-launcher", "lighthouse", "pdfkit"],
};

export default nextConfig;
