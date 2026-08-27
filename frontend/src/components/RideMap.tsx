import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import { useAppStore } from "../store/useAppStore";
import { Crosshair } from "lucide-react";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ============================================================
// CUSTOM HTML / SVG ICONS (NO BROKEN ASSETS / VITE SAFE)
// ============================================================

const createCurrentLocationIcon = () =>
  L.divIcon({
    className: "custom-current-location-marker",
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; inset: -6px; background: rgba(59, 130, 246, 0.35); border-radius: 9999px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 0; background: #2563eb; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });

const createPickupIcon = () =>
  L.divIcon({
    className: "custom-pickup-marker",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #10b981; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 4px 12px rgba(16,185,129,0.45); color: white; font-weight: bold; font-size: 15px;">
        📍
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });

const createDestinationIcon = () =>
  L.divIcon({
    className: "custom-destination-marker",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #ef4444; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 4px 12px rgba(239,68,68,0.45); color: white; font-weight: bold; font-size: 15px;">
        🏁
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });

type Coordinate = [number, number];

// Default active city coordinate (Hyderabad city center)
const DEFAULT_CENTER: Coordinate = [17.385, 78.4867];

// ============================================================
// MAP RESIZER (FIXES BLANK / GREY TILES IN DYNAMIC HEIGHT)
// ============================================================

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const triggerResize = () => {
      try {
        map.invalidateSize({ pan: false });
      } catch {}
    };

    triggerResize();
    const t1 = setTimeout(triggerResize, 80);
    const t2 = setTimeout(triggerResize, 300);
    const t3 = setTimeout(triggerResize, 800);
    const t4 = setTimeout(triggerResize, 1500);

    window.addEventListener("resize", triggerResize);
    window.addEventListener("orientationchange", triggerResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener("resize", triggerResize);
      window.removeEventListener("orientationchange", triggerResize);
    };
  }, [map]);

  return null;
}

// ============================================================
// LOCATION TRACKER & RE-CENTER CONTROLLER
// ============================================================

function LocationTracker({
  onCenterReady,
}: {
  onCenterReady?: (centerFn: () => void) => void;
}) {
  const [position, setPosition] = useState<Coordinate | null>(null);
  const map = useMap();
  const { setCurrentLocation, route } = useAppStore();
  const hasCenteredRef = useRef(false);

  const centerOnUser = useCallback(() => {
    if (position) {
      map.flyTo(position, 16, { animate: true, duration: 1.2 });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (loc) => {
          const coords: Coordinate = [loc.coords.latitude, loc.coords.longitude];
          setPosition(coords);
          setCurrentLocation(coords);
          map.flyTo(coords, 16, { animate: true, duration: 1.2 });
        },
        () => {
          map.flyTo(DEFAULT_CENTER, 14, { animate: true, duration: 1.2 });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [map, position, setCurrentLocation]);

  useEffect(() => {
    if (onCenterReady) {
      onCenterReady(centerOnUser);
    }
  }, [onCenterReady, centerOnUser]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    // 1. Fast immediate fetch
    navigator.geolocation.getCurrentPosition(
      (location) => {
        const newPosition: Coordinate = [
          location.coords.latitude,
          location.coords.longitude,
        ];
        setPosition(newPosition);
        setCurrentLocation(newPosition);

        if (!hasCenteredRef.current && (!route || route.length === 0)) {
          hasCenteredRef.current = true;
          map.flyTo(newPosition, 15, { animate: true, duration: 1 });
        }
      },
      () => {
        // If denied/unavailable, fallback to default center
        if (!hasCenteredRef.current && (!route || route.length === 0)) {
          hasCenteredRef.current = true;
          map.flyTo(DEFAULT_CENTER, 13, { animate: false });
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );

    // 2. Continuous watch
    const watchId = navigator.geolocation.watchPosition(
      (location) => {
        const newPosition: Coordinate = [
          location.coords.latitude,
          location.coords.longitude,
        ];
        setPosition(newPosition);
        setCurrentLocation(newPosition);
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map, setCurrentLocation, route]);

  if (!position) return null;

  return (
    <Marker position={position} icon={createCurrentLocationIcon()}>
      <Popup>
        <div className="text-xs font-bold text-slate-800 p-1">
          📍 You are here
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================================
// ROUTE FITTER
// ============================================================

function RouteFitter() {
  const map = useMap();
  const { route } = useAppStore();

  useEffect(() => {
    if (!route || route.length < 2) return;
    try {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, {
        padding: [50, 50],
        animate: true,
        duration: 1.2,
      });
    } catch {}
  }, [route, map]);

  return null;
}

// ============================================================
// FLY TO LOCATION
// ============================================================

function FlyToLocation({ position }: { position: Coordinate }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, 16, { animate: true, duration: 1.2 });
  }, [map, position]);

  return null;
}

// ============================================================
// DESTINATION MARKER
// ============================================================

function DestinationMarker({
  position,
  draggable,
  onMove,
}: {
  position: Coordinate;
  draggable: boolean;
  onMove?: (position: Coordinate) => void;
}) {
  return (
    <Marker
      position={position}
      draggable={draggable}
      icon={createDestinationIcon()}
      eventHandlers={
        draggable && onMove
          ? {
              dragend: (event) => {
                const marker = event.target;
                const newPosition = marker.getLatLng();
                onMove([newPosition.lat, newPosition.lng]);
              },
            }
          : undefined
      }
    >
      <Popup>
        <div className="text-xs font-bold text-slate-800 p-1">
          {draggable ? "Drag to set destination 🏁" : "Destination 🏁"}
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================================
// MAIN RIDE MAP COMPONENT
// ============================================================

export default function RideMap() {
  const {
    route,
    pickupLocation,
    destinationLocation,
    setDestinationLocation,
  } = useAppStore();

  const [centerHandler, setCenterHandler] = useState<(() => void) | null>(null);

  const startPosition: Coordinate =
    destinationLocation ?? pickupLocation ?? DEFAULT_CENTER;

  const hasRoute = !!route && route.length >= 2;
  const initialZoom = pickupLocation || destinationLocation ? 14 : 13;

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-slate-100">
      <MapContainer
        center={startPosition}
        zoom={initialZoom}
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
        zoomControl={false}
        className="h-full w-full z-0"
        style={{ height: "100%", width: "100%", minHeight: "100%" }}
      >
        {/* Automatic resize invalidator */}
        <MapResizer />

        {/* Clean OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Current GPS Location */}
        <LocationTracker onCenterReady={(fn) => setCenterHandler(() => fn)} />

        {/* Fit Bounds to Active Route */}
        {hasRoute && <RouteFitter />}

        {/* Focus Pickup */}
        {pickupLocation && !hasRoute && (
          <FlyToLocation position={pickupLocation} />
        )}

        {/* Focus Destination */}
        {destinationLocation && !hasRoute && (
          <FlyToLocation position={destinationLocation} />
        )}

        {/* Pickup Marker */}
        {pickupLocation && (
          <Marker position={pickupLocation} icon={createPickupIcon()}>
            <Popup>
              <div className="text-xs font-bold text-slate-800 p-1">
                Pickup Location 📍
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationLocation && (
          <DestinationMarker
            position={destinationLocation}
            draggable={!hasRoute}
            onMove={(position) => setDestinationLocation(position)}
          />
        )}

        {/* Render Route Polyline */}
        {hasRoute && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>

      {/* Re-center / Locate Me Button */}
      {centerHandler && (
        <button
          type="button"
          onClick={() => centerHandler()}
          aria-label="Center on my location"
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-blue-600 active:scale-95"
        >
          <Crosshair size={20} />
        </button>
      )}
    </div>
  );
}