import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { OverviewAppRow, WorkspaceOverview } from "@/lib/types";

// --- Mocks ---

const mockRefetch = mock(() => Promise.resolve());

let mockData: WorkspaceOverview | undefined;
let mockLoading = false;
let mockError = false;

mock.module("@/hooks/use-overview", () => ({
  useOverview: () => ({
    data: mockData,
    isLoading: mockLoading,
    isError: mockError,
    isFetching: false,
    refetch: mockRefetch,
  }),
}));

const { default: HomePage } = await import("./page");

// --- Fixtures ---

function buildRow(overrides: Partial<OverviewAppRow> = {}): OverviewAppRow {
  return {
    id: "app-1",
    name: "Alpha",
    platform: "ios",
    iconUrl: null,
    connectionMode: "public",
    storeRating: null,
    storeRatingsCount: null,
    reviewsTotal: 0,
    reviewsUnanswered: 0,
    auditScore: null,
    draftScore: null,
    trackedKeywords: 0,
    avgPosition: null,
    top10Count: 0,
    lastSyncedAt: null,
    ...overrides,
  };
}

function buildOverview(apps: OverviewAppRow[]): WorkspaceOverview {
  return {
    apps,
    totals: {
      apps: apps.length,
      reviewsUnanswered: apps.reduce((sum, app) => sum + app.reviewsUnanswered, 0),
      trackedKeywords: apps.reduce((sum, app) => sum + app.trackedKeywords, 0),
      downloadsAvailable: false,
    },
  };
}

afterEach(() => {
  cleanup();
  mockData = undefined;
  mockLoading = false;
  mockError = false;
  mockRefetch.mockClear();
});

// --- Tests ---

describe("HomePage", () => {
  test("shows the retry action on error and refetches on click", async () => {
    mockError = true;
    render(<HomePage />);

    expect(
      screen.getByText("Could not load the workspace overview."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  test("renders totals, the downloads notice and one row per app", () => {
    mockData = buildOverview([
      buildRow({
        id: "quiet",
        name: "Quiet App",
        platform: "android",
        connectionMode: "api",
        reviewsTotal: 4,
        reviewsUnanswered: 0,
        auditScore: 60,
        draftScore: 60,
      }),
      buildRow({
        id: "busy",
        name: "Busy App",
        storeRating: 4.04,
        storeRatingsCount: 1234,
        reviewsTotal: 20,
        reviewsUnanswered: 3,
        auditScore: 78,
        draftScore: 84,
        trackedKeywords: 12,
        avgPosition: 12.4,
        top10Count: 5,
      }),
    ]);
    render(<HomePage />);

    expect(screen.getByText("All apps at a glance")).toBeInTheDocument();
    expect(
      screen.getByText(/Downloads are not connected yet/),
    ).toBeInTheDocument();
    // Mean of 60 and 78 is 69.
    expect(screen.getByText("69/100")).toBeInTheDocument();

    // Unanswered reviews first, so the busy app leads even though "Quiet"
    // sorts after it alphabetically.
    const rowLinks = screen.getAllByRole("link", { name: /App$/ });
    expect(rowLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/apps/busy/dashboard",
      "/apps/quiet/dashboard",
    ]);

    expect(screen.getByText("Public link")).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("-> 84")).toBeInTheDocument();
    expect(screen.getByText(/4\.0 from 5/)).toBeInTheDocument();
    expect(screen.getByText("(1.2k)")).toBeInTheDocument();
    expect(screen.getByText("#12")).toBeInTheDocument();
    expect(screen.getAllByText("never")).toHaveLength(2);
  });

  test("says the score is not measured when no app has an audit", () => {
    mockData = buildOverview([buildRow()]);
    render(<HomePage />);

    expect(screen.getByText("not measured yet")).toBeInTheDocument();
    expect(screen.queryByText("-> ")).not.toBeInTheDocument();
  });

  test("offers to add an app when the workspace is empty", () => {
    mockData = buildOverview([]);
    render(<HomePage />);

    expect(
      screen.getByRole("link", { name: "Add your first app" }),
    ).toHaveAttribute("href", "/start");
  });
});
