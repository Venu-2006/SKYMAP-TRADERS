import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      // Locally stored uploads (API fallback when Cloudinary isn't configured)
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      ...(process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? [{ protocol: 'https' as const, hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname, pathname: '/uploads/**' }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
