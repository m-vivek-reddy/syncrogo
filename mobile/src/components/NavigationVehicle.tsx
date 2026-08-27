import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { Coordinate } from "../services/routing";

/**
 * Reusable 3D-navigation helpers for ride maps.
 *
 * - useSmoothedVehicle(): interpolates between consecutive real GPS fixes so
 *   the vehicle glides instead of jumping. It NEVER invents coordinates: if
 *   there is no target, there is no position.
 * - bearingBetween(): compass heading from real movement.
 * - VehicleBody(): a 3D-looking top-down vehicle rendered with layered views.
 *   This is intentionally isolated so it can later be swapped for a real
 *   SyncroGo GLB/model asset without touching the map components.
 */

export function bearingBetween(a: Coordinate, b: Coordinate): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const y =
    Math.sin(toRad(b.longitude - a.longitude)) *
    Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) *
    Math.cos(toRad(b.latitude)) *
    Math.cos(toRad(b.longitude - a.longitude));

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const INTERPOLATION_MS = 900;

export function useSmoothedVehicle(
  target: Coordinate | null,
  enabled: boolean
): { position: Coordinate | null; heading: number } {
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [heading, setHeading] = useState(0);

  const animRef = useRef<number | null>(null);
  const fromRef = useRef<Coordinate | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (!enabled || !target) {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      if (!enabled) {
        setPosition(null);
      }
      return;
    }

    const from = fromRef.current;
    fromRef.current = target;

    // First fix: place the vehicle immediately, no animation.
    if (!from) {
      setPosition(target);
      startRef.current = Date.now();
      return;
    }

    // Update rotation from REAL movement direction.
    const movedMetersApprox =
      Math.abs(target.latitude - from.latitude) +
      Math.abs(target.longitude - from.longitude);
    if (movedMetersApprox > 0.000005) {
      setHeading(bearingBetween(from, target));
    }

    // Interpolate from -> target over INTERPOLATION_MS.
    const startTime = Date.now();
    startRef.current = startTime;

    const step = () => {
      const t = Math.min(1, (Date.now() - startTime) / INTERPOLATION_MS);
      const eased = t * (2 - t); // ease-out

      setPosition({
        latitude: from.latitude + (target.latitude - from.latitude) * eased,
        longitude: from.longitude + (target.longitude - from.longitude) * eased,
      });

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
      }
    };

    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
    }
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [target?.latitude, target?.longitude, enabled, target]);

  return { position, heading };
}

/**
 * 3D-looking top-down vehicle built from layered views (body, cabin/glass,
 * headlights, drop shadow). Swap this component's internals for a real
 * SyncroGo model/image asset later without changing any map code.
 */
export function VehicleBody({ vehicleType }: { vehicleType?: string | null }) {
  const type = String(vehicleType || "car").toLowerCase();
  const isBike =
    type === "bike" || type === "motorcycle" || type === "scooter";

  if (isBike) {
    return (
      <View style={styles.bikeShadow}>
        <View style={[styles.bikeBody, { backgroundColor: "#1D4ED8" }]}>
          <View style={styles.bikeSeat} />
          <View style={styles.bikeFront} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.carShadow}>
      <View style={styles.carBody}>
        {/* Windshield */}
        <View style={styles.carWindshield} />
        {/* Roof / cabin */}
        <View style={styles.carRoof} />
        {/* Rear window */}
        <View style={styles.carRearGlass} />
        {/* Headlights */}
        <View style={styles.headlightLeft} />
        <View style={styles.headlightRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carShadow: {
    width: 30,
    height: 54,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.28)",
    transform: [{ translateX: 2 }, { translateY: 3 }],
    position: "absolute",
  },
  carBody: {
    width: 30,
    height: 54,
    borderRadius: 9,
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#0F5132",
    alignItems: "center",
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  carWindshield: {
    width: 20,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#BAE6FD",
    marginTop: 7,
  },
  carRoof: {
    width: 22,
    height: 16,
    borderRadius: 3,
    backgroundColor: "#15803D",
    marginTop: 2,
  },
  carRearGlass: {
    width: 20,
    height: 7,
    borderRadius: 3,
    backgroundColor: "#BAE6FD",
    marginTop: 2,
  },
  headlightLeft: {
    position: "absolute",
    top: 1,
    left: 3,
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FEF9C3",
  },
  headlightRight: {
    position: "absolute",
    top: 1,
    right: 3,
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FEF9C3",
  },
  bikeShadow: {
    width: 14,
    height: 34,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.28)",
    transform: [{ translateX: 1.5 }, { translateY: 2 }],
    position: "absolute",
  },
  bikeBody: {
    width: 14,
    height: 34,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#1E3A8A",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  bikeSeat: {
    width: 8,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#0F172A",
    marginTop: 14,
  },
  bikeFront: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FEF9C3",
    marginTop: 2,
  },
});
