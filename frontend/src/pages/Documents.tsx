import { useState } from "react";

import VerificationProgress from "../components/documents/VerificationProgress";
import DocumentCard from "../components/documents/DocumentCard";
import UploadDocument from "../components/documents/UploadDocument";
import UploadHistory from "../components/documents/UploadHistory";

import type { UploadedDocument } from "../components/documents/UploadHistory";

export default function Documents() {
  const [documents] = useState<UploadedDocument[]>([
    {
      id: 1,
      name: "aadhaar.pdf",
      type: "Aadhaar Card",
      uploadedAt: "2 days ago",
      status: "verified",
    },
    {
      id: 2,
      name: "license.jpg",
      type: "Driving License",
      uploadedAt: "Yesterday",
      status: "pending",
    },
  ]);

  const verified = documents.filter(
    (doc) => doc.status === "verified"
  ).length;

  const pending = documents.filter(
    (doc) => doc.status === "pending"
  ).length;

  const rejected = documents.filter(
    (doc) => doc.status === "rejected"
  ).length;

  const percentage = Math.round((verified / 3) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}

      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Identity & Documents
          </h1>

          <p className="text-slate-500 mt-2">
            Upload your documents to unlock all SyncroGo features.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Progress */}

        <VerificationProgress
          percentage={percentage}
          verified={verified}
          pending={pending}
          rejected={rejected}
        />

        {/* Cards */}

        <div className="grid md:grid-cols-3 gap-5">
          <DocumentCard
            title="Aadhaar Card"
            subtitle="Government Identity Proof"
            status="verified"
            uploadedAt="2 days ago"
          />

          <DocumentCard
            title="Driving License"
            subtitle="Required to offer rides"
            status="pending"
            uploadedAt="Yesterday"
          />

          <DocumentCard
            title="Vehicle Insurance"
            subtitle="Upload insurance copy"
            status="missing"
          />
        </div>

        {/* Upload */}

        <UploadDocument />

        {/* Upload History */}

        <UploadHistory documents={documents} />
      </div>
    </div>
  );
}