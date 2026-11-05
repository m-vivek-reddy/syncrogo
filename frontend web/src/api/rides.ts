import { apiClient } from "./client";
import type { Ride, Booking, PricingCalculation } from "../types";

export interface SearchRidesParams {
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat?: number;
  dropoff_lon?: number;
}

export interface PublishRidePayload {
  pickup_location: string;
  pickup_lat: number;
  pickup_lon: number;
  dropoff_location: string;
  dropoff_lat: number;
  dropoff_lon: number;
  distance_km: number;
  vehicle_type: 'car' | 'bike';
  available_seats: number;
  gender_preference?: string;
  price_per_seat?: number;
  departure_time?: string;
  discount?: number;
}

export const searchRidesApi = async (params: SearchRidesParams): Promise<{ success: boolean; data: Ride[]; count: number }> => {
  try {
    const res = await apiClient.get("/api/v1/rides/search", {
      params: {
        pickup_lat: params.pickup_lat,
        pickup_lon: params.pickup_lon,
        ...(params.dropoff_lat ? { dropoff_lat: params.dropoff_lat } : {}),
        ...(params.dropoff_lon ? { dropoff_lon: params.dropoff_lon } : {}),
      },
    });
    return {
      success: true,
      data: res.data.data || [],
      count: res.data.count || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      count: 0,
    };
  }
};

export const publishRideApi = async (payload: PublishRidePayload): Promise<{ success: boolean; data?: Ride; message?: string }> => {
  try {
    const res = await apiClient.post("/api/v1/rides/offer", payload);
    return {
      success: true,
      data: res.data.data || res.data,
      message: "Ride published successfully!",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to publish ride. Please sign in or check inputs.",
    };
  }
};

export const calculateFareApi = async (distance_km: number, vehicle_type: 'car' | 'bike'): Promise<PricingCalculation | null> => {
  try {
    const res = await apiClient.post("/pricing/calculate", {
      distance_km,
      ride_type: vehicle_type === 'bike' ? 'bike' : 'carpool',
    });
    const pricing = res.data;
    return {
      distance_km: pricing.distance_km ?? distance_km,
      vehicle_type,
      base_fare: pricing.base_fare ?? 0,
      per_km_rate: pricing.per_km_rate ?? (vehicle_type === 'bike' ? 5 : 10),
      estimated_fare: pricing.estimated_fare ?? pricing.total_fare ?? pricing.final_fare ?? 0,
    };
  } catch {
    // Fallback sensible estimate matching SyncroGo formula if backend pricing router unavailable
    const base = vehicle_type === "bike" ? 20 : 45;
    const rate = vehicle_type === "bike" ? 6 : 14;
    return {
      distance_km,
      vehicle_type,
      base_fare: base,
      per_km_rate: rate,
      estimated_fare: Math.round(base + (distance_km * rate)),
    };
  }
};

export const bookRideApi = async (rideId: number, seats: number = 1): Promise<{ success: boolean; data?: Booking; message?: string }> => {
  try {
    const res = await apiClient.post(`/api/v1/rides/${rideId}/book`, {
      seats_booked: seats,
    });
    return {
      success: true,
      data: res.data.booking || res.data,
      message: "Ride booked successfully! Connect with your co-travelers.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Failed to book ride. Please ensure you are logged in.",
    };
  }
};

export const fetchActiveRidesApi = async (): Promise<Ride[]> => {
  try {
    const res = await apiClient.get("/api/v1/rides/driver/active");
    return Array.isArray(res.data) ? res.data : (res.data.rides || []);
  } catch {
    return [];
  }
};

export const updateRideLocationApi = async (
  rideId: number,
  latitude: number,
  longitude: number,
): Promise<{ success: boolean; distance_km?: number; price_locked?: boolean; message?: string }> => {
  try {
    const { data } = await apiClient.patch(`/api/v1/rides/${rideId}/location`, { latitude, longitude });
    return { success: true, ...data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Could not update ride location.' };
  }
};
