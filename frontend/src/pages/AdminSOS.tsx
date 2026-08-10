import { useState } from "react";


const alerts = [
  {
    id:1,
    driver:"Rahul Kumar",
    passenger:"Priya Sharma",
    location:"Hyderabad",
    priority:"High",
    status:"Active",
    time:"12:30 PM"
  },
  {
    id:2,
    driver:"Arjun Reddy",
    passenger:"Sneha",
    location:"Gachibowli",
    priority:"Medium",
    status:"Pending",
    time:"11:50 AM"
  },
  {
    id:3,
    driver:"Kiran",
    passenger:"Amit",
    location:"Madhapur",
    priority:"Low",
    status:"Resolved",
    time:"10:20 AM"
  }
];



export default function AdminSOS(){


const [search,setSearch]=useState("");



const filteredAlerts = alerts.filter((alert)=>

alert.driver
.toLowerCase()
.includes(search.toLowerCase())

);



return (

<div className="
min-h-screen
bg-gray-100
p-6
">



{/* Header */}

<div className="
flex
justify-between
items-center
mb-6
">


<div>


<h1 className="
text-4xl
font-bold
text-gray-900
">

SOS Alerts

</h1>


<p className="
text-gray-600
mt-2
">

Monitor and manage emergency alerts across SyncroGo

</p>


</div>



<div className="
flex
gap-3
">


<button
className="
bg-blue-600
text-white
px-5
py-3
rounded-lg
font-semibold
"
>

Refresh

</button>


<button
className="
bg-gray-800
text-white
px-5
py-3
rounded-lg
font-semibold
"
>

Export Report

</button>


</div>



</div>







{/* Stats Cards */}


<div className="
grid
grid-cols-3
gap-5
mb-6
">


<Card
title="Active Alerts"
value="0"
color="text-red-600"
desc="No emergencies detected"
/>


<Card
title="Resolved"
value="24"
color="text-green-600"
desc="Successfully handled"
/>


<Card
title="Pending"
value="3"
color="text-orange-600"
desc="Waiting for action"
/>



</div>






{/* Monitoring Status */}


<div className="
bg-white
rounded-xl
shadow
p-5
mb-6
flex
justify-between
items-center
">


<div>

<h2 className="
font-bold
text-gray-900
text-xl
">

System Status

</h2>


<p className="
text-green-600
font-semibold
mt-2
">

🟢 Monitoring Active

</p>


</div>



<div>

<p className="
text-gray-500
">

Last Updated

</p>


<p className="
font-bold
text-gray-900
">

Just now

</p>


</div>



</div>








{/* Search */}


<div className="
bg-white
rounded-xl
shadow
p-4
mb-6
">


<input

value={search}

onChange={(e)=>setSearch(e.target.value)}

placeholder="Search driver or passenger..."

className="
w-full
border
border-gray-300
rounded-lg
px-4
py-3
text-gray-900
placeholder-gray-500
"

/>


</div>







{/* Alerts Table */}


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


<th className="p-4 text-left">
Driver
</th>


<th>
Passenger
</th>


<th>
Location
</th>


<th>
Priority
</th>


<th>
Status
</th>


<th>
Time
</th>


<th>
Action
</th>


</tr>


</thead>




<tbody>


{

filteredAlerts.length===0 ? (


<tr>

<td
colSpan={7}
className="
text-center
p-10
text-gray-500
"
>


🛡️

<br/>


<h3 className="
text-lg
font-semibold
text-gray-700
mt-3
">

No Active SOS Alerts

</h3>


<p>

All drivers and passengers are currently safe.

</p>


</td>

</tr>


):(


filteredAlerts.map((alert)=>(


<tr
key={alert.id}
className="
border-t
hover:bg-gray-50
"
>



<td className="
p-4
font-semibold
text-gray-900
">

{alert.driver}

</td>



<td>

{alert.passenger}

</td>



<td>

📍 {alert.location}

</td>



<td>

<Priority
priority={alert.priority}
/>

</td>



<td>

<Status
status={alert.status}
/>

</td>



<td>

{alert.time}

</td>




<td>


<button
className="
bg-blue-600
text-white
px-4
py-2
rounded-lg
"
>

View

</button>


</td>



</tr>


))


)


}



</tbody>



</table>



</div>





</div>


);

}








function Card({
title,
value,
color,
desc
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


<p className="
text-gray-600
">

{title}

</p>


<h2 className={`
text-4xl
font-bold
mt-2
${color}
`}>

{value}

</h2>


<p className="
text-gray-500
mt-2
">

{desc}

</p>


</div>

)

}








function Priority({
priority
}:any){


const colors:any={

High:
"bg-red-100 text-red-700",

Medium:
"bg-orange-100 text-orange-700",

Low:
"bg-green-100 text-green-700"

};


return (

<span className={`
px-3
py-1
rounded-full
text-sm
font-semibold
${colors[priority]}
`}>

{priority}

</span>

)

}








function Status({
status
}:any){


const colors:any={

Active:
"bg-red-100 text-red-700",

Pending:
"bg-orange-100 text-orange-700",

Resolved:
"bg-green-100 text-green-700"

};


return (

<span className={`
px-3
py-1
rounded-full
text-sm
font-semibold
${colors[status]}
`}>

{status}

</span>

)

}