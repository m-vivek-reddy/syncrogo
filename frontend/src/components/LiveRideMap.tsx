import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix missing default marker icon issue in Leaflet + Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// @ts-ignore
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  pickupLat?: number;
  pickupLon?: number;
  dropoffLat?: number;
  dropoffLon?: number;
}

export default function LiveRideMap({ pickupLat, pickupLon, dropoffLat, dropoffLon }: MapProps) {
  const centerLat = pickupLat && dropoffLat ? (pickupLat + dropoffLat) / 2 : 17.3850;
  const centerLon = pickupLon && dropoffLon ? (pickupLon + dropoffLon) / 2 : 78.4867;

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden shadow-sm border border-gray-100 z-0">
      <MapContainer center={[centerLat, centerLon]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickupLat && pickupLon && (
          <Marker position={[pickupLat, pickupLon]}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}
        {dropoffLat && dropoffLon && (
          <Marker position={[dropoffLat, dropoffLon]}>
            <Popup>Dropoff Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
