import {
  Bell,
  Search,
  Moon,
} from "lucide-react";

export default function Header() {
  return (
    <div className="
      bg-white 
      rounded-2xl 
      shadow-sm 
      p-5 
      flex 
      items-center 
      justify-between
      border
      border-gray-200
    ">

      {/* Title */}
      <div>
        <h1 className="
          text-3xl 
          font-bold 
          text-gray-900
        ">
          Admin Dashboard
        </h1>

        <p className="
          text-gray-600
          mt-1
        ">
          SyncroGo Platform Management
        </p>
      </div>


      {/* Right Actions */}
      <div className="flex items-center gap-4">


        {/* Search */}
        <div className="relative">

          <Search
            className="
              absolute 
              left-3 
              top-3 
              text-gray-500
            "
            size={18}
          />

          <input
            placeholder="Search..."
            className="
              pl-10
              pr-4
              py-2
              w-64
              rounded-xl
              border
              border-gray-300
              bg-white
              text-gray-900
              placeholder:text-gray-500
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          />

        </div>


        {/* Notification */}
        <button
          className="
            p-3
            rounded-xl
            bg-gray-100
            text-gray-700
            hover:bg-gray-200
          "
        >
          <Bell size={20}/>
        </button>


        {/* Theme */}
        <button
          className="
            p-3
            rounded-xl
            bg-gray-100
            text-gray-700
            hover:bg-gray-200
          "
        >
          <Moon size={20}/>
        </button>


      </div>

    </div>
  );
}