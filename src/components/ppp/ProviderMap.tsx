import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { PVA_CENTER, type Business } from "@/lib/ppp";

/**
 * Mapa interativo do PPP com marcadores dos prestadores geolocalizados.
 * Clique no marcador abre o card completo (pop-up) do prestador.
 */
export function ProviderMap({
  businesses,
  onSelect,
}: {
  businesses: Business[];
  onSelect: (b: Business) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;
    let cancelled = false;

    void import("maplibre-gl").then((mod: any) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const MapClass = mod.default?.Map || mod.Map;
      if (!MapClass) return;

      mapRef.current = new MapClass({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
            },
          },
          layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 19 }],
        },
        center: PVA_CENTER,
        zoom: 12.5,
        attributionControl: false,
      });

      setTimeout(() => {
        try {
          mapRef.current?.resize();
        } catch {}
      }, 150);
    });

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pins = businesses.filter(
      (b) => Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude)) && Number(b.latitude) !== 0,
    );

    void import("maplibre-gl").then((mod: any) => {
      const MarkerClass = mod.default?.Marker || mod.Marker;
      const map = mapRef.current;
      if (cancelled || !map || !MarkerClass) return;

      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch {}
      });
      markersRef.current = [];

      pins.forEach((b) => {
        const el = document.createElement("div");
        el.style.cssText = "width:34px;height:44px;cursor:pointer;transform:translateY(0);";
        el.innerHTML = `
          <svg width="34" height="44" viewBox="0 0 24 32" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">
            <path d="M12 0C5.9 0 1 4.9 1 11c0 8.2 11 21 11 21s11-12.8 11-21c0-6.1-4.9-11-11-11z" fill="#F5C518"/>
            <circle cx="12" cy="11" r="4.4" fill="#111"/>
          </svg>`;
        el.title = b.name;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectRef.current(b);
        });

        const marker = new MarkerClass({ element: el, anchor: "bottom" })
          .setLngLat([Number(b.longitude), Number(b.latitude)])
          .addTo(map);
        markersRef.current.push(marker);
      });

      if (pins.length > 1) {
        try {
          const LngLatBounds = mod.default?.LngLatBounds || mod.LngLatBounds;
          const bounds = new LngLatBounds();
          pins.forEach((b) => bounds.extend([Number(b.longitude), Number(b.latitude)]));
          map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 400 });
        } catch {}
      } else if (pins.length === 1) {
        try {
          map.easeTo({ center: [Number(pins[0].longitude), Number(pins[0].latitude)], zoom: 14 });
        } catch {}
      }
    });

    return () => {
      cancelled = true;
    };
  }, [businesses]);

  const geoCount = businesses.filter((b) => Number(b.latitude) && Number(b.longitude)).length;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border">
      <div ref={containerRef} className="w-full h-[260px] bg-muted" />
      {geoCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px] px-6 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed">
            Nenhum prestador com localização cadastrada ainda. Cadastre a localização para aparecer no mapa.
          </p>
        </div>
      )}
    </div>
  );
}
