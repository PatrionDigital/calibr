/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@calibr/core", "@calibr/adapters"],

  // Use standalone output for dynamic pages
  // This prevents static export issues with error pages
  output: 'standalone',

  // Proxy API requests to backend to avoid CORS issues
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${apiUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
