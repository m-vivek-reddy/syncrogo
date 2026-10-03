export type DriverDocumentStatus = {
  document_type: string;
  status: string;
};

export const REQUIRED_DRIVER_DOCUMENT_TYPES = ["license", "rc_book"] as const;

const normalizeDocumentType = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["license", "licence", "driving_license", "driving_licence"].includes(normalized)) return "license";
  if (["rc", "vehicle_rc", "rc_book"].includes(normalized)) return "rc_book";
  return normalized;
};

export function getDriverDocumentReadiness(documents: DriverDocumentStatus[]) {
  const latestStatusByType = new Map<string, string>();
  for (const document of documents) {
    const type = normalizeDocumentType(document.document_type);
    if (!latestStatusByType.has(type)) {
      latestStatusByType.set(type, document.status.trim().toLowerCase());
    }
  }

  const missingTypes = REQUIRED_DRIVER_DOCUMENT_TYPES.filter((type) =>
    !["approved", "verified"].includes(latestStatusByType.get(type) || ""),
  );
  const rejectedTypes = missingTypes.filter((type) => latestStatusByType.get(type) === "rejected");
  const pendingTypes = missingTypes.filter((type) => latestStatusByType.get(type) === "pending");

  return {
    ready: missingTypes.length === 0,
    missingTypes,
    rejectedTypes,
    pendingTypes,
  };
}
