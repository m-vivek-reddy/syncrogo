import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";

import VerificationProgress from "../components/documents/VerificationProgress";
import DocumentCard from "../components/documents/DocumentCard";
import UploadDocument from "../components/documents/UploadDocument";
import UploadHistory from "../components/documents/UploadHistory";

import type { UploadedDocument } from "../components/documents/UploadHistory";
import ProfileBackButton from "../components/profile/ProfileBackButton";

export default function Documents() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/v1/documents/");
      const list = res.data?.documents || (Array.isArray(res.data) ? res.data : []);
      setDocuments(
        list.map((d: any, idx: number) => ({
          id: d.id || idx + 1,
          name: d.file_url ? d.file_url.split("/").pop() || d.document_type : d.document_type,
          type: d.document_type || "Document",
          uploadedAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : "Uploaded",
          status: d.status || "pending",
        }))
      );
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const aadhaarDoc = documents.find((d) => d.type === "aadhaar" || d.type === "Aadhaar Card");
  const licenseDoc = documents.find((d) => d.type === "license" || d.type === "Driving License");
  const insuranceDoc = documents.find((d) => d.type === "vehicle_insurance" || d.type === "Vehicle Insurance");

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
          <ProfileBackButton />
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
            status={(aadhaarDoc?.status as any) || "missing"}
            uploadedAt={aadhaarDoc?.uploadedAt}
          />

          <DocumentCard
            title="Driving License"
            subtitle="Required to offer rides"
            status={(licenseDoc?.status as any) || "missing"}
            uploadedAt={licenseDoc?.uploadedAt}
          />

          <DocumentCard
            title="Vehicle Insurance"
            subtitle="Upload insurance copy"
            status={(insuranceDoc?.status as any) || "missing"}
            uploadedAt={insuranceDoc?.uploadedAt}
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
