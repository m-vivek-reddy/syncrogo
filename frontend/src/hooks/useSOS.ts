import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export default function useSOS() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);

    try {
      const res = await apiClient.get("/api/v1/sos/active-alerts");

      console.log("========== SOS API ==========");
      console.log(res.data);
      console.log("Is Array:", Array.isArray(res.data));
      console.log("=============================");

      // If backend returns an array
      if (Array.isArray(res.data)) {
        setAlerts(res.data);
      }

      // If backend returns { alerts: [...] }
      else if (Array.isArray(res.data.alerts)) {
        setAlerts(res.data.alerts);
      }

      // If backend returns { data: [...] }
      else if (Array.isArray(res.data.data)) {
        setAlerts(res.data.data);
      }

      // No valid array found
      else {
        console.warn("Unexpected SOS response:", res.data);
        setAlerts([]);
      }
    } catch (err) {
      console.error("Failed to load SOS alerts", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return {
    alerts,
    loading,
    reload: loadAlerts,
  };
}