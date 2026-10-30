import { describe, expect, it } from "vitest";
import {
  computeDelta, formatAge, formatCity, formatPKR, formatPhone, isPlaceholderPhone, isValidCnic, maskCnic, shortId,
} from "./format";

describe("formatPKR", () => {
  it("formats whole rupees with a thousands separator", () => {
    expect(formatPKR(5251.5)).toBe("Rs 5,252");
    expect(formatPKR(1000)).toBe("Rs 1,000");
    expect(formatPKR(0)).toBe("Rs 0");
  });
  it("handles negatives, signs, nullish and numeric strings", () => {
    expect(formatPKR(-500)).toBe("-Rs 500");
    expect(formatPKR(500, { signed: true })).toBe("+Rs 500");
    expect(formatPKR(null)).toBe("—");
    expect(formatPKR(undefined)).toBe("—");
    expect(formatPKR("900")).toBe("Rs 900");
    expect(formatPKR("abc")).toBe("—");
  });
  it("supports optional decimals and compact notation", () => {
    expect(formatPKR(1234.5, { decimals: 2 })).toBe("Rs 1,234.50");
    expect(formatPKR(1_200_000, { compact: true })).toMatch(/^Rs 1\.2/);
  });
});

describe("computeDelta (no fake growth)", () => {
  it("returns New when previous period is zero", () => {
    expect(computeDelta(5, 0)).toMatchObject({ label: "New", direction: "new", pct: null });
  });
  it("returns an em dash when both periods are zero", () => {
    expect(computeDelta(0, 0)).toMatchObject({ label: "—", direction: "none" });
  });
  it("computes real percentages", () => {
    expect(computeDelta(150, 100)).toMatchObject({ label: "+50%", direction: "up" });
    expect(computeDelta(50, 100)).toMatchObject({ label: "-50%", direction: "down" });
    expect(computeDelta(100, 100)).toMatchObject({ label: "0%", direction: "flat" });
  });
  it("never claims 100% growth from tiny numbers with no baseline", () => {
    expect(computeDelta(1, 0).label).not.toContain("100");
  });
  it("is safe for missing data", () => {
    expect(computeDelta(undefined, 4).direction).toBe("none");
  });
});

describe("phone / city placeholders", () => {
  it("treats legacy Google placeholders as not provided", () => {
    expect(isPlaceholderPhone("G-1781351343301-537")).toBe(true);
    expect(isPlaceholderPhone("")).toBe(true);
    expect(isPlaceholderPhone(null)).toBe(true);
    expect(formatPhone("G-1781351343301-537")).toBeNull();
  });
  it("formats Pakistani numbers", () => {
    expect(formatPhone("03001234567")).toBe("+92 300 1234567");
    expect(formatPhone("+923001234567")).toBe("+92 300 1234567");
    expect(formatPhone("+919876543210")).toBe("+919876543210");
  });
  it("treats placeholder cities as unknown", () => {
    expect(formatCity("N/A")).toBeNull();
    expect(formatCity("Mountain View")).toBeNull();
    expect(formatCity(" Lahore ")).toBe("Lahore");
  });
});

describe("CNIC", () => {
  it("validates #####-#######-#", () => {
    expect(isValidCnic("75211-1234567-2")).toBe(true);
    expect(isValidCnic("7521112345672")).toBe(false);
    expect(isValidCnic("1234-1234567-1")).toBe(false);
  });
  it("masks all but the first group and last digit", () => {
    expect(maskCnic("75211-1234567-2")).toBe("75211-*******-2");
    expect(maskCnic("7521112345672")).toBe("75211-*******-2");
    expect(maskCnic(null)).toBe("—");
  });
  it("never leaks the middle digits", () => {
    expect(maskCnic("75211-1234567-2")).not.toContain("1234567");
  });
});

describe("ids & ages", () => {
  it("shortens ids", () => {
    expect(shortId("66aabbccddeeff00112c9630c")).toBe("#c9630c");
    expect(shortId(undefined)).toBe("—");
  });
  it("formats ages", () => {
    const now = new Date("2026-01-01T12:00:00Z").getTime();
    expect(formatAge("2026-01-01T11:59:40Z", now)).toBe("<1m");
    expect(formatAge("2026-01-01T11:30:00Z", now)).toBe("30m");
    expect(formatAge("2026-01-01T09:00:00Z", now)).toBe("3h");
    expect(formatAge("2025-12-25T12:00:00Z", now)).toBe("7d");
    expect(formatAge(null, now)).toBe("—");
  });
});
