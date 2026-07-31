import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  // Replace this with your real authentication check
  const token = localStorage.getItem("syncrogo_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;