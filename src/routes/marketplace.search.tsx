import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/marketplace/search")({
  head: () => ({ meta: [{ title: "Buscar — MT Express" }] }),
  component: () => {
    const [q, setQ] = useState("");
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Buscar</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lojas, pratos, categorias…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <p className="text-sm text-muted-foreground">Em breve: resultados em tempo real.</p>
      </div>
    );
  },
});
