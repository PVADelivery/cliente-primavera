export type Business = {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  email?: string | null;
  website: string | null;
  hours: string | null;
  rating: number | null;
  featured?: boolean;
  card_image_url?: string | null;
  card_style?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export const PVA_CENTER: [number, number] = [-54.2961, -15.5561];

export const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export const formatPhone = (v: string) => {
  const d = onlyDigits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
};

export const waLink = (v: string, name?: string, message?: string) => {
  const d = onlyDigits(v);
  const clean = d.startsWith("55") ? d : `55${d}`;
  const text = encodeURIComponent(
    message ??
      `Olá${name ? ` *${name}*` : ""}! Encontrei seu contato no *PPP do app MT 24horas express* e gostaria de informações/orçamento.`,
  );
  return `https://wa.me/${clean}?text=${text}`;
};

export const getMapsUrl = (addr: string) => {
  const cleanAddr = (addr || "").trim();
  const full = cleanAddr.toLowerCase().includes("primavera")
    ? cleanAddr
    : `${cleanAddr}, Primavera do Leste - MT`;
  return `https://maps.google.com/?q=${encodeURIComponent(full)}`;
};

export const openMaps = (addr: string, e?: { preventDefault: () => void; stopPropagation: () => void }) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const url = getMapsUrl(addr);
  if (typeof window !== "undefined") {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w || w.closed || typeof w.closed === "undefined") window.location.href = url;
  }
};

export const cleanCategory = (str: string) =>
  (str || "")
    .replace(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, "")
    .trim();
