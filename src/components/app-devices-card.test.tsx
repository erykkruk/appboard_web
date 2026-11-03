import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type { App } from "@/lib/types";

import { AppDevicesCard } from "./app-devices-card";

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const APP: App = {
  bundleId: "tech.ravenlab.buzzin",
  iconUrl: null,
  id: "app-1",
  lastSyncedAt: null,
  name: "Buzzin",
  platform: "ios",
  storeId: "s",
};

let originalFetch: typeof fetch;
let sent: { body: unknown; method: string; url: string } | null;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  sent = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent = {
      body: init?.body ? JSON.parse(String(init.body)) : null,
      method: init?.method ?? "GET",
      url: String(input),
    };
    return new Response(
      JSON.stringify({ app: { ...APP, devices: ["phone", "tv"] } }),
      { headers: { "content-type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

describe("AppDevicesCard", () => {
  test("uses store-specific names and treats a legacy app as iPhone only", () => {
    render(<AppDevicesCard app={APP} />, { wrapper: Wrapper });
    expect(screen.getByLabelText("Apple TV")).toBeDefined();
    expect(screen.getByLabelText("iPhone").getAttribute("data-state")).toBe("checked");
    expect(screen.getByLabelText("Apple TV").getAttribute("data-state")).toBe("unchecked");
    expect(screen.getByText(/Apple publishes no Apple TV search results/)).toBeDefined();
  });

  test("saves the picked devices with PATCH /apps/:appId", async () => {
    render(<AppDevicesCard app={APP} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByLabelText("Apple TV"));
    fireEvent.click(screen.getByText("Save devices"));
    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent?.method).toBe("PATCH");
    expect(sent?.url).toContain("/api/apps/app-1");
    expect(sent?.body).toEqual({ devices: ["phone", "tv"] });
  });

  test("labels Android TV for Play apps", () => {
    render(<AppDevicesCard app={{ ...APP, devices: ["tv"], platform: "android" }} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByLabelText("Android TV").getAttribute("data-state")).toBe("checked");
    expect(screen.getByLabelText("Phone").getAttribute("data-state")).toBe("unchecked");
  });
});
