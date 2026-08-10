import { apiClient } from "../api/client";

export const getAnalytics = () =>
  apiClient.get("/admin/analytics");

export const getUsers = () =>
  apiClient.get("/admin/users");

export const getDrivers = () =>
  apiClient.get("/admin/drivers");

export const getDocuments = () =>
  apiClient.get("/admin/documents");

export const updateDocumentStatus = (
  id: number,
  status: string
) =>
  apiClient.patch(`/admin/documents/${id}?status=${status}`);