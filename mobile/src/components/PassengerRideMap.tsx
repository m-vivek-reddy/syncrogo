import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { fetchMultiPointRoute, type Coordinate } from "../services/routing";
import { useSmoothedVehicle, VehicleBody } from "./NavigationVehicle";

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
  const mapRef = useRef<MapView | null>(null);
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
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(allCoords, {
          edgePadding: { top: 60, right: 50, bottom: 60, left: 50 },
          animated: true,
        });
      }, 300);
    }
  }, [waypoints, driverCurrentLocation]);

  const initialRegion = {
    latitude: validDriverStart?.latitude || 17.385,
    longitude: validDriverStart?.longitude || 78.4867,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Smoothly transition to a 3D navigation camera when the ride starts.
  useEffect(() => {
    if (!rideStarted || !mapRef.current) return;
    setFollowMode(true);
    mapRef.current.animateCamera(
      {
        pitch: 50,
        heading: smoothed.heading,
        center: smoothed.position
          ? { latitude: smoothed.position.latitude, longitude: smoothed.position.longitude }
          : undefined,
        zoom: 17,
      },
      { duration: 1500 }
    );
    // Only on transition into navigation mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideStarted]);

  // Follow camera during navigation. Skipped while user is manually exploring.
  useEffect(() => {
    if (!rideStarted || !followMode || !mapRef.current) return;
    if (!smoothed.position) return;
    mapRef.current.animateCamera(
      {
        pitch: 50,
        heading: smoothed.heading,
        center: {
          latitude: smoothed.position.latitude,
          longitude: smoothed.position.longitude,
        },
        zoom: 17,
      },
      { duration: 600 }
    );
  }, [rideStarted, followMode, smoothed.position?.latitude, smoothed.position?.longitude, smoothed.heading]);

  const handleRecenter = () => {
    setFollowMode(true);
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={!rideStarted}
        showsMyLocationButton={false}
        onPanDrag={() => {
          if (rideStarted && followMode) setFollowMode(false);
        }}
      >
        {validDriverStart && (
          <Marker coordinate={validDriverStart} title="Driver Pickup" description="Ride Start Point">
            <View style={[styles.badge, styles.startBadge]}>
              <Text style={styles.badgeText}>🚀 Driver Start</Text>
            </View>
          </Marker>
        )}

        {validPassengers.map((p, idx) => (
          <Marker
            key={`p-${p.booking_id || idx}-${p.latitude}`}
            coordinate={{ latitude: Number(p.latitude), longitude: Number(p.longitude) }}
            title={p.is_current_user ? "Your Pickup" : (p.name || `Passenger ${idx + 1}`)}
            description={p.pickup_location || "Passenger Pickup"}
          >
            <View style={[styles.badge, p.is_current_user ? styles.myBadge : styles.passengerBadge]}>
              <Text style={styles.badgeText}>
                {p.is_current_user ? "📍 You (Pickup)" : (p.name || `Passenger ${idx + 1}`)}
              </Text>
            </View>
          </Marker>
        ))}

        {validDriverDest && (
          <Marker coordinate={validDriverDest} title="Driver Destination" description="Ride End Point">
            <View style={[styles.badge, styles.destBadge]}>
              <Text style={styles.badgeText}>🏁 Driver Destination</Text>
            </View>
          </Marker>
        )}

        {(() => {
          if (!driverCurrentLocation || !Number.isFinite(driverCurrentLocation.latitude)) return null;
          const pos = rideStarted ? (smoothed.position ?? driverCurrentLocation) : driverCurrentLocation;
          return (
            <Marker
              coordinate={pos}
              title="Driver Current Location"
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={rideStarted ? smoothed.heading : 0}
              flat={rideStarted}
            >
              {rideStarted ? (
                <View style={styles.navVehicleWrap}>
                  <VehicleBody vehicleType={vehicleType} />
                </View>
              ) : (
                <View style={styles.carBadge}>
                  <Text style={{ fontSize: 20 }}>🚗</Text>
                </View>
              )}
            </Marker>
          );
        })()}

        {routeCoords.length >= 2 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2563EB"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

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
  map: { ...StyleSheet.absoluteFillObject },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3 },
  startBadge: { backgroundColor: "#2563EB" },
  destBadge: { backgroundColor: "#DC2626" },
  passengerBadge: { backgroundColor: "#16A34A" },
  myBadge: { backgroundColor: "#7C3AED" },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  carBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#16A34A", elevation: 4 },
});