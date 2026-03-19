import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://www.inspectos.pt https://inspect-pt.vercel.app http://localhost:*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
