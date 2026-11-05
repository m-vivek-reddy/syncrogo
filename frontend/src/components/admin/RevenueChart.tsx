import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface Props {
  data?: { month: string; revenue: number }[];
}

const FALLBACK = [{ month: "—", revenue: 0 }];

export default function RevenueChart({ data }: Props) {
  const series = Array.isArray(data) && data.length > 0 ? data : FALLBACK;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">

      <h2 className="text-xl font-bold mb-6">
        Revenue Overview
      </h2>

      <ResponsiveContainer width="100%" height={300}>

        <AreaChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>

          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis dataKey="month" tickLine={false} axisLine={false} />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v: number) =>
              v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`
            }
          />

          <Tooltip
            formatter={((value: unknown) => [
              `₹${Number(value ?? 0).toLocaleString()}`,
              "Revenue",
            ]) as any}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={3}
            fill="url(#revenueFill)"
            animationDuration={900}
          />

        </AreaChart>

      </ResponsiveContainer>

    </div>
  );
}
