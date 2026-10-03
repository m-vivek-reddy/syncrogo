import { getDriverDocumentReadiness } from "../driverVerification";

describe("getDriverDocumentReadiness", () => {
  it("requires both an approved licence and RC", () => {
    expect(getDriverDocumentReadiness([
      { document_type: "license", status: "approved" },
    ]).ready).toBe(false);
    expect(getDriverDocumentReadiness([
      { document_type: "rc_book", status: "approved" },
    ]).ready).toBe(false);
    expect(getDriverDocumentReadiness([
      { document_type: "license", status: "approved" },
      { document_type: "rc_book", status: "approved" },
    ]).ready).toBe(true);
  });

  it("does not require optional document categories", () => {
    expect(getDriverDocumentReadiness([
      { document_type: "license", status: "approved" },
      { document_type: "rc_book", status: "approved" },
      { document_type: "aadhaar", status: "pending" },
    ]).ready).toBe(true);
  });

  it("recognizes legacy names and rejected required documents", () => {
    const result = getDriverDocumentReadiness([
      { document_type: "driving_licence", status: "verified" },
      { document_type: "vehicle rc", status: "rejected" },
    ]);
    expect(result.ready).toBe(false);
    expect(result.rejectedTypes).toContain("rc_book");
  });
});
