import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DiffBadge } from "./diff-badge";

afterEach(cleanup);

function getTriggerButton(): HTMLButtonElement {
	return screen.getByRole("button", {
		name: "Show original value",
	}) as HTMLButtonElement;
}

describe("DiffBadge", () => {
	test("renders a button with aria-label", () => {
		render(<DiffBadge originalValue="hello" />);
		const button = getTriggerButton();
		expect(button).toBeInTheDocument();
	});

	test("has cursor-pointer styling", () => {
		render(<DiffBadge originalValue="hello" />);
		const button = getTriggerButton();
		expect(button.className).toContain("cursor-pointer");
	});

	test("renders the amber dot indicator", () => {
		render(<DiffBadge originalValue="hello" />);
		const button = getTriggerButton();
		const dot = button.querySelector("span");
		expect(dot).toBeTruthy();
		expect(dot?.className).toContain("bg-amber-400");
	});

	test("calls onClick when clicked", async () => {
		const user = userEvent.setup();
		const onClick = mock(() => {});

		render(<DiffBadge originalValue="hello" onClick={onClick} />);
		await user.click(getTriggerButton());

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("renders without originalValue (undefined) without crashing", () => {
		render(<DiffBadge />);
		expect(getTriggerButton()).toBeInTheDocument();
	});

	test("renders with null originalValue without crashing", () => {
		render(<DiffBadge originalValue={null} />);
		expect(getTriggerButton()).toBeInTheDocument();
	});

	test("accepts additional className", () => {
		render(<DiffBadge originalValue="hello" className="extra-class" />);
		const button = getTriggerButton();
		expect(button.className).toContain("extra-class");
	});

	test("does not throw when clicked without onClick handler", async () => {
		const user = userEvent.setup();
		render(<DiffBadge originalValue="hello" />);

		// Should not throw
		await user.click(getTriggerButton());
		expect(getTriggerButton()).toBeInTheDocument();
	});

	test("renders without crash for a 200-char originalValue", () => {
		const longValue = "a".repeat(200);
		render(<DiffBadge originalValue={longValue} />);
		expect(getTriggerButton()).toBeInTheDocument();
	});
});
