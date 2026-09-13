import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, MapPin, Headphones, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceFeeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceFeeInfoModal({ isOpen, onClose }: ServiceFeeInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-[92vw] rounded-3xl bg-background/95 backdrop-blur-2xl border border-border p-6 shadow-2xl">
        <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
              ?
            </span>
            <DialogTitle className="text-lg font-black tracking-tight">
              Taxa de serviço do sistema
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Entenda como este valor de <strong className="text-foreground">R$ 0,99</strong> é aplicado no MT 24 Horas Express.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            A taxa de serviço é um pequeno valor destinado a manter toda a tecnologia e operação da plataforma funcionando com alta disponibilidade e segurança para você.
          </p>

          <div className="space-y-2.5 bg-muted/40 p-3.5 rounded-2xl border border-border/50">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Segurança e Proteção</p>
                <p className="text-muted-foreground text-[11px]">Proteção dos seus dados e monitoramento de transações 24h.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Geolocalização em Tempo Real</p>
                <p className="text-muted-foreground text-[11px]">Infraestrutura de servidores de mapas, rotas precisas e rastreio ao vivo.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Headphones className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Suporte Especializado</p>
                <p className="text-muted-foreground text-[11px]">Atendimento ágil para resolver dúvidas ou imprevistos em suas solicitações.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Evolução do Aplicativo</p>
                <p className="text-muted-foreground text-[11px]">Melhorias contínuas de velocidade, novos recursos e estabilidade.</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
        >
          <Check className="w-4 h-4 mr-1.5" /> Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
