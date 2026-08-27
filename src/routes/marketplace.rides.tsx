import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Car, Bike, MapPin, Loader2, ArrowLeft, Navigation, ShieldCheck, XCircle, Phone, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "maplibre-gl/dist/maplibre-gl.css";
import { createPickupPinElement, createDropoffPinElement, createVehicleMarkerElement, registerMapEmojis } from "@/lib/map-markers";

import { RequireAuth } from "@/components/marketplace/RequireAuth";
import { AeroSkeletonList } from "@/components/aero";

function RidesRouteComponent() {
  return (
    <RequireAuth>
      <RidesPage />
    </RequireAuth>
  );
}

export const Route = createFileRoute("/marketplace/rides")({
  head: () => ({ meta: [{ title: "Corridas — MT 24horas express" }] }),
  component: RidesRouteComponent,
});

const PVA_CENTER: [number, number] = [-54.3075, -15.5606];

function RidesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { user } = useAuth();
  const navigate = useNavigate();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRide, setActiveRide] = useState<any | null>(null);


  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      try {
        // Somente corridas do próprio usuário. Nunca listar corridas do sistema.
        let savedIds: string[] = [];
        const savedEmail = user?.email || "";
        if (typeof window !== "undefined") {
          try {
            savedIds = JSON.parse(localStorage.getItem("pva_my_ride_ids") || "[]");
          } catch (e) {}
        }

        const queryPromises: PromiseLike<any>[] = [];

        // 1. Busca por user_id se o usuario estiver autenticado
        if (user?.id) {
          queryPromises.push(
            supabase
              .from("ride_requests")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
          );
        }

        // 2. Busca por IDs de corridas criadas neste dispositivo (RLS ainda se aplica)
        if (savedIds.length > 0) {
          queryPromises.push(
            supabase
              .from("ride_requests")
              .select("*")
              .in("id", savedIds)
              .order("created_at", { ascending: false })
          );
        }

        // 3. Busca pelo e-mail do usuário autenticado
        if (user?.id && savedEmail) {
          queryPromises.push(
            supabase
              .from("ride_requests")
              .select("*")
              .ilike("customer_name", `%${savedEmail}%`)
              .order("created_at", { ascending: false })
          );
        }

        const results = queryPromises.length > 0 ? await Promise.all(queryPromises) : [];
        const combinedRides: any[] = [];
        const seenIds = new Set<string>();

        for (const res of results) {
          if (res.data) {
            for (const item of res.data) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                combinedRides.push(item);
              }
            }
          }
        }

        // 5. Incluir corridas ativas salvas localmente no dispositivo (garante exibição imediata em modo visitante ou com delay do Supabase)
        if (typeof window !== "undefined") {
          try {
            const localRides = JSON.parse(localStorage.getItem("pva_local_rides") || "[]");
            for (const item of localRides) {
              if (item && item.id && !seenIds.has(item.id)) {
                const isRecent = item.created_at && (Date.now() - new Date(item.created_at).getTime() < 86400000);
                const isActive = ["pending", "accepted", "in_progress"].includes(item.status);
                if (isActive || isRecent) {
                  seenIds.add(item.id);
                  combinedRides.push(item);
                }
              }
            }
          } catch (e) {}
        }

        combinedRides.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        let formattedRides = combinedRides;

        // Buscar motoristas vinculados para exibir informacoes do motorista
        const driverIds = Array.from(new Set(formattedRides.map((r: any) => r.driver_id).filter(Boolean)));
        if (driverIds.length > 0) {
          const { data: driversData } = await supabase
            .from("delivery_drivers")
            .select("id, full_name, vehicle, vehicle_type, license_plate, latitude, longitude, phone")
            .in("id", driverIds);
          
          if (driversData) {
            const driverMap = new Map(driversData.map((d: any) => [d.id, d]));
            formattedRides = formattedRides.map((r: any) => ({
              ...r,
              driver: r.driver_id ? driverMap.get(r.driver_id) : null
            }));
          }
        }

        setRides(formattedRides);
        
        const active = formattedRides?.find((r: any) => r.status === "pending" || r.status === "accepted" || r.status === "in_progress");
        setActiveRide(active || null);

      } catch (err) {
        console.error("Erro ao buscar corridas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();

    const rideSub = supabase
      .channel("my_rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => {
        fetchRides();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rideSub);
    };
  }, [user]);

function CustomerRideMap({ activeRide }: { activeRide: any }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || !activeRide) return;

    let isMounted = true;
    let pollInterval: any = null;
    let locSub: any = null;

    import("maplibre-gl").then((mod: any) => {
      if (!isMounted || !mapContainerRef.current || mapRef.current) return;

      try {
        const MapLibre = mod.default || mod;
        const MapClass = MapLibre.Map || mod.Map;
        const MarkerClass = MapLibre.Marker || mod.Marker;

        if (!MapClass) return;

        let pLat = Number(activeRide?.pickup_latitude || activeRide?.pickup_lat || activeRide?.origin_lat || 0);
        let pLng = Number(activeRide?.pickup_longitude || activeRide?.pickup_lng || activeRide?.origin_lng || 0);

        let dLat = Number(activeRide?.dropoff_latitude || activeRide?.dropoff_lat || activeRide?.destination_lat || 0);
        let dLng = Number(activeRide?.dropoff_longitude || activeRide?.dropoff_lng || activeRide?.destination_lng || 0);

        const initialCenter: [number, number] = (pLat && pLng) ? [pLng, pLat] : PVA_CENTER;

        const m = new MapClass({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              "osm-tiles": {
                type: "raster",
                tiles: [
                  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
              }
            },
            layers: [
              {
                id: "osm-layer",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19
              }
            ]
          },
          center: initialCenter,
          zoom: 14,
          minZoom: 12,
          maxZoom: 18,
          maxBounds: [
            [-54.65, -15.85],
            [-53.95, -15.25]
          ],
          attributionControl: false,
        });

        mapRef.current = m;

        setTimeout(() => {
          try { m.resize(); } catch (e) {}
        }, 150);

        const isCoordInPVA = (lat: number, lng: number) => {
          return typeof lat === "number" && typeof lng === "number" &&
                 !isNaN(lat) && !isNaN(lng) &&
                 lat < -15.0 && lat > -16.0 &&
                 lng < -53.8 && lng > -54.8;
        };

        const fitMapBounds = (pickupLat: number, pickupLng: number, dropoffLat?: number, dropoffLng?: number, drvLat?: number, drvLng?: number) => {
          try {
            const bounds = new MapLibre.LngLatBounds();
            if (isCoordInPVA(pickupLat, pickupLng)) bounds.extend([pickupLng, pickupLat]);
            if (dropoffLat && dropoffLng && isCoordInPVA(dropoffLat, dropoffLng)) bounds.extend([dropoffLng, dropoffLat]);
            if (drvLat && drvLng && isCoordInPVA(drvLat, drvLng)) bounds.extend([drvLng, drvLat]);
            if (!bounds.isEmpty()) {
              m.fitBounds(bounds, { padding: 40, minZoom: 13, maxZoom: 16, duration: 600 });
            }
          } catch (e) {}
        };

        const drawRouteLine = (pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) => {
          if (!m || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng) return;

          const updateRouteSource = (geojson: any) => {
            try {
              if (m.getSource("route-source")) {
                (m.getSource("route-source") as any).setData(geojson);
              } else {
                m.addSource("route-source", {
                  type: "geojson",
                  data: geojson,
                });
                m.addLayer({
                  id: "route-layer-bg",
                  type: "line",
                  source: "route-source",
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#0f172a",
                    "line-width": 8,
                    "line-opacity": 0.5,
                  },
                });
                m.addLayer({
                  id: "route-layer",
                  type: "line",
                  source: "route-source",
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#facc15",
                    "line-width": 5.5,
                    "line-opacity": 1.0,
                  },
                });
              }
            } catch (e) {}
          };

          const initialGeojson = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [pickupLng, pickupLat],
                [dropoffLng, dropoffLat],
              ],
            },
          };
          updateRouteSource(initialGeojson);

          const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`;
          fetch(url)
            .then((res) => res.json())
            .then((data) => {
              if (data && data.routes && data.routes.length > 0) {
                const routeGeojson = {
                  type: "Feature",
                  properties: {},
                  geometry: data.routes[0].geometry,
                };
                updateRouteSource(routeGeojson);
              }
            })
            .catch(() => {});
        };

        registerMapEmojis(m);

        const cleanStreetOnly = (addr: string): string => {
          if (!addr) return "";
          let cleaned = addr
            .replace(/\s*\(.*?\)/g, "")
            .replace(/\s*-\s*Primavera do Leste.*/gi, "")
            .replace(/nº\s*\d+/gi, "")
            .replace(/,\s*\d+/gi, "")
            .trim();

          const parts = cleaned.split(",");
          if (parts.length > 0) {
            const first = parts[0].trim();
            if (first.length > 3) return first;
          }
          return cleaned;
        };

        const geocodeAddress = async (addrStr: string): Promise<[number, number] | null> => {
          if (!addrStr) return null;
          const streetName = cleanStreetOnly(addrStr);
          if (!streetName) return null;

          try {
            const q1 = `${streetName}, Primavera do Leste, MT`;
            const r1 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q1)}`);
            const d1 = await r1.json();
            if (d1 && d1.length > 0) {
              return [parseFloat(d1[0].lat), parseFloat(d1[0].lon)];
            }

            const q2 = `${streetName}, Primavera do Leste, MT, Brasil`;
            const r2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q2)}`);
            const d2 = await r2.json();
            if (d2 && d2.length > 0) {
              return [parseFloat(d2[0].lat), parseFloat(d2[0].lon)];
            }
          } catch (e) {}
          return null;
        };

        const renderRouteMarkers = (pickupLatitude: number, pickupLongitude: number, dropoffLatitude?: number, dropoffLongitude?: number) => {
          if (MarkerClass) {
            // Pin Verde para o Local de Partida (Origem / Embarque)
            try {
              if (pickupMarkerRef.current) pickupMarkerRef.current.remove();
              pickupMarkerRef.current = new MarkerClass({
                element: createPickupPinElement(),
                anchor: "bottom",
              })
                .setLngLat([pickupLongitude, pickupLatitude])
                .addTo(m);
            } catch (e) {}

            // Pin Vermelho para o Local de Destino (Desembarque)
            if (dropoffLatitude && dropoffLongitude) {
              try {
                if (dropoffMarkerRef.current) dropoffMarkerRef.current.remove();
                dropoffMarkerRef.current = new MarkerClass({
                  element: createDropoffPinElement(),
                  anchor: "bottom",
                })
                  .setLngLat([dropoffLongitude, dropoffLatitude])
                  .addTo(m);
              } catch (e) {}

              drawRouteLine(pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude);
            }
            fitMapBounds(pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude);
          }
        };

        const updateDriverMarker = (lat: number, lng: number) => {
          if (!m || !lat || !lng || !MarkerClass) return;
          try {
            if (!driverMarkerRef.current) {
              const el = createVehicleMarkerElement(activeRide?.vehicle_type || "");
              driverMarkerRef.current = new MarkerClass({ element: el, anchor: "bottom" })
                .setLngLat([lng, lat])
                .addTo(m);
            } else {
              driverMarkerRef.current.setLngLat([lng, lat]);
            }
            fitMapBounds(pLat || -15.5606, pLng || -54.3075, dLat, dLng, lat, lng);
          } catch (e) {}
        };

        const setupRouteAndMarkers = async () => {
          if (!pLat || !pLng) {
            if (activeRide?.pickup_address) {
              const coords = await geocodeAddress(activeRide.pickup_address);
              if (coords) {
                pLat = coords[0];
                pLng = coords[1];
              }
            }
          }

          if (!dLat || !dLng) {
            if (activeRide?.dropoff_address) {
              const coords = await geocodeAddress(activeRide.dropoff_address);
              if (coords) {
                dLat = coords[0];
                dLng = coords[1];
              }
            }
          }

          if (!pLat || !pLng) {
            pLat = -15.5606;
            pLng = -54.3075;
          }

          if (!dLat || !dLng) {
            dLat = pLat - 0.005;
            dLng = pLng - 0.005;
          }

          if (isMounted) {
            renderRouteMarkers(pLat, pLng, dLat, dLng);

            // Se já tiver latitude do motorista salva na corrida, posiciona imediatamente
            if (activeRide?.driver_latitude && activeRide?.driver_longitude) {
              updateDriverMarker(Number(activeRide.driver_latitude), Number(activeRide.driver_longitude));
            }

            fitMapBounds(pLat, pLng, dLat, dLng);
          }
        };

        setupRouteAndMarkers();

        // Se houver corrida/motorista, busca e sincroniza localização em tempo real no Supabase
        if (activeRide?.id || activeRide?.driver_id) {
          const fetchDriverLoc = async () => {
            try {
              // 1. Busca primeiro em ride_requests
              if (activeRide?.id) {
                const { data: rData } = await (supabase as any)
                  .from("ride_requests")
                  .select("driver_latitude, driver_longitude, driver_id")
                  .eq("id", activeRide.id)
                  .maybeSingle();
                
                if (rData?.driver_latitude && rData?.driver_longitude) {
                  updateDriverMarker(Number(rData.driver_latitude), Number(rData.driver_longitude));
                  return;
                }
              }

              // 2. Busca na tabela delivery_drivers
              const drvId = activeRide?.driver_id;
              if (drvId) {
                const { data: d1 } = await (supabase as any)
                  .from("delivery_drivers")
                  .select("latitude, longitude, current_latitude, current_longitude")
                  .or(`user_id.eq.${drvId},id.eq.${drvId}`)
                  .maybeSingle();
                if (d1) {
                  const lat = Number(d1.latitude || d1.current_latitude);
                  const lng = Number(d1.longitude || d1.current_longitude);
                  if (lat && lng && isCoordInPVA(lat, lng)) {
                    updateDriverMarker(lat, lng);
                  }
                }
              }
            } catch (e) {}
          };

          fetchDriverLoc();
          pollInterval = setInterval(fetchDriverLoc, 2000);

          try {
            const channelName = `driver_loc_${activeRide.id || activeRide.driver_id}_${Math.random().toString(36).slice(2, 8)}`;
            locSub = supabase.channel(channelName);
            locSub
              .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests", filter: `id=eq.${activeRide.id}` }, (payload: any) => {
                const newLat = Number(payload.new?.driver_latitude);
                const newLng = Number(payload.new?.driver_longitude);
                if (newLat && newLng) {
                  updateDriverMarker(newLat, newLng);
                }
              })
              .on("postgres_changes", { event: "*", schema: "public", table: "delivery_drivers" }, (payload: any) => {
                const newLat = Number(payload.new?.latitude || payload.new?.current_latitude);
                const newLng = Number(payload.new?.longitude || payload.new?.current_longitude);
                if (newLat && newLng) {
                  updateDriverMarker(newLat, newLng);
                }
              })
              .subscribe();
          } catch (e) {
            console.warn("[CustomerRideMap] Aviso ao assinar Realtime:", e);
          }
        }

      } catch (err) {
        console.warn("[CustomerRideMap] Erro ao inicializar MapLibre:", err);
      }
    });

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (locSub) {
        try { supabase.removeChannel(locSub); } catch (e) {}
      }
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [activeRide?.id, activeRide?.driver_id]);

  return (
    <div className="w-full h-[250px] bg-secondary relative" ref={mapContainerRef}>
      {!activeRide?.driver_id && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <h3 className="font-bold text-foreground">Procurando Motorista</h3>
          <p className="text-xs text-muted-foreground mt-1">Aguarde enquanto encontramos um motorista parceiro próximo a você.</p>
        </div>
      )}
    </div>
  );
}

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] py-20 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Carregando suas corridas...</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "Procurando motorista",
    accepted: "Motorista a caminho",
    in_progress: "Corrida em andamento",
    completed: "Concluída",
    cancelled: "Cancelada"
  };

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-display font-black italic tracking-tight">Suas Corridas</h1>
        <AeroSkeletonList count={2} lines={4} label="Buscando suas corridas" />
      </div>
    );
  }

  const getDriver = (ride: any) => {
    if (!ride?.driver) return null;
    return Array.isArray(ride.driver) ? ride.driver[0] : ride.driver;
  };

  const handleCancelRide = async (rideId: string) => {
    if (!confirm("Deseja realmente cancelar esta corrida?")) return;

    // 1. Atualiza imediatamente o estado local e activeRide para zerar a interface instantaneamente
    setRides(prev => prev.map(r => r.id === rideId ? { ...r, status: "cancelled" } : r));
    if (activeRide?.id === rideId) {
      setActiveRide(null);
    }

    // 2. Atualiza imediatamente o localStorage (pva_local_rides e pva_my_ride_ids)
    if (typeof window !== "undefined") {
      try {
        const localRides = JSON.parse(localStorage.getItem("pva_local_rides") || "[]");
        const updated = localRides.map((r: any) => r.id === rideId ? { ...r, status: "cancelled" } : r);
        localStorage.setItem("pva_local_rides", JSON.stringify(updated));

        // Remove dos IDs salvos de corridas ativas para zerar a contagem
        const myIds = JSON.parse(localStorage.getItem("pva_my_ride_ids") || "[]");
        const filteredIds = myIds.filter((id: string) => id !== rideId);
        localStorage.setItem("pva_my_ride_ids", JSON.stringify(filteredIds));

        window.dispatchEvent(new Event("pva_ride_updated"));
      } catch (e) {}
    }

    // 3. Tenta a atualização no Supabase com resiliência total
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", rideId);

      if (error) {
        await supabase
          .from("ride_requests")
          .update({ status: "cancelled" })
          .filter("id", "eq", rideId);
      }
      toast.success("Corrida cancelada com sucesso.");
    } catch (err: any) {
      console.warn("Aviso ao cancelar no Supabase:", err);
      toast.success("Corrida cancelada com sucesso.");
    }
  };

  const drv = getDriver(activeRide);

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-black italic tracking-tight">Suas Corridas</h1>
        <p className="text-sm text-muted-foreground">Histórico e localização em tempo real.</p>
      </div>

      {activeRide && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
            <CustomerRideMap activeRide={activeRide} />

            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                    {activeRide?.status ? statusLabels[activeRide.status] || "Em Andamento" : "Em Andamento"}
                  </span>
                  <p className="text-sm font-semibold">{activeRide.vehicle_type === "taxi" ? "Carro (Táxi)" : "Moto Táxi"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Valor Estimado</span>
                  <span className="font-bold text-lg">
                    R$ {(() => {
                      const p = Number(activeRide.price || activeRide.estimated_value || activeRide.value || 0);
                      if (p > 0) return p.toFixed(2).replace('.', ',');
                      const dist = Number(activeRide.distance_km || 0);
                      const base = activeRide.vehicle_type === "taxi" ? 9.99 : 6.99;
                      const rate = activeRide.vehicle_type === "taxi" ? 3.0 : 2.0;
                      if (dist > 0) return (base + dist * rate).toFixed(2).replace('.', ',');
                      return (activeRide.vehicle_type === "taxi" ? 15.0 : 10.0).toFixed(2).replace('.', ',');
                    })()}
                  </span>
                </div>
              </div>

              {drv && (
                <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-none mb-1">{drv?.full_name || "Motorista Parceiro"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {(() => {
                        const plate = drv?.license_plate || drv?.vehicle_plate || drv?.plate;
                        const isTaxi = activeRide?.vehicle_type === "taxi" || activeRide?.vehicle_type === "carro";
                        const vehLabel = isTaxi ? "Carro (Táxi)" : "Moto Táxi";
                        return plate && plate !== "—" ? `${vehLabel} • Placa: ${plate}` : vehLabel;
                      })()}
                    </p>
                  </div>
                  {(() => {
                    const rawPhone = drv?.phone || drv?.whatsapp || activeRide?.driver_phone || "";
                    const cleanPhone = String(rawPhone).replace(/\D/g, "");
                    const finalPhone = cleanPhone.length === 10 || cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;
                    if (!finalPhone) return null;
                    return (
                      <a
                        href={`https://wa.me/${finalPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Falar com o motorista no WhatsApp"
                        className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.337a9.957 9.957 0 0 0 4.77 1.218h.005c5.505 0 9.987-4.478 9.989-9.984 0-2.668-1.037-5.176-2.924-7.062A9.92 9.92 0 0 0 12.012 2zm5.824 14.161c-.247.695-1.226 1.326-1.996 1.492-.525.113-1.21.205-3.518-.75-2.956-1.222-4.857-4.237-5.006-4.436-.144-.199-1.202-1.603-1.202-3.057 0-1.454.764-2.17 1.036-2.467.272-.298.594-.372.793-.372.198 0 .396.002.569.01.184.008.432-.07.676.516.248.594.842 2.057.917 2.206.074.149.123.322.025.521-.099.198-.148.322-.297.495-.149.174-.313.388-.446.522-.149.149-.305.312-.132.61.174.298.773 1.275 1.658 2.064 1.138 1.014 2.099 1.328 2.396 1.477.297.149.471.124.645-.075.173-.198.743-.867.941-1.164.198-.298.396-.248.669-.149.273.099 1.733.818 2.031.967.297.149.495.223.569.347.074.124.074.72-.173 1.415z"/>
                        </svg>
                      </a>
                    );
                  })()}
                </div>
              )}

              <div className="relative pl-6 space-y-4 my-2 border-l-2 border-dashed border-border ml-3">
                {/* Embarque (Origem) */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 flex items-center justify-center shadow-xs" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                      Embarque (Origem)
                    </span>
                    <span className="text-xs font-semibold text-foreground leading-tight mt-0.5">
                      {activeRide.pickup_address}
                    </span>
                  </div>
                </div>

                {/* Desembarque (Destino) */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-500/20 flex items-center justify-center shadow-xs" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                      Desembarque (Destino)
                    </span>
                    <span className="text-xs font-semibold text-foreground leading-tight mt-0.5">
                      {activeRide.dropoff_address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Cancelar Corrida Ativa */}
              {["pending", "accepted"].includes(activeRide.status) && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleCancelRide(activeRide.id)}
                  className="w-full h-11 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold transition-all mt-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Corrida
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Corridas Adicionais (Apenas se houver mais de uma corrida ativa) */}
      {(() => {
        const secondaryActiveRides = rides.filter(r => r.id !== activeRide?.id && ["pending", "accepted", "in_progress"].includes(r.status));
        
        if (!activeRide && secondaryActiveRides.length === 0) {
          return (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg">Corridas Ativas</h2>
                <Button size="sm" onClick={() => navigate({ to: "/marketplace/taxi" })}>
                  Nova Corrida
                </Button>
              </div>
              <div className="text-center py-10 bg-card rounded-2xl border border-border">
                <Car className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
                <p className="font-bold text-foreground">Nenhuma corrida em andamento</p>
                <p className="text-muted-foreground text-xs mt-1">Para consultar corridas anteriores, acesse a aba Perfil.</p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button size="sm" onClick={() => navigate({ to: "/marketplace/taxi" })}>
                    Solicitar Agora
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/marketplace/profile" })}>
                    Ver Histórico no Perfil
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        if (activeRide || secondaryActiveRides.length === 0) {
          return (
            <div className="flex items-center justify-end mt-2">
              <Button size="sm" onClick={() => navigate({ to: "/marketplace/taxi" })}>
                Nova Corrida
              </Button>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Outras Corridas Ativas</h2>
              <Button size="sm" onClick={() => navigate({ to: "/marketplace/taxi" })}>
                Nova Corrida
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {secondaryActiveRides.map((ride) => {
                const dateStr = ride.created_at ? new Date(ride.created_at).toLocaleDateString('pt-BR') : '';
                const itemPrice = Number(ride.price || ride.estimated_value || ride.value || (ride.vehicle_type === "taxi" ? 15.0 : 10.0));
                return (
                  <div key={ride.id} className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5 hover:border-primary/40 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {ride.vehicle_type === "taxi" ? <Car className="w-4 h-4 text-primary" /> : <Bike className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-foreground block">
                            {ride.vehicle_type === "taxi" ? "Táxi (Carro)" : "Moto Táxi"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        ride.status === "accepted" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                        ride.status === "in_progress" ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" :
                        "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                      }`}>
                        {ride.status ? (statusLabels[ride.status] || ride.status) : ""}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-muted-foreground truncate">{ride.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-muted-foreground truncate">{ride.dropoff_address}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">Valor Total</span>
                        <span className="font-bold text-base text-foreground">R$ {itemPrice.toFixed(2).replace('.', ',')}</span>
                      </div>

                      {["pending", "accepted"].includes(ride.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => handleCancelRide(ride.id)}
                          className="h-8 px-3 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-bold text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

