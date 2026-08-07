import { describe, expect, test } from "bun:test";

import {
  ALTERNATIVE_STORE_CREDENTIALS,
  buildCredentialPayload,
  isCredentialFormComplete,
  storeCredentialSchema,
} from "@/lib/store-credentials";
import { ALTERNATIVE_STORE_TYPES } from "@/lib/stores";
import type { AlternativeStoreType } from "@/lib/stores";

/** The exact JSON keys the backend store providers expect. */
const BACKEND_CONTRACT: Record<AlternativeStoreType, string[]> = {
  amazon_appstore: ["clientId", "clientSecret"],
  huawei_appgallery: ["clientId", "clientSecret"],
  onestore: ["clientId", "clientSecret"],
  rustore: ["keyId", "privateKey"],
  samsung_galaxy: ["serviceAccountId", "privateKey"],
  xiaomi_getapps: ["email", "privateKey"],
};

describe("ALTERNATIVE_STORE_CREDENTIALS", () => {
  test("every alternative store has a credential schema", () => {
    for (const type of ALTERNATIVE_STORE_TYPES) {
      expect(ALTERNATIVE_STORE_CREDENTIALS[type]).toBeDefined();
      expect(storeCredentialSchema(type).fields.length).toBeGreaterThan(0);
      expect(storeCredentialSchema(type).where.length).toBeGreaterThan(0);
    }
  });

  test("field keys match the backend credential contract", () => {
    for (const type of ALTERNATIVE_STORE_TYPES) {
      const keys = storeCredentialSchema(type).fields.map((f) => f.key);
      expect(keys).toEqual(BACKEND_CONTRACT[type]);
    }
  });

  test("private keys render as PEM textareas and secrets stay masked", () => {
    for (const type of ALTERNATIVE_STORE_TYPES) {
      for (const field of storeCredentialSchema(type).fields) {
        if (field.key === "privateKey") expect(field.type).toBe("pem");
        if (field.key === "clientSecret") expect(field.type).toBe("secret");
      }
    }
  });
});

describe("isCredentialFormComplete", () => {
  test("requires every declared field", () => {
    expect(
      isCredentialFormComplete("huawei_appgallery", { clientId: "123" }),
    ).toBe(false);
    expect(
      isCredentialFormComplete("huawei_appgallery", {
        clientId: "123",
        clientSecret: "secret",
      }),
    ).toBe(true);
  });

  test("treats whitespace-only values as empty", () => {
    expect(
      isCredentialFormComplete("rustore", { keyId: "  ", privateKey: "pem" }),
    ).toBe(false);
  });
});

describe("buildCredentialPayload", () => {
  test("trims values and drops fields the store does not declare", () => {
    const payload = buildCredentialPayload("samsung_galaxy", {
      apiToken: "leftover",
      privateKey: "  -----BEGIN PRIVATE KEY-----  ",
      serviceAccountId: " abc ",
    });

    expect(payload).toEqual({
      privateKey: "-----BEGIN PRIVATE KEY-----",
      serviceAccountId: "abc",
    });
  });

  test("returns empty strings for missing fields instead of undefined", () => {
    expect(buildCredentialPayload("xiaomi_getapps", {})).toEqual({
      email: "",
      privateKey: "",
    });
  });
});
