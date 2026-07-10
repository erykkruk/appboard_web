import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
	DOCS_URL,
	FAQ_URL,
	SUPPORT_MAILTO,
	WEBSITE_URL,
} from "@/lib/external-links";

import { HelpMenu } from "./help-menu";

afterEach(cleanup);

describe("HelpMenu", () => {
	test("renders the Help trigger", () => {
		render(<HelpMenu />);
		expect(screen.getByText("Help")).toBeInTheDocument();
	});

	test("opens with documentation, FAQ, support mail and website links", async () => {
		const user = userEvent.setup();
		render(<HelpMenu />);
		await user.click(screen.getByText("Help"));

		const docs = screen.getByText("Documentation").closest("a");
		expect(docs?.getAttribute("href")).toBe(DOCS_URL);
		expect(docs?.getAttribute("target")).toBe("_blank");

		const faq = screen.getByText("FAQ").closest("a");
		expect(faq?.getAttribute("href")).toBe(FAQ_URL);

		const mail = screen.getByText("Contact support").closest("a");
		expect(mail?.getAttribute("href")).toBe(SUPPORT_MAILTO);

		const site = screen.getByText("appboard.dev").closest("a");
		expect(site?.getAttribute("href")).toBe(WEBSITE_URL);
	});
});
