import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, Package, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/marketplace/errands")({
  head: () => ({ meta: [{ title: "Enviar Encomenda — Primavera Delivery" }] }),
  component: ErrandsPage,
});

function ErrandsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff || !description) return;
    setLoading(true);

    try {
      // Create custom delivery directly
      const { error } = await supabase.from("deliveries").insert({
        company_id: null,
        customer_name: user?.user_metadata?.full_name || user?.email || "Cliente",
        pickup_address: pickup,
        address: dropoff,
        notes: description,
        value: 15.00, // Fixed fee for MVP
        is_customer_errand: true,
        status: "pending",
        commission: 12.00, // Fixed driver commission
      } as any);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao solicitar motoboy. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">Solicitação enviada!</h2>
        <p className="text-muted-foreground mb-8">
          Um entregador já foi notificado e está a caminho do local de coleta.
        </p>
        <Button onClick={() => navigate({ to: "/marketplace" })} className="w-full max-w-xs h-12 rounded-xl">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-secondary grid place-items-center text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Solicitar Entregador</h1>
          <p className="text-xs text-muted-foreground">Envios rápidos na cidade</p>
        </div>
      </div>

      <div className="bg-secondary/30 p-4 rounded-2xl mb-6">
        <p className="text-sm font-medium">Preço Fixo de Lançamento</p>
        <p className="text-2xl font-display font-bold text-primary">R$ 15,00</p>
        <p className="text-xs text-muted-foreground mt-1">Qualquer corrida dentro do perímetro urbano.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Endereço de Coleta
          </label>
          <input
            required
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Onde devemos buscar?"
            className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" /> Endereço de Entrega
          </label>
          <input
            required
            type="text"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="Onde devemos entregar?"
            className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" /> O que vamos transportar?
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Buscar a chave com a Maria, Entregar um pacote de roupas..."
            className="w-full h-24 p-4 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !user}
          className="w-full h-14 rounded-xl font-bold text-lg mt-4 shadow-[var(--shadow-elegant)]"
        >
          {loading ? "Solicitando..." : user ? "Confirmar Solicitação" : "Faça login para solicitar"}
        </Button>
      </form>
    </div>
  );
}
