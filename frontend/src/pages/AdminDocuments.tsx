import { useCallback, useEffect, useState } from "react";
import { getDocuments, updateDocumentStatus } from "../services/adminApi";

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDocuments();
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setDocuments(list);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpdate = async (id: number, status: string) => {
    try {
      await updateDocumentStatus(id, status);
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = documents.filter((doc) =>
    (doc.driver_name || doc.user_name || doc.document_type || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">
            Driver Document Verification
          </h1>

          <p className="mt-2 text-slate-600">
            Review and verify uploaded driver documents.
          </p>
        </div>

        <button
          className="
          px-6
          py-3
          rounded-xl
          text-white
          font-semibold
          bg-gradient-to-r
          from-blue-600
          to-cyan-500
          hover:from-blue-700
          hover:to-cyan-600
          shadow-lg
          transition
          "
        >
          Refresh
        </button>

      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

        <Card
          title="Pending"
          value={documents.filter((d) => d.status === "pending").length.toString()}
          color="text-amber-500"
        />

        <Card
          title="Approved"
          value={documents.filter((d) => d.status === "verified" || d.status === "Approved").length.toString()}
          color="text-emerald-500"
        />

        <Card
          title="Rejected"
          value={documents.filter((d) => d.status === "rejected").length.toString()}
          color="text-red-500"
        />

        <Card
          title="Total Submitted"
          value={documents.length.toString()}
          color="text-slate-500"
        />

      </div>

      {/* Search */}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-5 mb-8">

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search driver..."
          className="
          w-full
          rounded-xl
          border
          border-slate-300
          bg-slate-50
          px-4
          py-3
          text-slate-900
          placeholder:text-slate-400
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:border-blue-500
          "
        />

      </div>

      {/* Table */}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-x-auto">

        <table className="min-w-[950px] w-full">

          <thead className="bg-slate-900 text-white">

            <tr>

              <th className="p-4 text-left">Driver</th>

              <th className="p-4">Vehicle</th>

              <th className="p-4">License</th>

              <th className="p-4">RC</th>

              <th className="p-4">Insurance</th>

              <th className="p-4">Aadhaar</th>

              <th className="p-4">Status</th>

              <th className="p-4">Action</th>

            </tr>

          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                  Loading submitted documents...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                  No documents found.
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (

                <tr
                  key={doc.id}
                  className="border-b border-slate-200 hover:bg-blue-50 transition"
                >

                  <td className="p-4 font-semibold text-slate-800">
                    {doc.driver_name || doc.user_name || "User #" + (doc.user_id || doc.id)}
                  </td>

                  <td className="text-center text-slate-700 font-bold uppercase">
                    {doc.document_type || "Document"}
                  </td>

                  <td className="text-center text-slate-600 text-sm">
                    {doc.doc_number || (doc.file_url ? "File Attached" : "On File")}
                  </td>

                  <td className="text-center">

                    <Status status={doc.status || "pending"} />

                  </td>

                  <td className="text-center space-x-2 p-4">

                    <button
                      onClick={() => handleUpdate(doc.id, "verified")}
                      className="px-3 py-1.5 rounded-lg text-white font-medium text-xs bg-emerald-600 hover:bg-emerald-700 transition"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => handleUpdate(doc.id, "rejected")}
                      className="px-3 py-1.5 rounded-lg text-white font-medium text-xs bg-red-600 hover:bg-red-700 transition"
                    >
                      Reject
                    </button>

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

function Card({
  title,
  value,
  color,
}: any) {

  return (

    <div
      className="
      bg-white
      border
      border-slate-200
      rounded-2xl
      shadow-lg
      hover:shadow-xl
      transition
      p-6
      "
    >

      <p className="text-slate-500 font-medium">
        {title}
      </p>

      <h2 className={`text-4xl font-bold mt-3 ${color}`}>
        {value}
      </h2>

    </div>

  );
}

function Status({
  status,
}: any) {

  const styles: any = {

    Pending:
      "bg-amber-100 text-amber-700",

    Approved:
      "bg-emerald-100 text-emerald-700",

    Rejected:
      "bg-red-100 text-red-700",

    Expired:
      "bg-slate-200 text-slate-700",

  };

  return (

    <span
      className={`
      inline-flex
      items-center
      justify-center
      px-3
      py-1
      rounded-full
      text-xs
      font-semibold
      ${styles[status]}
      `}
    >
      {status}
    </span>

  );
}
