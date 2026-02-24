/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        // Vercel auto-detected domain akan ditambahkan otomatis
      ],
    },
  },
}

module.exports = nextConfig
