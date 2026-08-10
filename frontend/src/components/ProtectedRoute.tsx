import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";


const getToken = () => {
  return (
    localStorage.getItem("syncrogo_token") ||
    localStorage.getItem("token")
  );
};


export default function ProtectedRoute() {

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);


  useEffect(() => {

    const checkAuth = async () => {

      const token = getToken();


      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }


      try {

        const response = await apiClient.get(
          "/api/v1/users/me",
          {
            headers:{
              Authorization:`Bearer ${token}`
            }
          }
        );


        if(response.status === 200){
          setAuthenticated(true);
        }


      } catch(error){

        localStorage.removeItem(
          "syncrogo_token"
        );

        localStorage.removeItem(
          "token"
        );

        setAuthenticated(false);

      }
      finally{
        setLoading(false);
      }

    };


    checkAuth();


    window.addEventListener(
      "storage",
      checkAuth
    );


    return ()=>{
      window.removeEventListener(
        "storage",
        checkAuth
      );
    };


  },[]);



  if(loading){

    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  }



  return authenticated
    ? <Outlet />
    : <Navigate to="/login" replace />;

}