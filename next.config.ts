import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Served as a zone of forgework.space: the main site rewrites /UR/* here.
  basePath: "/UR",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Breakdown reports carry up to 5 photos, downscaled in the browser first.
      bodySizeLimit: "8mb",
      // Requests arrive through forgework.space, whose origin differs from this deployment's host.
      allowedOrigins: ["forgework.space", "www.forgework.space"],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
