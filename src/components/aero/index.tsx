import * as React from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** Animação de entrada padronizada (respeita prefers-reduced-motion) */
export function useAeroMotion(index = 0) {
  const reduce = useReducedMotion();
  if (reduce) return {};
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(index * 0.05, 0.4), duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
  };
}

const SURFACE =
  "relative overflow-hidden rounded-3xl aero-surface aero-rim aero-focus text-foreground";

/** Textura padrão (carbono + verniz + varredura de luz) */
export function AeroTexture({ sheen = true }: { sheen?: boolean }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0 carbon-weave opacity-50 pointer-events-none" />
      <span aria-hidden className="absolute inset-0 clearcoat mix-blend-screen opacity-60 pointer-events-none" />
      {sheen && <span aria-hidden className="spec-sheen" />}
    </>
  );
}

/** Superfície padrão do app */
export function AeroCard({
  children,
  className,
  index = 0,
  interactive = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { index?: number; interactive?: boolean }) {
  const anim = useAeroMotion(index);
  return (
    <motion.div
      {...anim}
      whileHover={interactive ? { y: -4 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      className={cx(SURFACE, "group p-5", className)}
      {...(rest as Record<string, unknown>)}
    >
      <AeroTexture sheen={interactive} />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/** Card de navegação com ícone (usado nos atalhos da home) */
export function AeroTile({
  to,
  icon: Icon,
  title,
  subtitle,
  index = 0,
  className,
}: {
  to: string;
  icon: LucideIcon;
  title: React.ReactNode;
  subtitle?: string;
  index?: number;
  className?: string;
}) {
  const anim = useAeroMotion(index);
  return (
    <motion.div {...anim} whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} className="h-full">
      <Link
        to={to}
        className={cx(SURFACE, "group h-full flex flex-col p-5 min-h-[132px] text-white", className)}
      >
        <AeroTexture />
        <span
          aria-hidden
          className="absolute -top-8 -right-8 w-28 h-28 rotate-45 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(180deg, rgba(249,160,63,0.35), transparent)" }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <span className="w-11 h-11 mb-3 rounded-full grid place-items-center bg-black/60 ring-1 ring-primary/40 shadow-[inset_0_0_14px_rgba(249,160,63,0.22)] transition-transform duration-300 group-hover:scale-105">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
          </span>
          <p className="font-display font-black italic text-base leading-tight tracking-tight">{title}</p>
          {subtitle && <p className="text-[13px] text-white/65 mt-1.5 font-medium leading-snug">{subtitle}</p>}
        </div>
      </Link>
    </motion.div>
  );
}

/** Chip/placa chanfrada — filtros, abas e categorias */
export function AeroPlate({
  active = false,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      aria-pressed={active}
      className={cx(
        "tap-target aero-focus shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-bold border whitespace-nowrap transition-all duration-300",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-[0_10px_28px_-12px_rgba(249,160,63,0.8)]"
          : "bg-card/70 border-border text-muted-foreground hover:text-foreground hover:border-primary/45",
        className,
      )}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}

/** Botão padronizado */
export function AeroButton({
  variant = "primary",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_14px_34px_-16px_rgba(249,160,63,0.9)]",
    ghost: "bg-card/70 text-foreground border border-border hover:border-primary/50",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      className={cx(
        "tap-target aero-focus relative overflow-hidden group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
      {...(rest as Record<string, unknown>)}
    >
      <span aria-hidden className="spec-sheen" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

/** Campo de formulário padronizado */
export function AeroField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block space-y-1.5", className)}>
      <span className="text-[13px] font-bold text-foreground/85">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs font-semibold text-rose-400">{error}</span>}
    </label>
  );
}

export const aeroInputClass =
  "w-full rounded-2xl bg-card border border-border px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground aero-focus focus:border-primary transition-colors min-h-[46px]";

/** Cabeçalho de seção com etiqueta técnica */
export function AeroSection({
  title,
  subtitle,
  tag,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  tag?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("space-y-4", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          {tag && (
            <span className="inline-flex items-center gap-2 mb-1">
              <span aria-hidden className="h-px w-5 bg-primary/60" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/80">{tag}</span>
            </span>
          )}
          <h2 className="font-display text-lg sm:text-xl font-black italic tracking-tight leading-tight truncate">
            {title}
          </h2>
          {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
