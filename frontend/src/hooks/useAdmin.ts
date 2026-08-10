import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export default function useAdmin() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Load analytics and documents together
      const [analyticsRes, documentsRes] = await Promise.all([
        apiClient.get("/admin/analytics"),
        apiClient.get("/admin/documents"),
      ]);

      setAnalytics(analyticsRes.data);

      if (Array.isArray(documentsRes.data)) {
        setDocuments(documentsRes.data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setDocuments([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return {
    analytics,
    documents,
    loading,
    reload: loadDashboard,
  };
}