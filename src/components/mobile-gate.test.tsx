import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { MobileGate } from "./mobile-gate";

afterEach(cleanup);

describe("MobileGate", () => {
	test("renders the gated view for desktop viewports", () => {
		render(
			<MobileGate>
				<p>Editor canvas</p>
			</MobileGate>,
		);
		expect(screen.getByText("Editor canvas")).toBeInTheDocument();
	});

	test("always renders the explanation, hidden above the md breakpoint", () => {
		render(
			<MobileGate>
				<p>Editor canvas</p>
			</MobileGate>,
		);
		const heading = screen.getByText("Not supported on mobile yet");
		expect(heading).toBeInTheDocument();
		// CSS decides which half is visible, so the message ships in the server
		// render too and desktop never flashes it.
		expect(heading.closest("div.md\\:hidden")).not.toBeNull();
	});

	test("links back to the dashboard by default and honours an override", () => {
		const { unmount } = render(
			<MobileGate>
				<p>Editor canvas</p>
			</MobileGate>,
		);
		expect(
			screen.getByText("Back to dashboard").closest("a")?.getAttribute("href"),
		).toBe("/dashboard");
		unmount();

		render(
			<MobileGate backHref="/" backLabel="Back to home">
				<p>Editor canvas</p>
			</MobileGate>,
		);
		expect(
			screen.getByText("Back to home").closest("a")?.getAttribute("href"),
		).toBe("/");
	});
});
