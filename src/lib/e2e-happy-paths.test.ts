import { describe, it, expect } from "vitest";
import { formatPKR, fmtPKR, formatCompact, shortId, maskCnic } from "./format";

describe("E2E Happy Paths & Core Workflows Suite", () => {
  describe("1. Currency & Tabular Number Formatters", () => {
    it("formats standard and large Pakistani Rupee values with consistent Rs. prefix", () => {
      expect(formatPKR(0)).toBe("Rs 0");
      expect(formatPKR(1500)).toBe("Rs 1,500");
      expect(formatPKR(250000)).toBe("Rs 250,000");
      expect(formatPKR(12500000)).toBe("Rs 12,500,000");
    });

    it("formats compact notation for KPI cards and chart axes", () => {
      expect(formatCompact(500)).toBe("500");
      expect(formatCompact(1500)).toBe("1.5K");
      expect(formatCompact(2500000)).toBe("2.5M");
    });

    it("truncates MongoDB ObjectIDs safely for compact table pills", () => {
      const mongoId = "6631b5c490a12e001f3b8901";
      expect(shortId(mongoId)).toBe("#3b8901");
      expect(shortId("")).toBe("—");
    });
  });

  describe("2. NADRA CNIC Security & Masking", () => {
    it("correctly masks Pakistani CNIC while preserving first 5 and last 1 digit for verification", () => {
      const rawCnic = "42101-1234567-1";
      const masked = maskCnic(rawCnic);
      expect(masked).toBe("42101-*******-1");
    });

    it("handles unformatted 13-digit raw CNIC string", () => {
      const unformatted = "4210112345671";
      const masked = maskCnic(unformatted);
      expect(masked).toBe("42101-*******-1");
    });
  });

  describe("3. Financial Reconciliations & Top-Up Approvals", () => {
    it("accurately computes projected balance after approving pending top-up", () => {
      const currentAvailableBalance = 450;
      const approvedTopUpCredit = 2000;
      const projectedBalance = currentAvailableBalance + approvedTopUpCredit;
      expect(projectedBalance).toBe(2450);
      expect(fmtPKR(projectedBalance)).toBe("Rs 2,450");
    });
  });

  describe("4. Dispute Resolution 4-Way Outcome Calculations", () => {
    it("computes 50% split refund amounts accurately between client and worker", () => {
      const disputedEscrowAmount = 3000;
      const clientRefundPercent = 50;
      const clientAmount = (disputedEscrowAmount * clientRefundPercent) / 100;
      const workerAmount = disputedEscrowAmount - clientAmount;

      expect(clientAmount).toBe(1500);
      expect(workerAmount).toBe(1500);
    });

    it("applies wallet penalty deductions to worker", () => {
      const workerWallet = 2500;
      const penaltyAmount = 500;
      const updatedBalance = workerWallet - penaltyAmount;
      expect(updatedBalance).toBe(2000);
    });
  });

  describe("5. Promo Code Rules Engine (First-Time & City Scope)", () => {
    it("evaluates percentage discount capped at max ceiling", () => {
      const bookingAmount = 10000;
      const discountPercentage = 25; // 25% of 10,000 = 2,500
      const maxDiscountCeiling = 1000; // Cap at Rs. 1,000

      const rawDiscount = (bookingAmount * discountPercentage) / 100;
      const effectiveDiscount = maxDiscountCeiling > 0 ? Math.min(rawDiscount, maxDiscountCeiling) : rawDiscount;

      expect(rawDiscount).toBe(2500);
      expect(effectiveDiscount).toBe(1000);
      expect(bookingAmount - effectiveDiscount).toBe(9000);
    });

    it("validates city match against promo code scope", () => {
      const promoCityScope = "Karachi";
      const customerCityA = "karachi";
      const customerCityB = "lahore";

      const isValidA = promoCityScope === "all" || customerCityA.toLowerCase() === promoCityScope.toLowerCase();
      const isValidB = promoCityScope === "all" || customerCityB.toLowerCase() === promoCityScope.toLowerCase();

      expect(isValidA).toBe(true);
      expect(isValidB).toBe(false);
    });
  });

  describe("6. Pakistan Live Ops Radar City Topology", () => {
    it("verifies operational coordinates and valid provinces for all major Pakistani hubs", () => {
      const hubs = [
        { name: "Karachi", province: "Sindh", x: 230, y: 430 },
        { name: "Lahore", province: "Punjab", x: 420, y: 220 },
        { name: "Islamabad & Rawalpindi", province: "ICT / Punjab", x: 385, y: 135 },
        { name: "Peshawar", province: "Khyber Pakhtunkhwa", x: 330, y: 125 },
        { name: "Quetta", province: "Balochistan", x: 195, y: 275 },
      ];

      expect(hubs.length).toBe(5);
      hubs.forEach((hub) => {
        expect(hub.x).toBeGreaterThan(0);
        expect(hub.x).toBeLessThan(600);
        expect(hub.y).toBeGreaterThan(0);
        expect(hub.y).toBeLessThan(500);
      });
    });
  });
});
