import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MapPin, Package, CheckCircle2, X, MapPinned, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/marketplace/errands")({
  head: () => ({ meta: [{ title: "Enviar Encomenda — Primavera Delivery" }] }),
  component: ErrandsPage,
});

const PVA_CENTER: [number, number] = [-54.2972, -15.5597];
const PVA_BOUNDS = "-54.34,-15.60,-54.25,-15.52";

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

// Cálculo de distância simples usando fórmula de Haversine
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function ErrandsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado para armazenar o objeto maplibregl vindo do script global do navegador
  const [MapLibre, setMapLibre] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const mapContainerSmall = useRef<HTMLDivElement>(null);
  const mapContainerFull = useRef<HTMLDivElement>(null);
  
  const mapSmall = useRef<any>(null);
  const mapFull = useRef<any>(null);

  const [vehicleType, setVehicleType] = useState<"moto" | "carro" | "carro_aberto">("moto");
  const [description, setDescription] = useState("");
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
    if (typeof window === "undefined") return;

    const cssId = "maplibre-css";
    const scriptId = "maplibre-js";

    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "text/javascript";
      script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
      script.onload = () => {
        const globalLib = (window as any).maplibregl;
        if (globalLib) {
          const resolved = globalLib.Map ? globalLib : (globalLib.default || globalLib);
          setMapLibre(() => resolved);
        }
      };
      document.body.appendChild(script);
    } else {
      const globalLib = (window as any).maplibregl;
      if (globalLib) {
        const resolved = globalLib.Map ? globalLib : (globalLib.default || globalLib);
        setMapLibre(() => resolved);
      }
    }
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
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles" }],
      },
      center: initialCenter,
      zoom: 15,
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

  // Preço, Distância e Rota no Mapa
  useEffect(() => {
    let active = true;

    async function updateRoute() {
      if (pickupCoords && dropoffCoords) {
        const routeData = await fetchRoute(pickupCoords[0], pickupCoords[1], dropoffCoords[0], dropoffCoords[1]);
        if (!active) return;

        let dist = 0;
        let routeGeoJSON: any = null;

        if (routeData) {
          dist = routeData.distanceKm;
          routeGeoJSON = routeData.geometry;
        } else {
          dist = calculateDistance(pickupCoords[1], pickupCoords[0], dropoffCoords[1], dropoffCoords[0]);
        }
        
        setDistance(dist);
        
        // Tarifas por tipo de veículo
        // Moto: R$ 2.00/KM, min R$ 7.00
        // Carro: R$ 3.50/KM, min R$ 15.00
        // Carro Aberto: R$ 5.00/KM, min R$ 30.00
        let rate = 2.0;
        let minPrice = 7.0;
        if (vehicleType === "carro") {
          rate = 3.5;
          minPrice = 15.0;
        } else if (vehicleType === "carro_aberto") {
          rate = 5.0;
          minPrice = 30.0;
        }
        
        setPrice(Math.max(minPrice, dist * rate));

        // Atualizar rota no mapa
        const drawRoute = (mapRef: any) => {
          if (!mapRef.current) return;
          const map = mapRef.current;
          
          if (routeGeoJSON) {
            if (map.getSource("route")) {
              map.getSource("route").setData(routeGeoJSON);
            } else {
              map.addSource("route", { type: "geojson", data: routeGeoJSON });
              map.addLayer({
                id: "route",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#eab308", "line-width": 4 }
              }, map.getLayer("pickup-marker") ? "pickup-marker" : undefined);
            }

            // Centraliza o mapa
            const coords = routeGeoJSON.coordinates;
            const bounds = coords.reduce(function(bounds: any, coord: any) {
              return bounds.extend(coord);
            }, new MapLibre.LngLatBounds(coords[0], coords[0]));
            map.fitBounds(bounds, { padding: 40, duration: 800 });

          } else if (map.getSource("route")) {
            map.getSource("route").setData({ type: "FeatureCollection", features: [] });
          }
        };

        if (MapLibre) {
          drawRoute(mapSmall);
          drawRoute(mapFull);
        }
      } else {
        setDistance(0);
        setPrice(0);
        // Limpar rota
        const clearRoute = (mapRef: any) => {
          if (mapRef.current && mapRef.current.getSource("route")) {
            mapRef.current.getSource("route").setData({ type: "FeatureCollection", features: [] });
          }
        };
        clearRoute(mapSmall);
        clearRoute(mapFull);
      }
    }

    updateRoute();
    return () => { active = false; };
  }, [pickupCoords, dropoffCoords, vehicleType, MapLibre]);

  // Função algorítmica de geofencing e regras de rua para corrigir os bairros do OpenStreetMap
  const getCorrectBairro = (lon: number, lat: number, streetName: string, addr?: any): string => {
    if (addr) {
      const osmBairro = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential;
      if (osmBairro && osmBairro.toLowerCase() !== "parque eldorado") {
        return osmBairro;
      }
    }

    const street = streetName.toLowerCase();
    
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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
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
        const res = await fetch(url);
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
      alert("Defina o endereço de coleta e entrega!");
      return;
    }
    setLoading(true);

    const finalPickup = pickupNumber.trim() 
      ? `${pickupText}, nº ${pickupNumber} - Primavera do Leste` 
      : `${pickupText} - Primavera do Leste`;
      
    const finalDropoff = dropoffNumber.trim() 
      ? `${dropoffText}, nº ${dropoffNumber} - Primavera do Leste` 
      : `${dropoffText} - Primavera do Leste`;

    const vehicleLabelMap: Record<string, string> = {
      moto: "Moto",
      carro: "Carro",
      carro_aberto: "Carro Aberto"
    };

    const finalNotes = description.trim() 
      ? `${description}\n\n[Veículo Solicitado: ${vehicleLabelMap[vehicleType] || vehicleType}]`
      : `[Veículo Solicitado: ${vehicleLabelMap[vehicleType] || vehicleType}]`;

    try {
      const { error } = await supabase.from("deliveries").insert({
        company_id: null,
        customer_name: user?.user_metadata?.full_name || user?.email || "Cliente",
        pickup_address: finalPickup,
        address: finalDropoff,
        notes: finalNotes,
        value: price,
        is_customer_errand: true,
        status: "pending",
        commission: price * 0.8, // 80% do valor vai para o entregador
        vehicle_type: vehicleType,
        distance_km: distance,
        pickup_latitude: pickupCoords[1],
        pickup_longitude: pickupCoords[0],
        delivery_latitude: dropoffCoords[1],
        delivery_longitude: dropoffCoords[0],
      } as any);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao solicitar entregador. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">Solicitação enviada!</h2>
        <p className="text-muted-foreground mb-8">
          Um entregador já foi notificado e está a caminho do local de coleta.
        </p>
        <Button onClick={() => navigate({ to: "/marketplace" })} className="w-full max-w-xs h-12 rounded-xl">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-secondary grid place-items-center text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Solicitar Entregador</h1>
          <p className="text-xs text-muted-foreground">Envios rápidos na cidade</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {/* Endereço de Partida (Coleta) + Número */}
          <div className="relative z-30">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Onde coletamos a encomenda?</label>
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

          {/* Endereço de Destino (Entrega) + Número */}
          <div className="relative z-20">
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Onde devemos entregar?</label>
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
        </div>

        {/* Miniatura do Mapa */}
        <div 
          onClick={() => setIsMapFullscreen(true)}
          className="relative h-44 rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer group hover:opacity-95 transition-all"
        >
          <div ref={mapContainerSmall} className="w-full h-full pointer-events-none" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 flex items-center justify-center transition-all">
            <span className="bg-background/90 backdrop-blur text-foreground px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
              <Maximize2 className="w-3.5 h-3.5" /> Ver Mapa Completo
            </span>
          </div>
        </div>

        {/* Seletor de Tipo de Veículo */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={() => setVehicleType("moto")}
            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
              vehicleType === "moto"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-xl mb-1">🏍️</span>
            <span className="text-xs font-bold block">Moto</span>
            <span className="text-[10px] opacity-75 mt-0.5">R$ 2.00/KM</span>
          </button>

          <button
            type="button"
            onClick={() => setVehicleType("carro")}
            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
              vehicleType === "carro"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-xl mb-1">🚗</span>
            <span className="text-xs font-bold block">Carro</span>
            <span className="text-[10px] opacity-75 mt-0.5">R$ 3.50/KM</span>
          </button>

          <button
            type="button"
            onClick={() => setVehicleType("carro_aberto")}
            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
              vehicleType === "carro_aberto"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-xl mb-1">🛻</span>
            <span className="text-xs font-bold block">Carro Aberto</span>
            <span className="text-[10px] opacity-75 mt-0.5">R$ 5.00/KM</span>
          </button>
        </div>

        {/* Informações da Rota / Distância */}
        {pickupCoords && dropoffCoords && (
          <div className="bg-muted/50 p-4 rounded-2xl space-y-2 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Distância Estimada</span>
              <span className="font-bold text-foreground">{distance} km</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/50 pt-2">
              <span className="text-sm font-semibold">Preço da Entrega</span>
              <span className="text-lg font-black text-primary">
                R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" /> O que vamos transportar?
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Buscar a chave com a Maria, Entregar um pacote de roupas..."
            className="w-full h-24 p-4 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs text-amber-600 font-semibold mb-4 leading-relaxed">
          O pagamento do frete deve ser feito diretamente ao entregador.
        </div>

        <div className="flex gap-2">
          {pickupCoords || dropoffCoords ? (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 h-14 rounded-xl border border-border text-muted-foreground active:scale-95 transition-transform text-sm font-semibold"
            >
              Limpar
            </button>
          ) : null}
          
          <Button
            type="submit"
            disabled={loading || !user || !pickupCoords || !dropoffCoords}
            className="flex-1 h-14 rounded-xl font-bold text-base shadow-[var(--shadow-elegant)]"
          >
            {loading ? "Solicitando..." : user ? "Confirmar Solicitação" : "Faça login para solicitar"}
          </Button>
        </div>
      </form>

      {/* ── MODAL MAPA TELA CHEIA (COM MIRA FIXA CENTRAL) ── */}
      {isMapFullscreen && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in fade-in duration-200">
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
              A: Coleta {pickupCoords ? "✓" : ""}
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
              B: Entrega {dropoffCoords ? "✓" : ""}
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
                placeholder={activeSelectType === "pickup" ? "Buscar coleta..." : "Buscar entrega..."}
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
          <div className="flex-1 relative overflow-hidden">
            <div ref={mapContainerFull} className="w-full h-full" />
            
            {/* ── MIRA CENTRAL DE PRECISÃO ── */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-30 flex flex-col items-center">
              <div className={`px-3 py-1.5 rounded-xl shadow-lg text-[10px] font-black text-white whitespace-nowrap mb-1 animate-bounce ${
                activeSelectType === "pickup" ? "bg-primary" : "bg-emerald-500"
              }`}>
                {activeSelectType === "pickup" ? "Ponto de Coleta" : "Ponto de Entrega"}
              </div>
              <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${
                activeSelectType === "pickup" ? "bg-primary" : "bg-emerald-500"
              }`} />
              <div className="w-0.5 h-6 bg-slate-800 shadow shadow-black/30" />
            </div>

            <div className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur text-white p-3 rounded-2xl text-[11px] text-center pointer-events-none shadow-lg z-20">
              <span className="font-semibold text-slate-300">Endereço no centro:</span>
              <div className="font-bold text-white mt-0.5 truncate">
                {activeSelectType === "pickup" 
                  ? (pickupText || "Posicione o local de coleta...") 
                  : (dropoffText || "Posicione o local de entrega...")
                }
              </div>
            </div>

            {/* Botão Flutuante de Confirmação */}
            <button
              onClick={handleSelectLocationAtCenter}
              className={`absolute bottom-4 left-4 right-4 h-12 rounded-xl text-white font-bold text-sm shadow-lg z-20 active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                activeSelectType === "pickup" ? "bg-primary hover:bg-primary/95" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {activeSelectType === "pickup" ? "Fixar Coleta (A)" : "Fixar Entrega (B)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
