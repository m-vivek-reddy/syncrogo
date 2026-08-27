import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import { useEffect } from "react";

import "leaflet/dist/leaflet.css";


// ============================================================
// TYPES
// ============================================================

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

interface RideMapProps {
  driverLocation?: LocationPoint | null;
  passengerLocation?: LocationPoint | null;

  pickupLocation?: LocationPoint | null;
  destinationLocation?: LocationPoint | null;

  driverRoute?: [number, number][];
  passengerRoute?: [number, number][];

  followDriver?: boolean;
}


// ============================================================
// FIX LEAFLET DEFAULT ICON
// ============================================================

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


// ============================================================
// DRIVER ICON
// ============================================================

const driverIcon = L.divIcon({
  className: "syncrogo-driver-marker",

  html: `
    <div style="
      width:42px;
      height:42px;
      border-radius:50%;
      background:#111827;
      border:4px solid white;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.35);
      font-size:22px;
    ">
      🚗
    </div>
  `,

  iconSize: [42, 42],
  iconAnchor: [21, 21],
});


// ============================================================
// PASSENGER ICON
// ============================================================

const passengerIcon = L.divIcon({
  className: "syncrogo-passenger-marker",

  html: `
    <div style="
      width:38px;
      height:38px;
      border-radius:50%;
      background:#2563eb;
      border:4px solid white;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.3);
      font-size:20px;
    ">
      👤
    </div>
  `,

  iconSize: [38, 38],
  iconAnchor: [19, 19],
});


// ============================================================
// PICKUP ICON
// ============================================================

const pickupIcon = L.divIcon({
  className: "syncrogo-pickup-marker",

  html: `
    <div style="
      width:38px;
      height:38px;
      border-radius:50%;
      background:#16a34a;
      border:4px solid white;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.3);
      font-size:19px;
    ">
      📍
    </div>
  `,

  iconSize: [38, 38],
  iconAnchor: [19, 19],
});


// ============================================================
// DESTINATION ICON
// ============================================================

const destinationIcon = L.divIcon({
  className: "syncrogo-destination-marker",

  html: `
    <div style="
      width:42px;
      height:42px;
      border-radius:50%;
      background:#dc2626;
      border:4px solid white;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.3);
      font-size:20px;
    ">
      🏁
    </div>
  `,

  iconSize: [42, 42],
  iconAnchor: [21, 21],
});


// ============================================================
// MAP RESIZER (FIXES BLANK / GREY TILES)
// ============================================================

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
    window.addEventListener("resize", trigger);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", trigger);
    };
  }, [map]);
  return null;
}

// ============================================================
// MAP CAMERA
// ============================================================

function MapController({
  driverLocation,
  passengerLocation,
  destinationLocation,
  followDriver,
}: {
  driverLocation?: LocationPoint | null;
  passengerLocation?: LocationPoint | null;
  destinationLocation?: LocationPoint | null;
  followDriver: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!followDriver) {
      return;
    }

    if (driverLocation) {
      map.flyTo(
        [
          driverLocation.latitude,
          driverLocation.longitude,
        ],
        16,
        {
          duration: 0.8,
        }
      );

      return;
    }

    if (passengerLocation) {
      map.flyTo(
        [
          passengerLocation.latitude,
          passengerLocation.longitude,
        ],
        16,
        {
          duration: 0.8,
        }
      );

      return;
    }

    if (destinationLocation) {
      map.flyTo(
        [
          destinationLocation.latitude,
          destinationLocation.longitude,
        ],
        15,
        {
          duration: 0.8,
        }
      );
    }
  }, [
    driverLocation,
    passengerLocation,
    destinationLocation,
    followDriver,
    map,
  ]);

  return null;
}


// ============================================================
// FIT ROUTE
// ============================================================

function RouteBounds({
  driverRoute,
  passengerRoute,
  pickupLocation,
  destinationLocation,
}: {
  driverRoute: [number, number][];
  passengerRoute: [number, number][];
  pickupLocation?: LocationPoint | null;
  destinationLocation?: LocationPoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    if (driverRoute.length > 0) {
      points.push(...driverRoute);
    }

    if (passengerRoute.length > 0) {
      points.push(...passengerRoute);
    }

    if (pickupLocation) {
      points.push([
        pickupLocation.latitude,
        pickupLocation.longitude,
      ]);
    }

    if (destinationLocation) {
      points.push([
        destinationLocation.latitude,
        destinationLocation.longitude,
      ]);
    }

    if (points.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(points);

    map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 16,
      animate: true,
      duration: 1,
    });
  }, [
    driverRoute,
    passengerRoute,
    pickupLocation,
    destinationLocation,
    map,
  ]);

  return null;
}


// ============================================================
// MAIN MAP
// ============================================================

export default function RideMap({
  driverLocation,
  passengerLocation,
  pickupLocation,
  destinationLocation,
  driverRoute = [],
  passengerRoute = [],
  followDriver = true,
}: RideMapProps) {

  const initialLocation =
    driverLocation ||
    passengerLocation ||
    pickupLocation ||
    destinationLocation;

  if (!initialLocation) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-2 text-4xl">
            📍
          </div>

          <p className="font-medium text-gray-700">
            Waiting for location...
          </p>
        </div>
      </div>
    );
  }


  const center: [number, number] = [
    initialLocation.latitude,
    initialLocation.longitude,
  ];


  return (
    <MapContainer
      center={center}
      zoom={15}
      zoomControl={false}
      scrollWheelZoom={true}
      touchZoom={true}
      doubleClickZoom={true}
      dragging={true}
      className="h-full w-full"
      style={{
        minHeight: "100%",
        width: "100%",
      }}
    >

      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapResizer />


      <MapController
        driverLocation={driverLocation}
        passengerLocation={passengerLocation}
        destinationLocation={destinationLocation}
        followDriver={followDriver}
      />


      <RouteBounds
        driverRoute={driverRoute}
        passengerRoute={passengerRoute}
        pickupLocation={pickupLocation}
        destinationLocation={destinationLocation}
      />


      {/* ==================================================
          DRIVER
          ================================================== */}

      {driverLocation && (
        <Marker
          position={[
            driverLocation.latitude,
            driverLocation.longitude,
          ]}
          icon={driverIcon}
        >
          <Popup>
            Driver
          </Popup>
        </Marker>
      )}


      {/* ==================================================
          PASSENGER
          ================================================== */}

      {passengerLocation && (
        <Marker
          position={[
            passengerLocation.latitude,
            passengerLocation.longitude,
          ]}
          icon={passengerIcon}
        >
          <Popup>
            Passenger
          </Popup>
        </Marker>
      )}


      {/* ==================================================
          PICKUP
          ================================================== */}

      {pickupLocation && (
        <Marker
          position={[
            pickupLocation.latitude,
            pickupLocation.longitude,
          ]}
          icon={pickupIcon}
        >
          <Popup>
            Pickup location
          </Popup>
        </Marker>
      )}


      {/* ==================================================
          DESTINATION
          ================================================== */}

      {destinationLocation && (
        <Marker
          position={[
            destinationLocation.latitude,
            destinationLocation.longitude,
          ]}
          icon={destinationIcon}
        >
          <Popup>
            Destination
          </Popup>
        </Marker>
      )}


      {/* ==================================================
          DRIVER ROUTE
          ================================================== */}

      {driverRoute.length > 1 && (
        <Polyline
          positions={driverRoute}
          pathOptions={{
            color: "#2563eb",
            weight: 6,
            opacity: 0.9,
          }}
        />
      )}


      {/* ==================================================
          PASSENGER ROUTE
          ================================================== */}

      {passengerRoute.length > 1 && (
        <Polyline
          positions={passengerRoute}
          pathOptions={{
            color: "#16a34a",
            weight: 5,
            opacity: 0.8,
            dashArray: "10 8",
          }}
        />
      )}

    </MapContainer>
  );
}