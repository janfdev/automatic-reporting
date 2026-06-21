/**
 * Unit tests for the normalization helpers used in app/api/reports/route.ts.
 *
 * The logic is replicated here as pure functions so we can test it in
 * isolation, without needing to import the full route with all its DB
 * and auth dependencies.
 */

// Replicate the normalization logic from app/api/reports/route.ts
function normalizeKendala(val?: string | null): string {
  return !val || val.trim() === "" ? "Tidak ada" : val.trim();
}
function normalizeNeedSupport(val?: string | null): string {
  return !val || val.trim() === "" ? "Aman" : val.trim();
}

describe("Normalisasi Nilai Default Laporan", () => {
  describe("normalizeKendala (formKendala)", () => {
    it("string kosong -> 'Tidak ada'", () => {
      expect(normalizeKendala("")).toBe("Tidak ada");
    });
    it("undefined -> 'Tidak ada'", () => {
      expect(normalizeKendala(undefined)).toBe("Tidak ada");
    });
    it("null -> 'Tidak ada'", () => {
      expect(normalizeKendala(null)).toBe("Tidak ada");
    });
    it("hanya spasi -> 'Tidak ada'", () => {
      expect(normalizeKendala("   ")).toBe("Tidak ada");
    });
    it("ada isian -> dikembalikan apa adanya (trimmed)", () => {
      expect(normalizeKendala("  AC mati  ")).toBe("AC mati");
    });
    it("isian normal -> tidak berubah", () => {
      expect(normalizeKendala("Freezer rusak")).toBe("Freezer rusak");
    });
  });

  describe("normalizeNeedSupport (needSupport)", () => {
    it("string kosong -> 'Aman'", () => {
      expect(normalizeNeedSupport("")).toBe("Aman");
    });
    it("undefined -> 'Aman'", () => {
      expect(normalizeNeedSupport(undefined)).toBe("Aman");
    });
    it("null -> 'Aman'", () => {
      expect(normalizeNeedSupport(null)).toBe("Aman");
    });
    it("hanya spasi -> 'Aman'", () => {
      expect(normalizeNeedSupport("   ")).toBe("Aman");
    });
    it("ada isian support -> dikembalikan apa adanya (trimmed)", () => {
      expect(normalizeNeedSupport("  Butuh penggantian AC  ")).toBe("Butuh penggantian AC");
    });
  });
});
