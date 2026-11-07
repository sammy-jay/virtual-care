import type { NextConfig } from "next";

// Cache Components is off on purpose: almost every portal route is per-user
// health data that must render at request time. See PLAN.md §1.
const nextConfig: NextConfig = {
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
