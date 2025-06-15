
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
    ],
  },
  experimental: {
    allowedDevOrigins: [
      // Add the origin from the Firebase Studio / Cloud Workstation warning
      'https://9003-firebase-studio-1749668050033.cluster-joak5ukfbnbyqspg4tewa33d24.cloudworkstations.dev',
      // It's also good practice to keep your local port if you access it directly sometimes
      'http://localhost:9003',
    ],
  },
};

export default nextConfig;
