import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.primavera.cliente",
  appName: "MT 24 Horas Express - Marketplace",
  webDir: "dist/client",
  server: {
    url: "https://mt24horasexpress.com",
    errorPath: "error.html",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      sound: "ring.wav",
    },
  },
};

export default config;
