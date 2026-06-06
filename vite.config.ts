import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const vendorChunks = [
  { name: "react-vendor", packages: ["/react/", "/react-dom/"] },
  {
    name: "tanstack-vendor",
    packages: [
      "/@tanstack/react-query/",
      "/@tanstack/query-core/",
      "/@tanstack/react-router/",
      "/@tanstack/react-start/",
      "/@tanstack/router-core/",
      "/seroval/",
    ],
  },
  { name: "charts-vendor", packages: ["/recharts/", "/d3-", "/lodash/", "/lodash-es/"] },
  { name: "motion-vendor", packages: ["/framer-motion/"] },
  { name: "remotion-vendor", packages: ["/@remotion/player/", "/remotion/"] },
  {
    name: "realtime-vendor",
    packages: [
      "/socket.io-client/",
      "/socket.io-parser/",
      "/@socket.io/",
      "/engine.io-client/",
      "/engine.io-parser/",
    ],
  },
  { name: "ui-vendor", packages: ["/@radix-ui/", "/lucide-react/", "/cmdk/", "/vaul/"] },
  { name: "backend-vendor", packages: ["/@insforge/sdk/", "/@supabase/postgrest-js/"] },
];

function manualChunks(id: string) {
  const normalized = id.replace(/\\/g, "/");
  if (!normalized.includes("/node_modules/")) return;

  for (const group of vendorChunks) {
    if (group.packages.some((packageName) => normalized.includes(packageName))) {
      return group.name;
    }
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      server: { entry: "server" },
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
