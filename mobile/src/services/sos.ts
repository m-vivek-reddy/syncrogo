export type SosPayload = {
  latitude: number;
  longitude: number;
  ride_id?: number;
};

export function buildSosPayload(
  latitude: number,
  longitude: number,
  rideId?: number,
): SosPayload {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Current location has an invalid latitude.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Current location has an invalid longitude.");
  }
  if (rideId !== undefined && (!Number.isSafeInteger(rideId) || rideId <= 0)) {
    throw new Error("The active ride ID is invalid.");
  }

  return rideId === undefined
    ? { latitude, longitude }
    : { latitude, longitude, ride_id: rideId };
}
