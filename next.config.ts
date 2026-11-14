import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  compress: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Heavy static assets (3D models, textures, Draco decoder, videos) are not fingerprinted,
  // so by default they are revalidated on every visit. Cache them for a week, refresh in background.
  async headers() {
    const heavy = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return ["models", "textures", "draco", "about", "brand"].map((dir) => ({
      source: `/${dir}/:path*`,
      headers: heavy,
    }));
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

export default nextConfig;
