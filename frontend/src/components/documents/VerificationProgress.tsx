import {
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

interface VerificationProgressProps {
  percentage: number;
  verified: number;
  pending: number;
  rejected: number;
}

export default function VerificationProgress({
  percentage,
  verified,
  pending,
  rejected,
}: VerificationProgressProps) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Verification Progress
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Complete all required documents
          </p>
        </div>

        <span className="text-2xl font-bold text-blue-600">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">

        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <CheckCircle2
            size={26}
            className="mx-auto text-green-600"
          />

          <p className="text-2xl font-bold text-green-700 mt-2">
            {verified}
          </p>

          <p className="text-xs text-slate-500">
            Verified
          </p>
        </div>

        <div className="bg-yellow-50 rounded-2xl p-4 text-center">
          <Clock3
            size={26}
            className="mx-auto text-yellow-600"
          />

          <p className="text-2xl font-bold text-yellow-700 mt-2">
            {pending}
          </p>

          <p className="text-xs text-slate-500">
            Pending
          </p>
        </div>

        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <XCircle
            size={26}
            className="mx-auto text-red-600"
          />

          <p className="text-2xl font-bold text-red-700 mt-2">
            {rejected}
          </p>

          <p className="text-xs text-slate-500">
            Rejected
          </p>
        </div>

      </div>
    </div>
  );
}