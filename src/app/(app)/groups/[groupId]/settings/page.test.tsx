import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---

const mockMutateAsync = mock(() => Promise.resolve({}));

let mockGroupsData: unknown[] | undefined = [];
let mockGroupsLoading = false;

mock.module("next/navigation", () => ({
	useParams: () => ({ groupId: "g1" }),
}));

mock.module("@/hooks/use-app-groups", () => ({
	useAppGroups: () => ({
		data: mockGroupsData,
		isLoading: mockGroupsLoading,
	}),
	useCreateAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
	useUpdateAppGroup: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
	useDeleteAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
}));

const { default: GroupSettingsPage } = await import("./page");

// --- Fixtures ---

const MOCK_GROUP = {
	id: "g1",
	name: "Test Group",
	iconUrl: "https://example.com/icon.png",
	sortOrder: 0,
	useSharedProfile: false,
	workspaceId: "w1",
	createdAt: "2025-01-01T00:00:00Z",
	updatedAt: "2025-01-01T00:00:00Z",
	members: [],
};

// --- Helpers ---

function resetMocks() {
	mockGroupsData = [MOCK_GROUP];
	mockGroupsLoading = false;
	mockMutateAsync.mockClear();
}

// --- Tests ---

afterEach(() => {
	cleanup();
	resetMocks();
});

describe("GroupSettingsPage", () => {
	test("shows loading skeleton when data is loading", () => {
		mockGroupsLoading = true;
		mockGroupsData = undefined;

		render(<GroupSettingsPage />);

		expect(screen.queryByText("Group Settings")).toBeNull();
	});

	test("shows 'Group not found' when group doesn't exist", () => {
		mockGroupsData = [];

		render(<GroupSettingsPage />);

		expect(screen.getByText("Group not found.")).toBeInTheDocument();
	});

	test("renders page title", () => {
		render(<GroupSettingsPage />);

		expect(screen.getByText("Group Settings")).toBeInTheDocument();
	});

	test("renders General settings card", () => {
		render(<GroupSettingsPage />);

		expect(screen.getByText("General")).toBeInTheDocument();
		expect(screen.getByText("Group Name")).toBeInTheDocument();
		expect(screen.getByText("Icon URL")).toBeInTheDocument();
	});

	test("renders ASO Profile card with toggle", () => {
		render(<GroupSettingsPage />);

		expect(screen.getByText("ASO Profile")).toBeInTheDocument();
		expect(screen.getByText("Use shared ASO profile")).toBeInTheDocument();
		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	test("populates group name input with current name", () => {
		render(<GroupSettingsPage />);

		const nameInput = screen.getByDisplayValue("Test Group") as HTMLInputElement;
		expect(nameInput).toBeInTheDocument();
	});

	test("populates icon URL input with current value", () => {
		render(<GroupSettingsPage />);

		const urlInput = screen.getByDisplayValue("https://example.com/icon.png") as HTMLInputElement;
		expect(urlInput).toBeInTheDocument();
	});

	test("shared profile switch is unchecked when useSharedProfile is false", () => {
		render(<GroupSettingsPage />);

		const toggle = screen.getByRole("switch");
		expect(toggle).toHaveAttribute("data-state", "unchecked");
	});

	test("shared profile switch is checked when useSharedProfile is true", () => {
		mockGroupsData = [{ ...MOCK_GROUP, useSharedProfile: true }];

		render(<GroupSettingsPage />);

		const toggle = screen.getByRole("switch");
		expect(toggle).toHaveAttribute("data-state", "checked");
	});

	test("calls mutateAsync on name blur", async () => {
		const user = userEvent.setup();
		render(<GroupSettingsPage />);

		const nameInput = screen.getByDisplayValue("Test Group");
		await user.clear(nameInput);
		await user.type(nameInput, "New Name");
		await user.tab(); // blur

		expect(mockMutateAsync).toHaveBeenCalledWith({
			groupId: "g1",
			data: { name: "New Name" },
		});
	});

	test("does not call mutateAsync on name blur with empty value", async () => {
		const user = userEvent.setup();
		render(<GroupSettingsPage />);

		const nameInput = screen.getByDisplayValue("Test Group");
		await user.clear(nameInput);
		await user.tab(); // blur

		expect(mockMutateAsync).not.toHaveBeenCalled();
	});

	test("calls mutateAsync on icon URL blur", async () => {
		const user = userEvent.setup();
		render(<GroupSettingsPage />);

		const urlInput = screen.getByDisplayValue("https://example.com/icon.png");
		await user.clear(urlInput);
		await user.type(urlInput, "https://new.com/icon.png");
		await user.tab();

		expect(mockMutateAsync).toHaveBeenCalledWith({
			groupId: "g1",
			data: { iconUrl: "https://new.com/icon.png" },
		});
	});

	test("sends null iconUrl when cleared", async () => {
		const user = userEvent.setup();
		render(<GroupSettingsPage />);

		const urlInput = screen.getByDisplayValue("https://example.com/icon.png");
		await user.clear(urlInput);
		await user.tab();

		expect(mockMutateAsync).toHaveBeenCalledWith({
			groupId: "g1",
			data: { iconUrl: null },
		});
	});

	test("toggles shared profile on click", async () => {
		const user = userEvent.setup();
		render(<GroupSettingsPage />);

		const toggle = screen.getByRole("switch");
		await user.click(toggle);

		expect(mockMutateAsync).toHaveBeenCalledWith({
			groupId: "g1",
			data: { useSharedProfile: true },
		});
	});

	test("shows description text for shared profile toggle", () => {
		render(<GroupSettingsPage />);

		expect(
			screen.getByText(
				"When enabled, all apps in this group share a single ASO profile. Individual app profiles become read-only.",
			),
		).toBeInTheDocument();
	});
});
