import React, { useEffect, useState, useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Colors } from "../constants/colors";
import { useAuthStore } from "../store/auth";

const DEFAULT_COORDS = { latitude: 17.385, longitude: 78.4867 };

export default function HomeMapWeb() {
  const { mode } = useAuthStore();
  const isDriver = mode === "driver";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [gpsReady, setGpsReady] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const nearbyDrivers = React.useMemo(() => [
    { id: "d1", lat: coords.latitude + 0.0032, lon: coords.longitude + 0.0025 },
    { id: "d2", lat: coords.latitude - 0.0038, lon: coords.longitude + 0.0029 },
    { id: "d3", lat: coords.latitude + 0.0019, lon: coords.longitude - 0.0041 },
  ], [coords.latitude, coords.longitude]);

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      if (
        typeof location.coords.latitude === "number" &&
        typeof location.coords.longitude === "number" &&
        !isNaN(location.coords.latitude) &&
        !isNaN(location.coords.longitude)
      ) {
        setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        setLocationAccuracy(location.coords.accuracy ?? null);
        setGpsReady(true);
      }
    } catch {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setLocationAccuracy(pos.coords.accuracy ?? null);
            setGpsReady(true);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }
  }, []);

  useEffect(() => { void fetchLocation(); }, [fetchLocation]);

  const postIframeMessage = (msg: object) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");
    } catch {}
  };

  const handleZoomIn = () => postIframeMessage({ type: "ZOOM_IN" });
  const handleZoomOut = () => postIframeMessage({ type: "ZOOM_OUT" });
  const handleRecenter = () => postIframeMessage({ type: "RECENTER", lat: coords.latitude, lon: coords.longitude });

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; overflow:hidden; background:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
    .leaflet-control-attribution { display:none !important; }
    .user-marker { position:relative; width:24px; height:24px; }
    .user-pulse { position:absolute; top:-6px; left:-6px; width:36px; height:36px; background:${isDriver ? "rgba(16, 185, 129, 0.35)" : "rgba(37, 99, 235, 0.35)"}; border-radius:50%; animation:userPulse 2s infinite ease-in-out; }
    .user-core { position:absolute; top:2px; left:2px; width:20px; height:20px; background:${isDriver ? "#10B981" : "#2563EB"}; border:3px solid #ffffff; border-radius:50%; box-shadow:0 3px 8px rgba(0,0,0,0.35); }
    .car-marker { width:32px; height:32px; background:#ffffff; border:2px solid #10B981; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 3px 8px rgba(0,0,0,0.25); }
    @keyframes userPulse { 0%{transform:scale(0.85);opacity:0.9;} 50%{transform:scale(1.6);opacity:0.15;} 100%{transform:scale(0.85);opacity:0.9;} }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map, userMarker, driverMarkers = [];
    var centerLat = ${coords.latitude};
    var centerLon = ${coords.longitude};
    var isDriverMode = ${isDriver ? "true" : "false"};
    var drivers = ${JSON.stringify(nearbyDrivers)};

    function initMap() {
      if (typeof L === 'undefined') { setTimeout(initMap, 100); return; }
      if (map) return;

      map = L.map('map', { zoomControl: false, attributionControl: false, fadeAnimation: true, zoomAnimation: true }).setView([centerLat, centerLon], 15);

      var primaryTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' });
      primaryTiles.on('tileerror', function() {
        if (!map._hasOsm) { map._hasOsm = true; L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map); }
      });
      primaryTiles.addTo(map);

      var userIcon = L.divIcon({ className: 'custom-user-icon', html: '<div class="user-marker"><div class="user-pulse"></div><div class="user-core"></div></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
      userMarker = L.marker([centerLat, centerLon], { icon: userIcon }).addTo(map);

      if (!isDriverMode && Array.isArray(drivers)) {
        var carIcon = L.divIcon({ className: 'custom-car-icon', html: '<div class="car-marker">🚗</div>', iconSize: [32, 32], iconAnchor: [16, 16] });
        drivers.forEach(function(d) {
          var m = L.marker([d.lat, d.lon], { icon: carIcon }).addTo(map);
          driverMarkers.push(m);
        });
      }

      setTimeout(function() { if (map) map.invalidateSize(); }, 100);
      setTimeout(function() { if (map) map.invalidateSize(); }, 500);
    }

    function handleMsg(evt) {
      try {
        var msg = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
        if (!msg || !map) return;
        if (msg.type === 'RECENTER' || msg.type === 'SET_CENTER') {
          var lat = msg.lat || centerLat; var lon = msg.lon || centerLon;
          if (userMarker) userMarker.setLatLng([lat, lon]);
          map.setView([lat, lon], 15, { animate: true });
        } else if (msg.type === 'ZOOM_IN') { map.zoomIn(); }
        else if (msg.type === 'ZOOM_OUT') { map.zoomOut(); }
      } catch(e){}
    }

    window.addEventListener('message', handleMsg);
    window.addEventListener('resize', function() { if (map) map.invalidateSize(); });
    initMap();
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      <iframe
        ref={iframeRef}
        title="Map"
        srcDoc={mapHtml}
        style={{ width: "100%", height: "100%", border: "none" }}
      />

      {/* Floating Status Pill */}
      <View style={styles.statusPill} pointerEvents="none">
        <View style={[styles.pulseDot, { backgroundColor: isDriver ? Colors.green : Colors.primary }]} />
        <Text style={styles.statusPillText}>
          {isDriver
            ? `Driver Online • ${locationAccuracy ? `±${Math.round(locationAccuracy)}m` : "GPS Live"}`
            : gpsReady
            ? `3 Drivers Nearby • ${locationAccuracy ? `±${Math.round(locationAccuracy)}m` : "GPS Live"}`
            : "Locating GPS Area..."}
        </Text>
      </View>

      {/* Floating Zoom Controls (+ / -) */}
      <View style={styles.zoomControls}>
        <Pressable onPress={handleZoomIn} style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed]}>
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable onPress={handleZoomOut} style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed]}>
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
      </View>

      {/* Floating Re-center Button */}
      <Pressable onPress={handleRecenter} style={({ pressed }) => [styles.recenterBtn, pressed && styles.recenterBtnPressed]}>
        <Text style={styles.recenterIcon}>🎯</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 220, width: "100%", borderRadius: 20, overflow: "hidden", backgroundColor: "#E2E8F0", position: "relative", marginVertical: 12, borderWidth: 1, borderColor: "#CBD5E1", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  statusPill: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255, 255, 255, 0.95)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(203, 213, 225, 0.8)", zIndex: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: "800", color: "#1E293B" },
  recenterBtn: { position: "absolute", bottom: 12, right: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", zIndex: 10 },
  recenterBtnPressed: { backgroundColor: "#F1F5F9", transform: [{ scale: 0.94 }] },
  recenterIcon: { fontSize: 20 },
  zoomControls: { position: "absolute", right: 12, top: 55, backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", overflow: "hidden", zIndex: 10 },
  zoomButton: { width: 38, height: 38, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  zoomButtonPressed: { backgroundColor: "#EFF6FF" },
  zoomButtonText: { fontSize: 22, fontWeight: "700", color: "#1E3A8A", lineHeight: 24 },
  zoomDivider: { height: 1, backgroundColor: "#E2E8F0" },
});
