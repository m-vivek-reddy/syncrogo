import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { distanceToRouteMeters, fetchMultiPointRoute, type Coordinate } from "../services/routing";

export type DriverPassengerMarker = {
  booking_id?: number;
  passenger_id?: number;
  name?: string;
  phone?: string;
  pickup_location?: string;
  latitude: number;
  longitude: number;
  status?: string; // PENDING, ACCEPTED, CONFIRMED, STARTED, PICKED_UP, COMPLETED, CANCELLED
};

export type DriverRideMapProps = {
  driverStart: { name?: string; latitude: number; longitude: number } | null;
  driverDestination: { name?: string; latitude: number; longitude: number } | null;
  driverCurrentLocation?: { latitude: number; longitude: number } | null;
  passengers?: DriverPassengerMarker[];
  height?: number;
};

export default function DriverRideMapWeb({
  driverStart,
  driverDestination,
  driverCurrentLocation,
  passengers = [],
  height = 380,
}: DriverRideMapProps) {
  const [baseRoute, setBaseRoute] = useState<Coordinate[]>([]);
  const [activeRoute, setActiveRoute] = useState<Coordinate[]>([]);

  const validDriverStart = driverStart && Number.isFinite(driverStart.latitude) && Number.isFinite(driverStart.longitude) ? driverStart : null;
  const validDriverDest = driverDestination && Number.isFinite(driverDestination.latitude) && Number.isFinite(driverDestination.longitude) ? driverDestination : null;
  const validPassengers = passengers.filter(
    p => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) && p.status !== "CANCELLED" && p.status !== "REJECTED"
  );

  // Calculate Base Route (Start -> Destination)
  useEffect(() => {
    let active = true;
    if (validDriverStart && validDriverDest) {
      fetchMultiPointRoute([validDriverStart, validDriverDest]).then(res => {
        if (active) setBaseRoute(res.coordinates);
      }).catch(() => {
        if (active) setBaseRoute([validDriverStart, validDriverDest]);
      });
    }
    return () => { active = false; };
  }, [validDriverStart, validDriverDest]);

  // Passengers on-route validation (300-meter rule)
  const evaluatedPassengers = useMemo(() => {
    return validPassengers.map(p => {
      const pCoord = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
      const distMeters = baseRoute.length >= 2 ? distanceToRouteMeters(pCoord, baseRoute) : 0;
      return {
        ...p,
        distanceToRouteMeters: distMeters,
        isOutsideRoute: distMeters > 300,
      };
    });
  }, [validPassengers, baseRoute]);

  // Calculate Active Route Waypoints (Current/Start -> Active Passengers -> Destination)
  const routeWaypoints = useMemo(() => {
    const pts: Coordinate[] = [];
    const startPt = (driverCurrentLocation && Number.isFinite(driverCurrentLocation.latitude))
      ? driverCurrentLocation
      : validDriverStart;

    if (startPt) pts.push({ latitude: startPt.latitude, longitude: startPt.longitude });

    evaluatedPassengers.filter(p => p.status !== "COMPLETED" && !p.isOutsideRoute).forEach(p => {
      pts.push({ latitude: Number(p.latitude), longitude: Number(p.longitude) });
    });

    if (validDriverDest) pts.push({ latitude: validDriverDest.latitude, longitude: validDriverDest.longitude });
    return pts;
  }, [driverCurrentLocation, validDriverStart, evaluatedPassengers, validDriverDest]);

  useEffect(() => {
    let active = true;
    if (routeWaypoints.length >= 2) {
      fetchMultiPointRoute(routeWaypoints).then(res => {
        if (active) setActiveRoute(res.coordinates);
      }).catch(() => {
        if (active) setActiveRoute(routeWaypoints);
      });
    } else {
      setActiveRoute(routeWaypoints);
    }
    return () => { active = false; };
  }, [routeWaypoints]);

  const mapHtml = useMemo(() => {
    const centerLat = validDriverStart?.latitude || 17.385;
    const centerLon = validDriverStart?.longitude || 78.4867;

    const startScript = validDriverStart
      ? `var startPos = [${validDriverStart.latitude}, ${validDriverStart.longitude}];
         allBounds.push(startPos);
         L.marker(startPos, {
           icon: L.divIcon({ className: '', html: '<div class="pin start-pin">📍</div>', iconAnchor: [18, 18] })
         }).addTo(map);`
      : '';

    const passengerScripts = evaluatedPassengers
      .map((p, idx) => {
        const isCompleted = p.status === "COMPLETED";
        const isPickedUp = p.status === "PICKED_UP";
        const isOutside = p.isOutsideRoute;

        let pClass = "pin p-pin";
        if (isCompleted) pClass = "pin completed-pin";
        else if (isPickedUp) pClass = "pin picked-pin";
        else if (isOutside) pClass = "pin warn-pin";

        return `(function() {
          var pPos = [${p.latitude}, ${p.longitude}];
          allBounds.push(pPos);
          L.marker(pPos, {
            icon: L.divIcon({ className: '', html: '<div class="${pClass}">👤</div>', iconAnchor: [18, 18] })
          }).addTo(map);
        })();`;
      })
      .join('\n');

    const destScript = validDriverDest
      ? `var destPos = [${validDriverDest.latitude}, ${validDriverDest.longitude}];
         allBounds.push(destPos);
         L.marker(destPos, {
           icon: L.divIcon({ className: '', html: '<div class="pin dest-pin">🏁</div>', iconAnchor: [18, 18] })
         }).addTo(map);`
      : '';

    const carScript =
      driverCurrentLocation && Number.isFinite(driverCurrentLocation.latitude)
        ? `var carPos = [${driverCurrentLocation.latitude}, ${driverCurrentLocation.longitude}];
           allBounds.push(carPos);
           L.marker(carPos, {
             icon: L.divIcon({ className: '', html: '<div class="car-pin">🚗</div>', iconAnchor: [19, 19] })
           }).addTo(map);`
        : '';

    const routeScript =
      activeRoute.length >= 2
        ? `var routePts = ${JSON.stringify(activeRoute.map((c) => [c.latitude, c.longitude]))};
           L.polyline(routePts, { color: '#16a34a', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map);`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { width:100%; height:100%; margin:0; padding:0; background:#f8fafc; font-family:sans-serif; }
    .leaflet-control-attribution { display:none !important; }
    .pin {
      width:34px; height:34px; border-radius:17px;
      background:#0f172a; color:#ffffff; font-size:16px;
      display:flex; align-items:center; justify-content:center;
      border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.3);
    }
    .start-pin { background:#2563eb; }
    .dest-pin { background:#dc2626; }
    .p-pin { background:#16a34a; }
    .picked-pin { background:#0284c7; }
    .completed-pin { background:#64748b; }
    .warn-pin { background:#d97706; }
    .car-pin {
      width:38px; height:38px; border-radius:19px;
      background:#ffffff; color:#0f172a; font-size:18px;
      display:flex; align-items:center; justify-content:center;
      border:2px solid #16a34a; box-shadow:0 2px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLon}], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

    var allBounds = [];
    ${startScript}
    ${passengerScripts}
    ${destScript}
    ${carScript}
    ${routeScript}

    if (allBounds.length > 0) {
      if (allBounds.length === 1) {
        map.setView(allBounds[0], 14);
      } else {
        map.fitBounds(allBounds, { padding: [40, 40] });
      }
    }
  </script>
</body>
</html>`;
  }, [validDriverStart, evaluatedPassengers, validDriverDest, driverCurrentLocation, activeRoute]);

  return (
    <View style={[styles.container, { height }]}>
      <iframe title="Driver Ride Map" srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", borderRadius: 20, overflow: "hidden", backgroundColor: "#E2E8F0", position: "relative", borderWidth: 1, borderColor: "#CBD5E1" },
});
