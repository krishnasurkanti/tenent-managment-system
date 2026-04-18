import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateNextDueDate,
  formatPaymentDate,
  getDaysUntilDue,
  getDueStatus,
  getBillingCycleLabel,
} from "@/utils/payment";

// ─── calculateNextDueDate ───────────────────────────────────────────────────

describe("calculateNextDueDate", () => {
  describe("daily", () => {
    it("adds 1 day", () => {
      expect(calculateNextDueDate("2026-04-15", "2026-01-01", "daily")).toBe("2026-04-16");
    });

    it("wraps month end", () => {
      expect(calculateNextDueDate("2026-01-31", "2026-01-01", "daily")).toBe("2026-02-01");
    });

    it("wraps year end", () => {
      expect(calculateNextDueDate("2026-12-31", "2026-01-01", "daily")).toBe("2027-01-01");
    });
  });

  describe("weekly", () => {
    it("adds 7 days", () => {
      expect(calculateNextDueDate("2026-04-01", "2026-01-01", "weekly")).toBe("2026-04-08");
    });

    it("spans month boundary", () => {
      expect(calculateNextDueDate("2026-04-28", "2026-01-01", "weekly")).toBe("2026-05-05");
    });
  });

  describe("monthly", () => {
    it("returns same anchor day next month", () => {
      expect(calculateNextDueDate("2026-03-15", "2026-01-15", "monthly")).toBe("2026-04-15");
    });

    it("defaults to monthly when cycle omitted", () => {
      expect(calculateNextDueDate("2026-03-15", "2026-01-15")).toBe("2026-04-15");
    });

    it("wraps december to january", () => {
      expect(calculateNextDueDate("2026-12-10", "2026-01-10", "monthly")).toBe("2027-01-10");
    });

    it("clamps anchor day 31 in Feb (28 days)", () => {
      // anchor day 31, paid in Jan → next month is Feb 2026 (28 days)
      const result = calculateNextDueDate("2026-01-31", "2026-01-31", "monthly");
      expect(result).toBe("2026-02-28");
    });

    it("clamps anchor day 31 in April (30 days)", () => {
      const result = calculateNextDueDate("2026-03-31", "2026-01-31", "monthly");
      expect(result).toBe("2026-04-30");
    });

    it("uses anchor day not paid day", () => {
      // paid on 20th but anchor is 5th → next due should be 5th of next month
      const result = calculateNextDueDate("2026-03-20", "2026-01-05", "monthly");
      expect(result).toBe("2026-04-05");
    });
  });
});

// ─── getDaysUntilDue ────────────────────────────────────────────────────────

describe("getDaysUntilDue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for today", () => {
    expect(getDaysUntilDue("2026-04-18")).toBe(0);
  });

  it("returns positive for future date", () => {
    expect(getDaysUntilDue("2026-04-21")).toBe(3);
  });

  it("returns negative for past date", () => {
    expect(getDaysUntilDue("2026-04-15")).toBe(-3);
  });
});

// ─── getDueStatus ───────────────────────────────────────────────────────────

describe("getDueStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("overdue (any cycle)", () => {
    it("overdue by 1 day → red, priority 0", () => {
      const result = getDueStatus("2026-04-17");
      expect(result.tone).toBe("red");
      expect(result.priority).toBe(0);
      expect(result.label).toBe("Overdue by 1 day");
    });

    it("overdue by 5 days → plural label", () => {
      const result = getDueStatus("2026-04-13");
      expect(result.label).toBe("Overdue by 5 days");
    });
  });

  describe("due today (any cycle)", () => {
    it("returns orange, priority 1", () => {
      const result = getDueStatus("2026-04-18");
      expect(result.tone).toBe("orange");
      expect(result.label).toBe("Due today");
      expect(result.priority).toBe(1);
    });
  });

  describe("monthly", () => {
    it("due in 1 day → orange, priority 2", () => {
      const result = getDueStatus("2026-04-19", "monthly");
      expect(result.tone).toBe("orange");
      expect(result.label).toBe("Due in 1 day");
    });

    it("due in 2 days → yellow, priority 3", () => {
      const result = getDueStatus("2026-04-20", "monthly");
      expect(result.tone).toBe("yellow");
      expect(result.label).toBe("Due in 2 days");
    });

    it("due in 3 days → yellow", () => {
      const result = getDueStatus("2026-04-21", "monthly");
      expect(result.tone).toBe("yellow");
    });

    it("due in 10 days → green, priority 4", () => {
      const result = getDueStatus("2026-04-28", "monthly");
      expect(result.tone).toBe("green");
      expect(result.priority).toBe(4);
    });
  });

  describe("weekly", () => {
    it("due in 1 day → orange", () => {
      const result = getDueStatus("2026-04-19", "weekly");
      expect(result.tone).toBe("orange");
      expect(result.label).toBe("Due tomorrow");
    });

    it("due in 2 days → yellow", () => {
      const result = getDueStatus("2026-04-20", "weekly");
      expect(result.tone).toBe("yellow");
    });

    it("due in 5 days → green (weekly threshold)", () => {
      const result = getDueStatus("2026-04-23", "weekly");
      expect(result.tone).toBe("green");
    });
  });

  describe("daily", () => {
    it("any future date → green (active)", () => {
      const result = getDueStatus("2026-04-19", "daily");
      expect(result.tone).toBe("green");
      expect(result.label).toBe("Active");
    });

    it("10 days out still green for daily", () => {
      const result = getDueStatus("2026-04-28", "daily");
      expect(result.tone).toBe("green");
    });
  });
});

// ─── getBillingCycleLabel ───────────────────────────────────────────────────

describe("getBillingCycleLabel", () => {
  it("daily", () => expect(getBillingCycleLabel("daily")).toBe("Daily"));
  it("weekly", () => expect(getBillingCycleLabel("weekly")).toBe("Weekly"));
  it("monthly", () => expect(getBillingCycleLabel("monthly")).toBe("Monthly"));
  it("defaults to Monthly", () => expect(getBillingCycleLabel()).toBe("Monthly"));
});

// ─── formatPaymentDate ──────────────────────────────────────────────────────

describe("formatPaymentDate", () => {
  it("formats a date string", () => {
    const result = formatPaymentDate("2026-04-15");
    // locale-specific, just verify it contains year and month
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/Apr/);
    expect(result).toMatch(/15/);
  });
});
