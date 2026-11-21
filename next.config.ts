import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  agentRules: false,
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
};

export default config;
