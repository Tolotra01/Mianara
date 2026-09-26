import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photos des candidats et reçus de paiement (réduits côté navigateur, mais on garde de la marge).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
