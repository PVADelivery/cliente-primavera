import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.primavera.cliente",
  appName: "MT 24 Horas Express",
  webDir: "dist/client",
  server: {
    url: "https://www.mt24horasexpress.com",
    allowNavigation: [
      "mt24horasexpress.com",
      "*.mt24horasexpress.com",
      "www.mt24horasexpress.com",
      "owlbzwsdcognrgolvnzg.supabase.co"
    ],
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
