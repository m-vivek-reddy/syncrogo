import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { fetchMultiPointRoute, type Coordinate } from "../services/routing";
import { useSmoothedVehicle, VehicleBody } from "./NavigationVehicle";
import { SyncroGoMap, type SyncroGoMapHandle, type SyncroGoMarker } from "./SyncroGoMap";

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
  /** Real vehicle type from the backend ("car" / "bike"). */
  vehicleType?: string | null;
  height?: number;
};

export default function PassengerRideMap({
  driverStart,
  driverDestination,
  driverCurrentLocation,
  passengers = [],
  rideStatus,
  vehicleType,
  height = 360,
}: PassengerRideMapProps) {
  const mapRef = useRef<SyncroGoMapHandle | null>(null);
  const [routeCoords, setRouteCoordinates] = useState<Coordinate[]>([]);

  // 3D navigation mode only when the ride is actually STARTED on the backend.
  const rideStarted = rideStatus === "STARTED" || rideStatus === "started";
  const [followMode, setFollowMode] = useState(true);

  // Smoothed driver-vehicle position/heading derived ONLY from real backend GPS.
  const smoothed = useSmoothedVehicle(driverCurrentLocation ?? null, rideStarted);

  const validDriverStart = driverStart && Number.isFinite(driverStart.latitude) && Number.isFinite(driverStart.longitude) ? driverStart : null;
  const validDriverDest = driverDestination && Number.isFinite(driverDestination.latitude) && Number.isFinite(driverDestination.longitude) ? driverDestination : null;
  const validPassengers = passengers.filter(p => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));

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

  useEffect(() => {
    if (!mapRef.current) return;
    const allCoords: Coordinate[] = [...waypoints];
    if (driverCurrentLocation && Number.isFinite(driverCurrentLocation.latitude)) {
      allCoords.push(driverCurrentLocation);
    }
    if (allCoords.length > 0) {
      const t = setTimeout(() => {
        mapRef.current?.fitBounds(allCoords, 60);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [waypoints, driverCurrentLocation]);

  const initialCenter = useMemo(() => {
    if (validDriverStart) return validDriverStart;
    if (driverCurrentLocation) return driverCurrentLocation;
    return { latitude: 17.385, longitude: 78.4867 };
  }, [validDriverStart, driverCurrentLocation]);

  // Smoothly transition to a 3D navigation camera when the ride starts.
  useEffect(() => {
    if (!rideStarted) return;
    setFollowMode(true);
    // Only on transition into navigation mode.
     
  }, [rideStarted]);

  // Follow camera during navigation. Skipped while user is manually exploring.
  useEffect(() => {
    if (!rideStarted || !followMode || !mapRef.current) return;
    const target = smoothed.position ?? driverCurrentLocation ?? validDriverStart;
    if (!target || !Number.isFinite(target.latitude)) return;
    mapRef.current.animateTo(
      { latitude: target.latitude, longitude: target.longitude },
      { nav: true, duration: 600 }
    );
  }, [rideStarted, followMode, smoothed.position, driverCurrentLocation, validDriverStart]);

  const handleRecenter = () => {
    setFollowMode(true);
  };

  const markers = useMemo<SyncroGoMarker[]>(() => {
    const list: SyncroGoMarker[] = [];

    if (validDriverStart) {
      list.push({
        id: "driver-start",
        coordinate: validDriverStart,
        children: (
          <View style={[styles.badge, styles.startBadge]}>
            <Text style={styles.badgeText}>🚀 Driver Start</Text>
          </View>
        ),
      });
    }

    validPassengers.forEach((p, idx) => {
      list.push({
        id: `p-${p.booking_id || idx}-${p.latitude}`,
        coordinate: { latitude: Number(p.latitude), longitude: Number(p.longitude) },
        children: (
          <View style={[styles.badge, p.is_current_user ? styles.myBadge : styles.passengerBadge]}>
            <Text style={styles.badgeText}>
              {p.is_current_user ? "📍 You (Pickup)" : (p.name || `Passenger ${idx + 1}`)}
            </Text>
          </View>
        ),
      });
    });

    if (validDriverDest) {
      list.push({
        id: "driver-dest",
        coordinate: validDriverDest,
        children: (
          <View style={[styles.badge, styles.destBadge]}>
            <Text style={styles.badgeText}>🏁 Driver Destination</Text>
          </View>
        ),
      });
    }

    if (driverCurrentLocation && Number.isFinite(driverCurrentLocation.latitude)) {
      const pos = rideStarted ? (smoothed.position ?? driverCurrentLocation) : driverCurrentLocation;
      list.push({
        id: "driver-vehicle",
        coordinate: pos,
        children: rideStarted ? (
          <View style={styles.navVehicleWrap}>
            <VehicleBody vehicleType={vehicleType} />
          </View>
        ) : (
          <View style={styles.carBadge}>
            <Text style={{ fontSize: 20 }}>🚗</Text>
          </View>
        ),
      });
    }

    return list;
  }, [validDriverStart, validDriverDest, validPassengers, driverCurrentLocation, rideStarted, smoothed.position, vehicleType]);

  return (
    <View style={[styles.container, { height }]}>
      <SyncroGoMap
        ref={mapRef}
        initialCenter={initialCenter}
        initialZoom={13}
        routeCoordinates={routeCoords}
        routeColor="#2563EB"
        markers={markers}
        navigationMode={rideStarted}
        onPanStart={() => {
          if (rideStarted && followMode) setFollowMode(false);
        }}
        height={height}
      />

      {/* Re-center / follow-driver button (only in navigation mode) */}
      {rideStarted && !followMode && (
        <Pressable onPress={handleRecenter} style={styles.recenterBtn} accessibilityLabel="Follow driver">
          <Text style={styles.recenterIcon}>🧭</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", borderRadius: 20, overflow: "hidden", backgroundColor: "#E2E8F0", position: "relative" },
  recenterBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  recenterIcon: { fontSize: 20 },
  navVehicleWrap: { alignItems: "center", justifyContent: "center" },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3 },
  startBadge: { backgroundColor: "#2563EB" },
  destBadge: { backgroundColor: "#DC2626" },
  passengerBadge: { backgroundColor: "#16A34A" },
  myBadge: { backgroundColor: "#7C3AED" },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  carBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#16A34A", elevation: 4 },
});