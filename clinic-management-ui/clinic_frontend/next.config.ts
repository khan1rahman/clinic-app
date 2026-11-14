import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/appointments/:id",
        destination: "http://127.0.0.1:8000/appointments/:id"
      },
      {
        source: "/api/visits/:id",
        destination: "http://127.0.0.1:8000/visits/:id"
      },
      {
        source: "/api/measurements/:id",
        destination: "http://127.0.0.1:8000/measurements/:id"
      },
      {
        source: "/api/habits/:id",
        destination: "http://127.0.0.1:8000/habits/:id"
      },
      {
        source: "/api/personal-history/:id",
        destination: "http://127.0.0.1:8000/personal-history/:id"
      },
      {
        source: "/api/allergies/:id",
        destination: "http://127.0.0.1:8000/allergies/:id"
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*"
      }
    ];
  }
};

export default nextConfig;