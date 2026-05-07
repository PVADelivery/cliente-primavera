import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace/privacy")({
  head: () => ({ meta: [{ title: "Privacidade — Primavera Delivery" }] }),
  component: () => (
    <article className="prose prose-sm max-w-none">
      <h1 className="font-display text-2xl font-bold">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground">Coletamos apenas o necessário para entregar seus pedidos com segurança…</p>
    </article>
  ),
});
