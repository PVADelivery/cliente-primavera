import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidade — MT 24horas express" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-start sm:items-center gap-3 bg-card p-6 rounded-3xl border border-border/40 shadow-sm relative">
        <button 
          onClick={() => navigate({ to: '/marketplace' })}
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
          <p className="text-sm text-muted-foreground mt-1">Transparência e segurança com seus dados — MT 24 Horas Express.</p>
        </div>
      </div>
      
      <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border/40 shadow-sm space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Coleta de Dados</h2>
          <p>
            Coletamos apenas o necessário para entregar seus pedidos e realizar suas corridas com segurança e agilidade, incluindo seu nome, endereço de entrega/embarque, telefone de contato e localização geográfica (GPS).
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. Uso da Localização em Primeiro e Segundo Plano</h2>
          <p>
            A localização do usuário é utilizada exclusivamente para encontrar estabelecimentos próximos, calcular trajetos e tarifas com precisão, e permitir o rastreamento em tempo real do entregador ou motorista até o destino. Seus dados de GPS não são utilizados para nenhum outro fim nem comercializados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Uso das Informações</h2>
          <p>
            Suas informações são utilizadas exclusivamente para o processamento de pedidos, intermediação de corridas, comunicação sobre o andamento dos serviços e melhoria contínua da nossa plataforma.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. Compartilhamento Seguro</h2>
          <p>
            Compartilhamos seus dados básicos estritamente com os parceiros comerciais (restaurantes, farmácias, mercados) e entregadores/motoristas responsáveis pelo seu atendimento, única e exclusivamente para viabilizar a entrega correta ou a corrida solicitada. Nunca vendemos dados para terceiros.
          </p>
        </section>
        
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">5. Segurança dos Dados</h2>
          <p>
            Adotamos medidas de segurança rígidas e criptografia de ponta a ponta para proteger seus dados contra acessos não autorizados, garantindo conformidade com a Lei Geral de Proteção de Dados (LGPD) e com as diretrizes do Google Play.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">6. Exclusão de Dados da Conta</h2>
          <p>
            O usuário pode solicitar a qualquer momento a exclusão permanente de sua conta e de todos os seus dados cadastrados diretamente no menu do aplicativo (Perfil → Excluir Conta) ou pelo e-mail de suporte: contato@mt24horasexpress.com.
          </p>
        </section>
      </div>
    </div>
  );
}
