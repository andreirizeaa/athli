import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      // Library restructuring redirects
      {
        source: '/training/:path*',
        destination: '/library/training/:path*',
        permanent: true,
      },
      {
        source: '/forms/:path*',
        destination: '/library/forms/:path*',
        permanent: true,
      },
      {
        source: '/metrics/:path*',
        destination: '/library/metrics/:path*',
        permanent: true,
      },
      {
        source: '/habits/:path*',
        destination: '/library/habits/:path*',
        permanent: true,
      },
      {
        source: '/files/:path*',
        destination: '/library/files/:path*',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
};

export default nextConfig;
