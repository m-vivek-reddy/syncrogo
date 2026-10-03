import { buildSosPayload } from "../sos";

describe("buildSosPayload", () => {
  it("uses backend coordinate names and includes a known ride ID", () => {
    expect(buildSosPayload(12.5, 77.6, 42)).toEqual({
      latitude: 12.5,
      longitude: 77.6,
      ride_id: 42,
    });
  });

  it("omits ride_id for standalone SOS", () => {
    expect(buildSosPayload(12.5, 77.6)).toEqual({
      latitude: 12.5,
      longitude: 77.6,
    });
  });

  it("rejects out-of-range or non-finite coordinates", () => {
    expect(() => buildSosPayload(91, 0)).toThrow("invalid latitude");
    expect(() => buildSosPayload(0, Number.NaN)).toThrow("invalid longitude");
    expect(() => buildSosPayload(0, Number.POSITIVE_INFINITY)).toThrow("invalid longitude");
  });

  it("rejects invalid ride IDs", () => {
    expect(() => buildSosPayload(12.5, 77.6, 0)).toThrow("ride ID is invalid");
    expect(() => buildSosPayload(12.5, 77.6, 1.2)).toThrow("ride ID is invalid");
  });
});
