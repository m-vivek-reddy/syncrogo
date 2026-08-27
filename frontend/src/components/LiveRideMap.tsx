import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createMarkerIcon = (emoji: string, color: string) =>
  L.divIcon({
    className: 'custom-live-marker',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: ${color}; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 14px;">
        ${emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const trigger = () => {
      try {
        map.invalidateSize();
      } catch {}
    };
    trigger();
    const t1 = setTimeout(trigger, 100);
    const t2 = setTimeout(trigger, 400);
    window.addEventListener('resize', trigger);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', trigger);
    };
  }, [map]);
  return null;
}

function BoundsFitter({
  pickup,
  dropoff,
}: {
  pickup?: [number, number];
  dropoff?: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (pickup && dropoff) {
      try {
        const bounds = L.latLngBounds([pickup, dropoff]);
        map.fitBounds(bounds, { padding: [40, 40], animate: true });
      } catch {}
    } else if (pickup) {
      map.flyTo(pickup, 14);
    } else if (dropoff) {
      map.flyTo(dropoff, 14);
    }
  }, [map, pickup, dropoff]);

  return null;
}

interface MapProps {
  pickupLat?: number;
  pickupLon?: number;
  dropoffLat?: number;
  dropoffLon?: number;
}

export default function LiveRideMap({ pickupLat, pickupLon, dropoffLat, dropoffLon }: MapProps) {
  const hasPickup = typeof pickupLat === 'number' && typeof pickupLon === 'number';
  const hasDropoff = typeof dropoffLat === 'number' && typeof dropoffLon === 'number';

  const pickupCoord: [number, number] | undefined = hasPickup
    ? [pickupLat!, pickupLon!]
    : undefined;
  const dropoffCoord: [number, number] | undefined = hasDropoff
    ? [dropoffLat!, dropoffLon!]
    : undefined;

  const centerLat =
    hasPickup && hasDropoff
      ? (pickupLat! + dropoffLat!) / 2
      : hasPickup
      ? pickupLat!
      : hasDropoff
      ? dropoffLat!
      : 17.385;
  const centerLon =
    hasPickup && hasDropoff
      ? (pickupLon! + dropoffLon!) / 2
      : hasPickup
      ? pickupLon!
      : hasDropoff
      ? dropoffLon!
      : 78.4867;

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-sm border border-slate-200 z-0 bg-slate-100">
      <MapContainer center={[centerLat, centerLon]} zoom={13} style={{ height: '100%', width: '100%' }} className="h-full w-full z-0">
        <MapResizer />
        <BoundsFitter pickup={pickupCoord} dropoff={dropoffCoord} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {pickupCoord && (
          <Marker position={pickupCoord} icon={createMarkerIcon('📍', '#10b981')}>
            <Popup>
              <div className="text-xs font-bold">Pickup Location 📍</div>
            </Popup>
          </Marker>
        )}

        {dropoffCoord && (
          <Marker position={dropoffCoord} icon={createMarkerIcon('🏁', '#ef4444')}>
            <Popup>
              <div className="text-xs font-bold">Dropoff Location 🏁</div>
            </Popup>
          </Marker>
        )}

        {pickupCoord && dropoffCoord && (
          <Polyline
            positions={[pickupCoord, dropoffCoord]}
            pathOptions={{
              color: '#2563eb',
              weight: 4,
              opacity: 0.8,
              dashArray: '6, 8',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
