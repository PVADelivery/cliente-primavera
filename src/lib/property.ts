export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "Consulte";
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}