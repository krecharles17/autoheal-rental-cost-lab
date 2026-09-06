import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  formatCurrency,
  formatDateTime,
  format24to12Hour,
  format12to24Hour,
  formatDate,
  formatNumeric,
  formatBookingDataToCSV,
  downloadCSV,
  exportBookingsToCSV,
} from "./exportUtils";

const booking = (overrides: Record<string, unknown> = {}) =>
  ({
    booking_id: "b1",
    booking_display_id: "BK-1001",
    guest_user_id: "u1",
    guest_first_name: "Ada",
    guest_last_name: "Lovelace",
    created_at: "2026-01-15T13:45:30",
    listing_title: "Sunny loft",
    checkin_date: "2026-02-01",
    checkout_date: "2026-02-05",
    total_price: 1234.5,
    status: "completed",
    refunds_amount: 0,
    host_payouts_amount: 1000,
    net_revenue: 234.5,
    ...overrides,
  }) as never;

describe("formatCurrency", () => {
  it("formats positive amounts with two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });
  it("formats zero and negatives", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-9.999)).toBe("-$10.00");
  });
});

describe("formatNumeric", () => {
  it("always gives two decimals without a symbol", () => {
    expect(formatNumeric(5)).toBe("5.00");
    expect(formatNumeric(5.006)).toBe("5.01");
    expect(formatNumeric(-2.5)).toBe("-2.50");
  });
});

describe("formatDateTime", () => {
  it("formats afternoon times as PM with 12-hour clock", () => {
    expect(formatDateTime("2026-01-15T13:45:30")).toBe("2026-01-15 1:45:30 PM");
  });
  it("formats midnight as 12 AM", () => {
    expect(formatDateTime("2026-01-15T00:05:09")).toBe("2026-01-15 12:05:09 AM");
  });
  it("formats noon as 12 PM", () => {
    expect(formatDateTime("2026-07-04T12:00:00")).toBe("2026-07-04 12:00:00 PM");
  });
});

describe("formatDate", () => {
  it("returns the YYYY-MM-DD part", () => {
    expect(formatDate("2026-02-01")).toBe("2026-02-01");
    expect(formatDate("2026-02-01T10:00:00Z")).toBe("2026-02-01");
  });
});

describe("time format conversions", () => {
  it.each([
    ["00:00", "12:00 AM"],
    ["09:05", "9:05 AM"],
    ["12:00", "12:00 PM"],
    ["13:30", "1:30 PM"],
    ["23:59", "11:59 PM"],
  ])("converts %s to %s", (input, expected) => {
    expect(format24to12Hour(input)).toBe(expected);
  });

  it("returns the input unchanged when it is not a time", () => {
    expect(format24to12Hour("")).toBe("");
    expect(format24to12Hour("noon")).toBe("noon");
    expect(format12to24Hour("noon")).toBe("noon");
    expect(format12to24Hour("13:00")).toBe("13:00");
  });

  it.each([
    ["12:00 AM", "00:00"],
    ["9:05 AM", "09:05"],
    ["12:00 PM", "12:00"],
    ["1:30 PM", "13:30"],
    ["11:59 pm", "23:59"],
  ])("converts %s to %s", (input, expected) => {
    expect(format12to24Hour(input)).toBe(expected);
  });

  it("round-trips both ways", () => {
    ["00:00", "07:15", "12:00", "18:45", "23:59"].forEach((t) => {
      expect(format12to24Hour(format24to12Hour(t))).toBe(t);
    });
  });
});

describe("formatBookingDataToCSV", () => {
  it("emits the header even with no rows", () => {
    const csv = formatBookingDataToCSV([]);
    expect(csv.split("\n")).toHaveLength(1);
    expect(csv).toContain("Booking ID,Guest Id,Guest name");
  });

  it("writes one row per booking with formatted values", () => {
    const csv = formatBookingDataToCSV([booking()]);
    const [, row] = csv.split("\n");
    expect(row).toBe(
      "USD,BK-1001,u1,Ada Lovelace,2026-01-15 1:45:30 PM,Sunny loft,2026-02-01,2026-02-05,1234.50,completed,0.00,1000.00,234.50",
    );
  });

  it("falls back to N/A when the guest name is missing", () => {
    const csv = formatBookingDataToCSV([booking({ guest_first_name: null, guest_last_name: null })]);
    expect(csv).toContain(",N/A,");
  });

  it("escapes commas, quotes and newlines in fields", () => {
    const csv = formatBookingDataToCSV([
      booking({ listing_title: 'Loft, "big"\nview' }),
    ]);
    expect(csv).toContain('"Loft, ""big""\nview"');
  });
});

describe("downloadCSV", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("creates a link, clicks it and cleans up", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const create = vi.spyOn(document, "createElement");
    downloadCSV("a,b", "report.csv");
    const link = create.mock.results[0].value as HTMLAnchorElement;
    expect(link.getAttribute("download")).toBe("report.csv");
    expect(link.getAttribute("href")).toBe("blob:mock");
    expect(document.body.contains(link)).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("exportBookingsToCSV", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("downloads a report on success", async () => {
    rpcMock.mockResolvedValue({ data: [booking()], error: null });
    const result = await exportBookingsToCSV("2026-01-01", "2026-01-31");
    expect(result).toEqual({ success: true });
    expect(rpcMock).toHaveBeenCalledWith("admin_get_detailed_revenue_report", {
      p_start_date: "2026-01-01",
      p_end_date: "2026-01-31",
    });
  });

  it("reports an empty period", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await expect(exportBookingsToCSV("a", "b")).resolves.toEqual({
      success: false,
      error: "No bookings found for selected period",
    });
  });

  it("surfaces a permission error distinctly", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(exportBookingsToCSV("a", "b")).resolves.toEqual({
      success: false,
      error: "You don't have permission to export reports",
    });
  });

  it("returns a generic error for other failures", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(exportBookingsToCSV("a", "b")).resolves.toEqual({
      success: false,
      error: "Failed to fetch report data",
    });
  });

  it("never throws when the call rejects", async () => {
    rpcMock.mockRejectedValue(new Error("network"));
    await expect(exportBookingsToCSV("a", "b")).resolves.toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});
