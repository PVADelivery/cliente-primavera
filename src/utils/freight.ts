/**
 * freight.ts — Biblioteca de Cálculo de Frete por Regiões Geográficas
 *
 * Implementa o algoritmo Ray-Casting (point-in-polygon) para identificar
 * em qual região mapeada o endereço do cliente se encontra e calcular
 * automaticamente o valor do frete correspondente.
 *
 * Funciona igual ao iFood/Uber Eats: 100% baseado em polígonãos do mapa.
 */

/**
 * Algoritmo Ray-Casting — verifica se um ponto (lat, lng) está dentro de um polígonão.
 * @param lat Latitude do ponto
 * @param lng Longitude do ponto
 * @param coordinates Array de coordenadas GeoJSON [lng, lat][]
 */
export function pointInPolygon(
  lat: number,
  lng: number,
  coordinates: [number, number][]
): boolean {
  if (!coordinates || coordinates.length < 3) return false;
  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    // GeoJSON coordinates are [lng, lat] — we access accordingly
    const xi = coordinates[i][1]; // lat of point i
    const yi = coordinates[i][0]; // lng of point i
    const xj = coordinates[j][1]; // lat of point j
    const yj = coordinates[j][0]; // lng of point j
    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Extrai as coordenadas do polígonão de um objeto GeoJSON, tolerante a variações de formato.
 */
function extractCoordinates(geometry: any): [number, number][] | null {
  try {
    // Formato direto: { type: "Polygon", coordinates: [[...]] }
    if (geometry?.type === 'Polygon' && Array.isArray(geometry?.coordinates?.[0])) {
      return geometry.coordinates[0];
    }
    // Formato wrappado: { geometry: { type: "Polygon", coordinates: [[...]] } }
    if (geometry?.geometry?.type === 'Polygon' && Array.isArray(geometry?.geometry?.coordinates?.[0])) {
      return geometry.geometry.coordinates[0];
    }
    return null;
  } catch {
    return null;
  }
}

export interface FreightResult {
  fee: number | null;
  regionId: string | null;
  regionName: string | null;
  isOutOfRange: boolean;
}

/**
 * Calcula o frete para um par de coordenadas consultando as regiões ativas não banco.
 *
 * Regra: o frete exibido é SEMPRE o customer_price que o lojista configurou
 * não painel (Taxas de Entrega por Região). Se o lojista não configurou preço
 * para a região do cliente, considera-se que ele não entrega nessa região.
 *
 * @param lat Latitude do endereço de entrega
 * @param lng Longitude do endereço de entrega
 * @param supabase Instância do cliente Supabase
 * @param companyDeliveryRegionsPricing Array de { region_id, customer_price } do lojista
 */
export async function calculateDeliveryFee(
  lat: number,
  lng: number,
  supabase: any,
  companyDeliveryRegionsPricing?: Array<{ region_id: string; customer_price: string | number }> | null
): Promise<FreightResult> {
  if (!lat || !lng) {
    return { fee: null, regionId: null, regionName: null, isOutOfRange: false };
  }

  try {
    const { data: regions, error } = await supabase
      .from('regions')
      .select('id, name, geometry')
      .or('active.is.null,active.eq.true');

    if (error || !regions || regions.length === 0) {
      console.warn('[freight] Nenhuma região encontrada ou erro:', error?.message);
      return { fee: null, regionId: null, regionName: null, isOutOfRange: false };
    }

    // Normaliza o pricing do lojista para lookup rápido por region_id
    const merchantPricing: Record<string, number> = {};
    if (Array.isArray(companyDeliveryRegionsPricing)) {
      for (const entry of companyDeliveryRegionsPricing) {
        const price = Number(String(entry.customer_price).replace(',', '.'));
        if (entry.region_id && !isNaN(price) && price >= 0) {
          merchantPricing[entry.region_id] = price;
        }
      }
    }

    for (const region of regions) {
      const coords = extractCoordinates(region.geometry);
      if (!coords) continue;

      if (pointInPolygon(lat, lng, coords)) {
        // Lojista configurou preço para essa região → usa esse preço
        if (merchantPricing[region.id] !== undefined) {
          return {
            fee: merchantPricing[region.id],
            regionId: region.id,
            regionName: region.name,
            isOutOfRange: false,
          };
        }
        // Lojista NÃO configurou preço para essa região → não entrega aqui
        console.warn(`[freight] Lojista sem preço configurado para a região: ${region.name}`);
        return { fee: null, regionId: region.id, regionName: region.name, isOutOfRange: true };
      }
    }

    // Endereço fora de todas as regiões do mapa
    console.warn('[freight] ⚠️ Endereço fora de todas as regiões mapeadas.');
    return { fee: null, regionId: null, regionName: null, isOutOfRange: true };
  } catch (err: any) {
    console.error('[freight] Erro inesperado:', err?.message);
    return { fee: null, regionId: null, regionName: null, isOutOfRange: false };
  }
}

/**
 * Geocodifica um endereço textual para coordenadas lat/lng
 * usando a API gratuita do OpenStreetMap (Nominatim).
 *
 * @param address Endereço completo (ex: "Rua das Flores, 123, Cuiabá")
 * @returns { lat, lng } ou null se não encontrado
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;
  try {
    const query = encodeURIComponent(address + ', Brasil');
    const res = await fetch(
      `https://nãominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
