import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../api/client";


const AuthContext = createContext<any>(null);


export function AuthProvider({children}: any){

    const [user,setUser] = useState(null);
    const [loading,setLoading] = useState(true);


    useEffect(()=>{

        const loadUser = async()=>{

            const token = localStorage.getItem(
                "syncrogo_token"
            );


            if(!token){
                setLoading(false);
                return;
            }


            try{

                const res = await apiClient.get(
                    "/api/v1/users/me"
                );

                setUser(res.data);

            }
            catch(error){

                localStorage.removeItem(
                    "syncrogo_token"
                );

            }
            finally{
                setLoading(false);
            }
        };


        loadUser();

    },[]);



    return(
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}



export const useAuth=()=>useContext(AuthContext);