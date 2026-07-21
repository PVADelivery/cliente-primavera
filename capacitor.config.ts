import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.primavera.cliente",
  appName: "MT 24horas express",
  webDir: "dist",
  server: {
    // Em desenvolvimento, aponte para o preview Lovable, ex.:
    // url: "https://id-preview--<UUID>.lovable.app",
    // cleartext: true,
    androidScheme: "https",
  },
};

export default config;
