import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { useAppStore } from '../store/useAppStore';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// 1. Tracks the user's initial GPS location
function LocationTracker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap(); 
  const { setCurrentLocation, route } = useAppStore();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      const loc: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(loc);
      setCurrentLocation(loc);
      
      if (!route) {
        map.flyTo(e.latlng, 15, { animate: true, duration: 1.5 });
      }
    });
  }, [map, setCurrentLocation, route]);

  if (position === null) return null;

  return (
    <Marker position={position}>
      <Popup className="font-sans font-bold text-syncro-blue">
        You are here! 📍
      </Popup>
    </Marker>
  );
}

// 🎥 2. NEW: The "Camera Operator" that automatically fits the route on screen
function RouteFitter() {
  const map = useMap();
  const { route } = useAppStore();

  useEffect(() => {
    if (route && route.length > 0) {
      // Create a boundary box around all the coordinates in the route
      const bounds = L.latLngBounds(route);
      // Tell the map to zoom out/in to fit that box, with a little padding around the edges
      map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 1.5 });
    }
  }, [route, map]);

  return null;
}

function FlyToLocation({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { animate: true, duration: 1.5 });
    }
  }, [map, position]);

  return null;
}

export default function RideMap() {
  const { route, pickupLocation, destinationLocation, setDestinationLocation } = useAppStore(); 
  const defaultLocation: [number, number] = [20.5937, 78.9629]; 
  const startPosition = destinationLocation ?? pickupLocation ?? defaultLocation;

  return (
    <div className="w-full h-64 rounded-3xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
      <MapContainer 
        center={startPosition} 
        zoom={destinationLocation || pickupLocation ? 13 : 5} 
        scrollWheelZoom={true} /* 🖱️ ENABLED: Mouse wheel and pinch zooming! */
        /* 📱 Mobile Gestures Enabled! */
        touchZoom={true}        // Enables the two-finger pinch to zoom in/out
        doubleClickZoom={true}  // Enables double-tap to zoom in
        dragging={true}         // Enables one-finger panning/dragging around the map
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationTracker />
        <RouteFitter /> {/* 🎥 Mount the Camera Operator */}

        {pickupLocation && !route && <FlyToLocation position={pickupLocation} />}
        {destinationLocation && !route && <FlyToLocation position={destinationLocation} />}

        {/* 📍 DRAGGABLE DESTINATION PIN */}
        {destinationLocation && !route && (
          <Marker 
            draggable={true}
            position={destinationLocation}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                setDestinationLocation([position.lat, position.lng]);
              }
            }}
          >
            <Popup className="font-sans font-bold text-syncro-green">
              Drag me to exact drop-off!
            </Popup>
          </Marker>
        )}

        {/* 🛣️ THE ROUTE LINE */}
        {route && (
          <Polyline 
            positions={route} 
            color="#2563eb" 
            weight={5} 
            opacity={0.8} 
            dashArray="10, 10" 
          />
        )}
      </MapContainer>
    </div>
  );
}