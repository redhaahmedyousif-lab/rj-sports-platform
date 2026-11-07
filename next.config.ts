import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // شعارات الفرق والدوريات المخزّنة في Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
