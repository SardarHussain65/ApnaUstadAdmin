import { describe, expect, it } from "vitest";
import { buildReason, validateReason } from "./reason";
import { previousPeriod, rangeFromPreset, toQueryDate } from "./date-range";
import { resolveEffects } from "./preferences";
import { getPermissionsForRole, hasAdminPermission, canAccessRoute } from "./admin-permissions";

describe("reason helpers", () => {
  it("composes preset + note", () => {
    expect(buildReason({ selected: "Fraud", note: "Duplicate CNIC" })).toBe("Fraud — Duplicate CNIC");
    expect(buildReason({ selected: "Fraud" })).toBe("Fraud");
    expect(buildReason({ note: "  only note " })).toBe("only note");
  });
  it("requires a preset when presets exist", () => {
    expect(validateReason({}, { hasPresets: true, required: true })).toMatch(/Select a reason/);
    expect(validateReason({ selected: "Fraud" }, { hasPresets: true, required: true })).toBeNull();
  });
  it("requires a 10+ char note for Other or free-text-only", () => {
    expect(validateReason({ selected: "Other", note: "short" }, { hasPresets: true, required: true })).toMatch(/at least 10/);
    expect(validateReason({ selected: "Other", note: "long enough note" }, { hasPresets: true, required: true })).toBeNull();
    expect(validateReason({ note: "short" }, { hasPresets: false, required: true })).toMatch(/at least 10/);
  });
  it("skips validation when not required", () => {
    expect(validateReason({}, { hasPresets: true, required: false })).toBeNull();
  });
});

describe("date ranges", () => {
  const now = new Date(2026, 5, 15, 14, 30);
  it("7d is inclusive of today (7 calendar days)", () => {
    const r = rangeFromPreset("7d", now);
    expect(toQueryDate(r.from)).toBe("2026-06-09");
    expect(toQueryDate(r.to)).toBe("2026-06-15");
  });
  it("previous period has identical length and is adjacent", () => {
    const r = rangeFromPreset("30d", now);
    const p = previousPeriod(r);
    expect(toQueryDate(p.to)).toBe("2026-05-16");
    expect(toQueryDate(p.from)).toBe("2026-04-17");
  });
});

describe("visual effects resolution", () => {
  it("reduced motion always wins", () => {
    expect(resolveEffects("on", { reducedMotion: true, lowEnd: false })).toBe(false);
  });
  it("auto disables on low-end devices, 'on' forces enable", () => {
    expect(resolveEffects("auto", { reducedMotion: false, lowEnd: true })).toBe(false);
    expect(resolveEffects("on", { reducedMotion: false, lowEnd: true })).toBe(true);
    expect(resolveEffects("auto", { reducedMotion: false, lowEnd: false })).toBe(true);
    expect(resolveEffects("off", { reducedMotion: false, lowEnd: false })).toBe(false);
  });
});

describe("role permissions (client mirror)", () => {
  it("finance cannot access identity reviews; verifier cannot access payments", () => {
    expect(hasAdminPermission("finance", "verification")).toBe(false);
    expect(hasAdminPermission("verifier", "payments")).toBe(false);
    expect(hasAdminPermission("finance", "wallets")).toBe(true);
  });
  it("superadmin and admin get everything; unknown roles nothing", () => {
    expect(getPermissionsForRole("superadmin").length).toBeGreaterThan(15);
    expect(getPermissionsForRole("ghost")).toEqual([]);
  });
  it("gates routes by permission", () => {
    expect(canAccessRoute("support", "/payments")).toBe(false);
    expect(canAccessRoute("support", "/disputes/123")).toBe(true);
  });
});
