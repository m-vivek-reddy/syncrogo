export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type RouteResult = {
  distanceKm: number;
  durationMinutes: number;
  coordinates: Coordinate[];
};

const OSRM_URL = "https://router.project-osrm.org";

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 */
export function haversineDistanceKm(
  start: Coordinate,
  end: Coordinate
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((end.latitude - start.latitude) * Math.PI) / 180;
  const dLon = ((end.longitude - start.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start.latitude * Math.PI) / 180) *
      Math.cos((end.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Vehicle types supported by routing.
 * Bikes are routed with the OSRM `bike` profile which avoids motorways
 * (e.g. Hyderabad ORR bans two-wheelers).
 */
export type RouteVehicleType = "car" | "bike";

/**
 * Requests a route from the OSRM server.
 * NOTE: router.project-osrm.org rejects `exclude=` classes with HTTP 400
 * (the demo dataset isn't prepped with excludable classes), so bikes use
 * the dedicated `bike` profile instead, which naturally avoids motorways.
 * Returns null if OSRM is unreachable or no route was found.
 */
async function requestOsrmRoute(
  url: string
): Promise<RouteResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) return null;

    const data = await response.json();

    // OSRM returns non-"Ok" codes (e.g. "NoRoute") with HTTP 200,
    // so the code must be checked explicitly.
    if (
      !data ||
      data.code !== "Ok" ||
      !Array.isArray(data.routes) ||
      data.routes.length === 0 ||
      !data.routes[0].geometry
    ) {
      return null;
    }

    const route = data.routes[0];

    const coordinates: Coordinate[] =
      route.geometry.coordinates.map(
        ([longitude, latitude]: [number, number]) => ({
          latitude,
          longitude,
        })
      );

    if (coordinates.length < 2) return null;

    return {
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      durationMinutes: Math.max(1, Math.ceil(route.duration / 60)),
      coordinates,
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn("OSRM routing request failed:", err);
    return null;
  }
}

/**
 * Fetches real road driving route from Open Source Routing Machine (OSRM).
 * For bikes, first tries with motorways excluded; if that yields no route
 * (e.g. the only viable path uses a motorway), retries without the
 * exclusion so a real road route is still drawn instead of a straight line.
 */
export async function fetchRoute(
  start: Coordinate,
  end: Coordinate,
  vehicleType?: RouteVehicleType | string
): Promise<RouteResult> {
  const isBike = String(vehicleType).toLowerCase() === "bike";
  const profile = isBike ? "bike" : "driving";
  const base =
    `${OSRM_URL}/route/v1/${profile}/` +
    `${start.longitude},${start.latitude};` +
    `${end.longitude},${end.latitude}`;
  const params = "?overview=full&geometries=geojson";

  // Bike profile avoids motorways natively (e.g. Hyderabad ORR).
  let result: RouteResult | null = await requestOsrmRoute(`${base}${params}`);

  if (!result && isBike) {
    // Fallback to the driving profile if the bike profile has no route.
    result = await requestOsrmRoute(
      `${OSRM_URL}/route/v1/driving/` +
        `${start.longitude},${start.latitude};` +
        `${end.longitude},${end.latitude}${params}`
    );
  }

  if (result) return result;
  // Fallback: Haversine distance with 1.25 road curvature factor
  const straightKm = haversineDistanceKm(start, end);
  const roadKm = Math.max(0.1, Number((straightKm * 1.25).toFixed(2)));
  // Avg city speed ~32 km/h
  const durationMin = Math.max(2, Math.ceil((roadKm / 32) * 60));

  return {
    distanceKm: roadKm,
    durationMinutes: durationMin,
    coordinates: [start, end],
  };
}

function coordinateToOSRM(coordinate: Coordinate): string {
  return `${coordinate.longitude},${coordinate.latitude}`;
}

export async function fetchRoadRoute(
  pickup: Coordinate,
  destination: Coordinate,
  vehicleType?: RouteVehicleType | string
): Promise<RouteResult> {
  const isBike = String(vehicleType).toLowerCase() === "bike";
  const profile = isBike ? "bike" : "driving";
  const coordinates = [
    coordinateToOSRM(pickup),
    coordinateToOSRM(destination),
  ].join(";");

  const url =
    `${OSRM_URL}/route/v1/${profile}/${coordinates}` +
    `?overview=full&geometries=geojson&steps=false`;

  let data: any;
  try {
    const response = await fetch(url);
    if (response.ok) {
      data = await response.json();
    }
  } catch {
    data = null;
  }

  /* The bike profile can occasionally fail to snap or route; fall back to
   * the driving profile so a road route is still shown instead of an error. */
  if (!data || data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
    if (isBike) {
      try {
        const fallbackUrl =
          `${OSRM_URL}/route/v1/driving/${coordinates}` +
          `?overview=full&geometries=geojson&steps=false`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (
            fallbackData &&
            fallbackData.code === "Ok" &&
            Array.isArray(fallbackData.routes) &&
            fallbackData.routes.length > 0
          ) {
            data = fallbackData;
          }
        }
      } catch {
        // keep data null
      }
    }
  }

  if (
    !data ||
    data.code !== "Ok" ||
    !Array.isArray(data.routes) ||
    data.routes.length === 0
  ) {
    throw new Error("No road route was found.");
  }

  const route = data.routes[0];
  const distanceMeters = Number(route.distance) || 0;
  const durationSeconds = Number(route.duration) || 0;
  const geometry = route.geometry?.coordinates;

  let routeCoordinates: Coordinate[] = [];

  if (Array.isArray(geometry)) {
    routeCoordinates = geometry
      .filter(
        (point: unknown) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      )
      .map((point: number[]) => ({
        longitude: Number(point[0]),
        latitude: Number(point[1]),
      }));
  }

  if (routeCoordinates.length < 2) {
    routeCoordinates = [pickup, destination];
  }

  return {
    distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    coordinates: routeCoordinates,
  };
}

export async function fetchMultiPointRoute(
  waypoints: Coordinate[],
  vehicleType?: RouteVehicleType | string
): Promise<RouteResult> {
  const validWaypoints = waypoints.filter(
    (w) =>
      w &&
      Number.isFinite(Number(w.latitude)) &&
      Number.isFinite(Number(w.longitude))
  );

  if (validWaypoints.length < 2) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      coordinates: validWaypoints,
    };
  }

  const coordString = validWaypoints
    .map((w) => `${w.longitude},${w.latitude}`)
    .join(";");

  const isBike = String(vehicleType).toLowerCase() === "bike";
  const profile = isBike ? "bike" : "driving";
  const urls = [
    `${OSRM_URL}/route/v1/${profile}/${coordString}` +
      `?overview=full&geometries=geojson&steps=false`,
    // Fallback to driving profile for bikes if the bike profile fails.
    ...(isBike
      ? [
          `${OSRM_URL}/route/v1/driving/${coordString}` +
            `?overview=full&geometries=geojson&steps=false`,
        ]
      : []),
  ];

  for (const attemptUrl of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(attemptUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) continue;

      const data = await response.json();
      if (
        !data ||
        data.code !== "Ok" ||
        !Array.isArray(data.routes) ||
        data.routes.length === 0
      ) {
        // OSRM may return "NoRoute" with the exclusion — retry without it.
        clearTimeout(timer);
        continue;
      }

      const route = data.routes[0];
        const distanceMeters = Number(route.distance) || 0;
        const durationSeconds = Number(route.duration) || 0;
        const geometry = route.geometry?.coordinates;

        let routeCoordinates: Coordinate[] = [];
        if (Array.isArray(geometry)) {
          routeCoordinates = geometry
            .filter(
              (point: unknown) =>
                Array.isArray(point) &&
                point.length >= 2 &&
                Number.isFinite(Number(point[0])) &&
                Number.isFinite(Number(point[1]))
            )
            .map((point: number[]) => ({
              longitude: Number(point[0]),
              latitude: Number(point[1]),
            }));
        }

        if (routeCoordinates.length >= 2) {
          return {
            distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
            durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
            coordinates: routeCoordinates,
          };
        }
    } catch (err) {
      console.warn("Multi-point OSRM request failed:", err);
    }
  }

  let totalKm = 0;
  for (let i = 0; i < validWaypoints.length - 1; i++) {
    totalKm += haversineDistanceKm(validWaypoints[i], validWaypoints[i + 1]);
  }
  const roadKm = Math.max(0.1, Number((totalKm * 1.25).toFixed(2)));
  const durationMin = Math.max(2, Math.ceil((roadKm / 32) * 60));

  return {
    distanceKm: roadKm,
    durationMinutes: durationMin,
    coordinates: validWaypoints,
  };
}

/**
 * Calculates minimum distance in meters from a point to a route polyline.
 * Used for the 300-meter on-route validation rule.
 */
export function distanceToRouteMeters(
  point: Coordinate,
  polyline: Coordinate[]
): number {
  if (!polyline || polyline.length === 0) return 999999;
  if (polyline.length === 1) return haversineDistanceKm(point, polyline[0]) * 1000;

  let minDistanceMeters = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    // Convert lat/lon to approximate Cartesian meters relative to p1
    const cosLat = Math.cos((p1.latitude * Math.PI) / 180);
    const x = (point.longitude - p1.longitude) * cosLat * 111320;
    const y = (point.latitude - p1.latitude) * 111320;

    const dx = (p2.longitude - p1.longitude) * cosLat * 111320;
    const dy = (p2.latitude - p1.latitude) * 111320;

    const segmentLenSq = dx * dx + dy * dy;
    let t = 0;
    if (segmentLenSq > 0) {
      t = (x * dx + y * dy) / segmentLenSq;
      t = Math.max(0, Math.min(1, t)); // clamp to line segment
    }

    const projX = t * dx;
    const projY = t * dy;

    const distMeters = Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
    if (distMeters < minDistanceMeters) {
      minDistanceMeters = distMeters;
    }
  }

  return Math.round(minDistanceMeters);
}
