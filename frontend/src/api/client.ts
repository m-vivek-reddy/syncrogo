import axios from "axios";
import { API_BASE_URL } from "./config";


export const apiClient = axios.create({

    baseURL: API_BASE_URL,

    headers: {
        "Content-Type": "application/json",
        "X-Tunnel-Skip-AntiPhishing-Page": "true",
        "ngrok-skip-browser-warning": "true"
    }

});


apiClient.interceptors.request.use(

(config)=>{

    // Keep compatibility with sessions created by earlier versions of the
    // application.  Route guards already recognise both keys, so requests
    // must do the same.
    const token =
    localStorage.getItem("syncrogo_token") ||
    localStorage.getItem("token");


    if(token){

        config.headers.Authorization =
        `Bearer ${token}`;

    }


    return config;

},

(error)=>{

    return Promise.reject(error);

}

);
