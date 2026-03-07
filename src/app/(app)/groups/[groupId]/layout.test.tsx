import { afterEach, describe, expect, mock, test } from "bun:test";
import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";

// --- Mocks ---

let mockGroupsData: unknown[] | undefined = [];
let mockPathname = "/groups/g1/information";

mock.module("next/navigation", () => ({
	useParams: () => ({ groupId: "g1" }),
	usePathname: () => mockPathname,
}));

mock.module("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

mock.module("@/hooks/use-app-groups", () => ({
	useAppGroups: () => ({
		data: mockGroupsData,
		isLoading: false,
	}),
	useCreateAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
	useUpdateAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
	useDeleteAppGroup: () => ({ mutateAsync: mock(() => Promise.resolve({})), isPending: false }),
}));

const { default: GroupLayout } = await import("./layout");

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
			app: { id: "a2", name: "Android App", platform: "android", iconUrl: "https://example.com/android.png", bundleId: "com.test.android" },
		},
	],
};

// --- Tests ---

afterEach(() => {
	cleanup();
	mockGroupsData = [MOCK_GROUP];
	mockPathname = "/groups/g1/information";
});

describe("GroupLayout", () => {
	test("renders group name in sidebar header", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		expect(screen.getByText("Test Group")).toBeInTheDocument();
	});

	test("shows 'Loading...' when group is not found in data", () => {
		mockGroupsData = [];
		render(<GroupLayout>Content</GroupLayout>);

		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	test("renders group icon when available", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		const img = screen.getByAltText("Test Group");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "https://example.com/icon.png");
	});

	test("renders Information and Settings nav items", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		expect(screen.getByText("Information")).toBeInTheDocument();
		expect(screen.getByText("Settings")).toBeInTheDocument();
	});

	test("nav items link to correct paths", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		const infoLink = screen.getByText("Information").closest("a");
		const settingsLink = screen.getByText("Settings").closest("a");

		expect(infoLink).toHaveAttribute("href", "/groups/g1/information");
		expect(settingsLink).toHaveAttribute("href", "/groups/g1/settings");
	});

	test("renders member apps in sidebar", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		expect(screen.getByText("Apps")).toBeInTheDocument();
		expect(screen.getByText("iOS App")).toBeInTheDocument();
		expect(screen.getByText("Android App")).toBeInTheDocument();
	});

	test("member app links point to /apps/{appId}/information", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		const iosLink = screen.getByText("iOS App").closest("a");
		const androidLink = screen.getByText("Android App").closest("a");

		expect(iosLink).toHaveAttribute("href", "/apps/a1/information");
		expect(androidLink).toHaveAttribute("href", "/apps/a2/information");
	});

	test("shows app icon when available, fallback initials when not", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout>Content</GroupLayout>);

		// Android App has an icon
		const androidIcon = screen.getByAltText("Android App");
		expect(androidIcon).toHaveAttribute("src", "https://example.com/android.png");

		// iOS App has no icon — shows initials "IO"
		expect(screen.getByText("IO")).toBeInTheDocument();
	});

	test("does not render Apps section when group has no members", () => {
		mockGroupsData = [{ ...MOCK_GROUP, members: [] }];
		render(<GroupLayout>Content</GroupLayout>);

		expect(screen.queryByText("Apps")).toBeNull();
	});

	test("renders children in main content area", () => {
		mockGroupsData = [MOCK_GROUP];
		render(<GroupLayout><div>Test Content</div></GroupLayout>);

		expect(screen.getByText("Test Content")).toBeInTheDocument();
	});

	test("falls back to first app icon when group has no icon", () => {
		mockGroupsData = [{
			...MOCK_GROUP,
			iconUrl: null,
			members: [
				{
					id: "m2",
					appId: "a2",
					sortOrder: 0,
					app: { id: "a2", name: "Android App", platform: "android", iconUrl: "https://example.com/android.png", bundleId: "com.test.android" },
				},
			],
		}];
		render(<GroupLayout>Content</GroupLayout>);

		// The group header should show the first app's icon as fallback
		const imgs = screen.getAllByAltText("Test Group");
		expect(imgs.length).toBeGreaterThanOrEqual(1);
	});
});
