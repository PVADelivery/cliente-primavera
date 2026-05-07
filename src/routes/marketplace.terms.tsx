import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace/terms")({
  head: () => ({ meta: [{ title: "Termos — Primavera Delivery" }] }),
  component: () => (
    <article className="prose prose-sm max-w-none">
      <h1 className="font-display text-2xl font-bold">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground">Ao usar o Primavera Delivery, você concorda com…</p>
    </article>
  ),
});
