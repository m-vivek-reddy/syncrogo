interface Props {
  alerts: any[];
}

export default function SOSActivity({
  alerts,
}: Props) {

  return (

    <div className="bg-white rounded-2xl shadow p-6">

      <h2 className="text-2xl font-bold mb-4">
        Recent Activity
      </h2>

      {alerts.length === 0 ? (

        <p>No SOS activity.</p>

      ) : (

        alerts.slice(0, 5).map((alert) => (

          <div
            key={alert.id}
            className="border-b py-3"
          >

            Alert #{alert.id}

            <br />

            {alert.status}

          </div>

        ))

      )}

    </div>

  );
}