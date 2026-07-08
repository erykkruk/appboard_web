import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { FieldDiffPanel } from "./field-diff-panel";

afterEach(cleanup);

describe("FieldDiffPanel", () => {
	test("renders header with 'Changes' text", () => {
		render(<FieldDiffPanel oldValue="hello" newValue="world" />);
		expect(screen.getByText("Changes")).toBeInTheDocument();
	});

	test("renders 'Word diff' label for short, single-line text", () => {
		render(<FieldDiffPanel oldValue="hello" newValue="world" />);
		expect(screen.getByText("Word diff")).toBeInTheDocument();
	});

	test("renders 'Line diff' label for long text (>200 combined chars)", () => {
		const longOld = "a".repeat(150);
		const longNew = "b".repeat(150);
		render(<FieldDiffPanel oldValue={longOld} newValue={longNew} />);
		expect(screen.getByText("Line diff")).toBeInTheDocument();
	});

	test("renders 'Line diff' label for multi-line text", () => {
		render(
			<FieldDiffPanel
				oldValue={"line one\nline two"}
				newValue={"line one\nchanged"}
			/>,
		);
		expect(screen.getByText("Line diff")).toBeInTheDocument();
	});

	test("renders without crashing when oldValue is null", () => {
		render(<FieldDiffPanel oldValue={null} newValue="hello" />);
		expect(screen.getByText("Changes")).toBeInTheDocument();
	});

	test("renders without crashing when newValue is null", () => {
		render(<FieldDiffPanel oldValue="hello" newValue={null} />);
		expect(screen.getByText("Changes")).toBeInTheDocument();
	});

	test("renders without crashing when both values are null", () => {
		render(<FieldDiffPanel oldValue={null} newValue={null} />);
		expect(screen.getByText("Changes")).toBeInTheDocument();
	});

	test("renders without crashing when both values are undefined", () => {
		render(<FieldDiffPanel oldValue={undefined} newValue={undefined} />);
		expect(screen.getByText("Changes")).toBeInTheDocument();
	});

	test("renders InlineDiff with the diff content", () => {
		const { container } = render(
			<FieldDiffPanel oldValue="hello" newValue="world" />,
		);
		expect(container.textContent).toContain("hello");
		expect(container.textContent).toContain("world");
	});

	test("accepts additional className prop", () => {
		const { container } = render(
			<FieldDiffPanel oldValue="a" newValue="b" className="extra-class" />,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("extra-class");
	});

	test("uses bg-card design token (no hardcoded hex)", () => {
		const { container } = render(
			<FieldDiffPanel oldValue="a" newValue="b" />,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("bg-card");
	});

	test("normalizes null values — renders diff of empty → new", () => {
		const { container } = render(
			<FieldDiffPanel oldValue={null} newValue="hello" />,
		);
		expect(container.textContent).toContain("hello");
	});
});
