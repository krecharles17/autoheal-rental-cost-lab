import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("resolves conflicting tailwind classes in favour of the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-muted-foreground", "text-lg")).toBe("text-muted-foreground text-lg");
  });

  it("supports conditional objects and arrays", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("returns an empty string with no input", () => {
    expect(cn()).toBe("");
  });
});
