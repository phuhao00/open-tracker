/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许服务端读取仓库根目录的 data/history
  experimental: {
    externalDir: true,
  },
};

module.exports = nextConfig;
