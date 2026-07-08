import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { MetadataGrid } from "./metadata-grid";

afterEach(cleanup);

describe("MetadataGrid", () => {
	test("renders all label/value pairs", () => {
		const items = [
			{ label: "Product ID", value: "com.app.coins" },
			{ label: "Type", value: "Consumable" },
			{ label: "Apple ID", value: "123456" },
		];

		render(<MetadataGrid items={items} />);

		expect(screen.getByText("Product ID")).toBeInTheDocument();
		expect(screen.getByText("com.app.coins")).toBeInTheDocument();
		expect(screen.getByText("Type")).toBeInTheDocument();
		expect(screen.getByText("Consumable")).toBeInTheDocument();
		expect(screen.getByText("Apple ID")).toBeInTheDocument();
		expect(screen.getByText("123456")).toBeInTheDocument();
	});

	test("renders dash for null/undefined values", () => {
		const items = [
			{ label: "Duration", value: null },
			{ label: "Group", value: undefined },
		];

		render(<MetadataGrid items={items} />);

		const dashes = screen.getAllByText("—");
		expect(dashes).toHaveLength(2);
	});

	test("renders link when href is provided", () => {
		const items = [
			{
				label: "Group",
				value: "Premium Plans",
				href: "/apps/1/subscription-groups/abc",
			},
		];

		render(<MetadataGrid items={items} />);

		const link = screen.getByRole("link", { name: /Premium Plans/i });
		expect(link).toBeInTheDocument();
		expect(link.getAttribute("href")).toBe(
			"/apps/1/subscription-groups/abc",
		);
	});

	test("renders empty grid when no items", () => {
		const { container } = render(<MetadataGrid items={[]} />);
		const grid = container.firstChild as HTMLElement;
		expect(grid.children).toHaveLength(0);
	});
});
