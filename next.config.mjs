/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit"],
     images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "gaviasthemes.net",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      {
        protocol: "https",
        hostname: "gravatar.com",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
    ],
    // Configure image qualities to avoid warnings
    qualities: [25, 50, 75, 90, 100],
    // Add timeout and retry configurations
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Increase timeout for external images
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      // Add properties as needed, e.g.
      bodySizeLimit: '10MB', // or some other valid SizeLimit value
      allowedOrigins: ['https://localhost:3000', 'https://www.footballbank.soccer'], // or some other valid string[]
    },
  },
  // Next.js 16 builds with Turbopack by default. An empty config acknowledges
  // that the webpack fallbacks below are webpack-only (client Node polyfills).
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Add timeout configuration for external requests
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
