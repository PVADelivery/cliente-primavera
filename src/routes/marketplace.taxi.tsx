import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MapPin, CheckCircle2, Car, Bike, Navigation, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export const Route = createFileRoute("/marketplace/taxi")({
  head: () => ({ meta: [{ title: "Solicitar Corrida — Primavera Delivery" }] }),
  component: TaxiPage,
});

const PVA_CENTER: [number, number] = [-54.3075, -15.5606];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function TaxiPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [vehicleType, setVehicleType] = useState<"taxi" | "mototaxi">("mototaxi");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Coordenadas
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [price, setPrice] = useState<number>(15.0);
  const [rates, setRates] = useState({ taxi: 3.5, mototaxi: 2.0 });

  // Endereços e Autocomplete
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDropoff, setSearchingDropoff] = useState(false);

  const pickupMarker = useRef<maplibregl.Marker | null>(null);
  const dropoffMarker = useRef<maplibregl.Marker | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Inicializa o Mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: PVA_CENTER,
      zoom: 14,
    });

    map.current.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      if (!pickupCoords) {
        setPickupCoords([lng, lat]);
        fetchAddressFromCoords(lat, lng, "pickup");
      } else if (!dropoffCoords) {
        setDropoffCoords([lng, lat]);
        fetchAddressFromCoords(lat, lng, "dropoff");
      }
    });

    // Busca taxas
    supabase
      .from("regions")
      .select("taxi_rate_per_km, mototaxi_rate_per_km")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRates({
            taxi: Number(data.taxi_rate_per_km) || 3.5,
            mototaxi: Number(data.mototaxi_rate_per_km) || 2.0,
          });
        }
      });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [pickupCoords, dropoffCoords]);

  // Atualiza Marcadores no Mapa
  useEffect(() => {
    if (!map.current) return;

    if (pickupCoords) {
      if (!pickupMarker.current) {
        const el = document.createElement("div");
        el.className = "w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs";
        el.innerText = "A";
        pickupMarker.current = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(pickupCoords)
          .addTo(map.current);

        pickupMarker.current.on("dragend", () => {
          const lngLat = pickupMarker.current?.getLngLat();
          if (lngLat) {
            setPickupCoords([lngLat.lng, lngLat.lat]);
            fetchAddressFromCoords(lngLat.lat, lngLat.lng, "pickup");
          }
        });
      } else {
        pickupMarker.current.setLngLat(pickupCoords);
      }
    }

    if (dropoffCoords) {
      if (!dropoffMarker.current) {
        const el = document.createElement("div");
        el.className = "w-8 h-8 bg-emerald-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs";
        el.innerText = "B";
        dropoffMarker.current = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(dropoffCoords)
          .addTo(map.current);

        dropoffMarker.current.on("dragend", () => {
          const lngLat = dropoffMarker.current?.getLngLat();
          if (lngLat) {
            setDropoffCoords([lngLat.lng, lngLat.lat]);
            fetchAddressFromCoords(lngLat.lat, lngLat.lng, "dropoff");
          }
        });
      } else {
        dropoffMarker.current.setLngLat(dropoffCoords);
      }
    }

    if (pickupCoords && dropoffCoords) {
      const bounds = new maplibregl.LngLatBounds()
        .extend(pickupCoords)
        .extend(dropoffCoords);
      map.current.fitBounds(bounds, { padding: 90, maxZoom: 15 });
    }
  }, [pickupCoords, dropoffCoords]);

  // Calcula Preço e Distância
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const dist = calculateDistance(
        pickupCoords[1],
        pickupCoords[0],
        dropoffCoords[1],
        dropoffCoords[0]
      );
      setDistance(dist);
      const rate = vehicleType === "taxi" ? rates.taxi : rates.mototaxi;
      setPrice(Math.max(7.0, dist * rate));
    }
  }, [pickupCoords, dropoffCoords, vehicleType, rates]);

  // Geocodificação Reversa
  const fetchAddressFromCoords = async (lat: number, lng: number, type: "pickup" | "dropoff") => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const addressShort = data.display_name.split(",").slice(0, 3).join(",");
        if (type === "pickup") setPickupText(addressShort);
        else setDropoffText(addressShort);
      }
    } catch (err) {
      console.error("Geocodificação reversa falhou:", err);
    }
  };

  // Autocomplete Geocodificação Direta
  const searchAddress = (query: string, type: "pickup" | "dropoff") => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      if (type === "pickup") setPickupSuggestions([]);
      else setDropoffSuggestions([]);
      return;
    }

    if (type === "pickup") setSearchingPickup(true);
    else setSearchingDropoff(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query + ", Primavera do Leste, MT"
          )}&limit=5`
        );
        const data = await res.json();
        if (type === "pickup") setPickupSuggestions(data);
        else setDropoffSuggestions(data);
      } catch (err) {
        console.error("Erro na busca de endereço:", err);
      } finally {
        setSearchingPickup(false);
        setSearchingDropoff(false);
      }
    }, 500);
  };

  const selectSuggestion = (item: any, type: "pickup" | "dropoff") => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const shortName = item.display_name.split(",").slice(0, 3).join(",");

    if (type === "pickup") {
      setPickupCoords([lon, lat]);
      setPickupText(shortName);
      setPickupSuggestions([]);
    } else {
      setDropoffCoords([lon, lat]);
      setDropoffText(shortName);
      setDropoffSuggestions([]);
    }

    map.current?.flyTo({ center: [lon, lat], zoom: 15, duration: 1500 });
  };

  const handleClear = () => {
    if (pickupMarker.current) pickupMarker.current.remove();
    if (dropoffMarker.current) dropoffMarker.current.remove();
    pickupMarker.current = null;
    dropoffMarker.current = null;
    setPickupCoords(null);
    setDropoffCoords(null);
    setPickupText("");
    setDropoffText("");
    setDistance(0);
    setPrice(15.0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupCoords || !dropoffCoords) {
      alert("Defina o endereço de partida e destino!");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from("ride_requests").insert({
        user_id: user?.id || null,
        customer_name: user?.user_metadata?.full_name || user?.email || "Passageiro",
        customer_phone: user?.user_metadata?.phone || "",
        pickup_address: pickupText || "Localização A",
        dropoff_address: dropoffText || "Localização B",
        pickup_lat: pickupCoords[1],
        pickup_lng: pickupCoords[0],
        dropoff_lat: dropoffCoords[1],
        dropoff_lng: dropoffCoords[0],
        vehicle_type: vehicleType,
        notes: notes,
        price: price,
        status: "pending",
      } as any);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao solicitar corrida. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4 h-full">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-display font-bold mb-2">Corrida Solicitada!</h2>
        <p className="text-muted-foreground mb-8">
          Motoristas de Primavera do Leste estão a caminho. Pagamento deve ser feito por fora diretamente a eles.
        </p>
        <Button onClick={() => navigate({ to: "/marketplace" })} className="w-full max-w-xs h-12 rounded-xl">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-80px)] -mx-4 -mt-4 overflow-hidden">
      {/* ── MAPA EM TELA CHEIA ABSOLUTA ── */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />

      {/* ── BOTÃO FLUTUANTE DE VOLTAR ── */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/90 backdrop-blur shadow-lg grid place-items-center text-muted-foreground active:scale-95 transition-all z-20 border border-border"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* ── CARD FLUTUANTE DE ENDEREÇOS (TOP) ── */}
      <div className="absolute top-4 left-16 right-4 bg-background/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-border z-20 space-y-2.5 max-w-lg md:mx-auto">
        {/* Campo Partida */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <input
            type="text"
            value={pickupText}
            onChange={(e) => {
              setPickupText(e.target.value);
              searchAddress(e.target.value, "pickup");
            }}
            placeholder="Onde te buscamos? (Partida)"
            className="w-full pl-8 pr-8 h-10 rounded-xl border border-border/80 bg-background/80 text-xs focus:outline-none focus:ring-1.5 focus:ring-primary/40"
          />
          {pickupText && (
            <button
              onClick={() => {
                setPickupText("");
                setPickupCoords(null);
                if (pickupMarker.current) pickupMarker.current.remove();
                pickupMarker.current = null;
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {pickupSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-40">
              {pickupSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(item, "pickup")}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border/40 last:border-0 flex items-center gap-2 text-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campo Destino */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <input
            type="text"
            value={dropoffText}
            onChange={(e) => {
              setDropoffText(e.target.value);
              searchAddress(e.target.value, "dropoff");
            }}
            placeholder="Para onde vamos? (Destino)"
            className="w-full pl-8 pr-8 h-10 rounded-xl border border-border/80 bg-background/80 text-xs focus:outline-none focus:ring-1.5 focus:ring-primary/40"
          />
          {dropoffText && (
            <button
              onClick={() => {
                setDropoffText("");
                setDropoffCoords(null);
                if (dropoffMarker.current) dropoffMarker.current.remove();
                dropoffMarker.current = null;
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {dropoffSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-40">
              {dropoffSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(item, "dropoff")}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border/40 last:border-0 flex items-center gap-2 text-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BALÃO INFORMATIVO DO STATUS DO MAPA ── */}
      {(!pickupCoords || !dropoffCoords) && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur text-white px-3.5 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 pointer-events-none shadow-md z-10 transition-all">
          <Navigation className="w-3 h-3 animate-pulse text-primary" />
          {!pickupCoords ? "Toque no mapa para marcar a partida" : "Agora toque no destino"}
        </div>
      )}

      {/* ── BOTÃO LIMPAR FLUTUANTE ── */}
      {(pickupCoords || dropoffCoords) && (
        <button
          onClick={handleClear}
          className="absolute bottom-[285px] right-4 bg-background/90 backdrop-blur border border-border text-foreground px-3 py-1.5 rounded-xl text-xs font-bold shadow-md hover:bg-muted active:scale-95 transition-all z-20"
        >
          Limpar Rota
        </button>
      )}

      {/* ── CARD FLUTUANTE DE VALORES E CONFIRMAÇÃO (BOTTOM) ── */}
      <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-border z-20 space-y-4 max-w-lg md:mx-auto transition-all animate-in slide-in-from-bottom duration-300">
        
        {/* Escolha do Veículo */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setVehicleType("mototaxi")}
            className={`flex-1 flex items-center justify-between p-3 rounded-2xl border transition-all ${
              vehicleType === "mototaxi"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Bike className="w-6 h-6" />
              <span className="font-bold text-xs">Moto Táxi</span>
            </div>
            <span className="text-[10px] font-bold bg-primary/15 px-2 py-0.5 rounded-full">R$ {rates.mototaxi.toFixed(2)}/KM</span>
          </button>

          <button
            type="button"
            onClick={() => setVehicleType("taxi")}
            className={`flex-1 flex items-center justify-between p-3 rounded-2xl border transition-all ${
              vehicleType === "taxi"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Car className="w-6 h-6" />
              <span className="font-bold text-xs">Táxi (Carro)</span>
            </div>
            <span className="text-[10px] font-bold bg-primary/15 px-2 py-0.5 rounded-full">R$ {rates.taxi.toFixed(2)}/KM</span>
          </button>
        </div>

        {/* Resumo da Corrida */}
        {pickupCoords && dropoffCoords ? (
          <div className="bg-secondary/35 p-3 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Percurso</p>
              <p className="text-xs font-bold text-foreground mt-0.5">{distance.toFixed(2)} km</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Valor Estimado</p>
              <p className="text-base font-display font-black text-primary">R$ {price.toFixed(2).replace(".", ",")}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-[11px] text-muted-foreground py-2 border border-dashed border-border rounded-xl">
            Insira os locais para calcular o custo estimado
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações complementares (ex: portão azul)"
            className="w-full h-10 px-4 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1.5 focus:ring-primary/45"
          />

          <div className="text-[9px] text-center text-muted-foreground/80 leading-normal">
            ℹ️ O pagamento é efetuado fora do app diretamente ao motorista (Dinheiro/Pix).
          </div>

          <Button
            type="submit"
            disabled={loading || !pickupCoords || !dropoffCoords}
            className="w-full h-11 rounded-xl text-xs font-bold shadow-[var(--shadow-elegant)]"
          >
            {loading ? "Solicitando..." : "Confirmar e Solicitar Corrida"}
          </Button>
        </form>
      </div>
    </div>
  );
}
