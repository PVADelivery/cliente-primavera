import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MapPin, CheckCircle2, Car, Bike, Navigation, Search, X, Maximize2, Check } from "lucide-react";
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
  
  // Containers para os mapas (pequeno e tela cheia)
  const mapContainerSmall = useRef<HTMLDivElement>(null);
  const mapContainerFull = useRef<HTMLDivElement>(null);
  
  const mapSmall = useRef<maplibregl.Map | null>(null);
  const mapFull = useRef<maplibregl.Map | null>(null);

  const [vehicleType, setVehicleType] = useState<"taxi" | "mototaxi">("mototaxi");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Modal de Mapa
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

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

  // Markers Refs
  const pickupMarkerSmall = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerSmall = useRef<maplibregl.Marker | null>(null);
  
  const pickupMarkerFull = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerFull = useRef<maplibregl.Marker | null>(null);
  
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Carrega as tarifas regionais na inicialização
  useEffect(() => {
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
  }, []);

  // 1. Inicializa o Mapa Pequeno (Estático/Miniatura)
  useEffect(() => {
    if (!mapContainerSmall.current || isMapFullscreen) {
      if (mapSmall.current) {
        mapSmall.current.remove();
        mapSmall.current = null;
      }
      return;
    }

    mapSmall.current = new maplibregl.Map({
      container: mapContainerSmall.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
        },
        layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles" }],
      },
      center: PVA_CENTER,
      zoom: 12,
      interactive: false, // apenas visualização no form principal
    });

    return () => {
      if (mapSmall.current) {
        mapSmall.current.remove();
        mapSmall.current = null;
      }
    };
  }, [isMapFullscreen]);

  // 2. Inicializa o Mapa Tela Cheia (Interativo) quando o modal é aberto
  useEffect(() => {
    if (!isMapFullscreen || !mapContainerFull.current) {
      if (mapFull.current) {
        mapFull.current.remove();
        mapFull.current = null;
      }
      return;
    }

    mapFull.current = new maplibregl.Map({
      container: mapContainerFull.current,
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
        layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles" }],
      },
      center: pickupCoords || PVA_CENTER,
      zoom: 14,
    });

    // Clique no mapa em tela cheia para posicionar pinos
    mapFull.current.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      if (!pickupCoords) {
        setPickupCoords([lng, lat]);
        fetchAddressFromCoords(lat, lng, "pickup");
      } else if (!dropoffCoords) {
        setDropoffCoords([lng, lat]);
        fetchAddressFromCoords(lat, lng, "dropoff");
      }
    });

    return () => {
      if (mapFull.current) {
        mapFull.current.remove();
        mapFull.current = null;
      }
    };
  }, [isMapFullscreen, pickupCoords, dropoffCoords]);

  // 3. Atualiza marcadores no Mapa Pequeno
  useEffect(() => {
    const m = mapSmall.current;
    if (!m) return;

    if (pickupCoords) {
      if (!pickupMarkerSmall.current) {
        const el = document.createElement("div");
        el.className = "w-5 h-5 bg-primary rounded-full border-2 border-white shadow flex items-center justify-center text-white font-bold text-[9px]";
        el.innerText = "A";
        pickupMarkerSmall.current = new maplibregl.Marker({ element: el }).setLngLat(pickupCoords).addTo(m);
      } else {
        pickupMarkerSmall.current.setLngLat(pickupCoords);
      }
    } else if (pickupMarkerSmall.current) {
      pickupMarkerSmall.current.remove();
      pickupMarkerSmall.current = null;
    }

    if (dropoffCoords) {
      if (!dropoffMarkerSmall.current) {
        const el = document.createElement("div");
        el.className = "w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white font-bold text-[9px]";
        el.innerText = "B";
        dropoffMarkerSmall.current = new maplibregl.Marker({ element: el }).setLngLat(dropoffCoords).addTo(m);
      } else {
        dropoffMarkerSmall.current.setLngLat(dropoffCoords);
      }
    } else if (dropoffMarkerSmall.current) {
      dropoffMarkerSmall.current.remove();
      dropoffMarkerSmall.current = null;
    }

    if (pickupCoords && dropoffCoords) {
      const bounds = new maplibregl.LngLatBounds().extend(pickupCoords).extend(dropoffCoords);
      m.fitBounds(bounds, { padding: 40 });
    } else if (pickupCoords) {
      m.setCenter(pickupCoords);
    }
  }, [pickupCoords, dropoffCoords, isMapFullscreen]);

  // 4. Atualiza marcadores no Mapa do Modal (Tela Cheia)
  useEffect(() => {
    const m = mapFull.current;
    if (!m || !isMapFullscreen) return;

    if (pickupCoords) {
      if (!pickupMarkerFull.current) {
        const el = document.createElement("div");
        el.className = "w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer";
        el.innerText = "A";
        pickupMarkerFull.current = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(pickupCoords)
          .addTo(m);

        pickupMarkerFull.current.on("dragend", () => {
          const lngLat = pickupMarkerFull.current?.getLngLat();
          if (lngLat) {
            setPickupCoords([lngLat.lng, lngLat.lat]);
            fetchAddressFromCoords(lngLat.lat, lngLat.lng, "pickup");
          }
        });
      } else {
        pickupMarkerFull.current.setLngLat(pickupCoords);
      }
    } else if (pickupMarkerFull.current) {
      pickupMarkerFull.current.remove();
      pickupMarkerFull.current = null;
    }

    if (dropoffCoords) {
      if (!dropoffMarkerFull.current) {
        const el = document.createElement("div");
        el.className = "w-8 h-8 bg-emerald-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs cursor-pointer";
        el.innerText = "B";
        dropoffMarkerFull.current = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(dropoffCoords)
          .addTo(m);

        dropoffMarkerFull.current.on("dragend", () => {
          const lngLat = dropoffMarkerFull.current?.getLngLat();
          if (lngLat) {
            setDropoffCoords([lngLat.lng, lngLat.lat]);
            fetchAddressFromCoords(lngLat.lat, lngLat.lng, "dropoff");
          }
        });
      } else {
        dropoffMarkerFull.current.setLngLat(dropoffCoords);
      }
    } else if (dropoffMarkerFull.current) {
      dropoffMarkerFull.current.remove();
      dropoffMarkerFull.current = null;
    }

    if (pickupCoords && dropoffCoords) {
      const bounds = new maplibregl.LngLatBounds().extend(pickupCoords).extend(dropoffCoords);
      m.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [pickupCoords, dropoffCoords, isMapFullscreen]);

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

  // Geocodificação Reversa (Coordenadas -> Endereço)
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

    if (mapFull.current) {
      mapFull.current.flyTo({ center: [lon, lat], zoom: 15, duration: 1500 });
    }
  };

  const handleClear = () => {
    // Limpar marcadores pequeno
    if (pickupMarkerSmall.current) pickupMarkerSmall.current.remove();
    if (dropoffMarkerSmall.current) dropoffMarkerSmall.current.remove();
    pickupMarkerSmall.current = null;
    dropoffMarkerSmall.current = null;

    // Limpar marcadores full
    if (pickupMarkerFull.current) pickupMarkerFull.current.remove();
    if (dropoffMarkerFull.current) dropoffMarkerFull.current.remove();
    pickupMarkerFull.current = null;
    dropoffMarkerFull.current = null;

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
    <div className="pb-8 flex flex-col min-h-screen relative">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-secondary grid place-items-center text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Táxi & Moto Táxi</h1>
          <p className="text-xs text-muted-foreground">Preencha os endereços ou posicione no mapa ampliado</p>
        </div>
      </div>

      {/* ── FORMULÁRIO TRADICIONAL (LAYOUT DE ORIGEM) ── */}
      <div className="space-y-4">
        {/* Endereço de Partida */}
        <div className="relative z-30">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Onde te buscamos?</label>
          <div className="relative">
            <input
              type="text"
              value={pickupText}
              onChange={(e) => {
                setPickupText(e.target.value);
                searchAddress(e.target.value, "pickup");
              }}
              placeholder="Digite o endereço de partida..."
              className="w-full pl-4 pr-8 h-11 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {pickupText && (
              <button
                onClick={() => {
                  setPickupText("");
                  setPickupCoords(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {pickupSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-40">
              {pickupSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(item, "pickup")}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted border-b border-border last:border-0 flex items-center gap-2 text-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Endereço de Destino */}
        <div className="relative z-20">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Para onde vamos?</label>
          <div className="relative">
            <input
              type="text"
              value={dropoffText}
              onChange={(e) => {
                setDropoffText(e.target.value);
                searchAddress(e.target.value, "dropoff");
              }}
              placeholder="Digite o endereço de destino..."
              className="w-full pl-4 pr-8 h-11 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {dropoffText && (
              <button
                onClick={() => {
                  setDropoffText("");
                  setDropoffCoords(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {dropoffSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-40">
              {dropoffSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(item, "dropoff")}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-muted border-b border-border last:border-0 flex items-center gap-2 text-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── MAPA PEQUENO INTERATIVO (CLIQUE PARA EXPANDIR) ── */}
        <div 
          onClick={() => setIsMapFullscreen(true)}
          className="relative h-44 rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer group hover:opacity-95 transition-all"
        >
          <div ref={mapContainerSmall} className="w-full h-full pointer-events-none" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 flex items-center justify-center transition-all">
            <span className="bg-background/90 backdrop-blur text-foreground px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
              <Maximize2 className="w-3.5 h-3.5 text-primary" />
              Abrir Mapa Completo
            </span>
          </div>
        </div>

        {/* Veículo e Valores */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setVehicleType("mototaxi")}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              vehicleType === "mototaxi"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <Bike className="w-6 h-6 mb-1" />
            <span className="font-bold text-xs">Moto Táxi</span>
            <span className="text-[10px] opacity-80 mt-0.5">R$ {rates.mototaxi.toFixed(2)}/KM</span>
          </button>

          <button
            type="button"
            onClick={() => setVehicleType("taxi")}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
              vehicleType === "taxi"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <Car className="w-6 h-6 mb-1" />
            <span className="font-bold text-xs">Táxi (Carro)</span>
            <span className="text-[10px] opacity-80 mt-0.5">R$ {rates.taxi.toFixed(2)}/KM</span>
          </button>
        </div>

        {pickupCoords && dropoffCoords && (
          <div className="bg-secondary/40 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Distância Estimada</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{distance.toFixed(2)} km</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-semibold">Preço da Corrida</p>
              <p className="text-lg font-display font-black text-primary">R$ {price.toFixed(2).replace(".", ",")}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações complementares (ex: portão verde)"
            className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <div className="text-[10px] text-center text-muted-foreground/80">
            O pagamento deve ser feito por fora direto ao motorista.
          </div>

          <Button
            type="submit"
            disabled={loading || !pickupCoords || !dropoffCoords}
            className="w-full h-12 rounded-xl font-bold shadow-[var(--shadow-elegant)]"
          >
            {loading ? "Solicitando..." : "Confirmar Solicitação"}
          </Button>
        </form>
      </div>

      {/* ── MODAL MAPA TELA CHEIA (INTERATIVO) ── */}
      {isMapFullscreen && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in fade-in duration-200">
          {/* Header do Modal */}
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-card shadow-sm">
            <div>
              <h3 className="font-bold text-base">Posicionar no Mapa</h3>
              <p className="text-xs text-muted-foreground">Toque no mapa para marcar ou arraste os pinos</p>
            </div>
            <button
              onClick={() => setIsMapFullscreen(false)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Autocomplete flutuante dentro do Modal */}
          <div className="p-3 bg-card border-b border-border flex flex-col gap-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={pickupText}
                onChange={(e) => {
                  setPickupText(e.target.value);
                  searchAddress(e.target.value, "pickup");
                }}
                placeholder="Ponto de Partida (A)..."
                className="w-full pl-8 pr-8 h-9 rounded-lg border border-border bg-background text-xs"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
              {pickupSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto z-50">
                  {pickupSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSuggestion(item, "pickup")}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border/30 flex items-center gap-1.5 text-foreground"
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={dropoffText}
                onChange={(e) => {
                  setDropoffText(e.target.value);
                  searchAddress(e.target.value, "dropoff");
                }}
                placeholder="Ponto de Destino (B)..."
                className="w-full pl-8 pr-8 h-9 rounded-lg border border-border bg-background text-xs"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
              {dropoffSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto z-50">
                  {dropoffSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSuggestion(item, "dropoff")}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b border-border/30 flex items-center gap-1.5 text-foreground"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Div do Mapa */}
          <div className="flex-1 relative">
            <div ref={mapContainerFull} className="w-full h-full" />
            
            {(!pickupCoords || !dropoffCoords) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 pointer-events-none shadow-lg z-10">
                <Navigation className="w-3.5 h-3.5 animate-pulse text-primary" />
                {!pickupCoords ? "Toque no mapa para marcar a partida" : "Agora toque no destino"}
              </div>
            )}

            {(pickupCoords || dropoffCoords) && (
              <button
                onClick={handleClear}
                className="absolute bottom-4 right-4 bg-background border border-border text-foreground px-3 py-1.5 rounded-xl text-xs font-bold shadow-md hover:bg-muted active:scale-95 transition-all z-25"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Rodapé do Modal */}
          <div className="p-4 bg-card border-t border-border flex gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsMapFullscreen(false)}
              className="flex-1 h-12 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              disabled={!pickupCoords || !dropoffCoords}
              onClick={() => setIsMapFullscreen(false)}
              className="flex-1 h-12 rounded-xl text-xs font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirmar Pontos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
