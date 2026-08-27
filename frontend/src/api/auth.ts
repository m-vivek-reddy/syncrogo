import { apiClient } from './client';
import { primeCurrentUser } from './currentUser';
import { useAppStore } from '../store/useAppStore';

// ==========================================
// 1. LOGIN FUNCTION
// ==========================================
export const loginWithFastAPI = async (email: string, password: string) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const formData = new URLSearchParams();
    formData.append('username', cleanEmail);
    formData.append('password', password);

    const response = await apiClient.post('/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, user: profile } = response.data;
    localStorage.setItem('syncrogo_token', access_token);
    localStorage.setItem('token', access_token);
    primeCurrentUser(access_token, profile);

    useAppStore.getState().login({
      id: String(profile.id),
      name: profile.full_name || profile.name || profile.email,
      email: profile.email,
      rating: profile.rating ?? 0,
      role: profile.role,
      profile_photo_url: profile.profile_photo_url,
    });

    return {
      success: true,
      role: profile.role,
      user: profile,
    };
  } catch (error: any) {
    console.error('Login Failed:', error);
    const errorMsg = error.response?.data?.detail || 'Invalid credentials or server error';
    return {
      success: false,
      error: errorMsg,
      status: error.response?.status,
    };
  }
};

// ==========================================
// 2. REGISTER FUNCTION
// ==========================================
export const registerWithFastAPI = async (name: string, email: string, password: string) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const response = await apiClient.post('/api/v1/users/register', {
      full_name: name.trim(),
      email: cleanEmail,
      password: password,
      phone: "0000000000", // Placeholder to satisfy backend requirements
      role: "passenger"    // Default role
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Registration Failed:', error);
    const errorMsg = error.response?.data?.detail || 'Failed to create account';
    return { success: false, error: errorMsg, status: error.response?.status };
  }
};

// ==========================================
// 3. BOOK RIDE FUNCTION
// ==========================================
export const bookRideWithBackend = async (rideDetails: {
  pickup_location: string;
  pickup_lat: number;
  pickup_lon: number;
  dropoff_location: string;
  dropoff_lat: number;
  dropoff_lon: number;
  ride_type: string;
  fare: number;
}) => {
  try {
    const response = await apiClient.post('/rides', rideDetails);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to book ride via database:', error);
    const errorMsg = error.response?.data?.detail || 'Booking failed due to server error';
    return { success: false, error: errorMsg };
  }
};

export const fetchPassengerBookings = async () => {
  try {
    const response = await apiClient.get('/api/v1/bookings/mine');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch passenger bookings:', error);
    return { success: false, data: [] };
  }
};

export const cancelBookingWithBackend = async (bookingId: number) => {
  try {
    const response = await apiClient.post(`/api/v1/bookings/${bookingId}/cancel`);
    return response.data;
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    return { success: false, message: 'Network error' };
  }
};

export const fetchDriverBookings = async () => {
  try {
    const response = await apiClient.get('/api/v1/bookings/driver/mine');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch driver bookings:', error);
    return { success: false, data: [] };
  }
};

// ==========================================
// 4. PUBLISH RIDE OFFER (DRIVER)
// ==========================================
export const publishOfferWithBackend = async (offerData: {
  pickup_location: string;
  pickup_lat: number;
  pickup_lon: number;
  dropoff_location: string;
  dropoff_lat: number;
  dropoff_lon: number;
  departure_time?: string | null;
  distance_km: number;
  vehicle_type: string;
  price_per_seat: number;
  available_seats: number;
  gender_preference: string;
}) => {
  try {
    const response = await apiClient.post('/api/v1/rides/offer', offerData);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to publish offer:', error);
    const errorMsg = error.response?.data?.detail || 'Server error';
    return { success: false, error: errorMsg };
  }
};

// ==========================================
// 5. SEARCH FOR RIDES (PASSENGER)
// ==========================================
export const searchRidesWithBackend = async (
  pickup_lat: number,
  pickup_lon: number,
  dropoff_lat: number,
  dropoff_lon: number
) => {
  try {
    const response = await apiClient.get('/api/v1/rides/search', {
      params: { pickup_lat, pickup_lon, dropoff_lat, dropoff_lon }
    });
    return { success: true, data: response.data.data };
  } catch (error: any) {
    console.error('Failed to search rides:', error);
    return { success: false, data: [] };
  }
};

// ==========================================
// 6. BOOK A SEAT (PASSENGER)
// ==========================================
export const bookSeatWithBackend = async (rideId: number) => {
  try {
    const response = await apiClient.post('/api/v1/bookings', { ride_id: rideId });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to book seat:', error);
    const errorMsg = error.response?.data?.detail || 'Failed to book seat';
    return { success: false, error: errorMsg };
  }
};

// ==========================================
// 7. GET ACTIVE RIDE (DRIVER DASHBOARD)
// ==========================================
export const fetchActiveDriverRide = async () => {
  try {
    const response = await apiClient.get('/api/v1/rides/driver/active');
    return response.data; // Returns { success, data: active_ride }
  } catch (error) {
    console.error('Failed to fetch active ride:', error);
    return { success: false };
  }
};

// ==========================================
// 8. PRICING ENGINE CALCULATION
// ==========================================
export const calculateFareWithBackend = async (
  distanceKm: number,
  rideType: string = 'carpool',
  durationMinutes: number = 0,
) => {
  try {
    const response = await apiClient.post('/pricing/calculate', {
      distance_km: distanceKm,
      ride_type: rideType,
      duration_minutes: durationMinutes,
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to calculate fare:', error);
    const errorMsg = error.response?.data?.detail || 'Failed to calculate pricing';
    return { success: false, error: errorMsg };
  }
};

// ==========================================
// 9. CREATE RAZORPAY PAYMENT ORDER
// ==========================================
export const createPaymentOrder = async (amount: number, rideId: number) => {
  try {
    const response = await apiClient.post('/payments/create-order', {
      amount,
      ride_id: rideId,
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Failed to create payment order:', error);
    const errorMsg = error.response?.data?.detail || 'Failed to create payment order';
    return { success: false, error: errorMsg };
  }
};

// ==========================================
// 10. VERIFY RAZORPAY PAYMENT SIGNATURE
// ==========================================
export const verifyPaymentSignature = async (paymentDetails: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  ride_id: number;
}) => {
  try {
    const response = await apiClient.post('/payments/verify', paymentDetails);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    const errorMsg = error.response?.data?.detail || 'Payment verification failed';
    return { success: false, error: errorMsg };
  }
};
