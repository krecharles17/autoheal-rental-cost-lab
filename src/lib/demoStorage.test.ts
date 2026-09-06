import { describe, it, expect, beforeEach, vi } from "vitest";
import { demoStorage } from "./demoStorage";

const USER = "user-1";
const OTHER = "user-2";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("snapshots", () => {
  it("returns an empty default snapshot for an unknown user", () => {
    const snap = demoStorage.getSnapshot(USER);
    expect(snap.bookings).toEqual([]);
    expect(snap.profile).toBeNull();
    expect(snap.profiles).toEqual({});
    expect(snap.platformSettings).toEqual({
      default_host_commission_rate: "0.15",
      default_guest_service_fee_rate: "0.10",
      default_tax_rate: "0.08",
    });
  });

  it("persists and merges partial saves", () => {
    demoStorage.saveSnapshot(USER, { bookings: [{ id: "b1" }] });
    demoStorage.saveSnapshot(USER, { reviews: [{ id: "r1" }] });
    const snap = demoStorage.getSnapshot(USER);
    expect(snap.bookings).toHaveLength(1);
    expect(snap.reviews).toHaveLength(1);
    expect(snap.lastUpdated).toBeTruthy();
  });

  it("keeps each user's data separate", () => {
    demoStorage.addBooking(USER, { id: "b1" });
    expect(demoStorage.getBookings(OTHER)).toEqual([]);
  });

  it("clears only the requested user", () => {
    demoStorage.addBooking(USER, { id: "b1" });
    demoStorage.addBooking(OTHER, { id: "b2" });
    demoStorage.clearSnapshot(USER);
    expect(demoStorage.getBookings(USER)).toEqual([]);
    expect(demoStorage.getBookings(OTHER)).toHaveLength(1);
  });
});

describe("bookings", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    demoStorage.addBooking(USER, { id: "b1", status: "pending", listing_id: "l1" });
    demoStorage.addBooking(USER, { id: "b2", status: "confirmed", listing_id: "l1" });
  });

  it("stores bookings in order", () => {
    expect(demoStorage.getBookings(USER).map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("filters by status", () => {
    expect(demoStorage.getBookings(USER, { status: "confirmed" })).toHaveLength(1);
    expect(demoStorage.getBookings(USER, { status: "cancelled" })).toHaveLength(0);
  });

  it("updates a guest booking without touching the others", () => {
    demoStorage.updateBooking(USER, "b1", { status: "cancelled" });
    expect(demoStorage.getBooking(USER, "b1").status).toBe("cancelled");
    expect(demoStorage.getBooking(USER, "b2").status).toBe("confirmed");
  });

  it("also updates the matching host booking", () => {
    demoStorage.saveSnapshot(USER, { hostBookings: [{ id: "b1", status: "pending" }] });
    demoStorage.updateBooking(USER, "b1", { status: "confirmed" });
    expect(demoStorage.getSnapshot(USER).hostBookings[0].status).toBe("confirmed");
  });

  it("falls back to host bookings when looking a booking up", () => {
    demoStorage.saveSnapshot(USER, { hostBookings: [{ id: "hb1", status: "pending" }] });
    expect(demoStorage.getBooking(USER, "hb1").id).toBe("hb1");
  });

  it("returns null for an unknown booking", () => {
    expect(demoStorage.getBooking(USER, "nope")).toBeNull();
  });

  it("ignores updates to a booking that does not exist", () => {
    expect(() => demoStorage.updateBooking(USER, "nope", { status: "x" })).not.toThrow();
    expect(demoStorage.getBookings(USER)).toHaveLength(2);
  });
});

describe("transactions and debts", () => {
  beforeEach(() => {
    demoStorage.addTransaction(USER, { id: "t1", type: "payment", status: "succeeded" });
    demoStorage.addTransaction(USER, { id: "t2", type: "refund", status: "pending" });
  });

  it("filters by type and status together", () => {
    expect(demoStorage.getTransactions(USER, { type: "payment" }).map((t) => t.id)).toEqual(["t1"]);
    expect(demoStorage.getTransactions(USER, { status: "pending" }).map((t) => t.id)).toEqual(["t2"]);
    expect(demoStorage.getTransactions(USER, { type: "payment", status: "pending" })).toEqual([]);
  });

  it("filters and updates guest debts", () => {
    demoStorage.saveSnapshot(USER, {
      guestDebts: [
        { id: "d1", status: "outstanding", amount: 50 },
        { id: "d2", status: "paid", amount: 20 },
      ],
    });
    expect(demoStorage.getGuestDebts(USER, { status: "outstanding" })).toHaveLength(1);
    demoStorage.updateGuestDebt(USER, "d1", { status: "paid" });
    expect(demoStorage.getGuestDebts(USER, { status: "paid" })).toHaveLength(2);
  });
});

describe("profiles", () => {
  it("stores another user's profile once", () => {
    demoStorage.storeProfile(USER, OTHER, { first_name: "Grace" });
    demoStorage.storeProfile(USER, OTHER, { first_name: "Changed" });
    expect(demoStorage.getSnapshot(USER).profiles[OTHER].first_name).toBe("Grace");
  });

  it("merges profile updates and stamps updated_at", () => {
    demoStorage.saveSnapshot(USER, { profile: { first_name: "Ada", city: "Lisbon" } });
    const updated = demoStorage.updateProfile(USER, { city: "Porto" });
    expect(updated.first_name).toBe("Ada");
    expect(updated.city).toBe("Porto");
    expect(updated.updated_at).toBeTruthy();
  });
});

describe("listings", () => {
  beforeEach(() => {
    demoStorage.addListing(USER, {
      id: "l1",
      title: "Sunny loft",
      description: "Bright",
      city: "Lisbon",
      status: "published",
      base_price: 100,
      created_at: "2026-01-01",
    });
    demoStorage.addListing(USER, {
      id: "l2",
      title: "Beach house",
      description: "Sandy",
      city: "Faro",
      status: "draft",
      base_price: 300,
      created_at: "2026-02-01",
    });
  });

  it("reads a single listing or null", () => {
    expect(demoStorage.getListing(USER, "l1").title).toBe("Sunny loft");
    expect(demoStorage.getListing(USER, "nope")).toBeNull();
  });

  it("updates and deletes listings", () => {
    demoStorage.updateListing(USER, "l1", { title: "Renamed" });
    expect(demoStorage.getListing(USER, "l1").title).toBe("Renamed");
    demoStorage.deleteListing(USER, "l1");
    expect(demoStorage.getListings(USER)).toHaveLength(1);
  });

  it("filters by status", () => {
    expect(demoStorage.getListings(USER, { status: "draft" }).map((l) => l.id)).toEqual(["l2"]);
  });

  it("searches case-insensitively across title, description and city", () => {
    const ids = (q: string) =>
      demoStorage.getListingsFiltered(USER, { searchQuery: q }).map((l) => l.id);
    expect(ids("sunny")).toEqual(["l1"]);
    expect(ids("SANDY")).toEqual(["l2"]);
    expect(ids("lisbon")).toEqual(["l1"]);
    expect(ids("zzz")).toEqual([]);
  });

  it("ignores the 'all' status filter", () => {
    expect(demoStorage.getListingsFiltered(USER, { statusFilter: "all" })).toHaveLength(2);
  });

  it("applies a price range", () => {
    expect(
      demoStorage.getListingsFiltered(USER, { minPrice: 150 }).map((l) => l.id),
    ).toEqual(["l2"]);
    expect(
      demoStorage.getListingsFiltered(USER, { maxPrice: 150 }).map((l) => l.id),
    ).toEqual(["l1"]);
    expect(demoStorage.getListingsFiltered(USER, { minPrice: 0, maxPrice: 1000 })).toHaveLength(2);
  });

  it("sorts numerically and by date in both directions", () => {
    const ids = (sortBy: string, sortOrder: string) =>
      demoStorage.getListingsFiltered(USER, { sortBy, sortOrder }).map((l) => l.id);
    expect(ids("base_price", "asc")).toEqual(["l1", "l2"]);
    expect(ids("base_price", "desc")).toEqual(["l2", "l1"]);
    expect(ids("created_at", "asc")).toEqual(["l1", "l2"]);
    expect(ids("created_at", "desc")).toEqual(["l2", "l1"]);
    expect(ids("title", "asc")).toEqual(["l2", "l1"]);
  });

  it("does not mutate the stored order when sorting", () => {
    demoStorage.getListingsFiltered(USER, { sortBy: "base_price", sortOrder: "desc" });
    expect(demoStorage.getListings(USER).map((l) => l.id)).toEqual(["l1", "l2"]);
  });
});

describe("messaging", () => {
  it("creates a thread once and reuses it regardless of who asks", () => {
    const a = demoStorage.getOrCreateThread(USER, OTHER, null, null);
    const b = demoStorage.getOrCreateThread(USER, OTHER, null, null);
    expect(a).toBe(b);
    expect(demoStorage.getSnapshot(USER).messageThreads).toHaveLength(1);
  });

  it("keeps separate threads per booking context", () => {
    const a = demoStorage.getOrCreateThread(USER, OTHER, "booking-1", null);
    const b = demoStorage.getOrCreateThread(USER, OTHER, "booking-2", null);
    expect(a).not.toBe(b);
  });

  it("orders participants deterministically", () => {
    const id = demoStorage.getOrCreateThread(USER, OTHER, null, null);
    const thread = demoStorage.getSnapshot(USER).messageThreads.find((t) => t.id === id)!;
    expect(thread.participant_1_id < thread.participant_2_id).toBe(true);
    expect(thread.is_locked).toBe(false);
  });

  it("sends messages, sorts them by time and bumps the thread", () => {
    const threadId = demoStorage.getOrCreateThread(USER, OTHER, null, null);
    const first = demoStorage.sendMessage(USER, threadId, OTHER, "Hi there");
    const second = demoStorage.sendMessage(USER, threadId, OTHER, "Still around?");
    const messages = demoStorage.getMessages(USER, threadId);
    expect(messages.map((m) => m.body)).toEqual(["Hi there", "Still around?"]);
    expect(first.read).toBe(false);
    const thread = demoStorage.getSnapshot(USER).messageThreads[0];
    expect(thread.last_message_at).toBe(second.created_at);
  });

  it("stores attachments when provided", () => {
    const threadId = demoStorage.getOrCreateThread(USER, OTHER, null, null);
    const msg = demoStorage.sendMessage(USER, threadId, OTHER, "photo", "http://x/a.png", "image");
    expect(msg.attachment_url).toBe("http://x/a.png");
    expect(msg.attachment_type).toBe("image");
  });

  it("marks only incoming messages as read", () => {
    const threadId = demoStorage.getOrCreateThread(USER, OTHER, null, null);
    demoStorage.sendMessage(USER, threadId, OTHER, "from me");
    demoStorage.sendMessage(OTHER, threadId, USER, "from them");
    demoStorage.markMessagesAsRead(USER, threadId);
    const mine = demoStorage.getSnapshot(USER).messages;
    expect(mine.find((m) => m.body === "from me")!.read).toBe(false);
    const theirs = demoStorage.getSnapshot(OTHER).messages;
    expect(theirs.find((m) => m.body === "from them")!.read).toBe(false);
  });

  it("returns no messages for an unknown thread", () => {
    expect(demoStorage.getMessages(USER, "nope")).toEqual([]);
  });
});

describe("disputes", () => {
  it("finds only active disputes for a booking", () => {
    demoStorage.saveSnapshot(USER, {
      disputes: [
        { id: "d1", booking_id: "b1", status: "resolved" },
        { id: "d2", booking_id: "b2", status: "open" },
      ],
    });
    expect(demoStorage.getDisputeForBooking(USER, "b1")).toBeUndefined();
    expect(demoStorage.getDisputeForBooking(USER, "b2").id).toBe("d2");
  });

  it("filters the dispute list by status", () => {
    demoStorage.saveSnapshot(USER, {
      disputes: [
        { id: "d1", status: "open" },
        { id: "d2", status: "resolved" },
      ],
    });
    expect(demoStorage.getDisputes(USER, { status: "open" }).map((d: { id: string }) => d.id)).toEqual([
      "d1",
    ]);
    expect(demoStorage.getDisputes(USER)).toHaveLength(2);
  });
});
