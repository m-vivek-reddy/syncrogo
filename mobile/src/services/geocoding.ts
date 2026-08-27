import * as Location from "expo-location";

export type PlaceResult = {
  displayName: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const PHOTON_URL = "https://photon.komoot.io/api";

export async function searchPlaces(
  query: string
): Promise<PlaceResult[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  // 1. Try Photon (Fast OSM Geocoder by Komoot)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = `${PHOTON_URL}?q=${encodeURIComponent(trimmed)}&limit=6`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.features) && json.features.length > 0) {
        const results: PlaceResult[] = [];
        for (const feat of json.features) {
          const p = feat.properties || {};
          const coords = feat.geometry?.coordinates;
          if (coords && coords.length >= 2) {
            const lon = coords[0];
            const lat = coords[1];
            const title = p.name || p.street || trimmed;
            const subParts = [p.street, p.district, p.city, p.state, p.country].filter(
              (part) => part && part !== title
            );
            const subtitle = subParts.slice(0, 3).join(", ");

            results.push({
              displayName: title,
              subtitle: subtitle || undefined,
              latitude: lat,
              longitude: lon,
            });
          }
        }
        if (results.length > 0) return results;
      }
    }
  } catch {}

  // 2. Try native device geocoding
  try {
    const nativeResults = await Location.geocodeAsync(trimmed).catch(() => []);
    if (nativeResults && nativeResults.length > 0) {
      const places: PlaceResult[] = [];
      for (const res of nativeResults.slice(0, 4)) {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: res.latitude,
          longitude: res.longitude,
        }).catch(() => []);

        let name = trimmed;
        let subtitle: string | undefined;
        if (reverse && reverse.length > 0) {
          const addr = reverse[0];
          name = addr.name || addr.street || trimmed;
          const parts = [
            addr.street,
            addr.district,
            addr.city,
            addr.region,
          ].filter((p) => p && p !== name);
          subtitle = parts.slice(0, 2).join(", ");
        }

        places.push({
          displayName: name,
          subtitle,
          latitude: res.latitude,
          longitude: res.longitude,
        });
      }
      if (places.length > 0) return places;
    }
  } catch {}

  // 3. Fallback to Nominatim / OSM search
  try {
    const url =
      `${NOMINATIM_URL}/search` +
      `?q=${encodeURIComponent(trimmed)}` +
      `&format=json` +
      `&limit=6` +
      `&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SyncroGo/1.0",
      },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return data.map((item: any) => {
      const addr = item.address || {};
      const street = addr.road || addr.street || addr.suburb || addr.neighbourhood;
      const city = addr.city || addr.town || addr.county || addr.state_district;
      const subtitle = [street, city, addr.state].filter(Boolean).join(", ");

      return {
        displayName: item.name || street || city || item.display_name.split(",")[0],
        subtitle: subtitle !== item.name ? subtitle : undefined,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      };
    });
  } catch {
    return [];
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  // 1. First try native device geocoding (fastest and most accurate on real Android/iOS devices)
  try {
    const nativeAddresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (nativeAddresses && nativeAddresses.length > 0) {
      const addr = nativeAddresses[0];
      const parts = [
        addr.name,
        addr.street,
        addr.district || addr.subregion,
        addr.city,
      ].filter(Boolean);

      // Deduplicate consecutive parts
      const uniqueParts = parts.filter(
        (part, idx) => part && parts.indexOf(part) === idx
      );

      if (uniqueParts.length > 0) {
        return uniqueParts.join(", ");
      }
    }
  } catch {}

  // 2. Fallback to Nominatim OSM reverse geocoding with detailed address breakdown
  try {
    const url =
      `${NOMINATIM_URL}/reverse` +
      `?lat=${latitude}` +
      `&lon=${longitude}` +
      `&format=json` +
      `&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SyncroGo/1.0",
      },
    });

    if (!response.ok) {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    const data = await response.json();
    if (data.address) {
      const a = data.address;
      const road = a.road || a.pedestrian || a.suburb || a.neighbourhood || a.residential;
      const area = a.suburb || a.city_district || a.county;
      const city = a.city || a.town || a.village || a.state;
      const formatted = [road, area, city].filter(Boolean).join(", ");
      if (formatted) return formatted;
    }

    return (
      data.display_name ||
      `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    );
  } catch {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
}

