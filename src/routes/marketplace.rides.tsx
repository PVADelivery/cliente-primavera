import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Car, Bike, MapPin, Loader2, ArrowLeft, Navigation, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

import { RequireAuth } from "@/components/marketplace/RequireAuth";

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
  
  const [MapLibre, setMapLibre] = useState<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;
    import("maplibre-gl").then((mod) => {
      if (isMounted) {
        setMapLibre(mod.default || mod);
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      try {
        let savedIds: string[] = [];
        let savedEmail = user?.email || "";
        if (typeof window !== "undefined") {
          try {
            savedIds = JSON.parse(localStorage.getItem("pva_my_ride_ids") || "[]");
            if (!savedEmail) {
              savedEmail = localStorage.getItem("pva_user_email") || "";
            }
          } catch (e) {}
        }

        const queryPromises: Promise<any>[] = [];

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

        // 2. Busca por IDs salvos no navegador local (funciona anonimo ou autenticado)
        if (savedIds.length > 0) {
          queryPromises.push(
            supabase
              .from("ride_requests")
              .select("*")
              .in("id", savedIds)
              .order("created_at", { ascending: false })
          );
        }

        // 3. Busca por customer_name (e-mail do cliente)
        if (savedEmail) {
          queryPromises.push(
            supabase
              .from("ride_requests")
              .select("*")
              .ilike("customer_name", `%${savedEmail}%`)
              .order("created_at", { ascending: false })
          );
        }

        // 4. Fallback universal se nao houver ID nem email: busca as ultimas corridas
        if (queryPromises.length === 0) {
          queryPromises.push(
            supabase
              .from("ride_requests")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(5)
          );
        }

        const results = await Promise.all(queryPromises);
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

        // 5. Se nenhuma corrida foi encontrada ainda (ex: criacao recente sem match de email/id), buscar todas as corridas ativas
        if (combinedRides.length === 0) {
          const { data: activeFallback } = await supabase
            .from("ride_requests")
            .select("*")
            .in("status", ["pending", "accepted", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(10);

          if (activeFallback) {
            for (const item of activeFallback) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                combinedRides.push(item);
              }
            }
          }
        }

        // Ordenar do mais recente para o mais antigo
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
        if (active) setActiveRide(active);

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

  useEffect(() => {
    if (!MapLibre || !mapContainer.current || !activeRide) return;
    if (mapRef.current) return;

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

  useEffect(() => {
    if (!activeRide?.driver_id || !mapRef.current || !MapLibre) return;

    const rawDrv = activeRide.driver;
    const drv = Array.isArray(rawDrv) ? rawDrv[0] : rawDrv;

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
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] py-20 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Buscando suas corridas...</p>
      </div>
    );
  }

  const getDriver = (ride: any) => {
    if (!ride?.driver) return null;
    return Array.isArray(ride.driver) ? ride.driver[0] : ride.driver;
  };

  const drv = getDriver(activeRide);

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-black tracking-tight">Suas Corridas</h1>
        <p className="text-sm text-muted-foreground">Histórico e localização em tempo real.</p>
      </div>

      {activeRide && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
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
                  <span className="font-bold text-lg">R$ {Number(activeRide.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {drv && (
                <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-none mb-1">{drv?.full_name || "Motorista"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{drv?.vehicle} • {drv?.license_plate}</p>
                  </div>
                  <a href={`tel:${drv?.phone || ""}`} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
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

      <div className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Histórico de Corridas</h2>
          <Button size="sm" onClick={() => navigate({ to: "/marketplace/taxi" })}>
            Nova Corrida
          </Button>
        </div>
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
            {rides.filter(r => r.id !== activeRide?.id).map((ride) => {
              const dateStr = ride.created_at ? new Date(ride.created_at).toLocaleDateString('pt-BR') : '';
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
                      ride.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                      ride.status === "cancelled" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : 
                      ride.status === "pending" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-primary/10 text-primary border border-primary/20"
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
                    <span className="text-xs text-muted-foreground font-medium">Valor Total</span>
                    <span className="font-bold text-base text-foreground">R$ {Number(ride.price || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

