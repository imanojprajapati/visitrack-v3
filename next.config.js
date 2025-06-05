/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://www.visitrack.in/api'
      : 'http://localhost:3000/api',
    NEXT_PUBLIC_ENV: process.env.NODE_ENV
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dghizdjio/**',
      },
    ],
    domains: ['res.cloudinary.com', 'www.visitrack.in', 'localhost'],
    unoptimized: true,
  },
  transpilePackages: [
    '@ant-design/icons-svg',
    'rc-util',
    'rc-pagination',
    'rc-picker',
    'rc-table',
    'rc-tree',
    'rc-dialog',
    'rc-drawer',
    'rc-cascader',
    'rc-select',
    'rc-tree-select',
    '@rc-component/color-picker',
    '@rc-component/trigger',
    '@rc-component/tour',
    '@rc-component/portal',
    '@rc-component/util',
    '@ctrl/tinycolor',
    'rc-motion',
    'rc-field-form',
    'rc-dropdown',
    'rc-menu',
    'rc-input',
    'rc-textarea',
    'rc-tooltip',
    'rc-virtual-list'
  ],
  experimental: {
    esmExternals: true,
    serverComponentsExternalPackages: [],
    optimizeCss: false,
    scrollRestoration: false
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        module: false,
      };
    }
    
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename]
      }
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
      '@admin': require('path').resolve(__dirname, './src/components/admin'),
    };

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production'
          ? 'https://www.visitrack.in/api/:path*'
          : 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 