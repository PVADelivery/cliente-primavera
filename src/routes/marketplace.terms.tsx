import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/marketplace/terms")({
  head: () => ({ meta: [{ title: "Termos — MT 24horas express" }] }),
  component: TermsPage,
});

function TermsPage() {
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
          <FileText className="w-6 h-6" />
        </div>
        <div className="pr-10 sm:pr-0">
          <h1 className="font-display text-2xl font-black">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mt-1">Regras e condições de uso da plataforma.</p>
        </div>
      </div>
      
      <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border/40 shadow-sm space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Aceitação dos Termos</h2>
          <p>
            Ao utilizar o aplicativo MT 24horas express, você concorda com estes termos. Se não concordar com alguma regra, por favor, não utilize nossos serviços.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. Uso da Plataforma</h2>
          <p>
            O MT 24horas express atua como um intermediador entre clientes e estabelecimentos locais. O preparo e a qualidade dos produtos são de total responsabilidade de cada restaurante parceiro.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Responsabilidades do Usuário</h2>
          <p>
            Você é responsável por fornecer informações corretas para a entrega e estar disponível no endereço indicado. Pedidos recusados sem justificativa válida podem resultar na suspensão da conta.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. Cancelamentos e Reembolsos</h2>
          <p>
            Cancelamentos só podem ser feitos antes de o restaurante aceitar o pedido. Para problemas com a entrega ou qualidade, contate nosso suporte diretamente pelo aplicativo para analisarmos um reembolso.
          </p>
        </section>
      </div>
    </div>
  );
}
