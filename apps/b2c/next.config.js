/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@valuebooks/purchase-intake', '@valuebooks/shared'],
  webpack: (config) => {
    // Handle .js imports from TypeScript source files (NodeNext module resolution)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;
