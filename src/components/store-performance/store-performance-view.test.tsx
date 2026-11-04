import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  StorePerformanceMonth,
  StorePerformanceReport,
  StorePerformanceResponse,
} from "@/lib/types";

import { StorePerformanceView, type StorePerformanceViewProps } from "./store-performance-view";

afterEach(cleanup);

const SERVICE_ACCOUNT = "appboard-play@example-project.iam.gserviceaccount.com";

/** October 2026 of tech.ravenlab.buzzin, the numbers checked by hand against the Play CSV. */
const OCTOBER: StorePerformanceMonth = {
  countries: [
    { acquisitions: 200, conversionRate: 200 / 260, country: "PL", visitors: 260 },
    { acquisitions: 4, conversionRate: 0.5, country: "Other", visitors: 8 },
  ],
  files: { country: true, installs: true, trafficSource: true },
  installs: {
    activeDevices: 846,
    deviceInstalls: 1500,
    deviceUninstalls: 300,
    installEvents: 1600,
    lastDay: "2026-10-31",
    uninstallEvents: 310,
    updateEvents: 900,
    userInstalls: 1320,
    userUninstalls: 280,
  },
  lastDay: "2026-10-31",
  month: "2026-10",
  traffic: {
    campaigns: [
      {
        acquisitions: 800,
        conversionRate: 800 / 960,
        utmCampaign: "quiz-show-pl-meta-abo-test-storeclick-202609",
        utmSource: "meta",
        visitors: 960,
      },
    ],
    searchTermPlaceholders: [
      { acquisitions: 1191, conversionRate: 1191 / 1717, label: "Other", visitors: 1717 },
      {
        acquisitions: 1100,
        conversionRate: 1100 / 1322,
        label: "No search terms specified",
        visitors: 1322,
      },
    ],
    searchTerms: [{ acquisitions: 509, conversionRate: 509 / 590, term: "buzzin", visitors: 590 }],
    sources: [
      { acquisitions: 1191, conversionRate: 1191 / 1717, source: "Other", visitors: 1717 },
      { acquisitions: 1100, conversionRate: 1100 / 1322, source: "Ads and referrals", visitors: 1322 },
      { acquisitions: 509, conversionRate: 509 / 590, source: "Google Play search", visitors: 590 },
    ],
    totals: { acquisitions: 2800, conversionRate: 2800 / 3629, visitors: 3629 },
  },
};

const NOVEMBER_EMPTY: StorePerformanceMonth = {
  countries: null,
  files: { country: false, installs: false, trafficSource: false },
  installs: null,
  lastDay: null,
  month: "2026-11",
  traffic: null,
};

function playReport(overrides: Partial<StorePerformanceReport> = {}): StorePerformanceReport {
  return {
    bucket: "pubsite_prod_5411382577729402537",
    devices: ["phone"],
    fetchedAt: "2026-11-04T09:00:00.000Z",
    message: null,
    months: [NOVEMBER_EMPTY, OCTOBER],
    packageName: "tech.ravenlab.buzzin",
    serviceAccountEmail: SERVICE_ACCOUNT,
    status: "ok",
    storeId: "store-1",
    supported: true,
    tvOnly: false,
    ...overrides,
  };
}

function renderView(
  report: StorePerformanceResponse | undefined,
  overrides: Partial<StorePerformanceViewProps> = {},
) {
  const props: StorePerformanceViewProps = {
    error: null,
    isLoading: false,
    isRefreshing: false,
    month: "2026-10",
    onEditBucket: mock(() => {}),
    onMonthChange: mock(() => {}),
    onRefresh: mock(() => {}),
    report,
    ...overrides,
  };
  render(<StorePerformanceView {...props} />);
  return props;
}

function rowOf(table: HTMLElement, label: string): HTMLElement {
  const cell = within(table).getByText(label);
  const row = cell.closest("tr");
  if (!row) throw new Error(`no row for ${label}`);
  return row;
}

describe("StorePerformanceView", () => {
  test("shows a busy skeleton while loading", () => {
    renderView(undefined, { isLoading: true });
    expect(screen.getByLabelText("Loading store performance")).toBeDefined();
  });

  test("shows the request error with a retry", async () => {
    const props = renderView(undefined, { error: new Error("Network down") });
    expect(screen.getByText("Could not load store performance")).toBeDefined();
    expect(screen.getByText("Network down")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRefresh).toHaveBeenCalled();
  });

  test("tells iOS apps that App Store analytics are coming later", () => {
    renderView({
      message: "App Store analytics (impressions, product page views, sources) are coming later.",
      platform: "ios",
      supported: false,
    });
    expect(screen.getByText("App Store analytics coming later")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("asks for the bucket and opens the bucket dialog", async () => {
    const props = renderView(playReport({ bucket: null, months: [], status: "bucket_missing" }));
    expect(screen.getByText("Connect your Play reports")).toBeDefined();
    expect(screen.getByText(SERVICE_ACCOUNT)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Add Play reports bucket" }));
    expect(props.onEditBucket).toHaveBeenCalled();
  });

  test("explains a missing bulk-report permission and how to grant it", async () => {
    const props = renderView(
      playReport({
        message: `${SERVICE_ACCOUNT} cannot read the Play reports bucket pubsite_prod_5411382577729402537 (HTTP 403).`,
        months: [],
        status: "access_denied",
      }),
    );
    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByText("The service account cannot read the Play reports bucket"),
    ).toBeDefined();
    expect(within(alert).getByText(SERVICE_ACCOUNT)).toBeDefined();
    expect(
      within(alert).getByText(/View app information and download bulk reports \(read-only\)/),
    ).toBeDefined();
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(props.onRefresh).toHaveBeenCalled();
  });

  test("names a missing bucket and offers to change it", async () => {
    const props = renderView(
      playReport({ message: "The bucket pubsite_prod_000 does not exist.", months: [], status: "bucket_not_found" }),
    );
    expect(screen.getByText("Bucket not found")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Change bucket" }));
    expect(props.onEditBucket).toHaveBeenCalled();
  });

  test("points link-imported apps to a Play API connection", () => {
    renderView(
      playReport({
        message: "This app was added from a public store link.",
        months: [],
        status: "integration_required",
      }),
    );
    expect(screen.getByText("Needs a Google Play API connection")).toBeDefined();
    expect(screen.getByRole("link", { name: "Open connected stores" })).toBeDefined();
  });

  test("renders the traffic sources of the selected month", () => {
    renderView(playReport());
    const sources = screen.getByRole("table", { name: "Traffic sources" });
    const search = rowOf(sources, "Google Play search");
    expect(within(search).getByText("590")).toBeDefined();
    expect(within(search).getByText("509")).toBeDefined();
    expect(within(search).getByText("86.3%")).toBeDefined();
    const ads = rowOf(sources, "Ads and referrals");
    expect(within(ads).getByText("1,322")).toBeDefined();
    expect(within(ads).getByText("1,100")).toBeDefined();
    expect(screen.getByText("3,629")).toBeDefined();
    expect(screen.getByText("Data through 2026-10-31.", { exact: false })).toBeDefined();
  });

  test("keeps Play placeholders out of the search terms table", () => {
    renderView(playReport());
    const terms = screen.getByRole("table", { name: "Search terms" });
    expect(within(terms).getByText("buzzin")).toBeDefined();
    expect(within(terms).queryByText("No search terms specified")).toBeNull();
    const placeholders = screen.getByRole("table", { name: "Traffic without a search term" });
    expect(within(placeholders).getByText("No search terms specified")).toBeDefined();
  });

  test("shows campaigns, countries by name and the installs overview", () => {
    renderView(playReport());
    const campaigns = screen.getByRole("table", { name: "Campaigns" });
    expect(
      within(campaigns).getByText("meta / quiz-show-pl-meta-abo-test-storeclick-202609"),
    ).toBeDefined();
    const countries = screen.getByRole("table", { name: "Countries" });
    expect(within(countries).getByText("Poland")).toBeDefined();
    expect(within(countries).getByText("Other")).toBeDefined();
    expect(screen.getByText("1,320")).toBeDefined();
    expect(screen.getByText("846")).toBeDefined();
  });

  test("says when Play has not written the month yet", () => {
    renderView(playReport(), { month: "2026-11" });
    expect(screen.getByText(/has not written a store performance report for November 2026/)).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("explains that Android TV traffic is all Other with no search terms", () => {
    const tvMonth: StorePerformanceMonth = {
      ...OCTOBER,
      countries: null,
      traffic: {
        campaigns: [],
        searchTermPlaceholders: [
          { acquisitions: 189, conversionRate: 189 / 314, label: "Other", visitors: 314 },
        ],
        searchTerms: [],
        sources: [{ acquisitions: 189, conversionRate: 189 / 314, source: "Other", visitors: 314 }],
        totals: { acquisitions: 189, conversionRate: 189 / 314, visitors: 314 },
      },
    };
    renderView(
      playReport({ devices: ["tv"], months: [tvMonth], packageName: "com.playbuzzin.tv", tvOnly: true }),
    );
    expect(screen.getByText('Android TV traffic is all "Other"')).toBeDefined();
    expect(
      screen.getByText("No search terms: Google Play does not report search terms for Android TV."),
    ).toBeDefined();
    expect(screen.getByText("Google Play wrote no country report for this month.")).toBeDefined();
  });

  test("refresh reads the reports again", async () => {
    const props = renderView(playReport());
    await userEvent.click(screen.getByRole("button", { name: "Read the Play reports again" }));
    expect(props.onRefresh).toHaveBeenCalled();
  });
});
