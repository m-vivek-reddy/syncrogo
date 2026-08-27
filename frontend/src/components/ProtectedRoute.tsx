import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/currentUser";
import { useAppStore } from "../store/useAppStore";


const getToken = () => {
  return (
    localStorage.getItem("syncrogo_token") ||
    localStorage.getItem("token")
  );
};


export default function ProtectedRoute() {

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);


  useEffect(() => {

    const checkAuth = async () => {
      setAuthError(false);

      const token = getToken();


      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }


      try {

        const profile: any = await getCurrentUser(token);
        if (profile) {
          useAppStore.getState().login({
            id: String(profile.id),
            name: profile.full_name || profile.name || profile.email || "User",
            email: profile.email,
            rating: profile.rating ?? 0,
            role: profile.role || "passenger",
            profile_photo_url: profile.profile_photo_url,
          });
        }
        setAuthenticated(true);


      } catch (error: any) {
        const status = error?.response?.status;

        // Only an explicit authentication failure ends a session. A slow
        // database, temporary network error, or backend restart must not
        // send a logged-in user back to the login screen.
        if (status === 401 || status === 403) {
          localStorage.removeItem("syncrogo_token");
          localStorage.removeItem("token");
          setAuthenticated(false);
        } else {
          setAuthError(true);
        }

      }
      finally{
        setLoading(false);
      }

    };


    checkAuth();


    const handleStorage = (event: StorageEvent) => {
      if (event.key === "syncrogo_token" || event.key === "token") {
        void checkAuth();
      }
    };

    window.addEventListener("storage", handleStorage);


    return ()=>{
      window.removeEventListener("storage", handleStorage);
    };


  }, [retryNonce]);



  if(loading){

    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-700">We could not verify your session right now.</p>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          onClick={() => {
            setLoading(true);
            setRetryNonce((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }



  return authenticated
    ? <Outlet />
    : <Navigate to="/login" replace />;

}
