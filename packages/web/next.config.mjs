import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Get version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

// Get git hash
let gitHash = 'dev';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // Fallback if git is not available
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@calibr/core", "@calibr/adapters"],

  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_GIT_HASH: gitHash,
  },

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
