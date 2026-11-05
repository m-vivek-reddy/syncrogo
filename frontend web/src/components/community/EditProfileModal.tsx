import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';
import { uploadProfilePhotoApi, updateProfileApi } from '../../api/auth';
import type { User } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, user, onClose, onSaved }) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setPhone(user?.phone || '');
      setPhotoFile(null);
      setPhotoPreview(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Profile photo must be a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be 5 MB or smaller.');
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSavePhotoOnly = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    setError(null);
    const result = await uploadProfilePhotoApi(photoFile);
    setUploadingPhoto(false);
    if (!result.success || !result.user) {
      setError(result.message || 'Photo upload failed.');
      return;
    }
    onSaved(result.user);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSuccess('Profile photo updated!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    // Upload the picked photo first (if any), then save the text fields.
    if (photoFile) {
      setUploadingPhoto(true);
      const photoResult = await uploadProfilePhotoApi(photoFile);
      setUploadingPhoto(false);
      if (!photoResult.success || !photoResult.user) {
        setError(photoResult.message || 'Photo upload failed.');
        return;
      }
      onSaved(photoResult.user);
      setPhotoFile(null);
      setPhotoPreview(null);
    }

    setSaving(true);
    const result = await updateProfileApi({ name: name.trim(), phone: phone.trim() || undefined });
    setSaving(false);

    if (!result.success || !result.user) {
      setError(result.message || 'Unable to update your profile.');
      return;
    }

    onSaved(result.user);
    setSuccess('Profile updated successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-navy-950 font-display">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="relative">
            {photoPreview ? (
              <img src={photoPreview} alt="New profile photo" className="w-24 h-24 rounded-2xl object-cover shadow-md" />
            ) : user?.profile_photo ? (
              <img src={user.profile_photo} alt={user.name} className="w-24 h-24 rounded-2xl object-cover shadow-md" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-600 to-teal-800 text-white flex items-center justify-center font-extrabold text-3xl shadow-md">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={handlePickPhoto}
              className="absolute inset-0 rounded-2xl ring-2 ring-offset-2 ring-green-600/0 hover:ring-green-600/60 transition-all flex items-end justify-end group"
              aria-label="Change photo"
            >
              <span className="m-1.5 p-2 rounded-full bg-green-600 text-white shadow-md group-hover:bg-green-700 transition-colors">
                <Pencil className="w-4 h-4" />
              </span>
            </button>
          </div>
          <button type="button" onClick={handlePickPhoto} className="text-xs font-semibold text-brand-700 hover:underline">
            Change profile photo
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
          {photoFile && (
            <button
              type="button"
              onClick={handleSavePhotoOnly}
              disabled={uploadingPhoto}
              className="px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 text-xs font-bold hover:bg-brand-100 disabled:opacity-60 flex items-center gap-1.5"
            >
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {uploadingPhoto ? 'Uploading…' : 'Upload photo now'}
            </button>
          )}
        </div>

        {error && <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{error}</div>}
        {success && <div className="mb-3 p-3 rounded-xl bg-green-50 text-green-800 text-xs font-semibold">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
            />
            <p className="mt-1 text-[10px] text-slate-400">Email cannot be changed.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
            >
              {(saving || uploadingPhoto) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
