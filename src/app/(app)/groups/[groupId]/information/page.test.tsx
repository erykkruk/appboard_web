import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---

const mockMutateAsync = mock(() => Promise.resolve({}));
const mockSaveNow = mock(() => Promise.resolve());

let mockGroupsData: unknown[] | undefined = [];
let mockGroupProfileData: Record<string, unknown> | undefined;
let mockAppProfileData: Record<string, unknown> | undefined;
let mockGroupsLoading = false;
let mockGroupProfileLoading = false;

mock.module("next/navigation", () => ({
	useParams: () => ({ groupId: "g1" }),
}));

mock.module("@/hooks/use-app-groups", () => ({
	useAppGroups: () => ({
		data: mockGroupsData,
		isLoading: mockGroupsLoading,
	}),
	useCreateAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
	useUpdateAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
	useDeleteAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
}));

mock.module("@/hooks/use-group-aso-profile", () => ({
	useGroupAsoProfile: () => ({
		data: mockGroupProfileData,
		isLoading: mockGroupProfileLoading,
	}),
	useUpdateGroupAsoProfile: () => ({
		mutateAsync: mockMutateAsync,
	}),
	useEnableSharedProfile: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
}));

mock.module("@/hooks/use-aso-profile", () => ({
	useAsoProfile: () => ({
		data: mockAppProfileData,
		isLoading: false,
	}),
}));

mock.module("@/hooks/use-auto-save", () => ({
	useAutoSave: () => ({
		saveNow: mockSaveNow,
	}),
}));

// Import the component AFTER mocks are set up
const { default: GroupInformationPage } = await import("./page");

// --- Fixtures ---

const MOCK_GROUP = {
	id: "g1",
	name: "My App Group",
	iconUrl: null,
	sortOrder: 0,
	useSharedProfile: false,
	workspaceId: "w1",
	createdAt: "2025-01-01T00:00:00Z",
	updatedAt: "2025-01-01T00:00:00Z",
	members: [
		{
			id: "m1",
			appId: "a1",
			sortOrder: 0,
			app: { id: "a1", name: "iOS App", platform: "ios", iconUrl: null, bundleId: "com.test.ios" },
		},
		{
			id: "m2",
			appId: "a2",
			sortOrder: 1,
			app: { id: "a2", name: "Android App", platform: "android", iconUrl: null, bundleId: "com.test.android" },
		},
	],
};

const MOCK_GROUP_SHARED = {
	...MOCK_GROUP,
	useSharedProfile: true,
};

const MOCK_PROFILE_RESPONSE = {
	useSharedProfile: true,
	asoProfile: {
		category: "Productivity",
		oneLiner: "Test tagline",
		problem: null,
		mainBenefit: null,
		keyFeatures: ["Feature 1", "Feature 2"],
		differentiator: null,
		tone: null,
		brandVoiceExample: null,
		wordsToInclude: null,
		wordsToAvoid: null,
		targetAudience: null,
		painPoints: null,
		userLanguage: null,
		competitors: null,
		competitiveAdvantage: null,
		positioning: null,
		downloadCount: null,
		awards: null,
		pressQuotes: null,
		testimonials: null,
		pricingModel: null,
		price: null,
		freeFeatures: null,
		premiumFeatures: null,
		mustIncludeKeywords: null,
		longTailKeywords: null,
		excludeKeywords: null,
	},
};

// --- Helpers ---

function resetMocks() {
	mockGroupsData = [MOCK_GROUP];
	mockGroupProfileData = { useSharedProfile: false, asoProfile: null };
	mockAppProfileData = { asoProfile: null };
	mockGroupsLoading = false;
	mockGroupProfileLoading = false;
}

// --- Tests ---

afterEach(() => {
	cleanup();
	resetMocks();
});

describe("GroupInformationPage", () => {
	test("shows loading skeleton when groups are loading", () => {
		mockGroupsLoading = true;
		mockGroupProfileLoading = true;
		mockGroupsData = undefined;
		mockGroupProfileData = undefined;

		render(<GroupInformationPage />);

		expect(screen.queryByText("My App Group")).toBeNull();
		// Skeletons are rendered (just verify no main content)
		expect(screen.queryByText("Core Information")).toBeNull();
	});

	test("shows 'Group not found' when group doesn't exist", () => {
		mockGroupsData = [];

		render(<GroupInformationPage />);

		expect(screen.getByText("Group not found.")).toBeInTheDocument();
	});

	test("renders group name and member count", () => {
		mockGroupsData = [MOCK_GROUP];

		render(<GroupInformationPage />);

		expect(screen.getByText("My App Group")).toBeInTheDocument();
		expect(screen.getByText("2 apps in this group")).toBeInTheDocument();
	});

	test("shows singular 'app' for single member group", () => {
		mockGroupsData = [{ ...MOCK_GROUP, members: [MOCK_GROUP.members[0]] }];

		render(<GroupInformationPage />);

		expect(screen.getByText("1 app in this group")).toBeInTheDocument();
	});

	test("shows disabled banner when shared profile is off", () => {
		mockGroupsData = [MOCK_GROUP];
		mockGroupProfileData = { useSharedProfile: false, asoProfile: null };

		render(<GroupInformationPage />);

		expect(screen.getByText("Shared ASO profile is disabled")).toBeInTheDocument();
		expect(screen.getByText("Enable")).toBeInTheDocument();
	});

	test("does not show disabled banner when shared profile is on", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		expect(screen.queryByText("Shared ASO profile is disabled")).toBeNull();
	});

	test("shows actions menu only when shared profile is enabled", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
	});

	test("hides actions menu when shared profile is disabled", () => {
		mockGroupsData = [MOCK_GROUP];
		mockGroupProfileData = { useSharedProfile: false, asoProfile: null };

		render(<GroupInformationPage />);

		expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
	});

	test("renders core information card with form fields", () => {
		mockGroupsData = [MOCK_GROUP];

		render(<GroupInformationPage />);

		expect(screen.getByText("Core Information")).toBeInTheDocument();
		expect(screen.getByText("Category")).toBeInTheDocument();
		expect(screen.getByText("One-liner")).toBeInTheDocument();
		expect(screen.getByText("Problem it solves")).toBeInTheDocument();
		expect(screen.getByText("Main Benefit")).toBeInTheDocument();
		expect(screen.getByText("Key Features")).toBeInTheDocument();
		expect(screen.getByText("Differentiator")).toBeInTheDocument();
	});

	test("renders tone & branding subsection", () => {
		mockGroupsData = [MOCK_GROUP];

		render(<GroupInformationPage />);

		expect(screen.getByText("Tone & Branding")).toBeInTheDocument();
		expect(screen.getByText("Tone")).toBeInTheDocument();
		expect(screen.getByText("Brand Voice Example")).toBeInTheDocument();
		expect(screen.getByText("Words to Include")).toBeInTheDocument();
		expect(screen.getByText("Words to Avoid")).toBeInTheDocument();
	});

	test("renders collapsible sections for audience, competitors, social proof, product details, keywords", () => {
		mockGroupsData = [MOCK_GROUP];

		render(<GroupInformationPage />);

		expect(screen.getByText("Audience & Target")).toBeInTheDocument();
		expect(screen.getByText("Competitors")).toBeInTheDocument();
		expect(screen.getByText("Social Proof")).toBeInTheDocument();
		expect(screen.getByText("Product Details")).toBeInTheDocument();
		expect(screen.getByText("Keywords")).toBeInTheDocument();
	});

	test("form fields are disabled when shared profile is off", () => {
		mockGroupsData = [MOCK_GROUP];
		mockGroupProfileData = { useSharedProfile: false, asoProfile: null };

		render(<GroupInformationPage />);

		const categoryInput = screen.getByPlaceholderText("e.g. Productivity");
		expect(categoryInput).toBeDisabled();
	});

	test("form fields are enabled when shared profile is on", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		const categoryInput = screen.getByPlaceholderText("e.g. Productivity");
		expect(categoryInput).not.toBeDisabled();
	});

	test("populates form with profile data when available", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		const categoryInput = screen.getByPlaceholderText("e.g. Productivity") as HTMLInputElement;
		expect(categoryInput.value).toBe("Productivity");

		const taglineInput = screen.getByPlaceholderText("A short tagline") as HTMLInputElement;
		expect(taglineInput.value).toBe("Test tagline");
	});

	test("shows per-app profiles section when shared is enabled and has members", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		expect(screen.getByText("Apps")).toBeInTheDocument();
		expect(screen.getByText("iOS App")).toBeInTheDocument();
		expect(screen.getByText("Android App")).toBeInTheDocument();
	});

	test("hides per-app profiles section when shared is disabled", () => {
		mockGroupsData = [MOCK_GROUP];
		mockGroupProfileData = { useSharedProfile: false, asoProfile: null };

		render(<GroupInformationPage />);

		expect(screen.queryByText("iOS App")).toBeNull();
		expect(screen.queryByText("Android App")).toBeNull();
	});

	test("shows platform labels (iOS/Android) next to app names in per-app section", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		expect(screen.getByText("(iOS)")).toBeInTheDocument();
		expect(screen.getByText("(Android)")).toBeInTheDocument();
	});

	test("opens enable dialog when clicking Enable button", async () => {
		const user = userEvent.setup();
		mockGroupsData = [MOCK_GROUP];
		mockGroupProfileData = { useSharedProfile: false, asoProfile: null };

		render(<GroupInformationPage />);

		await user.click(screen.getByText("Enable"));

		expect(screen.getByText("Enable Shared ASO Profile")).toBeInTheDocument();
		expect(screen.getByText("Empty profile (start fresh)")).toBeInTheDocument();
		expect(screen.getByText("iOS App")).toBeInTheDocument();
		expect(screen.getByText("Android App")).toBeInTheDocument();
	});

	test("enable dialog shows cancel and enable buttons", async () => {
		const user = userEvent.setup();
		mockGroupsData = [MOCK_GROUP];
		mockGroupProfileData = { useSharedProfile: false, asoProfile: null };

		render(<GroupInformationPage />);

		await user.click(screen.getByText("Enable"));

		expect(screen.getByText("Cancel")).toBeInTheDocument();
		expect(screen.getByText("Enable Shared Profile")).toBeInTheDocument();
	});

	test("shows key features as badges when profile has array data", () => {
		mockGroupsData = [MOCK_GROUP_SHARED];
		mockGroupProfileData = MOCK_PROFILE_RESPONSE;

		render(<GroupInformationPage />);

		expect(screen.getByText("Feature 1")).toBeInTheDocument();
		expect(screen.getByText("Feature 2")).toBeInTheDocument();
	});
});
