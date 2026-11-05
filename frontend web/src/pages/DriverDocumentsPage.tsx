import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileLock2, ShieldCheck, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { updateConsentApi } from '../api/consent';

const documentTypes = [
  { type: 'aadhaar', label: 'Aadhaar card', requiredForRide: false },
  { type: 'license', label: 'Driving licence (DL)', requiredForRide: true },
  { type: 'rc_book', label: 'Vehicle registration (RC)', requiredForRide: true },
] as const;
type DocumentType = typeof documentTypes[number]['type'];
const allowedTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

export default function DriverDocumentsPage() {
  const [documents, setDocuments] = useState<{ document_type: string; status: string }[]>([]);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/v1/documents/');
      setDocuments(data?.documents || []);
      setError('');
    } catch {
      setError('Could not load document status. You can still upload; publishing remains locked until approval is confirmed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const upload = async (type: DocumentType) => {
    const file = files[type];
    if (!file || !consent) return;
    setUploading(type);
    setError('');
    setMessage('');
    try {
      const consentResult = await updateConsentApi(['documents'], true, 'driver_document_upload');
      if (!consentResult.success) throw new Error(consentResult.message || 'Could not save document consent.');
      const form = new FormData();
      form.append('document_type', type);
      form.append('file', file);
      await apiClient.post('/api/v1/documents/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFiles((current) => ({ ...current, [type]: undefined }));
      setMessage(`${documentTypes.find((item) => item.type === type)?.label} uploaded for review.`);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link to="/offer-ride" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" />Back to Offer a Ride
        </Link>
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-green-50 p-3 text-green-700"><FileLock2 className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-800">Secure document verification</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Upload your Aadhaar, driving licence, and vehicle RC. Documents are private to your account and authorized reviewers.</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Files must be JPG, PNG, WEBP, or PDF and no larger than 10 MB. Your DL and RC must be approved before you can publish a ride. Aadhaar is collected for identity verification.</p>
          </div>

          {loading && <p className="mt-5 text-sm text-slate-500">Checking your documents…</p>}
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}

          <div className="mt-6 space-y-4">
            {documentTypes.map(({ type, label, requiredForRide }) => {
              const current = documents.find((document) => document.document_type === type);
              const approved = ['approved', 'verified'].includes((current?.status || '').toLowerCase());
              return (
                <div key={type} className="rounded-2xl border border-slate-200 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-800">{label}{requiredForRide && <span className="ml-2 text-xs font-semibold text-red-600">Required for rides</span>}</h2>
                    <p className={`mt-1 text-xs font-semibold ${approved ? 'text-green-700' : current?.status === 'rejected' ? 'text-red-600' : 'text-amber-700'}`}>
                      {approved ? 'Approved' : current?.status || 'Not uploaded'}
                    </p>
                  </div>
                  {!approved && (
                    <div className="mt-3 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" aria-label={`Choose ${label}`} onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const extension = file.name.split('.').pop()?.toLowerCase() || '';
                        if (file.size === 0 || file.size > 10 * 1024 * 1024 || !allowedTypes[extension] || (file.type && file.type !== allowedTypes[extension])) {
                          setFiles((currentFiles) => ({ ...currentFiles, [type]: undefined }));
                          setError(file.size > 10 * 1024 * 1024 ? 'Each file must be 10 MB or smaller.' : 'Choose a non-empty JPG, PNG, WEBP, or PDF file.');
                          event.target.value = '';
                          return;
                        }
                        setError('');
                        setFiles((currentFiles) => ({ ...currentFiles, [type]: file }));
                      }} />
                      <button type="button" disabled={!files[type] || !consent || uploading !== null} onClick={() => void upload(type)} className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50">
                        <UploadCloud className="h-4 w-4" />{uploading === type ? 'Uploading…' : 'Upload'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-green-700" />
            <span>I agree to submit these documents for identity, driver, and vehicle verification as described in the <Link to="/privacy" className="font-semibold text-blue-700 underline">Privacy Policy</Link>.</span>
          </label>
        </section>
      </div>
    </main>
  );
}
