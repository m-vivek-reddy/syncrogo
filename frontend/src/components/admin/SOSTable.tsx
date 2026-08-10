interface Props {
  alerts: any[];
  reload: () => Promise<void>;
}

export default function SOSTable({
  alerts,
}: Props) {

  return (
    <div className="bg-white rounded-2xl shadow p-6">

      <h2 className="text-2xl font-bold mb-5">
        SOS Alerts
      </h2>

      {alerts.length === 0 ? (
        <p>No Active Alerts</p>
      ) : (

        <table className="w-full">

          <thead>

            <tr>

              <th>ID</th>

              <th>Status</th>

            </tr>

          </thead>

          <tbody>

            {alerts.map((alert) => (

              <tr key={alert.id}>

                <td>{alert.id}</td>

                <td>{alert.status}</td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>
  );
}