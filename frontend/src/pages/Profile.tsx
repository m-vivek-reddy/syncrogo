import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { supabase } from "../lib/supabase";

import {
  UserRound,
  FileText,
  CarFront,
  CreditCard,
  Car,
  ShieldAlert,
  Bell,
  Settings,
  CircleHelp,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import ProfileHeader from "../components/profile/ProfileHeader";
import MenuSection from "../components/profile/MenuSection";
import LogoutButton from "../components/profile/LogoutButton";

interface ExtendedUser {
  id?: string;
  name?: string;
  email?: string;
  rating?: number;
}

interface MenuItem {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export default function Profile() {
  const navigate = useNavigate();

  const { user, isDriverMode, logout } = useAppStore();

  const currentUser = user as ExtendedUser | null;

  const handleLogout = async () => {
    await supabase.auth.signOut();

    localStorage.removeItem("syncrogo_token");
    localStorage.removeItem("token");

    logout();

    navigate("/login", {
      replace: true,
    });
  };

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
        name={currentUser?.name || "Vivek Reddy"}
        email={currentUser?.email || "vivek@gmail.com"}
        rating={currentUser?.rating || 4.9}
        verified={true}
        isDriver={isDriverMode}
        completedTrips={28}
        memberSince="2026"
        location="Hyderabad"
      />

      <div className="px-6 mt-6 space-y-4">
        <MenuSection items={mainMenu} />

        <MenuSection items={supportMenu} />

        <LogoutButton onLogout={handleLogout} />
      </div>
    </div>
  );
}