import { useAntiSpamMonitor } from "@/hooks/useAntiSpamMonitor";

interface GlobalAntiSpamProps {
  appName?: string;
}

export function GlobalAntiSpam({ appName = "Marketplace Cliente" }: GlobalAntiSpamProps) {
  useAntiSpamMonitor({ appName });
  return null;
}
