interface StatusBadgeProps {
  status: "verified" | "pending" | "rejected" | "missing";
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  switch (status) {
    case "verified":
      return (
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
          Verified
        </span>
      );

    case "pending":
      return (
        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
          Pending
        </span>
      );

    case "rejected":
      return (
        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
          Rejected
        </span>
      );

    default:
      return (
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
          Not Uploaded
        </span>
      );
  }
}