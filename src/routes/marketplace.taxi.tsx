import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, MapPin, CheckCircle2, Car, Bike, Navigation, X, Check, MapPinned, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/marketplace/taxi")({
  head: () => ({ meta: [{ title: "Solicitar Corrida — Primavera Delivery" }] }),
  component: TaxiPage,
});

const PVA_CENTER: [number, number] = [-54.3075, -15.5606];
const PVA_BOUNDS = "-54.3700,-15.6100,-54.2500,-15.5100";

// OSRM Routing API
async function fetchRoute(lon1: number, lat1: number, lon2: number, lat2: number) {
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return {
        distanceKm: Number((data.routes[0].distance / 1000).toFixed(2)),
        geometry: data.routes[0].geometry
      };
    }
  } catch (err) {
    console.error("Erro OSRM:", err);
  }
  return null;
}

// Função para desenhar a rota no mapa
function drawRoute(mapInst: any, routeGeoJSON: any) {
  if (!mapInst || !routeGeoJSON) return;
  if (mapInst.getSource('route')) {
    mapInst.getSource('route').setData(routeGeoJSON);
  } else {
    mapInst.addSource('route', {
      'type': 'geojson',
      'data': routeGeoJSON
    });
    mapInst.addLayer({
      'id': 'route',
      'type': 'line',
      'source': 'route',
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': '#10b981',
        'line-width': 4
      }
    });
  }
}

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
  
  // Estado para armazenar o objeto maplibregl vindo do script global do navegador
  const [MapLibre, setMapLibre] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const mapContainerSmall = useRef<HTMLDivElement>(null);
  const mapContainerFull = useRef<HTMLDivElement>(null);
  
  const mapSmall = useRef<any>(null);
  const mapFull = useRef<any>(null);

  const [vehicleType, setVehicleType] = useState<"taxi" | "mototaxi">("mototaxi");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Modal de Mapa
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeSelectType, setActiveSelectType] = useState<"pickup" | "dropoff">("pickup");

  // Coordenadas
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [price, setPrice] = useState<number>(15.0);
  const [rates, setRates] = useState({ taxi: 3.0, mototaxi: 2.0 });

  // Endereços, Números e Autocomplete
  const [pickupText, setPickupText] = useState("");
  const [pickupNumber, setPickupNumber] = useState("");
  
  const [dropoffText, setDropoffText] = useState("");
  const [dropoffNumber, setDropoffNumber] = useState("");
  
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDropoff, setSearchingDropoff] = useState(false);

  // Marcadores do Mapa
  const pickupMarkerSmall = useRef<any>(null);
  const dropoffMarkerSmall = useRef<any>(null);
  
  const pickupMarkerFull = useRef<any>(null);
  const dropoffMarkerFull = useRef<any>(null);
  
  const userMarkerSmall = useRef<any>(null);
  const userMarkerFull = useRef<any>(null);
  
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Carrega dinamicamente via Script CDN para evitar que o bundler SSR acesse o pacote NPM no servidor
  useEffect(() => {
    // 1. Injeta o CSS do MapLibre
    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    // 2. Injeta o Script JS do MapLibre
    if (!document.getElementById("maplibre-js")) {
      const script = document.createElement("script");
      script.id = "maplibre-js";
      script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
      script.async = true;
      script.onload = () => {
        const globalLib = (window as any).maplibregl;
        if (globalLib) {
          const resolved = globalLib.Map ? globalLib : (globalLib.default || globalLib);
          setMapLibre(() => resolved);
        }
      };
      document.body.appendChild(script);
    } else {
      // Caso já esteja injetado no DOM
      const globalLib = (window as any).maplibregl;
      if (globalLib) {
        const resolved = globalLib.Map ? globalLib : (globalLib.default || globalLib);
        setMapLibre(() => resolved);
      }
    }
  }, []);

  // Carrega tarifas das regiões
  useEffect(() => {
    supabase
      .from("regions")
      .select("taxi_rate_per_km, mototaxi_rate_per_km")
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setRates({
            taxi: Number(data.taxi_rate_per_km) || 3.0,
            mototaxi: Number(data.mototaxi_rate_per_km) || 2.0,
          });
        }
      });
  }, []);

  // Obtém a geolocalização exata do usuário ao montar o componente
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
        },
        (error) => {
          console.warn("Geolocalização não autorizada ou indisponível:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 1. Inicializa o Mapa Pequeno
  useEffect(() => {
    if (!MapLibre || !mapContainerSmall.current || isMapFullscreen) {
      if (mapSmall.current) {
        mapSmall.current.remove();
        mapSmall.current = null;
      }
      return;
    }

    mapSmall.current = new MapLibre.Map({
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
      center: pickupCoords || userLocation || PVA_CENTER,
      zoom: 12,
      interactive: false,
      attributionControl: false,
    });

    return () => {
      if (mapSmall.current) {
        mapSmall.current.remove();
        mapSmall.current = null;
      }
    };
  }, [MapLibre, isMapFullscreen, userLocation]);

  // 2. Inicializa o Mapa Tela Cheia
  useEffect(() => {
    if (!MapLibre || !isMapFullscreen || !mapContainerFull.current) {
      if (mapFull.current) {
        mapFull.current.remove();
        mapFull.current = null;
      }
      return;
    }

    const initialCenter = activeSelectType === "pickup" 
      ? (pickupCoords || userLocation || PVA_CENTER)
      : (dropoffCoords || userLocation || PVA_CENTER);

    mapFull.current = new MapLibre.Map({
      container: mapContainerFull.current,
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
      center: initialCenter,
      zoom: 15,
      attributionControl: false,
    });

    return () => {
      if (mapFull.current) {
        mapFull.current.remove();
        mapFull.current = null;
      }
    };
  }, [MapLibre, isMapFullscreen, userLocation]);

  // 3. Atualiza marcadores no Mapa Pequeno
  useEffect(() => {
    if (!MapLibre) return;
    const m = mapSmall.current;
    if (!m) return;

    // Marcador da Localização do Usuário (Ponto Verde Pulsante)
    if (userLocation) {
      if (!userMarkerSmall.current) {
        const el = document.createElement("div");
        el.className = "w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow flex items-center justify-center animate-pulse";
        const inner = document.createElement("div");
        inner.className = "w-1.5 h-1.5 bg-white rounded-full";
        el.appendChild(inner);
        userMarkerSmall.current = new MapLibre.Marker({ element: el }).setLngLat(userLocation).addTo(m);
      } else {
        userMarkerSmall.current.setLngLat(userLocation);
      }
    } else if (userMarkerSmall.current) {
      userMarkerSmall.current.remove();
      userMarkerSmall.current = null;
    }

    if (pickupCoords) {
      if (!pickupMarkerSmall.current) {
        const el = document.createElement("div");
        el.className = "w-5 h-5 bg-primary rounded-full border-2 border-white shadow flex items-center justify-center text-white font-bold text-[9px]";
        el.innerText = "A";
        pickupMarkerSmall.current = new MapLibre.Marker({ element: el }).setLngLat(pickupCoords).addTo(m);
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
        dropoffMarkerSmall.current = new MapLibre.Marker({ element: el }).setLngLat(dropoffCoords).addTo(m);
      } else {
        dropoffMarkerSmall.current.setLngLat(dropoffCoords);
      }
    } else if (dropoffMarkerSmall.current) {
      dropoffMarkerSmall.current.remove();
      dropoffMarkerSmall.current = null;
    }

    if (pickupCoords && dropoffCoords) {
      const bounds = new MapLibre.LngLatBounds().extend(pickupCoords).extend(dropoffCoords);
      m.fitBounds(bounds, { padding: 40 });
    } else if (pickupCoords) {
      m.setCenter(pickupCoords);
    }
  }, [MapLibre, pickupCoords, dropoffCoords, isMapFullscreen, userLocation]);

  // 4. Marcadores no Modal (Tela Cheia)
  useEffect(() => {
    if (!MapLibre) return;
    const m = mapFull.current;
    if (!m || !isMapFullscreen) return;

    // Marcador da Localização do Usuário (Ponto Verde Pulsante)
    if (userLocation) {
      if (!userMarkerFull.current) {
        const el = document.createElement("div");
        el.className = "w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse";
        const inner = document.createElement("div");
        inner.className = "w-1.5 h-1.5 bg-white rounded-full";
        el.appendChild(inner);
        userMarkerFull.current = new MapLibre.Marker({ element: el }).setLngLat(userLocation).addTo(m);
      } else {
        userMarkerFull.current.setLngLat(userLocation);
      }
    } else if (userMarkerFull.current) {
      userMarkerFull.current.remove();
      userMarkerFull.current = null;
    }

    // Marcador A (Partida)
    if (pickupCoords) {
      if (!pickupMarkerFull.current) {
        const el = document.createElement("div");
        el.className = "w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs";
        el.innerText = "A";
        pickupMarkerFull.current = new MapLibre.Marker({ element: el })
          .setLngLat(pickupCoords)
          .addTo(m);
      } else {
        pickupMarkerFull.current.setLngLat(pickupCoords);
      }
    } else if (pickupMarkerFull.current) {
      pickupMarkerFull.current.remove();
      pickupMarkerFull.current = null;
    }

    // Marcador B (Destino)
    if (dropoffCoords) {
      if (!dropoffMarkerFull.current) {
        const el = document.createElement("div");
        el.className = "w-8 h-8 bg-emerald-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs";
        el.innerText = "B";
        dropoffMarkerFull.current = new MapLibre.Marker({ element: el })
          .setLngLat(dropoffCoords)
          .addTo(m);
      } else {
        dropoffMarkerFull.current.setLngLat(dropoffCoords);
      }
    } else if (dropoffMarkerFull.current) {
      dropoffMarkerFull.current.remove();
      dropoffMarkerFull.current = null;
    }
  }, [MapLibre, pickupCoords, dropoffCoords, isMapFullscreen, userLocation]);

  // Preço e Distância
  useEffect(() => {
    let active = true;
    if (pickupCoords && dropoffCoords) {
      fetchRoute(pickupCoords[0], pickupCoords[1], dropoffCoords[0], dropoffCoords[1]).then(routeData => {
        if (!active) return;
        if (routeData) {
          setDistance(routeData.distanceKm);
          if (mapSmall.current) drawRoute(mapSmall.current, routeData.geometry);
          if (mapFull.current) drawRoute(mapFull.current, routeData.geometry);
          
          let baseFee = 6.99;
          let rate = 2.0;
          if (vehicleType === "taxi") {
            baseFee = 9.99;
            rate = 3.0;
          }
          setPrice(baseFee + routeData.distanceKm * rate);
        } else {
          // Fallback para linha reta se a API do OSRM falhar
          const dist = calculateDistance(
            pickupCoords[1],
            pickupCoords[0],
            dropoffCoords[1],
            dropoffCoords[0]
          );
          setDistance(dist);
          
          let baseFee = 6.99;
          let rate = 2.0;
          if (vehicleType === "taxi") {
            baseFee = 9.99;
            rate = 3.0;
          }
          setPrice(baseFee + dist * rate);
        }
      });
    }
    return () => { active = false; };
  }, [pickupCoords, dropoffCoords, vehicleType]);

  // Função algorítmica de geofencing e regras de rua para corrigir os bairros do OpenStreetMap
  const getCorrectBairro = (lon: number, lat: number, streetName: string, addr?: any): string => {
    if (addr) {
      const osmBairro = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential;
      if (osmBairro && osmBairro.toLowerCase() !== "parque eldorado") {
        return osmBairro;
      }
    }

    const street = streetName.toLowerCase();
    
    // 1. Regras específicas por nome de rua principal
    if (street.includes("ari krief") || street.includes("ari kriff")) return "Jardim Progresso";
    if (street.includes("santo amaro")) {
      if (lon < -54.307) return "Primavera I";
      if (lon < -54.298) return "Jardim Riva";
      return "Centro";
    }
    if (street.includes("david riva") || street.includes("avenida primavera") || street.includes("campo grande")) {
      if (lon < -54.300) return "Jardim Riva";
      return "Centro";
    }
    if (street.includes("piracicaba") || street.includes("paranatinga") || street.includes("cuiaba") || street.includes("cuiabá") || street.includes("porto alegre")) {
      return "Centro";
    }
    if (street.includes("belo horizonte") || street.includes("curitiba") || street.includes("sao paulo") || street.includes("são paulo")) {
      return "Centro";
    }
    if (street.includes("pion. poncio") || street.includes("poncho verde")) {
      return "Poncho Verde";
    }
    if (street.includes("castelandia") || street.includes("castelândia")) {
      return "Castelândia";
    }
    if (street.includes("são joão") || street.includes("sao joao")) {
      return "Centro";
    }
    
    return "";
  };

  // Helper para formatar sugestões com bairro correto
  const formatSuggestionLabel = (item: any) => {
    const lon = parseFloat(item.lon);
    const lat = parseFloat(item.lat);
    const addr = item.address || {};
    const street = addr.road || addr.street || item.display_name.split(",")[0] || "";
    
    const bairro = getCorrectBairro(lon, lat, street, addr);
    const city = addr.city || addr.town || addr.municipality || "Primavera do Leste";
    return {
      main: bairro ? `${street}, ${bairro}` : street,
      sub: `${city} - MT`
    };
  };

  // Geocodificação Reversa
  const fetchAddressFromCoords = async (lat: number, lng: number, type: "pickup" | "dropoff") => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        { headers: { "User-Agent": "Primavera-Delivery/1.0" } }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.street || data.display_name.split(",")[0] || "";
        
        const bairro = getCorrectBairro(lng, lat, street, addr);
        const addressShort = bairro ? `${street}, ${bairro}` : street;
        
        if (type === "pickup") {
          setPickupText(addressShort);
          const houseNo = addr.house_number || "";
          if (houseNo) setPickupNumber(houseNo);
        } else {
          setDropoffText(addressShort);
          const houseNo = addr.house_number || "";
          if (houseNo) setDropoffNumber(houseNo);
        }
      }
    } catch (err) {
      console.error("Geocodificação reversa falhou:", err);
    }
  };

  // Autocomplete
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
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
          query
        )}&viewbox=${PVA_BOUNDS}&bounded=1&limit=6`;
        const res = await fetch(url, { headers: { "User-Agent": "Primavera-Delivery/1.0" } });
        const data = await res.json();
        if (type === "pickup") setPickupSuggestions(data);
        else setDropoffSuggestions(data);
      } catch (err) {
        console.error("Erro na busca de endereço:", err);
      } finally {
        setSearchingPickup(false);
        setSearchingDropoff(false);
      }
    }, 400);
  };

  const selectSuggestion = (item: any, type: "pickup" | "dropoff") => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    const label = formatSuggestionLabel(item);
    const streetBairro = label.main;

    if (type === "pickup") {
      setPickupCoords([lon, lat]);
      setPickupText(streetBairro);
      setPickupSuggestions([]);
    } else {
      setDropoffCoords([lon, lat]);
      setDropoffText(streetBairro);
      setDropoffSuggestions([]);
    }

    if (mapFull.current) {
      mapFull.current.flyTo({ center: [lon, lat], zoom: 16, duration: 1000 });
    }
  };

  // Trava a localização sob a mira central do mapa
  const handleSelectLocationAtCenter = () => {
    const m = mapFull.current;
    if (!m) return;
    const center = m.getCenter();
    const coords: [number, number] = [center.lng, center.lat];

    if (activeSelectType === "pickup") {
      setPickupCoords(coords);
      fetchAddressFromCoords(center.lat, center.lng, "pickup");
      setActiveSelectType("dropoff");
      if (dropoffCoords) {
        m.flyTo({ center: dropoffCoords, zoom: 15, duration: 800 });
      }
    } else {
      setDropoffCoords(coords);
      fetchAddressFromCoords(center.lat, center.lng, "dropoff");
    }
  };

  const handleClear = () => {
    if (pickupMarkerSmall.current) pickupMarkerSmall.current.remove();
    if (dropoffMarkerSmall.current) dropoffMarkerSmall.current.remove();
    pickupMarkerSmall.current = null;
    dropoffMarkerSmall.current = null;

    if (pickupMarkerFull.current) pickupMarkerFull.current.remove();
    if (dropoffMarkerFull.current) dropoffMarkerFull.current.remove();
    pickupMarkerFull.current = null;
    dropoffMarkerFull.current = null;

    setPickupCoords(null);
    setDropoffCoords(null);
    setPickupText("");
    setPickupNumber("");
    setDropoffText("");
    setDropoffNumber("");
    setDistance(0);
    setPrice(15.0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupCoords || !dropoffCoords) {
      alert("Defina o endereço de partida e destino!");
      return;
    }
    if (!user) {
      alert("Você precisa entrar na sua conta para solicitar uma corrida.");
      navigate({ to: "/login" });
      return;
    }
    setLoading(true);

    const finalPickup = pickupNumber.trim() 
      ? `${pickupText}, nº ${pickupNumber} - Primavera do Leste` 
      : `${pickupText} - Primavera do Leste`;
      
    const finalDropoff = dropoffNumber.trim() 
      ? `${dropoffText}, nº ${dropoffNumber} - Primavera do Leste` 
      : `${dropoffText} - Primavera do Leste`;

    try {
      const { error } = await supabase.from("ride_requests").insert({
        user_id: user?.id || null,
        customer_name: user?.user_metadata?.full_name || user?.email || "Passageiro",
        customer_phone: user?.user_metadata?.phone || "",
        pickup_address: finalPickup,
        dropoff_address: finalDropoff,
        vehicle_type: vehicleType,
        notes: notes,
        price: price,
        status: "pending",
      } as any);

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao solicitar corrida. ${err?.message || "Tente novamente."}`);
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
          Motoristas de Primavera do Leste estão a caminho. O pagamento deve ser feito por fora diretamente a eles.
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
          <p className="text-xs text-muted-foreground">Busque sua rua e adicione o número da residência</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Endereço de Partida + Número */}
        <div className="relative z-30">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Onde te buscamos?</label>
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3 relative">
              <input
                type="text"
                value={pickupText}
                onChange={(e) => {
                  setPickupText(e.target.value);
                  searchAddress(e.target.value, "pickup");
                }}
                placeholder="Rua, Avenida ou Bairro..."
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
            
            <div className="col-span-1">
              <input
                type="text"
                value={pickupNumber}
                onChange={(e) => setPickupNumber(e.target.value)}
                placeholder="Nº"
                className="w-full h-11 text-center rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {pickupSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-40">
              {pickupSuggestions.map((item, idx) => {
                const label = formatSuggestionLabel(item);
                return (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(item, "pickup")}
                    className="w-full text-left px-4 py-2 hover:bg-muted border-b border-border last:border-0 flex flex-col gap-0.5 text-foreground"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{label.main}</span>
                    </div>
                    <span className="pl-[22px] text-[10px] text-muted-foreground">{label.sub}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Endereço de Destino + Número */}
        <div className="relative z-20">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Para onde vamos?</label>
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3 relative">
              <input
                type="text"
                value={dropoffText}
                onChange={(e) => {
                  setDropoffText(e.target.value);
                  searchAddress(e.target.value, "dropoff");
                }}
                placeholder="Rua, Avenida ou Bairro..."
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

            <div className="col-span-1">
              <input
                type="text"
                value={dropoffNumber}
                onChange={(e) => setDropoffNumber(e.target.value)}
                placeholder="Nº"
                className="w-full h-11 text-center rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {dropoffSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-40">
              {dropoffSuggestions.map((item, idx) => {
                const label = formatSuggestionLabel(item);
                return (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(item, "dropoff")}
                    className="w-full text-left px-4 py-2 hover:bg-muted border-b border-border last:border-0 flex flex-col gap-0.5 text-foreground"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{label.main}</span>
                    </div>
                    <span className="pl-[22px] text-[10px] text-muted-foreground">{label.sub}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Miniatura do Mapa */}
        <div 
          onClick={() => setIsMapFullscreen(true)}
          className="relative h-44 rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer group hover:opacity-95 transition-all"
        >
          <div ref={mapContainerSmall} className="w-full h-full pointer-events-none" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 flex items-center justify-center transition-all">
            <span className="bg-background/90 backdrop-blur text-foreground px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
              <Maximize2 className="w-3.5 h-3.5 text-primary" />
              Ver Mapa Completo
            </span>
          </div>
        </div>

        {/* Seleção do Veículo */}
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
            <span className="text-[10px] opacity-80 mt-0.5">R$ 6,99 + R$ {rates.mototaxi.toFixed(2).replace('.', ',')}/km</span>
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
            <span className="text-[10px] opacity-80 mt-0.5">R$ 9,99 + R$ {rates.taxi.toFixed(2).replace('.', ',')}/km</span>
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

      {/* ── MODAL MAPA TELA CHEIA (COM MIRA FIXA CENTRAL) ── */}
      {isMapFullscreen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 h-[100dvh] w-screen bg-background z-[9999] flex flex-col overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-card shadow-sm">
            <div>
              <h3 className="font-bold text-base">Arrastar Mapa sob a Mira</h3>
              <p className="text-xs text-muted-foreground">Posicione a rua no centro da tela e clique para fixar</p>
            </div>
            <button
              onClick={() => setIsMapFullscreen(false)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Seletores de Atividade da Mira */}
          <div className="p-3 bg-card border-b border-border flex gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveSelectType("pickup");
                if (pickupCoords && mapFull.current) mapFull.current.flyTo({ center: pickupCoords, zoom: 15 });
              }}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSelectType === "pickup"
                  ? "bg-primary border-primary text-primary-foreground shadow"
                  : "bg-background border-border text-foreground hover:bg-muted"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-primary shrink-0" />
              A: Partida {pickupCoords ? "✓" : ""}
            </button>

            <button
              onClick={() => {
                setActiveSelectType("dropoff");
                if (dropoffCoords && mapFull.current) mapFull.current.flyTo({ center: dropoffCoords, zoom: 15 });
              }}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSelectType === "dropoff"
                  ? "bg-emerald-500 border-emerald-500 text-white shadow"
                  : "bg-background border-border text-foreground hover:bg-muted"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-emerald-500 shrink-0" />
              B: Destino {dropoffCoords ? "✓" : ""}
            </button>
          </div>

          {/* Autocomplete de Pesquisa */}
          <div className="p-2.5 bg-card border-b border-border relative z-55 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={activeSelectType === "pickup" ? pickupText : dropoffText}
                onChange={(e) => {
                  if (activeSelectType === "pickup") {
                    setPickupText(e.target.value);
                    searchAddress(e.target.value, "pickup");
                  } else {
                    setDropoffText(e.target.value);
                    searchAddress(e.target.value, "dropoff");
                  }
                }}
                placeholder={activeSelectType === "pickup" ? "Buscar partida..." : "Buscar destino..."}
                className="w-full pl-8 pr-8 h-9 rounded-lg border border-border bg-background text-xs"
              />
              <MapPinned className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              
              {activeSelectType === "pickup" && pickupSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto z-50">
                  {pickupSuggestions.map((item, idx) => {
                    const label = formatSuggestionLabel(item);
                    return (
                      <button
                        key={idx}
                        onClick={() => selectSuggestion(item, "pickup")}
                        className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border/30 flex flex-col gap-0.5 text-foreground"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{label.main}</span>
                        </div>
                        <span className="pl-[20px] text-[10px] text-muted-foreground">{label.sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {activeSelectType === "dropoff" && dropoffSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto z-50">
                  {dropoffSuggestions.map((item, idx) => {
                    const label = formatSuggestionLabel(item);
                    return (
                      <button
                        key={idx}
                        onClick={() => selectSuggestion(item, "dropoff")}
                        className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border/30 flex flex-col gap-0.5 text-foreground"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{label.main}</span>
                        </div>
                        <span className="pl-[20px] text-[10px] text-muted-foreground">{label.sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Div do Mapa com Alvo Central Fixo */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <div ref={mapContainerFull} className="w-full h-full" />
            
            {/* ── MIRA CENTRAL DE PRECISÃO ── */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-30 flex flex-col items-center">
              <div className={`px-3 py-1.5 rounded-xl shadow-lg text-[10px] font-black text-white whitespace-nowrap mb-1 animate-bounce ${
                activeSelectType === "pickup" ? "bg-primary" : "bg-emerald-500"
              }`}>
                {activeSelectType === "pickup" ? "Ponto de Partida" : "Ponto de Destino"}
              </div>
              <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${
                activeSelectType === "pickup" ? "bg-primary" : "bg-emerald-500"
              }`} />
              <div className="w-0.5 h-6 bg-slate-800 shadow shadow-black/30" />
            </div>

            <div className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur text-white p-3 rounded-2xl text-[11px] text-center pointer-events-none shadow-lg z-20">
              <span className="font-semibold text-slate-300">Endereço no centro:</span>
              <p className="font-bold truncate mt-0.5">
                {activeSelectType === "pickup" ? (pickupText || "Primavera do Leste") : (dropoffText || "Primavera do Leste")}
              </p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-20">
              <Button
                onClick={handleSelectLocationAtCenter}
                className={`w-full h-12 rounded-xl text-xs font-bold text-white shadow-lg ${
                  activeSelectType === "pickup" ? "bg-primary hover:bg-primary/95" : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                Definir Ponto {activeSelectType === "pickup" ? "A (Partida)" : "B (Destino)"} Aqui
              </Button>
            </div>
          </div>

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
              Confirmar e Voltar
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
