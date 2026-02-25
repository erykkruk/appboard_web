import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ActionsMenu } from "./actions-menu";
import type { ActionsMenuAction } from "./actions-menu";

// --- Helpers ---

function buildActions(overrides?: Partial<Record<string, Partial<ActionsMenuAction>>>): ActionsMenuAction[] {
	const defaults: ActionsMenuAction[] = [
		{
			key: "generate-all",
			label: "Generate All",
			icon: "sparkles",
			onSelect: mock(() => {}),
		},
		{
			key: "sync",
			label: "Sync",
			icon: "sync",
			onSelect: mock(() => {}),
			separatorBefore: true,
		},
		{
			key: "export-csv",
			label: "Export CSV",
			icon: "download",
			onSelect: mock(() => {}),
			separatorBefore: true,
		},
		{
			key: "export-json",
			label: "Export JSON",
			icon: "download",
			onSelect: mock(() => {}),
		},
		{
			key: "import",
			label: "Import",
			icon: "upload",
			onSelect: mock(() => {}),
			separatorBefore: true,
		},
	];

	if (!overrides) return defaults;

	return defaults.map((action) => {
		const override = overrides[action.key];
		return override ? { ...action, ...override } : action;
	});
}

// --- Tests ---

describe("ActionsMenu", () => {
	test("renders the trigger button with aria-label", () => {
		render(<ActionsMenu actions={buildActions()} />);
		expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
	});

	test("opens menu and shows all action labels on click", async () => {
		const user = userEvent.setup();
		const actions = buildActions();

		render(<ActionsMenu actions={actions} />);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		for (const action of actions) {
			expect(screen.getByRole("menuitem", { name: action.label })).toBeInTheDocument();
		}
	});

	test("calls onSelect when clicking a menu item", async () => {
		const user = userEvent.setup();
		const actions = buildActions();

		render(<ActionsMenu actions={actions} />);
		await user.click(screen.getByRole("button", { name: "More actions" }));
		await user.click(screen.getByRole("menuitem", { name: "Export CSV" }));

		const exportCsv = actions.find((a) => a.key === "export-csv")!;
		expect(exportCsv.onSelect).toHaveBeenCalledTimes(1);
	});

	test("disabled items are not clickable", async () => {
		const user = userEvent.setup();
		const actions = buildActions({
			"generate-all": { disabled: true },
		});

		render(<ActionsMenu actions={actions} />);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		const item = screen.getByRole("menuitem", { name: "Generate All" });
		expect(item).toHaveAttribute("data-disabled");
	});

	test("renders hidden file input when importConfig is provided", () => {
		const onChange = mock(() => {});
		render(
			<ActionsMenu
				actions={buildActions()}
				importConfig={{ accept: ".csv,.json", onChange }}
			/>,
		);

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.accept).toBe(".csv,.json");
		expect(input.className).toContain("hidden");
	});

	test("does not render file input when importConfig is not provided", () => {
		render(<ActionsMenu actions={buildActions()} />);
		const input = document.querySelector('input[type="file"]');
		expect(input).toBeNull();
	});

	test("renders only provided actions", async () => {
		const user = userEvent.setup();
		const actions: ActionsMenuAction[] = [
			{
				key: "ai-prompt",
				label: "AI Prompt",
				icon: "copy",
				onSelect: mock(() => {}),
			},
			{
				key: "export-csv",
				label: "Export CSV",
				icon: "download",
				onSelect: mock(() => {}),
				separatorBefore: true,
			},
		];

		render(<ActionsMenu actions={actions} />);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		expect(screen.getByRole("menuitem", { name: "AI Prompt" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Export CSV" })).toBeInTheDocument();
		expect(screen.queryByRole("menuitem", { name: "Sync" })).toBeNull();
		expect(screen.queryByRole("menuitem", { name: "Import" })).toBeNull();
	});

	test("renders separators between grouped actions", async () => {
		const user = userEvent.setup();
		const actions: ActionsMenuAction[] = [
			{
				key: "generate-all",
				label: "Generate All",
				icon: "sparkles",
				onSelect: mock(() => {}),
			},
			{
				key: "sync",
				label: "Sync",
				icon: "sync",
				onSelect: mock(() => {}),
				separatorBefore: true,
			},
		];

		render(<ActionsMenu actions={actions} />);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		const separators = document.querySelectorAll('[data-slot="dropdown-menu-separator"]');
		expect(separators.length).toBe(1);
	});

	test("empty actions array renders trigger but no items", async () => {
		const user = userEvent.setup();
		render(<ActionsMenu actions={[]} />);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		const items = screen.queryAllByRole("menuitem");
		expect(items).toHaveLength(0);
	});
});

describe("ActionsMenu — Listings page scenario", () => {
	test("shows all listings menu actions", async () => {
		const user = userEvent.setup();
		const actions: ActionsMenuAction[] = [
			{ key: "generate-all", label: "Regenerate All", icon: "sparkles", onSelect: mock(() => {}) },
			{ key: "sync", label: "Sync", icon: "sync", onSelect: mock(() => {}), separatorBefore: true },
			{ key: "export-csv", label: "Export CSV", icon: "download", onSelect: mock(() => {}), separatorBefore: true },
			{ key: "export-json", label: "Export JSON", icon: "download", onSelect: mock(() => {}) },
			{ key: "download-template", label: "Download Template", icon: "download", onSelect: mock(() => {}) },
			{ key: "import", label: "Import", icon: "upload", onSelect: mock(() => {}), separatorBefore: true },
		];

		render(
			<ActionsMenu
				actions={actions}
				importConfig={{ accept: ".csv,.json", onChange: mock(() => {}) }}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		expect(screen.getByRole("menuitem", { name: "Regenerate All" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Sync" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Export CSV" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Export JSON" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Download Template" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Import" })).toBeInTheDocument();
	});
});

describe("ActionsMenu — Information page scenario", () => {
	test("shows all info menu actions", async () => {
		const user = userEvent.setup();
		const actions: ActionsMenuAction[] = [
			{ key: "ai-prompt", label: "AI Prompt", icon: "copy", onSelect: mock(() => {}) },
			{ key: "export-csv", label: "Export CSV", icon: "download", onSelect: mock(() => {}), separatorBefore: true },
			{ key: "export-json", label: "Export JSON", icon: "download", onSelect: mock(() => {}) },
			{ key: "download-template", label: "Download Template", icon: "download", onSelect: mock(() => {}) },
			{ key: "import", label: "Import", icon: "upload", onSelect: mock(() => {}), separatorBefore: true, disabled: false },
		];

		render(
			<ActionsMenu
				actions={actions}
				importConfig={{ accept: ".csv,.json", onChange: mock(() => {}) }}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "More actions" }));

		expect(screen.getByRole("menuitem", { name: "AI Prompt" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Export CSV" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Export JSON" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Download Template" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Import" })).toBeInTheDocument();
	});
});
