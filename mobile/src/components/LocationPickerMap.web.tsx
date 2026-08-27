import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Coordinate } from "../services/routing";

type Props = {
  pickup: Coordinate | null;
  destination: Coordinate | null;
  onPickupChange: (coordinate: Coordinate) => void;
  onDestinationChange: (coordinate: Coordinate) => void;
  selectionMode: "pickup" | "destination";
  onRouteChange?: (
    distanceKm: number,
    durationMinutes: number,
    routeCoordinates: Coordinate[]
  ) => void;
};

export default function LocationPickerMapWeb({
  pickup,
  destination,
  selectionMode,
}: Props) {
  const initialLat = pickup?.latitude || 17.385;
  const initialLon = pickup?.longitude || 78.4867;

  const mapHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#e2e8f0;}</style></head><body><div id="map"></div><script>var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${initialLat},${initialLon}],14);L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);${pickup ? `L.marker([${pickup.latitude},${pickup.longitude}]).addTo(map);` : ""}${destination ? `L.marker([${destination.latitude},${destination.longitude}]).addTo(map);` : ""}</script></body></html>`;

  return (
    <View style={styles.container}>
      <iframe title="Location Picker" srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} />
      <View style={styles.instructionBadge} pointerEvents="none">
        <Text style={styles.instructionText}>
          {selectionMode === "pickup" ? "📍 Pickup Point" : "🏁 Destination Point"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: 360, borderRadius: 20, overflow: "hidden", backgroundColor: "#E2E8F0", position: "relative", borderWidth: 1, borderColor: "#CBD5E1" },
  instructionBadge: { position: "absolute", top: 14, left: 14, backgroundColor: "rgba(15, 23, 42, 0.88)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, zIndex: 10 },
  instructionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
