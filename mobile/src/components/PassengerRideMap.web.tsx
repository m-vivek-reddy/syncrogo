import React, { useEffect, useRef, useMemo } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { fetchMultiPointRoute, type Coordinate } from "../services/routing";

export type PassengerMarker = {
  booking_id?: number;
  passenger_id?: number;
  name?: string;
  is_current_user?: boolean;
  pickup_location?: string;
  latitude: number;
  longitude: number;
  status?: string;
};

export type PassengerRideMapProps = {
  driverStart: { name?: string; latitude: number; longitude: number } | null;
  driverDestination: { name?: string; latitude: number; longitude: number } | null;
  driverCurrentLocation?: { latitude: number; longitude: number } | null;
  passengers?: PassengerMarker[];
  rideStatus?: string;
  height?: number;
};

export default function PassengerRideMapWeb({
  driverStart,
  driverDestination,
  driverCurrentLocation,
  passengers = [],
  rideStatus,
  height = 360,
}: PassengerRideMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [routeCoords, setRouteCoordinates] = React.useState<Coordinate[]>([]);

  // Filter valid coordinates
  const validDriverStart = driverStart && Number.isFinite(driverStart.latitude) && Number.isFinite(driverStart.longitude) ? driverStart : null;
  const validDriverDest = driverDestination && Number.isFinite(driverDestination.latitude) && Number.isFinite(driverDestination.longitude) ? driverDestination : null;
  const validPassengers = passengers.filter(p => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));

  // Waypoints in sequence: Driver Start -> Passengers -> Driver Destination
  const waypoints = useMemo(() => {
    const pts: Coordinate[] = [];
    if (validDriverStart) pts.push({ latitude: validDriverStart.latitude, longitude: validDriverStart.longitude });
    validPassengers.forEach(p => pts.push({ latitude: Number(p.latitude), longitude: Number(p.longitude) }));
    if (validDriverDest) pts.push({ latitude: validDriverDest.latitude, longitude: validDriverDest.longitude });
    return pts;
  }, [validDriverStart, validPassengers, validDriverDest]);

  useEffect(() => {
    let active = true;
    if (waypoints.length >= 2) {
      fetchMultiPointRoute(waypoints).then(res => {
        if (active) setRouteCoordinates(res.coordinates);
      }).catch(() => {
        if (active) setRouteCoordinates(waypoints);
      });
    } else {
      setRouteCoordinates(waypoints);
    }
    return () => { active = false; };
  }, [waypoints]);

  const mapHtml = useMemo(() => {
    const centerLat = validDriverStart?.latitude || 17.385;
    const centerLon = validDriverStart?.longitude || 78.4867;

    const startScript = validDriverStart
      ? `var startPos = [${validDriverStart.latitude}, ${validDriverStart.longitude}];
           allBounds.push(startPos);
           L.marker(startPos, {
             icon: L.divIcon({ className: '', html: '<div class="marker-label start-label">🚀 Driver Start</div>', iconAnchor: [40, 12] })
           }).addTo(map);`
      : "";

    const passengerScripts = validPassengers
      .map((p, idx) => {
        const pName = p.is_current_user
          ? "📍 You (Pickup)"
          : (p.name || "Passenger " + (idx + 1));
        const pClass = p.is_current_user
          ? "marker-label my-label"
          : "marker-label p-label";
        return `(function() {
            var pPos = [${p.latitude}, ${p.longitude}];
            allBounds.push(pPos);
            L.marker(pPos, {
              icon: L.divIcon({ className: '', html: '<div class="${pClass}">${pName}</div>', iconAnchor: [35, 12] })
            }).addTo(map);
          })();`;
      })
      .join("\n");

    const destScript = validDriverDest
      ? `var destPos = [${validDriverDest.latitude}, ${validDriverDest.longitude}];
           allBounds.push(destPos);
           L.marker(destPos, {
             icon: L.divIcon({ className: '', html: '<div class="marker-label dest-label">🏁 Driver Destination</div>', iconAnchor: [50, 12] })
           }).addTo(map);`
      : "";

    const carScript =
      driverCurrentLocation && Number.isFinite(driverCurrentLocation.latitude)
        ? `var carPos = [${driverCurrentLocation.latitude}, ${driverCurrentLocation.longitude}];
             allBounds.push(carPos);
             L.marker(carPos, {
               icon: L.divIcon({ className: '', html: '<div class="car-marker">🚗</div>', iconAnchor: [12, 12] })
             }).addTo(map);`
        : "";

    const routeScript =
      routeCoords.length >= 2
        ? `var routePts = ${JSON.stringify(routeCoords.map((c) => [c.latitude, c.longitude]))};
             L.polyline(routePts, { color: '#2563eb', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(map);`
        : "";

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
      .marker-label { background:#0f172a; color:#ffffff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:12px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
      .start-label { background:#2563eb; }
      .dest-label { background:#dc2626; }
      .p-label { background:#16a34a; }
      .my-label { background:#7c3aed; }
      .car-marker { font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
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
  }, [validDriverStart, validDriverDest, validPassengers, driverCurrentLocation, routeCoords]);

  return (
    <View style={[styles.container, { height }]}>
      <iframe title="Passenger Ride Map" srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", borderRadius: 20, overflow: "hidden", backgroundColor: "#E2E8F0", position: "relative", borderWidth: 1, borderColor: "#CBD5E1" },
});
