import { useEffect } from "react";
import { router } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../auth/AuthContext";
import { useAuthStore } from "../store/auth";

export default function SplashScreen() {
  const { loading, isAuthenticated, user } = useAuth();
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (loading || !hydrated) return;

    if (isAuthenticated) {
      if (["admin", "administrator"].includes(user?.role?.toLowerCase() ?? "")) {
        router.replace("/(admin)");
      } else {
        router.replace("/(user)/home");
      }
    } else {
      router.replace("/(auth)/login");
    }
  }, [loading, hydrated, isAuthenticated, user]);

  return <LoadingScreen />;
}
