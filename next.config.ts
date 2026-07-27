import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:6680";

// Self-hosted PostHog. Analytics is proxied under our own origin so ad
// blockers, which match on the PostHog domain, do not drop the requests.
const POSTHOG_HOST =
  process.env.POSTHOG_HOST ?? "https://posthog.tools.playbuzzin.com";

// Without a key nothing is tracked, so the proxy must not exist either -
// otherwise every self-hosted install would be an open relay to our instance.
const ANALYTICS_ENABLED = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

const nextConfig: NextConfig = {
  output: "standalone",
  // Required by the PostHog proxy - a trailing-slash redirect breaks ingestion.
  skipTrailingSlashRedirect: ANALYTICS_ENABLED,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      ...(ANALYTICS_ENABLED
        ? [
            {
              source: "/ingest/:path*",
              destination: `${POSTHOG_HOST}/:path*`,
            },
          ]
        : []),
    ];
  },
  experimental: {
    // Deep research with reasoning models can run for many minutes — the
    // proxy must outlive the slowest backend request or the UI sees 500s.
    proxyTimeout: 900_000,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "play-lh.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
