import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  nitro: {
    preset: process.env.NITRO_PRESET ?? "cloudflare-module",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "@capacitor/push-notifications": path.resolve(__dirname, "./src/lib/pushNotifications.ts"),
        "@capacitor/local-notifications": path.resolve(__dirname, "./src/lib/localNotifications.ts"),
        "@capacitor/app": path.resolve(__dirname, "./src/lib/capacitorApp.ts"),
        "@capacitor/status-bar": path.resolve(__dirname, "./src/lib/statusBarPlugin.ts"),
      },
    },
    ssr: {
      external: [
        "@capacitor/core",
        "@capacitor/app",
        "@capacitor/status-bar",
        "@capacitor/push-notifications",
        "@capacitor/local-notifications",
      ],
    },
  },
});

