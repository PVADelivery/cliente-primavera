import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceLayout } from "@/components/marketplace/MarketplaceLayout";

export const Route = createFileRoute("/marketplace")({
  component: MarketplaceLayout,
});
