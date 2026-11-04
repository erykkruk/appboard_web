import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { DailySummarySettings } from "@/lib/types";

import {
  coverageLabel,
  DailySummaryCardView,
  type DailySummaryCardViewProps,
  summaryTimeLabel,
} from "./daily-summary-card";

afterEach(cleanup);

const SETTINGS: DailySummarySettings = {
  effectiveEmail: "owner@example.com",
  email: null,
  enabled: false,
  lastSentAt: null,
  schedule: { hour: 7, minute: 30, timezone: "Europe/Warsaw" },
  trackedApps: 3,
};

function renderCard(overrides: Partial<DailySummaryCardViewProps> = {}) {
  const props: DailySummaryCardViewProps = {
    isLoading: false,
    isSendingTest: false,
    onSaveEmail: mock(() => {}),
    onSendTest: mock(() => {}),
    onToggle: mock(() => {}),
    settings: SETTINGS,
    ...overrides,
  };
  render(<DailySummaryCardView {...props} />);
  return props;
}

describe("labels", () => {
  test("formats the send time with the timezone", () => {
    expect(summaryTimeLabel(SETTINGS.schedule)).toBe("07:30 (Europe/Warsaw)");
  });

  test("names how many apps the summary covers", () => {
    expect(coverageLabel(1)).toBe("Covers 1 app with rank tracking or auto-research.");
    expect(coverageLabel(3)).toBe("Covers 3 apps with rank tracking or auto-research.");
    expect(coverageLabel(0)).toMatch(/nothing to summarize/);
  });
});

describe("DailySummaryCardView", () => {
  test("shows a skeleton while loading", () => {
    renderCard({ isLoading: true, settings: undefined });
    expect(screen.getByTestId("daily-summary-loading")).toBeDefined();
  });

  test("off: explains that each app keeps its own emails", () => {
    renderCard();
    expect(screen.getByText(/Off: every app sends its own emails/)).toBeDefined();
    expect(screen.getByText("Goes to owner@example.com.")).toBeDefined();
    expect(screen.getByText(/Covers 3 apps/)).toBeDefined();
    const toggle = screen.getByRole("switch", { name: "Send the daily summary" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  test("on: says it replaces the per-app emails and when it was last sent", () => {
    renderCard({
      settings: {
        ...SETTINGS,
        email: "team@example.com",
        effectiveEmail: "team@example.com",
        enabled: true,
        lastSentAt: "2026-11-04T06:30:00.000Z",
      },
    });
    expect(screen.getByText(/On: one morning email/)).toBeDefined();
    expect(screen.getByText(/Last sent:/)).toBeDefined();
    expect((screen.getByLabelText("Summary email") as HTMLInputElement).value).toBe(
      "team@example.com",
    );
  });

  test("toggling calls onToggle with the new value", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("switch", { name: "Send the daily summary" }));
    expect(props.onToggle).toHaveBeenCalledWith(true);
  });

  test("saves a changed email on blur, and an emptied one as null", () => {
    const props = renderCard({ settings: { ...SETTINGS, email: "old@example.com" } });
    const input = screen.getByLabelText("Summary email");
    fireEvent.change(input, { target: { value: " new@example.com " } });
    fireEvent.blur(input);
    expect(props.onSaveEmail).toHaveBeenCalledWith("new@example.com");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(props.onSaveEmail).toHaveBeenLastCalledWith(null);
  });

  test("sends a test summary on click", () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Send a test summary now/ }));
    expect(props.onSendTest).toHaveBeenCalledTimes(1);
  });

  test("disables the test button while sending, without apps or without an address", () => {
    renderCard({ isSendingTest: true });
    expect(
      (screen.getByRole("button", { name: /Sending/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    cleanup();

    renderCard({ settings: { ...SETTINGS, trackedApps: 0 } });
    expect(
      (screen.getByRole("button", { name: /Send a test summary now/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/nothing to summarize/)).toBeDefined();
    cleanup();

    renderCard({ settings: { ...SETTINGS, effectiveEmail: null } });
    expect(
      (screen.getByRole("button", { name: /Send a test summary now/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("No email address to send to yet.")).toBeDefined();
  });
});
