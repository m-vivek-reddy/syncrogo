import React, { useState } from 'react';

export default function IdentityVerification({ onBack }) {
  // Simulated document state based on your database structure
  const [documents, setDocuments] = useState([
    {
      id: 'doc_1',
      title: 'Aadhaar Card',
      required: true,
      status: 'not_uploaded',
      uploadedAt: null,
      rejectReason: null,
    },
    {
      id: 'doc_2',
      title: 'Driving License',
      required: true,
      status: 'not_uploaded',
      uploadedAt: null,
      rejectReason: null,
    },
    {
      id: 'doc_3',
      title: 'PAN Card',
      required: false,
      status: 'not_uploaded',
      uploadedAt: null,
      rejectReason: null,
    }
  ]);

  // Calculate overall progress
  const requiredDocs = documents.filter(doc => doc.required);
  const verifiedDocs = requiredDocs.filter(doc => doc.status === 'verified');
  const progressPercent = Math.round((verifiedDocs.length / requiredDocs.length) * 100);

  // Simulated upload handler
  const handleUploadClick = (docId) => {
    alert(`Triggering file upload for document ID: ${docId}. \n\nIn production, this would open the camera or file picker.`);
    // TODO: Implement actual file upload to Supabase/S3 and update status to 'under_review'
  };

  // Helper to render the correct status badge and styling
  const renderStatus = (status) => {
    switch (status) {
      case 'verified':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">✅ Verified</span>;
      case 'under_review':
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">🟡 Under Review</span>;
      case 'rejected':
        return <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">❌ Rejected</span>;
      default:
        return <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Not Uploaded</span>;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-10 font-sans text-gray-800 shadow-xl border border-gray-100">

      {/* 1. HEADER */}
      <div className="bg-white px-6 py-4 flex items-center shadow-sm sticky top-0 z-20">
        <button onClick={onBack} className="text-gray-600 font-bold mr-4 p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">Identity Verification</h1>
      </div>

      {/* 2. PROGRESS INDICATOR */}
      <div className="p-6 pb-2">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Verification Progress</p>
              <h2 className="text-2xl font-black text-gray-900 mt-1">{progressPercent}% Complete</h2>
            </div>
            <div className="text-3xl">{progressPercent === 100 ? '🎉' : '🛡️'}</div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {progressPercent === 100 ? (
            <p className="text-xs text-emerald-600 font-semibold mt-3">✅ You are fully verified and ready to offer rides!</p>
          ) : (
            <p className="text-xs text-gray-500 mt-3">Complete all required documents to publish rides.</p>
          )}
        </div>
      </div>

      {/* 3. DOCUMENT LIST */}
      <div className="p-6 space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md">

            {/* Required Tag */}
            {doc.required && (
              <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-600 text-[9px] font-extrabold px-3 py-1 rounded-bl-lg uppercase">
                Required
              </div>
            )}

            <div className="flex items-start space-x-4">
              <div className="text-3xl p-2 bg-gray-50 rounded-xl">🪪</div>

              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{doc.title}</h3>

                <div className="mt-1.5 flex items-center space-x-2">
                  {renderStatus(doc.status)}
                  {doc.uploadedAt && (
                    <span className="text-[10px] text-gray-400">Uploaded: {doc.uploadedAt}</span>
                  )}
                </div>

                {/* Rejection Reason (If Applicable) */}
                {doc.status === 'rejected' && doc.rejectReason && (
                  <div className="mt-3 bg-red-50 p-3 rounded-xl border border-red-100">
                    <p className="text-xs text-red-700 font-medium">
                      <span className="font-bold">Reason:</span> {doc.rejectReason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4">
                  {doc.status === 'not_uploaded' && (
                    <button
                      onClick={() => handleUploadClick(doc.id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                    >
                      Upload Document
                    </button>
                  )}

                  {doc.status === 'rejected' && (
                    <button
                      onClick={() => handleUploadClick(doc.id)}
                      className="w-full bg-white border-2 border-red-200 hover:border-red-300 text-red-600 font-bold py-2 rounded-xl text-sm transition"
                    >
                      Upload Again
                    </button>
                  )}

                  {doc.status === 'under_review' && (
                    <button disabled className="w-full bg-gray-100 text-gray-400 font-semibold py-2.5 rounded-xl text-sm cursor-not-allowed">
                      Processing...
                    </button>
                  )}

                  {doc.status === 'verified' && (
                    <button className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold py-2 rounded-xl text-sm transition">
                      View Document
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}