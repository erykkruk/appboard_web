import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { PricesTable } from "./prices-table";

afterEach(cleanup);

const MOCK_PRICES = [
	{ id: "1", territory: "USA", currency: "USD", price: "0.99" },
	{ id: "2", territory: "GBR", currency: "GBP", price: "0.79" },
	{ id: "3", territory: "DEU", currency: "EUR", price: "0.49" },
];

describe("PricesTable", () => {
	test("renders empty state when no prices", () => {
		render(<PricesTable prices={[]} />);

		expect(
			screen.getByText(
				"No prices configured. Sync from store to fetch prices.",
			),
		).toBeInTheDocument();
	});

	test("does not render table when prices is empty", () => {
		render(<PricesTable prices={[]} />);
		expect(screen.queryByRole("table")).toBeNull();
	});

	test("renders table headers", () => {
		render(<PricesTable prices={MOCK_PRICES} />);

		expect(screen.getByText("Territory")).toBeInTheDocument();
		expect(screen.getByText("Currency")).toBeInTheDocument();
		expect(screen.getByText("Price")).toBeInTheDocument();
	});

	test("renders all price rows", () => {
		render(<PricesTable prices={MOCK_PRICES} />);

		expect(screen.getByText("USA")).toBeInTheDocument();
		expect(screen.getByText("USD")).toBeInTheDocument();
		expect(screen.getByText("0.99")).toBeInTheDocument();
		expect(screen.getByText("GBR")).toBeInTheDocument();
		expect(screen.getByText("GBP")).toBeInTheDocument();
		expect(screen.getByText("0.79")).toBeInTheDocument();
	});

	test("sorts prices by currency priority then territory", () => {
		render(<PricesTable prices={MOCK_PRICES} />);

		const rows = screen.getAllByRole("row");
		// Priority currencies first (USD, EUR), then rest alphabetically by territory
		const cells = rows.slice(1).map((row) => row.children[0].textContent);
		expect(cells).toEqual(["USA", "DEU", "GBR"]);
	});
});
