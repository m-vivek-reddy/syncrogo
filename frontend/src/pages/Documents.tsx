import { useState } from 'react';
import { apiClient } from '../api/client';

export default function Documents() {
  const [documentType, setDocumentType] = useState('Driver License');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);

    setUploading(true);
    setMessage('');

    try {
      const res = await apiClient.post('/api/v1/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.status === 201) {
        setMessage('Document uploaded successfully and is pending review.');
        setFile(null);
      } else {
        setMessage('Upload failed. Please try again.');
      }
    } catch (err) {
      setMessage('An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-50 min-h-screen">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Identity & Documents</h2>
      <p className="text-sm text-slate-500 mb-6">Upload required verifications to unlock all features.</p>

      {message && <p className="text-sm p-3 mb-4 rounded bg-blue-50 text-blue-700">{message}</p>}

      <form onSubmit={handleUpload} className="bg-white p-4 rounded-xl shadow-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Document Type</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="mt-1 w-full border p-2 rounded-md text-sm border-slate-300"
          >
            <option value="Driver License">Driver License</option>
            <option value="Govt ID Card">Government ID Card</option>
            <option value="Vehicle Insurance">Vehicle Insurance</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Upload File (PDF/Image)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            required
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-slate-900 text-white p-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Submit Document'}
        </button>
      </form>
    </div>
  );
}
