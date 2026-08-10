import {
  FileText,
  Upload,
  Eye,
} from "lucide-react";

import StatusBadge from "./StatusBadge";

interface DocumentCardProps {
  title: string;
  subtitle: string;
  status: "verified" | "pending" | "rejected" | "missing";
  uploadedAt?: string;
  onUpload?: () => void;
  onView?: () => void;
}

export default function DocumentCard({
  title,
  subtitle,
  status,
  uploadedAt,
  onUpload,
  onView,
}: DocumentCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">

      {/* Top */}
      <div className="flex justify-between items-start">

        <div className="flex gap-4">

          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FileText
              size={26}
              className="text-blue-600"
            />
          </div>

          <div>

            <h3 className="font-bold text-slate-900">
              {title}
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              {subtitle}
            </p>

            {uploadedAt && (
              <p className="text-xs text-slate-400 mt-2">
                Uploaded {uploadedAt}
              </p>
            )}

          </div>

        </div>

        <StatusBadge status={status} />

      </div>

      {/* Bottom */}
      <div className="flex justify-end gap-3 mt-6">

        {(status === "verified" || status === "pending") && (
          <button
            onClick={onView}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
          >
            <Eye size={18} />
            View
          </button>
        )}

        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <Upload size={18} />
          {status === "missing"
            ? "Upload"
            : "Replace"}
        </button>

      </div>

    </div>
  );
}