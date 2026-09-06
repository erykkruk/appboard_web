import { describe, expect, test } from "bun:test";

import { isLocalApp, storeConsoleUrl, storeLocaleFor } from "@/lib/apps";
import type { App } from "@/lib/types";

const base = {
  bundleId: "com.example.app",
  id: "app-1",
  name: "Example",
  status: "active",
  storeId: "store-1",
} as unknown as App;

describe("storeLocaleFor", () => {
  test("keeps a bare App Store locale when the store keys it that way", () => {
    expect(storeLocaleFor("pl", "pl", "ios")).toBe("pl");
  });

  test("expands a bare language to the App Store locale of that market", () => {
    expect(storeLocaleFor("de", "de", "ios")).toBe("de-DE");
    expect(storeLocaleFor("es", "mx", "ios")).toBe("es-MX");
    expect(storeLocaleFor("es", "es", "ios")).toBe("es-ES");
  });

  test("falls back to the first locale of that language, then the bare code", () => {
    expect(storeLocaleFor("es", "cl", "ios")).toBe("es-MX");
    expect(storeLocaleFor("xx", "pl", "ios")).toBe("xx");
  });

  test("uses language-REGION on Google Play", () => {
    expect(storeLocaleFor("pl", "pl", "android")).toBe("pl-PL");
  });
});

describe("storeConsoleUrl", () => {
  test("points an App Store app at its App Information page", () => {
    const app = { ...base, externalId: "123", platform: "ios" } as App;
    expect(storeConsoleUrl(app)).toBe(
      "https://appstoreconnect.apple.com/apps/123/distribution/info",
    );
  });

  test("points a Play app at the console", () => {
    const app = { ...base, externalId: "com.x", platform: "android" } as App;
    expect(storeConsoleUrl(app)).toBe("https://play.google.com/console/");
  });

  test("has nowhere to send an app that is in no store", () => {
    const app = {
      ...base,
      externalId: "local-1",
      platform: "ios",
      rawData: { notInStore: true },
    } as App;
    expect(isLocalApp(app)).toBe(true);
    expect(storeConsoleUrl(app)).toBeNull();
  });
});
