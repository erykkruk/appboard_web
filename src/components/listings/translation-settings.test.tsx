import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Listing } from "@/lib/types";

// --- Mocks ---

let mockListingData: Listing | null | undefined;
const mockMutateAsync = mock(() => Promise.resolve({} as Listing));

// Capture the latest `data` handed to useAutoSave so we can assert the payload
// that would be persisted, without dealing with debounce timers.
let lastAutoSaveData: {
	doNotTranslateFields: string[];
	translationInstructions: string;
} | null = null;

mock.module("@/hooks/use-listings", () => ({
	useListing: () => ({ data: mockListingData }),
	useUpdateListingTranslationSettings: () => ({ mutateAsync: mockMutateAsync }),
}));

mock.module("@/hooks/use-auto-save", () => ({
	useAutoSave: ({
		data,
	}: {
		data: { doNotTranslateFields: string[]; translationInstructions: string };
	}) => {
		lastAutoSaveData = data;
		return { saveNow: mock(() => Promise.resolve()), status: "idle" };
	},
}));

// Import the component AFTER mocks are set up.
const { TranslationSettings } = await import("./translation-settings");

const FIELDS = [
	{ key: "title" as const, label: "Name" },
	{ key: "description" as const, label: "Description" },
	{ key: "keywords" as const, label: "Keywords" },
];

beforeEach(() => {
	mockListingData = {
		appId: "app-1",
		doNotTranslateFields: null,
		fullDesc: "",
		id: "l1",
		isDirty: false,
		keywords: "",
		language: "pl",
		promoText: "",
		shortDesc: "",
		source: "draft",
		title: "",
		translationInstructions: null,
		videoUrl: "",
		whatsNew: "",
	};
	lastAutoSaveData = null;
});

afterEach(() => {
	cleanup();
	mockMutateAsync.mockClear();
});

describe("TranslationSettings", () => {
	test("renders a Do Not Translate toggle per field plus the instructions textarea", () => {
		render(
			<TranslationSettings appId="app-1" fields={FIELDS} language="pl" />,
		);

		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(screen.getByLabelText("Keywords")).toBeInTheDocument();
		expect(
			screen.getByLabelText(/Instrukcje tłumaczenia/i),
		).toBeInTheDocument();
	});

	test("hydrates existing DNT fields and instructions from the listing", () => {
		mockListingData = {
			...(mockListingData as Listing),
			doNotTranslateFields: ["title"],
			translationInstructions: "Keep the brand name as-is.",
		};

		render(
			<TranslationSettings appId="app-1" fields={FIELDS} language="pl" />,
		);

		expect(screen.getByLabelText("Name")).toBeChecked();
		expect(screen.getByLabelText("Description")).not.toBeChecked();
		expect(
			screen.getByLabelText(/Instrukcje tłumaczenia/i),
		).toHaveValue("Keep the brand name as-is.");
	});

	test("toggling a field adds its AI key to doNotTranslateFields", async () => {
		const user = userEvent.setup();
		render(
			<TranslationSettings appId="app-1" fields={FIELDS} language="pl" />,
		);

		await user.click(screen.getByLabelText("Keywords"));

		await waitFor(() => {
			expect(lastAutoSaveData?.doNotTranslateFields).toContain("keywords");
		});
		expect(screen.getByLabelText("Keywords")).toBeChecked();
	});

	test("untoggling a field removes it from doNotTranslateFields", async () => {
		mockListingData = {
			...(mockListingData as Listing),
			doNotTranslateFields: ["title"],
		};
		const user = userEvent.setup();
		render(
			<TranslationSettings appId="app-1" fields={FIELDS} language="pl" />,
		);

		expect(screen.getByLabelText("Name")).toBeChecked();
		await user.click(screen.getByLabelText("Name"));

		await waitFor(() => {
			expect(lastAutoSaveData?.doNotTranslateFields).not.toContain("title");
		});
	});

	test("editing the instructions textarea binds to translationInstructions", async () => {
		const user = userEvent.setup();
		render(
			<TranslationSettings appId="app-1" fields={FIELDS} language="pl" />,
		);

		const textarea = screen.getByLabelText(/Instrukcje tłumaczenia/i);
		await user.type(textarea, "Profesjonalny ton");

		await waitFor(() => {
			expect(lastAutoSaveData?.translationInstructions).toBe(
				"Profesjonalny ton",
			);
		});
		expect(textarea).toHaveValue("Profesjonalny ton");
	});

	test("does not render switches when disabled interaction is blocked", () => {
		render(
			<TranslationSettings
				appId="app-1"
				disabled
				fields={FIELDS}
				language="pl"
			/>,
		);

		expect(screen.getByLabelText("Name")).toBeDisabled();
		expect(screen.getByLabelText(/Instrukcje tłumaczenia/i)).toBeDisabled();
	});
});
