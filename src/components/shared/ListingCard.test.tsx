import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import ListingCard from "./ListingCard";
import { makeListing, renderWithRouter } from "@/test/utils";

describe("ListingCard", () => {
  it("shows the key listing details", () => {
    renderWithRouter(<ListingCard listing={makeListing()} />);
    expect(screen.getByText("Sunny loft near the river")).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();
    expect(screen.getByText("12 reviews")).toBeInTheDocument();
    expect(screen.getByText("Sleeps 4")).toBeInTheDocument();
    expect(screen.getByText("2 Beds")).toBeInTheDocument();
    expect(screen.getByText("1 Rooms")).toBeInTheDocument();
    expect(screen.getByText("1 Bathrooms")).toBeInTheDocument();
  });

  it("rounds the rating to one decimal", () => {
    renderWithRouter(<ListingCard listing={makeListing({ rating_avg: 4.567 })} />);
    expect(screen.getByText("4.6")).toBeInTheDocument();
  });

  it("formats the location line with size", () => {
    renderWithRouter(<ListingCard listing={makeListing({ size_sqft: 1200 })} />);
    expect(screen.getByText(/Lisbon, Portugal • Apartment • 1,200 sq ft/)).toBeInTheDocument();
  });

  it("omits the size when it is missing", () => {
    renderWithRouter(<ListingCard listing={makeListing({ size_sqft: undefined })} />);
    expect(screen.queryByText(/sq ft/)).not.toBeInTheDocument();
  });

  it("links to the listing and carries the current search params", () => {
    renderWithRouter(<ListingCard listing={makeListing()} />, ["/search?city=Lisbon&guests=2"]);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/listing/listing-1?city=Lisbon&guests=2",
    );
  });

  it("uses the cover image with the title as alt text", () => {
    renderWithRouter(<ListingCard listing={makeListing()} />);
    const img = screen.getByAltText("Sunny loft near the river");
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("falls back to the placeholder when there is no cover image", () => {
    renderWithRouter(<ListingCard listing={makeListing({ cover_image: "" })} />);
    expect(screen.getByAltText("Sunny loft near the river")).toHaveAttribute(
      "src",
      "/placeholder.svg",
    );
  });
});
