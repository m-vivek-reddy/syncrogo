interface Document {
  id: number;
  driver: string;
  license: boolean;
  rc: boolean;
  insurance: boolean;
  aadhaar: boolean;
  status: string;
}

interface DocumentTableProps {
  documents: Document[];
}

export default function DocumentTable({
  documents,
}: DocumentTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Recent Documents
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Latest uploaded driver documents
          </p>
        </div>

        <button
          className="
            bg-blue-600
            hover:bg-blue-700
            text-white
            px-5
            py-2
            rounded-xl
            transition
            font-medium
          "
        >
          View All
        </button>

      </div>

      {/* Table */}
      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                Driver
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                License
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                RC
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Insurance
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Aadhaar
              </th>

              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {documents.length === 0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="py-12 text-center text-gray-500"
                >
                  No documents found.
                </td>

              </tr>

            ) : (

              documents.map((doc) => (

                <tr
                  key={doc.id}
                  className="
                    border-b
                    border-gray-200
                    hover:bg-gray-50
                    transition
                  "
                >

                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {doc.driver}
                  </td>

                  <td className="px-6 py-4 text-center text-xl">
                    {doc.license ? (
                      <span className="text-green-600">✔</span>
                    ) : (
                      <span className="text-red-500">✖</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center text-xl">
                    {doc.rc ? (
                      <span className="text-green-600">✔</span>
                    ) : (
                      <span className="text-red-500">✖</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center text-xl">
                    {doc.insurance ? (
                      <span className="text-green-600">✔</span>
                    ) : (
                      <span className="text-red-500">✖</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center text-xl">
                    {doc.aadhaar ? (
                      <span className="text-green-600">✔</span>
                    ) : (
                      <span className="text-red-500">✖</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <Status status={doc.status} />
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

interface StatusProps {
  status: string;
}

function Status({ status }: StatusProps) {
  const styles: Record<string, string> = {
    Approved: "bg-green-100 text-green-700",
    Pending: "bg-orange-100 text-orange-700",
    Rejected: "bg-red-100 text-red-700",
    Expired: "bg-gray-200 text-gray-700",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-4
        py-1.5
        rounded-full
        text-sm
        font-semibold
        ${styles[status] || "bg-gray-100 text-gray-700"}
      `}
    >
      {status}
    </span>
  );
}