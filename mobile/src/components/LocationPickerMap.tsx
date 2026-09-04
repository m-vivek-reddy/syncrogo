import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Location from "expo-location";

import {
  fetchRoadRoute,
  haversineDistanceKm,
  type Coordinate,
} from "../services/routing";

type SelectionMode = "pickup" | "destination";

type LocationPickerMapProps = {
  pickup: Coordinate | null;
  destination: Coordinate | null;
  selectionMode: SelectionMode;
  /** "car" uses all roads (incl. ORR); "bike" excludes motorways. */
  vehicleType?: string;
  onPickupChange: (coordinate: Coordinate) => void;
  onDestinationChange: (coordinate: Coordinate) => void;
  onRouteChange: (
    distanceKm: number,
    durationMinutes: number,
    coordinates: Coordinate[]
  ) => void;
};

function estimateDurationMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / 30) * 60));
}

function useRouteCalculator(
  pickup: Coordinate | null,
  destination: Coordinate | null,
  onRouteChange: (
    distanceKm: number,
    durationMinutes: number,
    coordinates: Coordinate[]
  ) => void,
  vehicleType?: string
) {
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const onRouteChangeRef = useRef(onRouteChange);
  useEffect(() => {
    onRouteChangeRef.current = onRouteChange;
  }, [onRouteChange]);

  const lastRouteKeyRef = useRef<string>("");

  const pLat = pickup ? pickup.latitude.toFixed(4) : "";
  const pLon = pickup ? pickup.longitude.toFixed(4) : "";
  const dLat = destination ? destination.latitude.toFixed(4) : "";
  const dLon = destination ? destination.longitude.toFixed(4) : "";
  const routeKey = `${pLat},${pLon};${dLat},${dLon};${String(vehicleType || "car").toLowerCase()}`;

  useEffect(() => {
    let cancelled = false;

    const calculateRoute = async () => {
      if (!pickup || !destination) {
        setRouteCoordinates([]);
        setRouteError(null);
        lastRouteKeyRef.current = "";
        return;
      }

      if (routeKey === lastRouteKeyRef.current) return;
      lastRouteKeyRef.current = routeKey;

      const directDistance = haversineDistanceKm(pickup, destination);

      if (directDistance < 0.01) {
        const samePointRoute = [pickup, destination];
        setRouteCoordinates(samePointRoute);
        onRouteChangeRef.current(0.01, 1, samePointRoute);
        return;
      }

      try {
        setRouteLoading(true);
        setRouteError(null);

        const result = await fetchRoadRoute(pickup, destination, vehicleType);
        if (cancelled) return;

        setRouteCoordinates(result.coordinates);
        onRouteChangeRef.current(
          result.distanceKm,
          result.durationMinutes,
          result.coordinates
        );
      } catch {
        if (cancelled) return;

        const fallbackDistance = Math.max(0.1, Math.round(directDistance * 100) / 100);
        const fallbackDuration = estimateDurationMinutes(fallbackDistance);
        const fallbackCoordinates = [pickup, destination];

        setRouteCoordinates(fallbackCoordinates);
        setRouteError("Road route temporarily unavailable. Showing direct route.");
        onRouteChangeRef.current(fallbackDistance, fallbackDuration, fallbackCoordinates);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    void calculateRoute();

    return () => {
      cancelled = true;
    };
  }, [pLat, pLon, dLat, dLon, pickup, destination, routeKey, vehicleType]);

  return { routeCoordinates, routeLoading, routeError };
}

/* To be continued: Leaflet HTML template + component */

const LEAFLET_HTML_HEAD = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#e2e8f0;}#map{touch-action:none;}.sg-pin{border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);}.sg-pickup{background:#2563EB;}.sg-dest{background:#16A34A;}</style></head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([17.4435, 78.3772], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
var pickupMarker = null, destMarker = null, routeLine = null;
function pinIcon(cls) { return L.divIcon({ className: '', html: '<div class="sg-pin ' + cls + '" style="width:22px;height:22px;"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }); }
function renderMap(pickup, destination, route, fit) {
  if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
  if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  if (pickup) pickupMarker = L.marker([pickup[0], pickup[1]], { icon: pinIcon('sg-pickup') }).addTo(map);
  if (destination) destMarker = L.marker([destination[0], destination[1]], { icon: pinIcon('sg-dest') }).addTo(map);
  if (route && route.length >= 2) routeLine = L.polyline(route, { color: '#2563EB', weight: 5 }).addTo(map);
  if (fit) {
    var pts = (route && route.length >= 2) ? route.slice() : [];
    if (pickup) pts.push(pickup);
    if (destination) pts.push(destination);
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length >= 2) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }
}
map.on('click', function (e) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', lat: e.latlng.lat, lng: e.latlng.lng }));
});
window.updateMap = renderMap;
renderMap(__PICKUP__, __DEST__, __ROUTE__, true);
</script></body></html>`;

export default function LocationPickerMap({
  pickup,
  destination,
  selectionMode,
  vehicleType,
  onPickupChange,
  onDestinationChange,
  onRouteChange,
}: LocationPickerMapProps) {
  const webRef = useRef<WebView | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const { routeCoordinates, routeLoading, routeError } = useRouteCalculator(
    pickup,
    destination,
    onRouteChange,
    vehicleType
  );

  const selectionModeRef = useRef(selectionMode);
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  const initialHtml = useMemo(() => {
    const p = pickup ? JSON.stringify([pickup.latitude, pickup.longitude]) : "null";
    const d = destination ? JSON.stringify([destination.latitude, destination.longitude]) : "null";

    return LEAFLET_HTML_HEAD.replace("__PICKUP__", p).replace("__DEST__", d).replace("__ROUTE__", "null");
  }, [destination, pickup]);

  /* Push updated markers/route into the WebView. */
  useEffect(() => {
    if (!mapReady) return;
    const p = pickup ? JSON.stringify([pickup.latitude, pickup.longitude]) : "null";
    const d = destination ? JSON.stringify([destination.latitude, destination.longitude]) : "null";
    const r =
      routeCoordinates.length >= 2
        ? JSON.stringify(routeCoordinates.map((c) => [c.latitude, c.longitude]))
        : "null";
    const fit = hasInteracted ? "false" : "true";
    webRef.current?.injectJavaScript(
      `window.updateMap(${p}, ${d}, ${r}, ${fit}); true;`
    );
  }, [mapReady, pickup, destination, routeCoordinates, hasInteracted]);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (
          data.type === "tap" &&
          Number.isFinite(Number(data.lat)) &&
          Number.isFinite(Number(data.lng))
        ) {
          setHasInteracted(true);
          const coordinate: Coordinate = {
            latitude: Number(data.lat),
            longitude: Number(data.lng),
          };
          if (selectionModeRef.current === "pickup") {
            onPickupChange(coordinate);
          } else {
            onDestinationChange(coordinate);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [onDestinationChange, onPickupChange]
  );

  const loadCurrentLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinate: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setHasInteracted(true);

      if (!pickup && selectionModeRef.current === "pickup") {
        onPickupChange(coordinate);
      } else {
        webRef.current?.injectJavaScript(
          `map.setView([${coordinate.latitude}, ${coordinate.longitude}], 15); true;`
        );
      }
    } catch (error) {
      console.log("LocationPickerMap GPS error:", error);
    } finally {
      setLocationLoading(false);
    }
  }, [onPickupChange, pickup]);

  const handleZoom = useCallback((delta: number) => {
    webRef.current?.injectJavaScript(
      `map.setZoom(map.getZoom() + ${delta}); true;`
    );
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html: initialHtml }}
        style={styles.map}
        originWhitelist={["*"]}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => setMapReady(true)}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />

      <View style={styles.topOverlay} pointerEvents="none">
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>
            {selectionMode === "pickup" ? "📍 Select Pickup" : "🏁 Select Destination"}
          </Text>
          <Text style={styles.instructionText}>
            Tap anywhere on the map to choose your{" "}
            {selectionMode === "pickup" ? "pickup point" : "destination"}.
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => handleZoom(1)} style={styles.controlButton}>
          <Text style={styles.controlText}>+</Text>
        </Pressable>
        <Pressable onPress={() => handleZoom(-1)} style={styles.controlButton}>
          <Text style={styles.controlText}>−</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => void loadCurrentLocation()}
        disabled={locationLoading}
        style={styles.gpsButton}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <Text style={styles.gpsText}>🎯</Text>
        )}
      </Pressable>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay} pointerEvents="none">
          <View style={styles.mapLoadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.mapLoadingText}>Loading map...</Text>
          </View>
        </View>
      )}

      {routeLoading && (
        <View style={styles.routeLoadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.routeLoadingText}>Calculating road route...</Text>
        </View>
      )}

      {!routeLoading && routeError && (
        <View style={styles.routeErrorBox}>
          <Text style={styles.routeErrorText}>⚠️ {routeError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 390,
    minHeight: 390,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 70,
  },
  instructionBox: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },
  instructionText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  controls: {
    position: "absolute",
    right: 12,
    top: 90,
    gap: 7,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  controlText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "500",
    color: "#1E3A8A",
  },
  gpsButton: {
    position: "absolute",
    right: 12,
    bottom: 74,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    elevation: 6,
  },
  gpsText: {
    fontSize: 22,
  },
  routeLoadingBox: {
    position: "absolute",
    left: 12,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 7,
    elevation: 3,
  },
  routeLoadingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  routeErrorBox: {
    position: "absolute",
    left: 12,
    right: 70,
    bottom: 16,
    backgroundColor: "rgba(255,247,237,0.96)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  routeErrorText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9A3412",
  },
  mapLoadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },
  mapLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 4,
  },
  mapLoadingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
});
