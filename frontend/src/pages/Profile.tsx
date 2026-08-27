import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { getCurrentUser } from "../api/currentUser";
import { API_BASE_URL } from "../api/config";
import { useAppStore } from "../store/useAppStore";

import {
  Camera,
  UserRound,
  FileText,
  CarFront,
  CreditCard,
  Car,
  ShieldAlert,
  Bell,
  Settings,
  CircleHelp,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import ProfileHeader from "../components/profile/ProfileHeader";
import MenuSection from "../components/profile/MenuSection";
import LogoutButton from "../components/profile/LogoutButton";

interface ExtendedUser {
  id?: string | number;
  name?: string;
  email?: string;
  rating?: number;
  role?: string;
  phone?: string;
  is_verified?: boolean;
  created_at?: string;
  profile_photo_url?: string;
}

interface MenuItem {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export default function Profile() {
  const navigate = useNavigate();

  const { user, isDriverMode, login, logout } = useAppStore();

  const currentUser = user as ExtendedUser | null;
  const [profile, setProfile] = useState<ExtendedUser | null>(currentUser);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const resolveProfilePhotoUrl = (url?: string) => {
    if (!url) {
      return undefined;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    return `${API_BASE_URL}${url}`;
  };

  const syncProfileState = (nextProfile: ExtendedUser) => {
    setProfile(nextProfile);

    if (nextProfile.email) {
      login({
        id: String(nextProfile.id ?? currentUser?.id ?? ""),
        name: nextProfile.name || nextProfile.email,
        email: nextProfile.email,
        rating: nextProfile.rating ?? currentUser?.rating ?? 0,
        role: nextProfile.role || currentUser?.role || "customer",
        profile_photo_url: nextProfile.profile_photo_url,
      });
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("syncrogo_token") || localStorage.getItem("token");
        if (!token) return;

        const userProfile = await getCurrentUser<ExtendedUser>(token);
        syncProfileState(userProfile);
      } catch (error) {
        console.error("Unable to load profile:", error);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const handleLogout = async () => {
    localStorage.removeItem("syncrogo_token");
    localStorage.removeItem("token");

    logout();

    navigate("/login", {
      replace: true,
    });
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file for your profile photo.");
      return;
    }

    setPhotoError("");
    setIsUploadingPhoto(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post(
        "/api/v1/users/me/profile-photo",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      syncProfileState(response.data);
      setIsPhotoMenuOpen(false);
      stopCamera();
    } catch (error: any) {
      setPhotoError(
        error.response?.data?.detail || "Could not update profile photo.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      uploadProfilePhoto(file);
    }
  };

  const startCamera = async () => {
    setPhotoError("");
    setIsPhotoMenuOpen(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoError("Camera capture is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Unable to open camera:", error);
      setPhotoError("Could not open the camera. Check browser permission.");
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setPhotoError("Could not capture the photo.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      setPhotoError("Could not capture the photo.");
      return;
    }

    await uploadProfilePhoto(
      new File([blob], "profile-photo.jpg", {
        type: "image/jpeg",
      }),
    );
  };

  const activeProfile = profile || currentUser;
  const memberSince = activeProfile?.created_at
    ? new Date(activeProfile.created_at).getFullYear().toString()
    : new Date().getFullYear().toString();

      const mainMenu: MenuItem[] = [
      {
        to: "/account",
        icon: UserRound,
        title: "Account Details",
        subtitle: "Name, Email, Phone Number",
      },
      {
        to: "/documents",
        icon: FileText,
        title: "Identity & Documents",
        subtitle: "Aadhaar, PAN, Driving License",
      },

      ...(isDriverMode
        ? [
            {
              to: "/vehicles",
              icon: CarFront,
              title: "My Vehicles",
              subtitle: "Cars, Bikes, RC, Insurance",
            },
          ]
        : []),

      {
        to: "/payments",
        icon: CreditCard,
        title: "Payment Methods",
        subtitle: "UPI, Cards, Wallet",
      },
      {
        to: "/preferences",
        icon: Car,
        title: "Ride Preferences",
        subtitle: "Seat, Music, AC",
      },
    ];

    const supportMenu: MenuItem[] = [
      {
        to: "/emergency",
        icon: ShieldAlert,
        title: "Emergency Contacts",
        subtitle: "Trusted Contacts & SOS",
      },
      {
        to: "/notifications",
        icon: Bell,
        title: "Notifications",
      },
      {
        to: "/settings",
        icon: Settings,
        title: "Settings",
      },
      {
        to: "/support",
        icon: CircleHelp,
        title: "Help & Support",
      },
    ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <ProfileHeader
        name={activeProfile?.name || activeProfile?.email || "SyncroGo User"}
        email={activeProfile?.email || ""}
        rating={activeProfile?.rating ?? 0}
        verified={activeProfile?.is_verified ?? false}
        isDriver={isDriverMode}
        completedTrips={0}
        memberSince={memberSince}
        location="Hyderabad"
        avatar={resolveProfilePhotoUrl(activeProfile?.profile_photo_url)}
        onEditAvatar={() => setIsPhotoMenuOpen(true)}
        avatarDisabled={isUploadingPhoto}
      />

      <div className="px-6 mt-6 space-y-4">
        {photoError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {photoError}
          </div>
        )}

        <MenuSection items={mainMenu} />

        <MenuSection items={supportMenu} />

        <LogoutButton onLogout={handleLogout} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {isPhotoMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 pb-6 sm:items-center sm:pb-0">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Profile photo
              </h2>

              <button
                type="button"
                aria-label="Close profile photo menu"
                onClick={() => setIsPhotoMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
              >
                <ImagePlus size={22} className="text-blue-600" />
                Upload
              </button>

              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={startCamera}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
              >
                <Camera size={22} className="text-blue-600" />
                Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Take photo
              </h2>

              <button
                type="button"
                aria-label="Close camera"
                onClick={stopCamera}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl bg-slate-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-square w-full object-cover"
              />
            </div>

            <button
              type="button"
              disabled={isUploadingPhoto}
              onClick={capturePhoto}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isUploadingPhoto ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Camera size={18} />
              )}
              {isUploadingPhoto ? "Saving..." : "Capture"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
