import { useState, useEffect } from "react";
import { apiClient } from "../api/client";

export default function Settings() {

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  const [message, setMessage] = useState("");


  // Load saved theme
  useEffect(() => {

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

  }, []);



  // Apply theme
  useEffect(() => {

    if (darkMode) {

      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");

    } else {

      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");

    }

  }, [darkMode]);




  const changePassword = async () => {

    try {

      const response = await apiClient.put(
        "/api/v1/users/change-password",
        {
          current_password: oldPassword,
          new_password: newPassword,
        }
      );


      setMessage(response.data.message);

      setOldPassword("");
      setNewPassword("");


    } catch (error:any) {

      setMessage(
        error.response?.data?.detail ||
        "Password change failed"
      );

    }

  };



  return (

    <div
      className="
      min-h-screen
      p-6
      transition-colors
      duration-300
      bg-slate-100
      dark:bg-slate-950
      text-slate-900
      dark:text-white
      "
    >


      <h1 className="text-3xl font-bold mb-6">
        Settings
      </h1>



      {/* Appearance */}

      <div
        className="
        bg-white
        dark:bg-slate-800
        p-5
        rounded-xl
        mb-6
        shadow
        "
      >

        <h2 className="text-xl font-semibold mb-4">
          Appearance
        </h2>


        <button

          onClick={() => setDarkMode(!darkMode)}

          className="
          px-5
          py-2
          rounded-lg
          bg-blue-600
          hover:bg-blue-700
          text-white
          "
        >

          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}

        </button>


      </div>




      {/* Change Password */}

      <div
        className="
        bg-white
        dark:bg-slate-800
        p-5
        rounded-xl
        shadow
        "
      >

        <h2 className="text-xl font-semibold mb-4">
          Change Password
        </h2>



        <div className="space-y-4">


          <input

            type={showPassword ? "text":"password"}

            placeholder="Current Password"

            value={oldPassword}

            onChange={(e)=>setOldPassword(e.target.value)}

            className="
            w-full
            p-3
            rounded-lg
            border
            bg-white
            dark:bg-slate-700
            dark:border-slate-600
            "
          />



          <input

            type={showPassword ? "text":"password"}

            placeholder="New Password"

            value={newPassword}

            onChange={(e)=>setNewPassword(e.target.value)}

            className="
            w-full
            p-3
            rounded-lg
            border
            bg-white
            dark:bg-slate-700
            dark:border-slate-600
            "
          />



          <button

            onClick={()=>setShowPassword(!showPassword)}

            className="
            text-blue-500
            "
          >

            {showPassword ? "Hide Password":"Show Password"}

          </button>



          <button

            onClick={changePassword}

            className="
            w-full
            py-3
            rounded-lg
            bg-green-600
            text-white
            "
          >

            Update Password

          </button>



          {
            message &&

            <p className="mt-3">
              {message}
            </p>
          }


        </div>


      </div>


    </div>

  );
}