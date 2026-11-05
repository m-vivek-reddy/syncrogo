import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  completed?: number;
  cancelled?: number;
  ongoing?: number;
}

const colors = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
];

export default function RideChart({
  completed = 0,
  cancelled = 0,
  ongoing = 0,
}: Props) {

  const data = [
    { name: "Completed", value: completed },
    { name: "Cancelled", value: cancelled },
    { name: "Ongoing", value: ongoing },
  ].filter((slice) => slice.value > 0);

  const empty = data.length === 0;

  return (

    <div className="bg-white rounded-2xl shadow-lg p-6">

      <h2 className="text-xl font-bold mb-6">
        Ride Status
      </h2>

      {empty ? (
        <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
          No ride data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>

          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              innerRadius={55}
              paddingAngle={3}
              animationDuration={900}
            >

              {data.map((_, index) => (

                <Cell
                  key={index}
                  fill={colors[index % colors.length]}
                />

              ))}

            </Pie>

            <Tooltip />

            <Legend iconType="circle" />

          </PieChart>

        </ResponsiveContainer>
      )}

    </div>

  );
}
