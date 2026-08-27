import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import ProfileBackButton from "../components/profile/ProfileBackButton";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { KeyRound, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAppStore();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!oldPassword || !newPassword) {
      setMessage("Please enter both current and new password.");
      return;
    }

    try {
      const response = await apiClient.put("/api/v1/users/change-password", {
        current_password: oldPassword,
        new_password: newPassword,
      });
      setMessage(response.data.message || "Password changed successfully.");
      setIsSuccess(true);
      setOldPassword("");
      setNewPassword("");
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Password change failed.");
      setIsSuccess(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");

    if (!confirmEmail.trim()) {
      setDeleteError("Please type your email address to confirm.");
      return;
    }

    if (user?.email && confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError("The email you entered does not match your account email.");
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.post("/api/v1/users/delete-account", {
        email: confirmEmail.trim(),
      });

      localStorage.removeItem("syncrogo_token");
      localStorage.removeItem("token");
      logout();

      alert("Your account has been permanently deleted.");
      navigate("/login", { replace: true });
    } catch (error: any) {
      setDeleteError(error.response?.data?.detail || "Failed to delete account. Please check your email.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 font-sans">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <ProfileBackButton />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Update your account security credentials</p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm"
              >
                Update Password
              </button>
            </div>

            {message && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${isSuccess ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {isSuccess ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Danger Zone: Delete Account */}
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900">Danger Zone: Delete Account</h2>
                <p className="mt-1 text-xs text-red-700 leading-relaxed">
                  Permanently delete your SyncroGo account, rides, bookings, vehicles, and personal data. This action is irreversible.
                </p>
              </div>
            </div>
            {!showDeleteModal && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 transition shadow-sm"
              >
                Delete Account
              </button>
            )}
          </div>

          {showDeleteModal && (
            <div className="mt-6 border-t border-red-200 pt-5">
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div className="rounded-xl bg-white p-4 border border-red-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    To confirm deletion, please type your account email address ({user?.email}):
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={user?.email || "Type your email address"}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {deleteError && (
                  <div className="rounded-xl bg-red-100 p-3 text-xs font-semibold text-red-800 border border-red-200">
                    ⚠️ {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setConfirmEmail("");
                      setDeleteError("");
                    }}
                    disabled={isDeleting}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isDeleting || !confirmEmail.trim()}
                    className="rounded-xl bg-red-600 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isDeleting ? "Deleting..." : "Permanently Delete Account"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
