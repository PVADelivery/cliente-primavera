import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "@/components/ui/sonner";

import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/services/logger";
import { useEffect, useState, Suspense } from "react";
import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";
import { AlertTriangle, RefreshCw, Copy, Check, Home, ShieldAlert } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { toast } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-bold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página solicitada não existe ou foi alterada de endereço.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    reportErrorToTelegram({
      error_message: error?.message || "Erro na rota",
      stack_trace: error?.stack || "",
      url: typeof window !== "undefined" ? window.location.href : "",
    }, "Marketplace Cliente");
  }, [error]);

  const errorMessage = error?.message || "Instabilidade inesperada na execução da página.";

  const handleCopy = () => {
    const text = `🚨 *RELATÓRIO DE ERRO - MT 24HORAS EXPRESS*\n\n` +
      `*Página:* ${typeof window !== "undefined" ? window.location.href : "N/A"}\n` +
      `*Mensagem:* ${errorMessage}\n` +
      `*Data/Hora:* ${new Date().toLocaleString("pt-BR")}\n` +
      `*Detalhes:* ${error?.stack?.slice(0, 300) || "Sem stack"}`;
    
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Dados do erro copiados! Envie para o suporte da BonaSoft.");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSendToBonaSoft = () => {
    const text = `Olá equipe *BonaSoft*, ocorreu um erro no app *MT 24horas express*:\n\n` +
      `*Erro:* ${errorMessage}\n` +
      `*Link da página:* ${typeof window !== "undefined" ? window.location.href : "N/A"}\n\n` +
      `Por favor, poderiam verificar?`;
    window.open(`https://wa.me/556697196937?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 shadow-xl text-center space-y-4">
        {/* Ícone de Destaque */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Instabilidade Temporária
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Ocorreu uma falha no carregamento. Por favor, <strong>envie este erro para a equipe da BonaSoft</strong> para suporte e correção.
          </p>
        </div>

        {/* Box do erro com visual técnico limpo */}
        <div className="p-3 rounded-2xl bg-muted/60 border border-border text-left space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span>Detalhe técnico:</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
          <p className="text-xs font-mono text-red-500 break-words leading-snug">
            {errorMessage}
          </p>
        </div>

        {/* Ações */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSendToBonaSoft}
            className="w-full h-11 rounded-2xl bg-[#25D366] hover:bg-[#1fb457] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <WhatsappIcon className="w-4 h-4" />
            <span>Mandar para a BonaSoft (WhatsApp)</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="flex-1 h-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar de novo</span>
            </button>

            <a
              href="/"
              className="flex-1 h-10 rounded-2xl border border-border bg-background hover:bg-muted font-bold text-xs flex items-center justify-center gap-1.5 text-foreground transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Início</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { title: "MT 24horas express — Peça em minutos" },
      { name: "description", content: "Marketplace de delivery multi-loja: restaurantes, mercados, farmácias e corridas da sua cidade em um só app." },
      { name: "author", content: "MT 24horas express" },
      { property: "og:title", content: "MT 24horas express — Peça em minutos" },
      { property: "og:description", content: "Marketplace de delivery multi-loja: restaurantes, mercados, farmácias e corridas da sua cidade em um só app." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://www.mt24horasexpress.com/pwa-512x512-v3.png" },
      { property: "og:image:secure_url", content: "https://www.mt24horasexpress.com/pwa-512x512-v3.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MT 24horas express — Peça em minutos" },
      { name: "twitter:description", content: "Marketplace de delivery multi-loja: restaurantes, mercados, farmácias e corridas da sua cidade em um só app." },
      { name: "twitter:image", content: "https://www.mt24horasexpress.com/pwa-512x512-v3.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon-v3.png" },
      { rel: "apple-touch-icon", href: "/favicon-v3.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="notranslate" translate="no" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <HeadContent />
      </head>
      <body className="notranslate" translate="no" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initializeGlobalErrorHandlers("Marketplace Cliente");
    if (typeof window !== "undefined" && window.location.hostname.includes("lovable.app")) {
      window.location.replace(`https://www.mt24horasexpress.com${window.location.pathname}${window.location.search}`);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <NotificationsBridge />
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
          <Toaster position="top-center" richColors />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotificationsBridge() {
  useCustomerNotifications();
  return null;
}
