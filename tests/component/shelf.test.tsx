import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { packRows, Shelf } from "@/components/library/Shelf";
import type { ShelfBook } from "@/components/library/types";

const books: ShelfBook[] = Array.from({ length: 12 }, (_, i) => ({
  id: `demo-${i}`,
  title: `Demo Book ${i}`,
  href: `/books/demo-${i}`,
  typeLabel: "Book",
  priceLabel: "₹499",
  spineColor: "#2F4A3A",
}));

describe("packRows", () => {
  it("keeps every book exactly once, in order", () => {
    const rows = packRows(books, 300);
    expect(rows.flat().map((b) => b.id)).toEqual(books.map((b) => b.id));
    expect(rows.length).toBeGreaterThan(1);
  });

  it("puts everything on one row when there is room", () => {
    expect(packRows(books.slice(0, 3), 2000)).toHaveLength(1);
  });
});

describe("Shelf", () => {
  it("renders each product as an accessible spine button", () => {
    render(<Shelf books={books} label="Featured library" />);
    expect(screen.getByRole("button", { name: "Demo Book 0, Book, ₹499" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Demo Book/ })).toHaveLength(12);
  });

  it("opens the pull-out preview on Enter and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<Shelf books={books} label="Featured library" />);
    const spine = screen.getByRole("button", { name: /Demo Book 3,/ });
    spine.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "View Product" })).toHaveAttribute("href", "/books/demo-3");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers a list view as a non-motion fallback", async () => {
    const user = userEvent.setup();
    render(<Shelf books={books} label="Featured library" />);
    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByRole("link", { name: /Demo Book 5/ })).toHaveAttribute("href", "/books/demo-5");
  });

  it("renders the empty state when there are no books", () => {
    render(<Shelf books={[]} label="Library" empty={<p>Your Library is Empty</p>} />);
    expect(screen.getByText("Your Library is Empty")).toBeInTheDocument();
  });
});
