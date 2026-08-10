interface Props {
  alerts: any[];
}

export default function SOSStats({ alerts }: Props) {
  const list = Array.isArray(alerts) ? alerts : [];

  const active = list.filter(
    (a) => a.status === "active"
  ).length;

  const resolved = list.filter(
    (a) => a.status === "resolved"
  ).length;

  const pending = list.filter(
    (a) =>
      a.status !== "active" &&
      a.status !== "resolved"
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-gray-600 font-semibold">
          Active Alerts
        </h3>

        <h2 className="text-4xl font-bold text-red-600 mt-3">
          {active}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-gray-600 font-semibold">
          Resolved
        </h3>

        <h2 className="text-4xl font-bold text-green-600 mt-3">
          {resolved}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-gray-600 font-semibold">
          Pending
        </h3>

        <h2 className="text-4xl font-bold text-yellow-500 mt-3">
          {pending}
        </h2>
      </div>
    </div>
  );
}