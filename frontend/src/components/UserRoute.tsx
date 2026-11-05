import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/currentUser";

/**
 * Guard for the passenger (user) portal.
 * Admins and employers must stay inside the admin portal, so any
 * attempt to open a user route redirects them back to /admin.
 */
export default function UserRoute() {

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {

        let active = true;

        async function checkRole() {

            try {

                const token = localStorage.getItem("syncrogo_token") || localStorage.getItem("token");
                if (!token) {
                    throw new Error("No authentication token");
                }

                const currentUser = await getCurrentUser(token);

                if (active) {
                    setIsAdmin(currentUser.role === "admin" || currentUser.role === "employer");
                }

            } catch {

                if (active) {
                    setIsAdmin(false);
                }

            }

            if (active) {
                setLoading(false);
            }

        }

        checkRole();

        return () => {
            active = false;
        };

    }, []);

    if (loading) {
        return (
            <div className="p-5">
                Loading...
            </div>
        );
    }

    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return <Outlet />;

}
