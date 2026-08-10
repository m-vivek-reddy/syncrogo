import {
  FileText,
  CheckCircle2,
  Clock3,
  XCircle,
  Download,
} from "lucide-react";

export interface UploadedDocument {
  id: number;
  name: string;
  type: string;
  uploadedAt: string;
  status: "verified" | "pending" | "rejected";
}

interface UploadHistoryProps {
  documents: UploadedDocument[];
}

export default function UploadHistory({
  documents,
}: UploadHistoryProps) {
  const statusColor = (status: UploadedDocument["status"]) => {
    switch (status) {
      case "verified":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "rejected":
        return "text-red-600 bg-red-50";
    }
  };

  const statusIcon = (status: UploadedDocument["status"]) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 size={16} />;
      case "pending":
        return <Clock3 size={16} />;
      case "rejected":
        return <XCircle size={16} />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-slate-900 mb-5">
        Upload History
      </h2>

      {documents.length === 0 ? (
        <div className="text-center py-10">
          <FileText
            size={48}
            className="mx-auto text-slate-300"
          />

          <p className="text-gray-500 mt-3">
            No uploaded documents yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-2xl p-4 flex justify-between items-center hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <FileText
                    size={22}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">
                    {doc.type}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {doc.name}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded {doc.uploadedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColor(
                    doc.status
                  )}`}
                >
                  {statusIcon(doc.status)}
                  {doc.status}
                </span>

                <button className="text-slate-400 hover:text-blue-600 transition">
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}