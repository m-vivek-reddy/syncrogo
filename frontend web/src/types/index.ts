export type VehicleType = 'car' | 'bike';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  profile_photo?: string;
  is_verified?: boolean;
  rating?: number;
  rides_count?: number;
  communities_count?: number;
  badges?: string[];
  bio?: string;
}

export interface Ride {
  id: number;
  driver_id?: number;
  driver_name: string;
  driver_rating: number;
  driver_photo?: string;
  driver_verified?: boolean;
  pickup_location: string;
  pickup_lat: number;
  pickup_lon: number;
  dropoff_location: string;
  dropoff_lat: number;
  dropoff_lon: number;
  distance_km: number;
  vehicle_type: VehicleType;
  vehicle_model?: string;
  vehicle_number?: string;
  available_seats: number;
  total_seats?: number;
  price_per_seat: number;
  departure_time: string;
  status: 'published' | 'active' | 'completed' | 'cancelled';
  gender_preference?: string;
  notes?: string;
  mrp_fare?: number;
  discount?: number;
  /** Distance left after deducting what the driver has already covered. */
  remaining_distance_km?: number;
  current_fare?: number;
  /** Distance captured at booking time; only present when the price is locked. */
  original_distance_km?: number | null;
  price_locked?: boolean;
  /** How far the driver still is from the pickup point. */
  driver_pickup_distance_km?: number | null;
  /** Distance from the ride origin to the pickup point returned by ride search. */
  pickup_distance_km?: number | null;
}

export interface Booking {
  id: number;
  ride_id: number;
  passenger_id: number;
  seats_booked: number;
  total_fare: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  otp?: string;
  created_at?: string;
}

export type PostType =
  | 'general'
  | 'ride_request'
  | 'ride_offer'
  | 'traffic'
  | 'safety'
  | 'question'
  | 'event';

export interface RouteDetail {
  from: string;
  to: string;
  date?: string;
  time?: string;
  vehicle_type?: VehicleType;
  seats?: number;
  price?: number;
  ride_id?: number;
  preferences?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  authorAvatar?: string;
  isVerified?: boolean;
  text: string;
  createdAt: string;
  likes: number;
  hasLiked?: boolean;
  replies?: PostComment[];
}

export interface CommunityPost {
  id: string;
  userId?: number;
  authorName: string;
  authorAvatar?: string;
  isVerified?: boolean;
  role?: string;
  createdAt: string;
  groupName: string;
  postType: PostType;
  title?: string;
  content: string;
  imageUrl?: string;
  routeInfo?: RouteDetail;
  likes: number;
  commentsCount: number;
  shares: number;
  hasLiked?: boolean;
  hasSaved?: boolean;
  comments?: PostComment[];
}

export interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'commute' | 'campus' | 'office' | 'city' | 'eco';
  memberCount: number;
  isJoined?: boolean;
  routeHighlight?: string;
}

export interface CommunityBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned?: boolean;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
}

export interface PricingCalculation {
  distance_km: number;
  vehicle_type: VehicleType;
  base_fare: number;
  per_km_rate: number;
  estimated_fare: number;
}
