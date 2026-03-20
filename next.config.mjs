/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  /**
   * Windows: Webpack's filesystem cache can warn when the same folder is resolved as
   * `D:\...` vs `d:\...` (same path, different casing). That is harmless; lowering
   * infrastructure log noise avoids flooding the console. To see all webpack logs:
   * set WEBPACK_VERBOSE=1
   */
  webpack: (config) => {
    if (process.platform === "win32" && !process.env.WEBPACK_VERBOSE) {
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: "error",
      };
    }
    return config;
  },
};

export default nextConfig;
