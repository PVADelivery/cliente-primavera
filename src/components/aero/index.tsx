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
          style={{ background: "linear-gradient(180deg, rgba(255,222,33,0.35), transparent)" }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <span className="w-11 h-11 mb-3 rounded-full grid place-items-center bg-black/60 ring-1 ring-primary/40 shadow-[inset_0_0_14px_rgba(255,222,33,0.22)] transition-transform duration-300 group-hover:scale-105">
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
        "disabled:bg-btn-disabled disabled:text-btn-disabled-ink disabled:border-btn-line disabled:shadow-none disabled:cursor-not-allowed",
        active
          ? "bg-btn-active text-btn-active-ink border-btn-active shadow-[0_10px_28px_-12px_rgba(255,222,33,0.8)]"
          : "bg-btn-surface border-btn-line text-btn-ink hover:bg-btn-surface-hover hover:text-btn-ink hover:border-primary/45 active:bg-btn-active active:text-btn-active-ink active:border-btn-active",
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
  loading = false,
  loadingLabel = "Carregando…",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
  loadingLabel?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-btn-active text-btn-active-ink hover:brightness-105 active:brightness-100 shadow-[0_14px_34px_-16px_rgba(255,222,33,0.9)]",
    ghost:
      "bg-btn-surface text-btn-ink border border-btn-line hover:border-primary/45 active:bg-btn-active active:text-btn-active-ink active:border-btn-active",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  const disabled = loading || rest.disabled;
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      whileHover={disabled ? undefined : { y: -1 }}
      aria-busy={loading || undefined}
      className={cx(
        "tap-target aero-focus relative overflow-hidden group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-colors disabled:bg-btn-disabled disabled:text-btn-disabled-ink disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none",
        styles[variant],
        className,
      )}
      {...(rest as Record<string, unknown>)}
      disabled={disabled}
    >
      {!disabled && <span aria-hidden className="spec-sheen" />}
      <span className="relative z-10 inline-flex items-center gap-2">
        {loading && (
          <span
            aria-hidden
            className="w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        )}
        {loading ? loadingLabel : children}
      </span>
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
      {error && (
        <span role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}
    </label>
  );
}

export const aeroInputClass =
  "w-full rounded-2xl bg-card border border-border px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground aero-focus focus:border-primary transition-colors min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed";

/** Classe de input com estado de erro */
export function aeroInput(error?: boolean, extra?: string) {
  return cx(aeroInputClass, error && "border-destructive focus:border-destructive", extra);
}

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

/** Hero padronizado das seções (mesmo acabamento da home) */
export function AeroHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx("group relative overflow-hidden isolate rounded-[28px] p-7 sm:p-10 text-white", className)}
      style={{
        background: "radial-gradient(120% 100% at 100% 0%, #1a1408 0%, #0a0803 40%, #000000 75%)",
        boxShadow:
          "0 40px 80px -32px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,222,33,0.10), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <span
        aria-hidden
        className="absolute -top-40 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none opacity-95"
        style={{
          background:
            "radial-gradient(circle, rgba(255,232,90,0.95) 0%, rgba(255,222,33,0.55) 25%, rgba(255,200,20,0.15) 55%, rgba(0,0,0,0) 75%)",
          filter: "blur(28px)",
        }}
      />
      <AeroTexture sheen={false} />
      <div className="relative z-10 max-w-2xl space-y-4">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            <span aria-hidden className="h-px w-5 bg-primary/60" />
            {eyebrow}
          </span>
        )}
        <h1 className="font-display font-black italic text-[30px] sm:text-[42px] leading-[0.98] tracking-[-0.03em]">
          {title}
        </h1>
        {subtitle && <p className="text-[15px] text-white/80 font-medium max-w-md leading-relaxed">{subtitle}</p>}
        {children}
      </div>
      <span aria-hidden className="absolute right-5 bottom-4 flex items-center gap-2 pointer-events-none">
        <span className="h-px w-6 bg-primary/50" />
        <span className="text-[9px] font-mono tracking-[0.35em] text-white/35 uppercase">MT-24</span>
      </span>
    </section>
  );
}

/** Cabeçalho de página com botão voltar padronizado */
export function AeroPageHeader({
  title,
  subtitle,
  onBack,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3", className)}>
      {onBack ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          aria-label="Voltar"
          className="tap-target aero-focus w-11 h-11 rounded-full grid place-items-center bg-card border border-border text-foreground hover:border-primary/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      ) : (
        <span />
      )}
      <div className="min-w-0">
        <h1 className="font-display text-xl sm:text-2xl font-black italic tracking-tight leading-tight truncate">
          {title}
        </h1>
        {subtitle && <p className="text-[13px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Chip âmbar (filtros aplicados, com remoção opcional) */
export function AeroChip({
  children,
  onRemove,
  removeLabel = "Remover filtro",
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/12 px-3 py-1.5 text-[12px] font-bold text-primary",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="aero-focus grid h-5 w-5 place-items-center rounded-full text-primary/80 hover:bg-primary/20 hover:text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}

/** Abas em placas aerodinâmicas */
export function AeroTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label = "Filtros",
}: {
  items: Array<{ value: T; label: string; icon?: LucideIcon }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx("flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 py-1", className)}
    >
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <AeroPlate
            key={it.value}
            role="tab"
            aria-selected={value === it.value}
            active={value === it.value}
            onClick={() => onChange(it.value)}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden />}
            {it.label}
          </AeroPlate>
        );
      })}
    </div>
  );
}

/** Estado vazio / erro padronizado */
export function AeroEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cx(
        "relative overflow-hidden rounded-3xl aero-surface px-6 py-12 text-center flex flex-col items-center gap-3",
        className,
      )}
    >
      <AeroTexture sheen={false} />
      <div className="relative z-10 flex flex-col items-center gap-3">
        {Icon && (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/12 ring-1 ring-primary/30">
            <Icon className="h-7 w-7 text-primary" aria-hidden />
          </span>
        )}
        <p className="font-display text-lg font-black italic tracking-tight">{title}</p>
        {description && <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>}
        {action}
      </div>
    </div>
  );
}

/** Bloco de carregamento com brilho suave */
export function AeroSkeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block rounded-xl aero-shimmer", className)} />;
}

/** Skeleton de card padrão (mesma altura do conteúdo real) */
export function AeroSkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("rounded-3xl aero-surface p-5 space-y-3", className)}>
      <AeroSkeleton className="h-11 w-11 rounded-full" />
      <AeroSkeleton className="h-4 w-2/3" />
      {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
        <AeroSkeleton key={i} className={cx("h-3", i % 2 ? "w-1/2" : "w-5/6")} />
      ))}
    </div>
  );
}

/** Lista de skeletons acessível */
export function AeroSkeletonList({
  count = 4,
  lines = 3,
  className,
  label = "Carregando conteúdo",
}: {
  count?: number;
  lines?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy className={cx("space-y-3", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <AeroSkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
