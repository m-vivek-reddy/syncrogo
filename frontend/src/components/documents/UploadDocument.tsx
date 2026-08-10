import { useState } from "react";
import { UploadCloud, File, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../api/client";

export default function UploadDocument() {
  const [documentType, setDocumentType] = useState("Aadhaar Card");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file);

    try {
      await apiClient.post(
        "/api/v1/documents/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage("Document uploaded successfully.");

      setFile(null);
    } catch {
      setMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">

      <h2 className="text-xl font-bold text-slate-900">
        Upload Document
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        Upload clear images or PDFs.
      </p>

      {message && (
        <div className="mt-5 rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-green-700">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      <form
        onSubmit={handleUpload}
        className="space-y-5 mt-6"
      >

        {/* Document Type */}

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Document Type
          </label>

          <select
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value)
            }
            className="w-full mt-2 rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500"
          >
            <option>Aadhaar Card</option>
            <option>PAN Card</option>
            <option>Driving License</option>
            <option>RC Book</option>
            <option>Vehicle Insurance</option>
            <option>Pollution Certificate</option>
          </select>
        </div>

        {/* Upload */}

        <label className="block">

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-500 transition cursor-pointer">

            <UploadCloud
              size={40}
              className="mx-auto text-blue-600"
            />

            <p className="mt-3 font-semibold text-slate-700">
              Click to choose a file
            </p>

            <p className="text-xs text-slate-500 mt-1">
              JPG, PNG or PDF (Max 10MB)
            </p>

            <input
              type="file"
              accept="image/*,.pdf"
              hidden
              onChange={(e) =>
                setFile(
                  e.target.files
                    ? e.target.files[0]
                    : null
                )
              }
            />

          </div>

        </label>

        {file && (

          <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">

            <File className="text-blue-600" />

            <div>

              <p className="font-medium">
                {file.name}
              </p>

              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

            </div>

          </div>

        )}

        <button
          disabled={uploading || !file}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition"
        >
          {uploading
            ? "Uploading..."
            : "Upload Document"}
        </button>

      </form>

    </div>
  );
}