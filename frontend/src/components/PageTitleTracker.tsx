import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Welcome",
  "/login": "Sign In",
  "/register": "Create Account",
  "/verify-otp": "Verify OTP",
  "/verify-email": "Verify Email",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/home": "Home",
  "/find-ride": "Find a Ride",
  "/offer-ride": "Offer a Ride",
  "/messages": "Messages",
  "/message": "Chat",
  "/profile": "My Profile",
  "/account": "Account Details",
  "/payments": "Payment Methods",
  "/vehicles": "My Vehicles",
  "/documents": "My Documents",
  "/trips": "My Trips",
  "/emergency": "Emergency Contacts",
  "/settings": "Settings",
  "/preferences": "Ride Preferences",
  "/notifications": "Notifications",
  "/support": "Help & Support",
  "/admin": "Admin Dashboard",
  "/admin/users": "Manage Users",
  "/admin/drivers": "Manage Drivers",
  "/admin/documents": "Verify Documents",
  "/admin/sos": "Emergency SOS Alerts",
  "/admin/payments": "Platform Payments",
  "/admin/reports": "System Reports",
  "/admin/settings": "Platform Settings",
};

export default function PageTitleTracker() {
  const location = useLocation();

  useEffect(() => {
    let title = ROUTE_TITLES[location.pathname];
    if (!title) {
      if (location.pathname.startsWith("/ride/")) {
        title = "Live Ride Navigation";
      } else {
        title = "Page Not Found";
      }
    }
    document.title = `${title} | SyncroGo`;
  }, [location.pathname]);

  return null;
}
