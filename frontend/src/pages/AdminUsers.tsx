import { useState } from "react";


const users = [
  {
    id: 1,
    name: "Vivek Reddy",
    email: "vivekandteam848@gmail.com",
    role: "Passenger",
    status: "Offline",
  },
  {
    id: 2,
    name: "Admin User",
    email: "admin@syncrogo.com",
    role: "Admin",
    status: "Online",
  },
];


export default function AdminUsers() {

  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((user)=>
    user.name
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    user.email
      .toLowerCase()
      .includes(search.toLowerCase())
  );


  return (

    <div className="min-h-screen bg-gray-100 p-6">


      {/* Header */}

      <div className="mb-6">

        <h1 className="
        text-4xl
        font-bold
        text-gray-900
        ">
          User Management
        </h1>


        <p className="
        text-gray-600
        mt-2
        ">
          Manage users, roles and account status
        </p>


      </div>




      {/* Stats */}

      <div className="
      grid
      grid-cols-4
      gap-5
      mb-6
      ">


        <StatCard
          title="Total Users"
          value="1250"
        />


        <StatCard
          title="Passengers"
          value="1100"
        />


        <StatCard
          title="Drivers"
          value="130"
        />


        <StatCard
          title="Admins"
          value="20"
        />


      </div>





      {/* Search */}

      <div className="
      bg-white
      p-4
      rounded-xl
      shadow
      mb-5
      ">


        <input

          value={search}

          onChange={(e)=>setSearch(e.target.value)}

          placeholder="Search users..."

          className="
          w-full
          border
          border-gray-300
          rounded-lg
          px-4
          py-3
          text-gray-900
          placeholder-gray-500
          outline-none
          "

        />


      </div>






      {/* Table */}


      <div className="
      bg-white
      rounded-xl
      shadow
      overflow-hidden
      border
      border-gray-200
      ">


        <table className="w-full">


          <thead className="
          bg-gray-200
          text-gray-700
          ">


            <tr>


              <th className="p-4 text-left font-semibold">
                Name
              </th>


              <th className="p-4 text-left font-semibold">
                Email
              </th>


              <th className="p-4 font-semibold">
                Role
              </th>


              <th className="p-4 font-semibold">
                Status
              </th>


              <th className="p-4 font-semibold">
                Change Role
              </th>


            </tr>


          </thead>



          <tbody>


          {
            filteredUsers.map((user)=>(


              <tr
              key={user.id}
              className="
              border-t
              border-gray-200
              hover:bg-gray-50
              "
              >


                <td className="p-4">


                  <div className="
                  flex
                  items-center
                  gap-3
                  ">


                    <div className="
                    w-10
                    h-10
                    rounded-full
                    bg-blue-100
                    flex
                    items-center
                    justify-center
                    text-blue-700
                    font-bold
                    ">
                      {user.name.charAt(0)}
                    </div>


                    <span className="
                    font-semibold
                    text-gray-900
                    ">
                      {user.name}
                    </span>


                  </div>


                </td>




                <td className="
                p-4
                text-gray-600
                ">
                  {user.email}
                </td>





                <td className="p-4 text-center">

                  <RoleBadge role={user.role}/>

                </td>




                <td className="p-4 text-center">

                  <StatusBadge status={user.status}/>

                </td>





                <td className="p-4 text-center">


                  <select
                  className="
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-2
                  text-gray-900
                  bg-white
                  "
                  defaultValue={user.role}
                  >

                    <option>
                      Passenger
                    </option>

                    <option>
                      Driver
                    </option>

                    <option>
                      Admin
                    </option>


                  </select>


                </td>



              </tr>


            ))
          }


          </tbody>



        </table>


      </div>



    </div>

  );
}




function StatCard({
title,
value
}:any){

return (

<div className="
bg-white
rounded-xl
shadow
p-5
border
border-gray-200
">

<p className="text-gray-600">
{title}
</p>

<h2 className="
text-3xl
font-bold
text-gray-900
mt-2
">
{value}
</h2>


</div>

);

}




function RoleBadge({
role
}:any){


const styles:any={

Passenger:
"bg-blue-100 text-blue-700",

Driver:
"bg-green-100 text-green-700",

Admin:
"bg-red-100 text-red-700"

};


return (

<span
className={`
px-4
py-1
rounded-full
text-sm
font-semibold
shadow-sm
${styles[role]}
`}
>

{role}

</span>

);

}




function StatusBadge({
status
}:any){


return (

<span
className={`
px-4
py-1
rounded-full
text-sm
font-semibold

${
status==="Online"
?
"bg-green-100 text-green-700"
:
"bg-gray-100 text-gray-700"
}

`}
>

{status==="Online" ? "🟢 Online" : "⚪ Offline"}

</span>

);

}