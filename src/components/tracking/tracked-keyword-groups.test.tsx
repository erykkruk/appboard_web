import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { TrackedKeyword } from "@/lib/types";

import { TrackedKeywordGroups } from "./tracked-keyword-groups";

afterEach(cleanup);

function kw(country: string, keyword: string): TrackedKeyword {
  return { appId: "a", country, createdAt: "", id: `${country}-${keyword}`, keyword };
}

const KEYWORDS = [kw("pl", "quiz rodzinny"), kw("pl", "kalambury"), kw("de", "quizshow")];

function renderGroups(onRemove = mock(() => {})) {
  render(
    <TrackedKeywordGroups
      countries={["de", "pl"]}
      keywords={KEYWORDS}
      markets={[]}
      maxPerMarket={40}
      onRemove={onRemove}
      selectedCountry="pl"
    />,
  );
  return onRemove;
}

const header = (name: RegExp) => screen.getByRole("button", { name });

describe("TrackedKeywordGroups", () => {
  test("opens only the selected market and shows slots per market", () => {
    renderGroups();
    expect(header(/Poland/).getAttribute("aria-expanded")).toBe("true");
    expect(header(/Germany/).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("kalambury")).toBeDefined();
    expect(screen.queryByText("quizshow")).toBeNull();
    expect(header(/Poland/).textContent).toContain("2/40");
  });

  test("a market header toggles its keywords", () => {
    renderGroups();
    fireEvent.click(header(/Germany/));
    expect(screen.getByText("quizshow")).toBeDefined();
    fireEvent.click(header(/Poland/));
    expect(screen.queryByText("kalambury")).toBeNull();
  });

  test("expand all and collapse all", () => {
    renderGroups();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByText("quizshow")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText("kalambury")).toBeNull();
    expect(screen.queryByText("quizshow")).toBeNull();
  });

  test("the filter opens every match", () => {
    renderGroups();
    fireEvent.change(screen.getByLabelText("Filter keywords and markets"), {
      target: { value: "quiz" },
    });
    expect(screen.getByText("quizshow")).toBeDefined();
    expect(screen.getByText("quiz rodzinny")).toBeDefined();
    expect(screen.queryByText("kalambury")).toBeNull();
  });

  test("chips stay removable", () => {
    const onRemove = renderGroups();
    fireEvent.click(screen.getByRole("button", { name: "Remove kalambury" }));
    expect(onRemove).toHaveBeenCalledWith("pl-kalambury");
  });
});
