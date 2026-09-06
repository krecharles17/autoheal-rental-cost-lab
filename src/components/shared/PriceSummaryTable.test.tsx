import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let settings: { setting_key: string; setting_value: string }[] | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: () => ({ eq: async () => ({ data: settings, error: null }) }),
      }),
    }),
  },
}));

import PriceSummaryTable from "./PriceSummaryTable";

beforeEach(() => {
  settings = [
    { setting_key: "default_tax_rate", setting_value: "0.10" },
    { setting_key: "default_guest_service_fee_rate", setting_value: "0.08" },
    { setting_key: "default_host_commission_rate", setting_value: "0.05" },
  ];
});

const renderTable = async (props: { base_price: number; cleaning_fee: number }) => {
  render(<PriceSummaryTable {...props} />);
  await waitFor(() => expect(screen.getByText("Base price")).toBeInTheDocument());
};

describe("PriceSummaryTable", () => {
  it("computes the guest total from a three-night stay", async () => {
    await renderTable({ base_price: 100, cleaning_fee: 50 });
    // subtotal 300, tax 30, platform fee 24, cleaning 50 => 404
    expect(screen.getByText("$300.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("$24.00")).toBeInTheDocument();
    expect(screen.getByText("$404.00")).toBeInTheDocument();
  });

  it("computes the host payout after commission", async () => {
    await renderTable({ base_price: 100, cleaning_fee: 50 });
    // (300 + 50) - 5% => 332.50
    expect(screen.getByText("$332.50")).toBeInTheDocument();
    expect(screen.getByText(/Host payout \(after host fee 5%\)/)).toBeInTheDocument();
  });

  it("labels the rates as percentages", async () => {
    await renderTable({ base_price: 100, cleaning_fee: 0 });
    expect(screen.getByText("Taxes (10%)")).toBeInTheDocument();
    expect(screen.getByText("8% service charge")).toBeInTheDocument();
  });

  it("hides the cleaning fee row when there is none", async () => {
    await renderTable({ base_price: 100, cleaning_fee: 0 });
    expect(screen.queryByText("Cleaning fee")).not.toBeInTheDocument();
  });

  it("uses the platform rates coming back from the backend", async () => {
    settings = [
      { setting_key: "default_tax_rate", setting_value: "0.20" },
      { setting_key: "default_guest_service_fee_rate", setting_value: "0.10" },
      { setting_key: "default_host_commission_rate", setting_value: "0.15" },
    ];
    await renderTable({ base_price: 100, cleaning_fee: 0 });
    expect(screen.getByText("Taxes (20%)")).toBeInTheDocument();
    expect(screen.getByText("$60.00")).toBeInTheDocument(); // 300 * 0.20
    expect(screen.getByText("$255.00")).toBeInTheDocument(); // 300 - 15%
  });

  it("falls back to default rates when settings are unavailable", async () => {
    settings = null;
    await renderTable({ base_price: 100, cleaning_fee: 0 });
    expect(screen.getByText("Taxes (10%)")).toBeInTheDocument();
    expect(screen.getByText(/after host fee 5%/)).toBeInTheDocument();
  });
});
