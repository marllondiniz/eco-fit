import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Reduz recarregamentos desnecessários e pode melhorar estabilidade no dev
  reactStrictMode: true,
  experimental: {
    // Evita recompilar tudo a cada mudança em arquivos grandes
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
