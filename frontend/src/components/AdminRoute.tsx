import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/currentUser";


export default function AdminRoute(){

    const [loading,setLoading]=useState(true);
    const [isAdmin,setIsAdmin]=useState(false);


    useEffect(()=>{

        let active = true;

        async function checkAdmin(){

            try{

                const token = localStorage.getItem("syncrogo_token") || localStorage.getItem("token");
                if (!token) {
                    throw new Error("No authentication token");
                }

                const currentUser = await getCurrentUser(token);


                if(active){
                    setIsAdmin(currentUser.role === "admin" || currentUser.role === "employer");
                }


            }catch{

                if(active){
                    setIsAdmin(false);
                }

            }


            if(active){
                setLoading(false);
            }

        }


        checkAdmin();

        return () => {
            active = false;
        };


    },[]);



    if(loading){
        return (
            <div className="p-5">
                Checking admin...
            </div>
        )
    }



    if(!isAdmin){
        return <Navigate to="/home" replace />
    }


    return <Outlet />;

}
