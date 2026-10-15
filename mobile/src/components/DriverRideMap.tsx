import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { distanceToRouteMeters, fetchMultiPointRoute, type Coordinate } from "../services/routing";
import { useSmoothedVehicle, VehicleBody } from "./NavigationVehicle";
import { SyncroGoMap, type SyncroGoMapHandle, type SyncroGoMarker } from "./SyncroGoMap";

export type DriverPassengerMarker = {
  booking_id?: number;
  passenger_id?: number;
  name?: string;
  phone?: string;
  pickup_location?: string;
  latitude: number;
  longitude: number;
  status?: string;
};

export type DriverRideMapProps = {
  driverStart: { name?: string; latitude: number; longitude: number } | null;
  driverDestination: { name?: string; latitude: number; longitude: number } | null;
  driverCurrentLocation?: { latitude: number; longitude: number } | null;
  passengers?: DriverPassengerMarker[];
  /** Real ride status from the backend. When started, enables 3D navigation camera. */
  rideStarted?: boolean;
  /** Real vehicle type from the backend ("car" / "bike"). */
  vehicleType?: string | null;
  height?: number;
};

export default function DriverRideMap({
  driverStart,
  driverDestination,
  driverCurrentLocation,
  passengers = [],
  rideStarted = false,
  vehicleType,
  height = 380,
}: DriverRideMapProps) {
  const mapRef = useRef<SyncroGoMapHandle | null>(null);
  const [baseRoute, setBaseRoute] = useState<Coordinate[]>([]);
  const [activeRoute, setActiveRoute] = useState<Coordinate[]>([]);

  // Navigation camera state
  const [followMode, setFollowMode] = useState(true);

  // Smoothed vehicle position/heading derived ONLY from real GPS fixes.
  const smoothed = useSmoothedVehicle(driverCurrentLocation ?? null, rideStarted);

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

  // Passengers 300m on-route validation
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

  // Active Route Waypoints
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

  useEffect(() => {
    if (rideStarted) return;
    const allCoords: Coordinate[] = [];
    if (validDriverStart) allCoords.push(validDriverStart);
    evaluatedPassengers.forEach(p => allCoords.push({ latitude: Number(p.latitude), longitude: Number(p.longitude) }));
    if (validDriverDest) allCoords.push(validDriverDest);
    if (driverCurrentLocation && Number.isFinite(driverCurrentLocation.latitude)) {
      allCoords.push(driverCurrentLocation);
    }

    if (allCoords.length > 0) {
      const t = setTimeout(() => {
        mapRef.current?.fitBounds(allCoords, 60);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [rideStarted, validDriverStart, validDriverDest, evaluatedPassengers, driverCurrentLocation]);

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
          <View style={[styles.pin, styles.startPin]}>
            <Text style={styles.pinIcon}>📍</Text>
          </View>
        ),
      });
    }

    evaluatedPassengers.forEach((p, idx) => {
      const isCompleted = p.status === "COMPLETED";
      const isPickedUp = p.status === "PICKED_UP";
      const isOutside = p.isOutsideRoute;

      let pinStyle = styles.passengerPin;
      if (isCompleted) pinStyle = styles.completedPin;
      else if (isPickedUp) pinStyle = styles.pickedPin;
      else if (isOutside) pinStyle = styles.warnPin;

      list.push({
        id: `dp-${p.booking_id || idx}-${p.latitude}`,
        coordinate: { latitude: Number(p.latitude), longitude: Number(p.longitude) },
        children: (
          <View style={[styles.pin, pinStyle]}>
            <Text style={styles.pinIcon}>👤</Text>
          </View>
        ),
      });
    });

    if (validDriverDest) {
      list.push({
        id: "driver-dest",
        coordinate: validDriverDest,
        children: (
          <View style={[styles.pin, styles.destPin]}>
            <Text style={styles.pinIcon}>🏁</Text>
          </View>
        ),
      });
    }

    const markerLocation = driverCurrentLocation ?? (
      rideStarted && validDriverStart
        ? { latitude: validDriverStart.latitude, longitude: validDriverStart.longitude }
        : null
    );
    if (markerLocation && Number.isFinite(markerLocation.latitude)) {
      const pos = rideStarted ? (smoothed.position ?? markerLocation) : markerLocation;
      list.push({
        id: "driver-vehicle",
        coordinate: pos,
        children: rideStarted ? (
          <View style={styles.navVehicleWrap}>
            <VehicleBody vehicleType={vehicleType} />
          </View>
        ) : (
          <View style={styles.carBadge}>
            <Text style={{ fontSize: 18 }}>🚗</Text>
          </View>
        ),
      });
    }

    return list;
  }, [validDriverStart, validDriverDest, evaluatedPassengers, driverCurrentLocation, rideStarted, smoothed.position, vehicleType]);

  return (
    <View style={[styles.container, { height }]}>
      <SyncroGoMap
        ref={mapRef}
        initialCenter={initialCenter}
        initialZoom={13}
        routeCoordinates={activeRoute}
        routeColor="#16A34A"
        markers={markers}
        navigationMode={rideStarted}
        onPanStart={() => {
          // User is manually exploring: stop auto-following the vehicle.
          if (rideStarted && followMode) setFollowMode(false);
        }}
        height={height}
      />

      {/* Re-center / follow-driver button (only in navigation mode) */}
      {rideStarted && !followMode && (
        <Pressable onPress={handleRecenter} style={styles.recenterBtn} accessibilityLabel="Follow my vehicle">
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
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  startPin: { backgroundColor: "#2563EB" },
  destPin: { backgroundColor: "#DC2626" },
  passengerPin: { backgroundColor: "#16A34A" },
  pickedPin: { backgroundColor: "#0284C7" },
  completedPin: { backgroundColor: "#64748B" },
  warnPin: { backgroundColor: "#D97706" },
  pinIcon: { fontSize: 16 },
  carBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#16A34A",
    elevation: 4,
  },
});
