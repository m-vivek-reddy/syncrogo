import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  MessageCircleMore,
  Package,
  UserRound,
} from "lucide-react";

import { useAppStore } from "../store/useAppStore";

export default function AppLayout() {

  const navigate = useNavigate();
  const location = useLocation();

  const {
    isDriverMode,
    toggleDriverMode
  } = useAppStore();


  return (

    <div className="
      min-h-screen
      bg-slate-50
      text-syncro-dark
      font-sans
      pb-20
      flex
      flex-col
    ">


      {/* Passenger Header */}
      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-slate-200
          bg-white/95
          px-4
          py-3
          shadow-sm
          backdrop-blur
        "
      >

        <div className="flex items-center justify-between">


          {/* Logo */}
          <div
            onClick={() => navigate("/home")}
            className="cursor-pointer"
          >

            <h1 className="text-xl font-extrabold">
              Syncro
              <span className="text-emerald-500">
                Go
              </span>
            </h1>


            <p className="text-[11px] text-slate-500">
              Travel Together. Save Together.
            </p>

          </div>



          {/* Passenger / Driver Toggle */}
          <button
            onClick={() => {
              toggleDriverMode();
              navigate("/home");
            }}

            className={`
              rounded-full
              px-4
              py-2
              text-xs
              font-semibold

              ${
                isDriverMode
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
              }
            `}
          >

            {
              isDriverMode
              ? "🚙 Driver"
              : "🚗 Passenger"
            }

          </button>


        </div>

      </header>



      {/* Page Content */}
      <main className="flex-1 overflow-y-auto">

        <Outlet />

      </main>




      {/* Passenger Bottom Navigation */}
      <nav
        className="
          fixed
          bottom-0
          w-full
          border-t
          border-slate-200
          bg-white
          px-4
          py-3
          shadow-[0_-8px_24px_rgba(15,23,42,0.06)]
          z-50
        "
      >

        <div className="
          mx-auto
          flex
          max-w-md
          items-center
          justify-between
        ">


          <NavButton
            icon={<Home size={18}/>}
            label="Home"
            active={location.pathname === "/home"}
            onClick={()=>navigate("/home")}
          />


          <NavButton
            icon={<Package size={18}/>}
            label="Trips"
            active={location.pathname === "/trips"}
            onClick={()=>navigate("/trips")}
          />


          <NavButton
            icon={<MessageCircleMore size={18}/>}
            label="Messages"
            active={location.pathname === "/messages"}
            onClick={()=>navigate("/messages")}
          />


          <NavButton
            icon={<UserRound size={18}/>}
            label="Profile"
            active={location.pathname === "/profile"}
            onClick={()=>navigate("/profile")}
          />


        </div>

      </nav>


    </div>

  );
}



function NavButton({
  icon,
  label,
  active,
  onClick
}:{
  icon:React.ReactNode;
  label:string;
  active:boolean;
  onClick:()=>void;
}){


return (

<button
onClick={onClick}
className={`
flex
flex-col
items-center
gap-1
rounded-xl
px-3
py-2

${
active
? "text-slate-900"
: "text-slate-400"
}

`}
>

{icon}

<span className="text-[10px] font-semibold">
{label}
</span>


</button>

)

}