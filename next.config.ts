/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // ADVERTENCIA: Esto ignorará los errores de TypeScript durante el build.
    // Es recomendable corregir los errores en lugar de ignorarlos.
    ignoreBuildErrors: true,
  },
  eslint: {
    // ADVERTENCIA: Esto ignorará los errores de ESLint durante el build.
    ignoreDuringBuilds: true,
  },
  // ... cualquier otra configuración que tengas ...
};

module.exports = nextConfig;