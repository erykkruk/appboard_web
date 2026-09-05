import { beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  AppSelectionProvider,
  useAppSelection,
} from "@/lib/app-selection-context";

const STORAGE_KEY = "appboard:app-selection";

function wrapper({ children }: { children: ReactNode }) {
  return <AppSelectionProvider>{children}</AppSelectionProvider>;
}

function renderSelection() {
  return renderHook(() => useAppSelection(), { wrapper });
}

function persisted(): { selectedIds: string[]; sourceAppId: string | null } {
  return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("useAppSelection", () => {
  test("throws outside the provider", () => {
    expect(() => renderHook(() => useAppSelection())).toThrow(
      /AppSelectionProvider/,
    );
  });

  test("starts empty", () => {
    const { result } = renderSelection();
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.sourceAppId).toBeNull();
  });

  test("toggle adds and removes an id", () => {
    const { result } = renderSelection();

    act(() => result.current.toggle("app-1"));
    expect([...result.current.selectedIds]).toEqual(["app-1"]);

    act(() => result.current.toggle("app-2"));
    expect(result.current.selectedIds.size).toBe(2);

    act(() => result.current.toggle("app-1"));
    expect([...result.current.selectedIds]).toEqual(["app-2"]);
  });

  test("selectAll replaces the selection", () => {
    const { result } = renderSelection();

    act(() => result.current.toggle("app-1"));
    act(() => result.current.selectAll(["app-7", "app-8"]));

    expect([...result.current.selectedIds]).toEqual(["app-7", "app-8"]);
  });

  test("clear empties the selection and the source app", () => {
    const { result } = renderSelection();

    act(() => result.current.selectAll(["app-1", "app-2"]));
    act(() => result.current.setSource("app-1"));
    act(() => result.current.clear());

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.sourceAppId).toBeNull();
  });

  test("setSource records the source app", () => {
    const { result } = renderSelection();

    act(() => result.current.setSource("app-3"));
    expect(result.current.sourceAppId).toBe("app-3");

    act(() => result.current.setSource(null));
    expect(result.current.sourceAppId).toBeNull();
  });
});

describe("session persistence", () => {
  test("writes the selection to sessionStorage", async () => {
    const { result } = renderSelection();

    act(() => result.current.selectAll(["app-1", "app-2"]));
    act(() => result.current.setSource("app-1"));

    await waitFor(() => {
      expect(persisted()).toEqual({
        selectedIds: ["app-1", "app-2"],
        sourceAppId: "app-1",
      });
    });
  });

  test("restores a stored selection on mount", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedIds: ["app-9"], sourceAppId: "app-9" }),
    );

    const { result } = renderSelection();

    await waitFor(() => {
      expect([...result.current.selectedIds]).toEqual(["app-9"]);
    });
    expect(result.current.sourceAppId).toBe("app-9");
  });

  test("ignores a corrupted payload and overwrites it on the next change", async () => {
    sessionStorage.setItem(STORAGE_KEY, "not json");

    const { result } = renderSelection();

    await waitFor(() => {
      expect(result.current.selectedIds.size).toBe(0);
    });
    expect(result.current.sourceAppId).toBeNull();

    act(() => result.current.toggle("app-4"));
    expect(persisted()).toEqual({
      selectedIds: ["app-4"],
      sourceAppId: null,
    });
  });

  test("leaves the sidebar localStorage keys alone", () => {
    localStorage.setItem("appboard:favorites", JSON.stringify(["app-1"]));

    const { result } = renderSelection();
    act(() => result.current.toggle("app-2"));

    expect(localStorage.getItem("appboard:favorites")).toBe(
      JSON.stringify(["app-1"]),
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
