// src/services/routing.ts

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export type LeafletRoute = [number, number][];

interface OSRMResponse {
  code: string;
  routes?: {
    geometry: {
      coordinates: [number, number][];
    };
    distance: number;
    duration: number;
  }[];
}

/**
 * Get a real road route using the public OSRM routing service.
 *
 * IMPORTANT:
 * OSRM uses:
 * longitude,latitude
 *
 * Leaflet uses:
 * latitude,longitude
 */
export async function getRoadRoute(
  start: RoutePoint,
  destination: RoutePoint
): Promise<{
  coordinates: LeafletRoute;
  distanceKm: number;
  durationMinutes: number;
}> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.longitude},${start.latitude};` +
    `${destination.longitude},${destination.latitude}` +
    `?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Routing request failed: ${response.status}`
    );
  }

  const data: OSRMResponse = await response.json();

  if (
    data.code !== "Ok" ||
    !data.routes ||
    data.routes.length === 0
  ) {
    throw new Error("No road route found.");
  }

  const route = data.routes[0];

  const coordinates: LeafletRoute =
    route.geometry.coordinates.map(
      ([longitude, latitude]) =>
        [latitude, longitude] as [number, number]
    );

  return {
    coordinates,
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
}