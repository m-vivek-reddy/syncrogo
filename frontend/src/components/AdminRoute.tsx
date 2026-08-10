import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";


export default function AdminRoute(){

    const [loading,setLoading]=useState(true);
    const [isAdmin,setIsAdmin]=useState(false);


    useEffect(()=>{

        async function checkAdmin(){

            try{

                const response = await apiClient.get(
                    "/api/v1/users/me"
                );


                console.log("CURRENT USER:", response.data);


                if(response.data.role === "admin"){
                    setIsAdmin(true);
                }


            }catch(error){

                console.log(error);

            }


            setLoading(false);

        }


        checkAdmin();


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