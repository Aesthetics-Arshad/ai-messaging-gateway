/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Next.js 15/16 - moved out of experimental
  serverExternalPackages: ['@neondatabase/serverless'],
  
  // Updated image config (domains is deprecated)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
}

export default nextConfig;