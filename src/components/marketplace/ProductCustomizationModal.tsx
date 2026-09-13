import { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Check, AlertCircle, ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart, type CartOptionSelected } from "@/contexts/CartContext";
import type { Product } from "@/types/database";
import { toast } from "sonner";

interface OptionGroup {
  id: string;
  name: string;
  min_options: number;
  max_options: number;
  required: boolean;
}

interface OptionItem {
  id: string;
  group_id: string;
  name: string;
  price: number;
}

interface ProductCustomizationModalProps {
  product: (Product & { promo?: number }) | null;
  storeId: string;
  storeName: string;
  onClose: () => void;
}

export function ProductCustomizationModal({
  product,
  storeId,
  storeName,
  onClose,
}: ProductCustomizationModalProps) {
  const { add } = useCart();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [options, setOptions] = useState<Record<string, OptionItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Selected options: { [groupId]: OptionItem[] }
  const [selections, setSelections] = useState<Record<string, OptionItem[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const basePrice = useMemo(() => {
    if (!product) return 0;
    const promo = (product as any).promo;
    return promo ? product.price * (1 - promo / 100) : product.price;
  }, [product]);

  useEffect(() => {
    if (!product) return;
    loadGroupsAndOptions(product.id);
  }, [product?.id]);

  const loadGroupsAndOptions = async (prodId: string) => {
    setLoading(true);
    try {
      const { data: grpData } = await supabase
        .from("product_option_groups")
        .select("*")
        .eq("product_id", prodId)
        .order("created_at", { ascending: true });

      if (grpData && grpData.length > 0) {
        setGroups(grpData);
        const groupIds = grpData.map((g: any) => g.id);
        const { data: optData } = await supabase
          .from("product_options")
          .select("*")
          .in("group_id", groupIds)
          .order("created_at", { ascending: true });

        const mapped: Record<string, OptionItem[]> = {};
        optData?.forEach((opt: any) => {
          if (!mapped[opt.group_id]) mapped[opt.group_id] = [];
          mapped[opt.group_id].push(opt);
        });
        setOptions(mapped);
      } else {
        setGroups([]);
        setOptions({});
      }
    } catch (e) {
      console.error("Erro ao carregar variações:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  // Toggle selection for a group
  const handleToggleOption = (group: OptionGroup, opt: OptionItem) => {
    const current = selections[group.id] || [];
    const isSelected = current.some((o) => o.id === opt.id);

    if (isSelected) {
      // Remove
      setSelections((prev) => ({
        ...prev,
        [group.id]: prev[group.id].filter((o) => o.id !== opt.id),
      }));
    } else {
      // Add
      if (group.max_options === 1) {
        // Single choice: replace current
        setSelections((prev) => ({
          ...prev,
          [group.id]: [opt],
        }));
      } else {
        // Multiple choices: check limit
        if (current.length >= group.max_options) {
          toast.error(`Você pode escolher no máximo ${group.max_options} opções em "${group.name}".`);
          return;
        }
        setSelections((prev) => ({
          ...prev,
          [group.id]: [...current, opt],
        }));
      }
    }
  };

  // Additional options price per unit
  const extraPricePerUnit = Object.values(selections)
    .flat()
    .reduce((sum, opt) => sum + (Number(opt.price) || 0), 0);

  const unitPrice = basePrice + extraPricePerUnit;
  const totalPrice = unitPrice * quantity;

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    for (const grp of groups) {
      const chosen = (selections[grp.id] || []).length;
      if (grp.required && chosen < Math.max(1, grp.min_options)) {
        errors.push(`Selecione ao menos ${Math.max(1, grp.min_options)} em "${grp.name}"`);
      } else if (grp.min_options > 0 && chosen < grp.min_options) {
        errors.push(`Escolha no mínimo ${grp.min_options} em "${grp.name}"`);
      }
    }
    return errors;
  }, [groups, selections]);

  const handleAddToCart = () => {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    const selectedOptionsList: CartOptionSelected[] = [];
    groups.forEach((grp) => {
      const chosen = selections[grp.id] || [];
      chosen.forEach((opt) => {
        selectedOptionsList.push({
          groupName: grp.name,
          optionName: opt.name,
          price: Number(opt.price) || 0,
        });
      });
    });

    // Format custom notes summary
    const optionsSummary = selectedOptionsList
      .map((o) => `${o.groupName}: ${o.optionName}`)
      .join(" • ");

    const combinedNotes = [optionsSummary, notes.trim()].filter(Boolean).join(" | ");

    add(storeId, storeName, {
      productId: product.id,
      name: product.name,
      price: unitPrice,
      quantity,
      imageUrl: product.image_url || undefined,
      notes: combinedNotes || undefined,
      selectedOptions: selectedOptionsList,
    });

    toast.success(`"${product.name}" adicionado ao carrinho!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 border-b border-border bg-muted/40 flex items-start justify-between gap-4">
          <div className="flex-1 pr-6">
            <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-base sm:text-lg font-black text-primary">
                R$ {basePrice.toFixed(2).replace(".", ",")}
              </span>
              {(product as any).promo && (
                <span className="text-xs text-muted-foreground line-through">
                  R$ {product.price.toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Groups & Options */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Carregando opções do produto...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Este item não possui opções de personalização.
            </div>
          ) : (
            groups.map((grp) => {
              const grpOptions = options[grp.id] || [];
              const chosen = selections[grp.id] || [];
              const isSatisfied = grp.required
                ? chosen.length >= Math.max(1, grp.min_options)
                : true;

              return (
                <div key={grp.id} className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{grp.name}</h4>
                        {grp.required && (
                          <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {grp.max_options === 1
                          ? "Escolha 1 opção"
                          : `Escolha de ${grp.min_options || 0} até ${grp.max_options} opções`}
                      </p>
                    </div>
                    {isSatisfied && chosen.length > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {grpOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhuma opção disponível.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {grpOptions.map((opt) => {
                        const active = chosen.some((o) => o.id === opt.id);
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleToggleOption(grp, opt)}
                            className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all select-none ${
                              active
                                ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary shadow-xs"
                                : "bg-card border-border hover:border-primary/40 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-${grp.max_options === 1 ? "full" : "md"} border flex items-center justify-center shrink-0 ${
                                  active
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/40 bg-background"
                                }`}
                              >
                                {active && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-bold truncate">{opt.name}</span>
                            </div>
                            <span className="text-xs font-black text-primary shrink-0">
                              {opt.price > 0 ? `+ R$ ${opt.price.toFixed(2).replace(".", ",")}` : "Grátis"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Observações / Notas */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-foreground block">Alguma observação?</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sem salada, enviar talher descartável, etc."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-2xl bg-muted/40 border border-border focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between gap-4">
            {/* Quantity */}
            <div className="flex items-center border border-border rounded-2xl bg-background overflow-hidden p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center text-sm font-black">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to cart button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={validationErrors.length > 0}
              className={`flex-1 h-12 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between px-5 shadow-lg transition-all active:scale-[0.98] ${
                validationErrors.length > 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                  : "bg-primary text-primary-foreground hover:brightness-105"
              }`}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Adicionar
              </span>
              <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
            </button>
          </div>

          {validationErrors.length > 0 && (
            <p className="text-[11px] text-amber-500 font-bold flex items-center gap-1.5 justify-center animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5" />
              {validationErrors[0]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
