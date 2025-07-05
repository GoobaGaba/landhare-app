
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // This is required for Next.js to work in this environment
    allowedDevOrigins: ["https://*.cluster-joak5ukfbnbyqspg4tewa33d24.cloudworkstations.dev"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  transpilePackages: [
    "@genkit-ai/core",
    "@genkit-ai/flow",
    "dotprompt",
    "zod-to-json-schema",
  ]
};

export default nextConfig;
