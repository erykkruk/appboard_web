import { describe, expect, test } from "bun:test";

import { storeLabel } from "@/components/top-nav";

describe("storeLabel", () => {
  test("tells the store records of one product apart", () => {
    expect(storeLabel({ devices: ["phone"], platform: "ios" })).toBe("App Store");
    expect(storeLabel({ devices: ["phone"], platform: "android" })).toBe("Google Play");
    expect(storeLabel({ devices: ["tv"], platform: "android" })).toBe(
      "Google Play · Android TV",
    );
    expect(storeLabel({ devices: ["tv"], platform: "ios" })).toBe("App Store · Apple TV");
    expect(storeLabel({ devices: ["phone", "tv"], platform: "ios" })).toBe(
      "App Store · phone + TV",
    );
  });

  test("an app without device data reads as its store", () => {
    expect(storeLabel({ platform: "ios" })).toBe("App Store");
  });
});
