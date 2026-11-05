import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import type { Ride } from '../../types';

interface InteractiveRouteMapProps {
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
  rides?: Ride[];
  pickup?: { lat: number; lon: number; label?: string };
  dropoff?: { lat: number; lon: number; label?: string };
  selectedRide?: Ride | null;
  onSelectRide?: (ride: Ride) => void;
  onMapClick?: (point: { lat: number; lon: number }) => void;
  onRouteDistance?: (distanceKm: number) => void;
  onLocate?: () => void;
  locating?: boolean;
  selectionLabel?: string;
  vehicleType?: string;
  className?: string;
}

const estimateRoadDistanceKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.max(0.1, 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 1.25);
};
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[char]);

export const InteractiveRouteMap: React.FC<InteractiveRouteMapProps> = ({
  centerLat = 17.4435, // Hyderabad default
  centerLon = 78.3772,
  zoom = 12,
  rides = [],
  pickup,
  dropoff,
  selectedRide,
  onSelectRide,
  onMapClick,
  onRouteDistance,
  onLocate,
  locating = false,
  selectionLabel,
  vehicleType = 'car',
  className = "h-[450px] w-full rounded-3xl",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onRouteDistanceRef = useRef(onRouteDistance);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onRouteDistanceRef.current = onRouteDistance;
  }, [onRouteDistance]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    if (onMapClickRef.current) {
      map.on('click', (event: L.LeafletMouseEvent) => {
        onMapClickRef.current?.({ lat: event.latlng.lat, lon: event.latlng.lng });
      });
    }
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && (centerLat !== undefined && centerLon !== undefined)) {
      mapInstanceRef.current.setView([centerLat, centerLon], zoom);
    }
  }, [centerLat, centerLon, zoom]);

  // Update Markers and Route Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const bounds = L.latLngBounds([]);
    let routeRequestCancelled = false;

    const drawRoadRoute = async () => {
      if (!pickup || !dropoff || !pickup.lat || !pickup.lon || !dropoff.lat || !dropoff.lon) return;
      const profiles = vehicleType === 'bike' ? ['bike', 'driving'] : ['driving'];
      for (const profile of profiles) {
        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${pickup.lon},${pickup.lat};${dropoff.lon},${dropoff.lat}?overview=full&geometries=geojson`);
          if (!response.ok) continue;
          const result = await response.json();
          const route = result.routes?.[0];
          if (!route || routeRequestCancelled) continue;
          const roadPoints = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
          routeLineRef.current = L.polyline(roadPoints, { color: '#2563EB', weight: 5, opacity: 0.9 }).addTo(map);
          onRouteDistanceRef.current?.(route.distance / 1000);
          roadPoints.forEach((point: [number, number]) => bounds.extend(point));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
          return;
        } catch {
          // Try the driving route for bikes when the public bike router is unavailable.
        }
      }
      if (!routeRequestCancelled) {
        routeLineRef.current = L.polyline([[pickup.lat, pickup.lon], [dropoff.lat, dropoff.lon]], { color: '#2563EB', weight: 5, opacity: 0.75, dashArray: '7 7' }).addTo(map);
        onRouteDistanceRef.current?.(Number(estimateRoadDistanceKm(pickup, dropoff).toFixed(2)));
      }
    };

    // Pickup Marker
    if (pickup && pickup.lat && pickup.lon) {
      const pickupIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background-color:#2563EB; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const pMarker = L.marker([pickup.lat, pickup.lon], { icon: pickupIcon })
        .bindPopup(`<strong>Pickup:</strong><br/>${escapeHtml(pickup.label || 'Your Location')}`);
      markersLayer.addLayer(pMarker);
      bounds.extend([pickup.lat, pickup.lon]);
    }

    // Dropoff Marker
    if (dropoff && dropoff.lat && dropoff.lon) {
      const dropoffIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background-color:#16A34A; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const dMarker = L.marker([dropoff.lat, dropoff.lon], { icon: dropoffIcon })
        .bindPopup(`<strong>Destination:</strong><br/>${escapeHtml(dropoff.label || 'Dropoff Point')}`);
      markersLayer.addLayer(dMarker);
      bounds.extend([dropoff.lat, dropoff.lon]);

      if (pickup && pickup.lat && pickup.lon) {
        void drawRoadRoute();
      }
    }

    // Real rides returned by the backend only (no fake cars)
    rides.forEach((ride) => {
      if (!ride.pickup_lat || !ride.pickup_lon) return;

      const isSelected = selectedRide?.id === ride.id;
      const isCar = ride.vehicle_type === 'car';

      const rideIcon = L.divIcon({
        className: 'custom-ride-pin',
        html: `
          <div style="
            background: ${isSelected ? '#0F766E' : '#1E293B'};
            color: white;
            padding: 4px 8px;
            border-radius: 9999px;
            border: 2px solid ${isSelected ? '#2DD4BF' : '#94A3B8'};
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            white-space: nowrap;
          ">
            <span>${isCar ? '🚗' : '🏍️'}</span>
            <span>₹${escapeHtml(ride.price_per_seat)}</span>
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 13],
      });

      const marker = L.marker([ride.pickup_lat, ride.pickup_lon], { icon: rideIcon });
      marker.on('click', () => {
        if (onSelectRide) onSelectRide(ride);
      });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong>${escapeHtml(ride.driver_name)}</strong> (${escapeHtml(ride.vehicle_type?.toUpperCase())})<br/>
          <span>${escapeHtml(ride.pickup_location)} → ${escapeHtml(ride.dropoff_location)}</span><br/>
          <span style="color: #0D9488; font-weight: bold;">₹${escapeHtml(ride.price_per_seat)}</span> • ${escapeHtml(ride.available_seats)} seats left
        </div>
      `);
      markersLayer.addLayer(marker);
      bounds.extend([ride.pickup_lat, ride.pickup_lon]);
    });

    if (bounds.isValid() && (pickup || rides.length > 0)) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      routeRequestCancelled = true;
    };
  }, [rides, pickup, dropoff, selectedRide, vehicleType]);

  return (
    <div className="relative overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className={className} />

      {/* Live Routing Indicator Tag */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
        <span>{selectionLabel || 'Road route preview'}</span>
      </div>
      {onLocate && <button type="button" onClick={onLocate} disabled={locating} aria-label="Use my current location" className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-lg hover:bg-blue-50 disabled:opacity-60">
        <Crosshair size={19} className={locating ? 'animate-pulse' : ''} />
      </button>}
    </div>
  );
};
