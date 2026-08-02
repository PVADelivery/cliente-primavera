export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "Valor: Consulte";
  return `Valor: ${price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}