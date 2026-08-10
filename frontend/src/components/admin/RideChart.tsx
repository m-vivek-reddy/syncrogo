import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Completed", value: 70 },
  { name: "Cancelled", value: 20 },
  { name: "Ongoing", value: 10 },
];

const colors = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
];

export default function RideChart() {

  return (

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <h2 className="text-xl font-bold mb-6">
        Ride Status
      </h2>

      <ResponsiveContainer width="100%" height={300}>

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            outerRadius={100}
          >

            {data.map((_, index) => (

              <Cell
                key={index}
                fill={colors[index]}
              />

            ))}

          </Pie>

          <Tooltip />

        </PieChart>

      </ResponsiveContainer>

    </div>

  );
}