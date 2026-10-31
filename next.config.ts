import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Media is never served from /public; it streams through /api/media/[id] after a policy check.
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "nodemailer"],
};

export default nextConfig;
