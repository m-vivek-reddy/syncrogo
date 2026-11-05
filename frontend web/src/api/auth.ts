import { apiClient } from "./client";
import { API_BASE_URL } from "./config";
import type { User } from "../types";

/* The backend may return either an absolute URL (it builds one from
 * request.base_url after a photo upload) or a relative path such as
 * "/uploads/profile_photos/x.jpg" from GET /users/me. Relative paths
 * must be resolved against the backend origin, like the mobile app does. */
const resolvePhotoUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const normalizeUser = (data: any): User => ({
  ...data,
  name: data.name || data.full_name,
  profile_photo: resolvePhotoUrl(data.profile_photo || data.profile_photo_url),
});

export interface LoginPayload {
  email: string;
  password?: string;
  otp?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
}

export const loginApi = async (email: string, password?: string): Promise<{ success: boolean; token?: string; user?: User; message?: string }> => {
  try {
    const res = await apiClient.post("/api/v1/users/login", { email, password });
    const token = res.data.access_token || res.data.token;
    if (token) {
      localStorage.setItem("syncrogo_token", token);
      localStorage.setItem("token", token);
    }
    return {
      success: true,
      token,
      user: res.data.user ? normalizeUser(res.data.user) : undefined,
    };
  } catch (error: any) {
    if (!error.response) {
      return {
        success: false,
        message: "SyncroGo server is not reachable. Start the backend on http://127.0.0.1:8000 and try again.",
      };
    }
    return {
      success: false,
      message: error.response?.data?.detail || "Invalid credentials. Please verify your details.",
    };
  }
};

export const registerApi = async (data: RegisterPayload): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await apiClient.post("/api/v1/users/register", data);
    return {
      success: true,
      message: res.data.message || "Registration successful! Please verify OTP.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Registration failed. Email or phone may already exist.",
    };
  }
};

export const verifyOtpApi = async (email: string, otp: string): Promise<{ success: boolean; token?: string; user?: User; message?: string }> => {
  try {
    const res = await apiClient.post("/api/v1/users/verify-otp", { email, otp });
    const token = res.data.access_token || res.data.token;
    if (token) {
      localStorage.setItem("syncrogo_token", token);
      localStorage.setItem("token", token);
    }
    return {
      success: true,
      token,
      user: res.data.user ? normalizeUser(res.data.user) : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Invalid OTP code entered.",
    };
  }
};

export const getCurrentUserApi = async (): Promise<User | null> => {
  try {
    const res = await apiClient.get("/api/v1/users/me");
    return normalizeUser(res.data);
  } catch {
    return null;
  }
};

export const updateProfileApi = async (data: { name?: string; phone?: string }): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const res = await apiClient.put("/api/v1/users/me", data);
    return { success: true, user: normalizeUser(res.data) };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Unable to update your profile. Please try again.",
    };
  }
};

export const uploadProfilePhotoApi = async (file: File): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post("/api/v1/users/me/profile-photo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, user: normalizeUser(res.data) };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Photo upload failed. Please try another image.",
    };
  }
};

export const resendOtpApi = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await apiClient.post("/api/v1/users/resend-otp", { email });
    return { success: true, message: res.data.message || "A new OTP was sent." };
  } catch (error: any) {
    return { success: false, message: error.response?.data?.detail || "Unable to send a new OTP." };
  }
};

export const triggerSOSApi = async (lat: number, lon: number, address?: string) => {
  try {
    const res = await apiClient.post("/sos/trigger", {
      latitude: lat,
      longitude: lon,
      location_description: address || "Emergency triggered from SyncroGo Web App",
    });
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.detail || "Emergency alert triggered locally.",
    };
  }
};

export const logoutUser = () => {
  localStorage.removeItem("syncrogo_token");
  localStorage.removeItem("token");
};
