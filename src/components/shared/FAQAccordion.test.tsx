import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FAQAccordion } from "./FAQAccordion";

const faqs = [
  { id: "1", question: "How do I book?", answer: "Pick your dates and confirm." },
  { id: "2", question: "Can I cancel?", answer: "Yes, per the cancellation policy." },
];

describe("FAQAccordion", () => {
  it("shows an empty state without FAQs", () => {
    render(<FAQAccordion faqs={[]} />);
    expect(screen.getByText("No FAQs available at the moment.")).toBeInTheDocument();
  });

  it("handles a null list defensively", () => {
    render(<FAQAccordion faqs={null as never} />);
    expect(screen.getByText("No FAQs available at the moment.")).toBeInTheDocument();
  });

  it("renders every question", () => {
    render(<FAQAccordion faqs={faqs} />);
    expect(screen.getByText("How do I book?")).toBeInTheDocument();
    expect(screen.getByText("Can I cancel?")).toBeInTheDocument();
  });

  it("keeps answers hidden until a question is opened", async () => {
    const user = userEvent.setup();
    render(<FAQAccordion faqs={faqs} />);
    expect(screen.queryByText("Pick your dates and confirm.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /How do I book/ }));
    expect(await screen.findByText("Pick your dates and confirm.")).toBeVisible();
  });

  it("shows one answer at a time", async () => {
    const user = userEvent.setup();
    render(<FAQAccordion faqs={faqs} />);
    await user.click(screen.getByRole("button", { name: /How do I book/ }));
    await user.click(screen.getByRole("button", { name: /Can I cancel/ }));
    expect(await screen.findByText("Yes, per the cancellation policy.")).toBeVisible();
    expect(screen.getByRole("button", { name: /How do I book/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("applies a custom class name", () => {
    const { container } = render(<FAQAccordion faqs={faqs} className="my-faqs" />);
    expect(container.querySelector(".my-faqs")).toBeTruthy();
  });
});
