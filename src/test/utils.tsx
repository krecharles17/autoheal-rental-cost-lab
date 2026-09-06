import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

export const withRouter = (ui: ReactNode, initialEntries: string[] = ["/"]) => (
  <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
);

export const renderWithRouter = (ui: ReactElement, initialEntries: string[] = ["/"]) =>
  render(withRouter(ui, initialEntries));

export const makeListing = (overrides: Record<string, unknown> = {}) => ({
  id: "listing-1",
  cover_image: "https://example.com/cover.jpg",
  rating_avg: 4.567,
  rating_count: 12,
  base_price: 150,
  city: "Lisbon",
  country: "Portugal",
  type: "Apartment",
  size_sqft: 1200,
  title: "Sunny loft near the river",
  guests_max: 4,
  beds: 2,
  bedrooms: 1,
  bathrooms: 1,
  ...overrides,
});
