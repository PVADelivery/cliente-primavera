import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Car, Bike, MapPin, Loader2, ArrowLeft, Navigation, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/marketplace/rides")({
  head: () => ({ meta: [{ title: "Corridas — Primavera Delivery" }] }),
  component: RidesPage,
});

const PVA_CENTER: [number, number] = [-54.3075, -15.5606];

function RidesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRide, setActiveRide] = useState<any | null>(null);
  
  // MapLibre state
  const [MapLibre, setMapLibre] = useState<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  // Load MapLibre
  useEffect(() => {
    if (window.maplibregl) {
      setMapLibre(window.maplibregl);
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@3.3.1/dist/maplibre-gl.js";
      script.async = true;
      script.onload = () => {
        if (window.maplibregl) setMapLibre(window.maplibregl);
      };
      document.head.appendChild(script);

      const link = document.createElement("link");
      link.href = "https://unpkg.com/maplibre-gl@3.3.1/dist/maplibre-gl.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  // Fetch Rides
  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const fetchRides = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ride_requests")
          .select("*, driver:delivery_drivers(id, full_name, vehicle, vehicle_type, license_plate, latitude, longitude)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRides(data || []);
        
        const active = data?.find(r => r.status === "pending" || r.status === "accepted" || r.status === "in_progress");
        if (active) setActiveRide(active);

      } catch (err) {
        console.error("Erro ao buscar corridas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();

    // Subscribe to ride_requests changes
    const rideSub = supabase
      .channel("my_rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests", filter: `user_id=eq.${user.id}` }, () => {
        fetchRides();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rideSub);
    };
  }, [user]);

  // Init Map when we have active ride
  useEffect(() => {
    if (!MapLibre || !mapContainer.current || !activeRide) return;
    if (mapRef.current) return; // already init

    mapRef.current = new MapLibre.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: PVA_CENTER,
      zoom: 14,
      attributionControl: false,
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [MapLibre, activeRide]);

  // Handle Driver Location Updates
  useEffect(() => {
    if (!activeRide?.driver_id || !mapRef.current || !MapLibre) return;

    // Set initial driver position
    const drv = activeRide.driver;
    if (drv?.latitude && drv?.longitude) {
      if (!driverMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary overflow-hidden";
        el.innerHTML = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 8-4 4 4 4"/><path d="M16 12H8"/></svg></div>`;
        
        driverMarkerRef.current = new MapLibre.Marker({ element: el })
          .setLngLat([drv.longitude, drv.latitude])
          .addTo(mapRef.current);
          
        mapRef.current.flyTo({ center: [drv.longitude, drv.latitude], zoom: 15 });
      }
    }

    const locSub = supabase
      .channel(`driver_loc_${activeRide.driver_id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_drivers", filter: `id=eq.${activeRide.driver_id}` }, (payload) => {
        const newLat = payload.new.latitude;
        const newLng = payload.new.longitude;
        if (newLat && newLng && driverMarkerRef.current) {
          driverMarkerRef.current.setLngLat([newLng, newLat]);
          mapRef.current?.flyTo({ center: [newLng, newLat] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locSub);
    };
  }, [activeRide?.driver_id, MapLibre]);

  const statusLabels: Record<string, string> = {
    pending: "Procurando motorista",
    accepted: "Motorista a caminho",
    in_progress: "Corrida em andamento",
    completed: "Concluída",
    cancelled: "Cancelada"
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] py-20 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Buscando suas corridas...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-black tracking-tight">Suas Corridas</h1>
        <p className="text-sm text-muted-foreground">Histórico e localização em tempo real.</p>
      </div>

      {activeRide && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
            {/* Map Area */}
            <div className="w-full h-[250px] bg-secondary relative" ref={mapContainer}>
              {!activeRide.driver_id && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground">Procurando Motorista</h3>
                  <p className="text-xs text-muted-foreground mt-1">Aguarde enquanto encontramos um motorista parceiro próximo a você.</p>
                </div>
              )}
            </div>

            {/* Ride Details */}
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                    {statusLabels[activeRide.status] || "Em Andamento"}
                  </span>
                  <p className="text-sm font-semibold">{activeRide.vehicle_type === "taxi" ? "Carro (Táxi)" : "Moto Táxi"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Valor Estimado</span>
                  <span className="font-bold text-lg">R$ {Number(activeRide.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {activeRide.driver && (
                <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-none mb-1">{activeRide.driver.full_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{activeRide.driver.vehicle} • {activeRide.driver.license_plate}</p>
                  </div>
                  <a href={`tel:${activeRide.driver.phone || ""}`} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    📞
                  </a>
                </div>
              )}

              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-background bg-emerald-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-3 md:ml-0">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Origem</span>
                      <span className="text-xs truncate">{activeRide.pickup_address}</span>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-background bg-rose-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" />
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-3 md:ml-0">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Destino</span>
                      <span className="text-xs truncate">{activeRide.dropoff_address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="flex flex-col gap-3 mt-4">
        <h2 className="font-display font-bold text-lg">Histórico de Corridas</h2>
        {rides.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-2xl border border-border">
            <Car className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground text-sm">Você ainda não solicitou nenhuma corrida.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/marketplace/taxi" })}>
              Solicitar Agora
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rides.filter(r => r.id !== activeRide?.id).map((ride) => (
              <div key={ride.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ride.vehicle_type === "taxi" ? <Car className="w-4 h-4 text-primary" /> : <Bike className="w-4 h-4 text-primary" />}
                    <span className="font-bold text-sm">{ride.vehicle_type === "taxi" ? "Táxi" : "Moto"}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    ride.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                    ride.status === "cancelled" ? "bg-rose-100 text-rose-800" : "bg-secondary text-foreground"
                  }`}>
                    {statusLabels[ride.status] || ride.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{ride.pickup_address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{ride.dropoff_address}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-border">
                  <span className="text-xs font-medium">{new Date(ride.created_at).toLocaleDateString('pt-BR')}</span>
                  <span className="font-bold text-sm">R$ {Number(ride.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
