import type { NextConfig } from 'next';

// allowedDevOrigins takes hostnames (no ports). Override with ALLOWED_DEV_ORIGINS="a,b".
const origins = (process.env.ALLOWED_DEV_ORIGINS ?? '64.177.59.133')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: origins,
};

export default nextConfig;
