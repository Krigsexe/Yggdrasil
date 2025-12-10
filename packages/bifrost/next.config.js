const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true"
})

const withPWA = require("next-pwa")({
  dest: "public"
})

module.exports = withBundleAnalyzer(
  withPWA({
    reactStrictMode: true,
    images: {
      remotePatterns: [
        {
          protocol: "http",
          hostname: "localhost"
        },
        {
          protocol: "http",
          hostname: "127.0.0.1"
        },
        {
          protocol: "https",
          hostname: "**"
        }
      ]
    },
    experimental: {
      serverComponentsExternalPackages: ["sharp", "onnxruntime-node", "@xenova/transformers"]
    },
    webpack: (config, { isServer }) => {
      // Exclude native node modules from webpack bundling
      config.externals = config.externals || []
      config.externals.push({
        "onnxruntime-node": "commonjs onnxruntime-node",
        "sharp": "commonjs sharp"
      })

      // Ignore .node binary files
      config.module.rules.push({
        test: /\.node$/,
        use: "node-loader"
      })

      // Fallbacks for browser
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false
        }
      }

      return config
    }
  })
)
