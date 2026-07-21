import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/marketplace/privacy")({
  head: () => ({ meta: [{ title: "Privacidade — MT 24horas express" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center gap-3 bg-card p-6 rounded-3xl border border-border/40 shadow-sm relative">
        <button 
          onClick={() => navigate({ to: '/marketplace/profile' })}
          className="absolute top-4 right-4 sm:static sm:mr-2 p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="pr-10 sm:pr-0">
          <h1 className="font-display text-2xl font-black">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Transparência e segurança com seus dados.</p>
        </div>
      </div>
      
      <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border/40 shadow-sm space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Coleta de Dados</h2>
          <p>
            Coletamos apenas o necessário para entregar seus pedidos com segurança e eficiência, como nome, endereço de entrega, telefone e dados essenciais da conta.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. Uso das Informações</h2>
          <p>
            Suas informações são utilizadas exclusivamente para o processamento de pedidos, entrega, comunicação de status e melhoria contínua da nossa plataforma.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Compartilhamento</h2>
          <p>
            Compartilhamos seus dados básicos apenas com os estabelecimentos parceiros e entregadores responsáveis pelo seu pedido, estritamente para viabilizar a entrega rápida e correta. Não vendemos suas informações para terceiros.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. Segurança</h2>
          <p>
            Adotamos medidas de segurança rígidas e tecnologias modernas para proteger seus dados contra acesso não autorizado, garantindo privacidade em todas as etapas da sua compra.
          </p>
        </section>
      </div>
    </div>
  );
}
