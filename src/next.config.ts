
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // This allows the Next.js dev server to accept requests from the
    // Firebase Studio development environment.
    allowedDevOrigins: ["*.cloudworkstations.dev"],
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
