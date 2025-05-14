// next.config.js
export default {
  // Configurazione per il deploy su Vercel
  output: 'standalone',
  // Reindirizza API reqest a Express
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: '/api',
      },
    ];
  },
  // Usa Vite invece di webpack
  experimental: {
    externalDir: true
  }
};