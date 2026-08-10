import { useState } from "react";


const drivers = [
  {
    id:1,
    name:"Rahul Kumar",
    vehicle:"Swift Dzire",
    phone:"9876543210",
    rating:"4.8",
    status:"Online",
    documents:"Verified",
    earnings:"₹18,250"
  },
  {
    id:2,
    name:"Priya Sharma",
    vehicle:"WagonR",
    phone:"9123456780",
    rating:"4.9",
    status:"Offline",
    documents:"Pending",
    earnings:"₹15,100"
  },
  {
    id:3,
    name:"Arjun Reddy",
    vehicle:"Nexon",
    phone:"9988776655",
    rating:"4.7",
    status:"Busy",
    documents:"Verified",
    earnings:"₹21,900"
  }
];



export default function AdminDrivers(){

const [search,setSearch]=useState("");


const filteredDrivers = drivers.filter((driver)=>
driver.name
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

Drivers

</h1>


<p className="
text-gray-600
mt-2
">

Manage registered drivers

</p>


</div>



<button
className="
bg-blue-600
hover:bg-blue-700
text-white
px-5
py-3
rounded-lg
font-semibold
"
>

+ Add Driver

</button>



</div>





{/* Stats */}


<div className="
grid
grid-cols-4
gap-5
mb-6
">


<Card
title="Total Drivers"
value="125"
color="text-blue-600"
/>


<Card
title="Online"
value="42"
color="text-green-600"
/>


<Card
title="Offline"
value="73"
color="text-gray-600"
/>


<Card
title="Pending Verification"
value="10"
color="text-orange-600"
/>


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

placeholder="Search Driver..."

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


<th className="p-4 text-left">
Driver
</th>


<th>
Vehicle
</th>


<th>
Phone
</th>


<th>
Rating
</th>


<th>
Status
</th>


<th>
Documents
</th>


<th>
Earnings
</th>


<th>
Actions
</th>


</tr>


</thead>



<tbody>


{
filteredDrivers.map((driver)=>(


<tr
key={driver.id}
className="
border-t
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
font-bold
text-blue-700
">

{driver.name.charAt(0)}

</div>


<div>

<p className="
font-semibold
text-gray-900
">

{driver.name}

</p>


</div>


</div>


</td>




<td className="
text-gray-700
">

{driver.vehicle}

</td>




<td className="
text-gray-700
">

{driver.phone}

</td>




<td>

⭐ {driver.rating}

</td>




<td>

<Status status={driver.status}/>

</td>




<td>

<DocumentStatus status={driver.documents}/>

</td>




<td className="
font-semibold
text-gray-900
">

{driver.earnings}

</td>




<td>


<button
className="
bg-blue-600
text-white
px-3
py-2
rounded-lg
"
>

View

</button>


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







function Card({
title,
value,
color
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
text-3xl
font-bold
mt-2
${color}
`}>

{value}

</h2>


</div>

)

}







function Status({
status
}:any){


const styles:any={

Online:
"bg-green-100 text-green-700",

Offline:
"bg-gray-100 text-gray-700",

Busy:
"bg-orange-100 text-orange-700"

};


return (

<span className={`
px-3
py-1
rounded-full
text-sm
font-semibold
${styles[status]}
`}>

{status}

</span>

)

}







function DocumentStatus({
status
}:any){

return (

<span
className={`
px-3
py-1
rounded-full
text-sm
font-semibold

${
status==="Verified"
?
"bg-green-100 text-green-700"
:
"bg-orange-100 text-orange-700"

}

`}
>

{status}

</span>

)

}