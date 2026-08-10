import type { AlternativeStoreType } from "@/lib/stores";

export type StoreCredentialFieldType =
  | "text"
  | "email"
  | "secret"
  | "pem"
  /** Comma-separated input sent to the backend as string[]. */
  | "list";

export interface StoreCredentialField {
  /** JSON key sent to the backend - must match the store provider contract. */
  key: string;
  label: string;
  type: StoreCredentialFieldType;
  placeholder: string;
  /** Optional fields are omitted from the payload when left empty. */
  optional?: boolean;
  /** Extra hint rendered under the input. */
  help?: string;
}

export interface StoreCredentialSchema {
  fields: StoreCredentialField[];
  /** Where in the store's own console the user creates this key. */
  where: string;
}

const PEM_PLACEHOLDER = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----";

/**
 * Huawei and Amazon APIs cannot enumerate a developer's apps, so the packages
 * to sync have to be named up front - otherwise the first sync resolves nothing.
 */
const PACKAGE_NAMES_FIELD: StoreCredentialField = {
  help: "This store's API cannot list your apps, so AppBoard needs the package names to sync. You can add more later in Settings.",
  key: "packageNames",
  label: "Package names (optional)",
  optional: true,
  placeholder: "com.example.app, com.example.other",
  type: "list",
};

/**
 * Per-store credential forms for the alternative Android stores.
 * The `key` of every field is the exact JSON property the backend expects.
 */
export const ALTERNATIVE_STORE_CREDENTIALS: Record<
  AlternativeStoreType,
  StoreCredentialSchema
> = {
  amazon_appstore: {
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "e.g. amzn1.application-oa2-client.1a2b3c...",
        type: "text",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        placeholder: "Client secret of your Security Profile",
        type: "secret",
      },
      PACKAGE_NAMES_FIELD,
    ],
    where: "Amazon Developer Console -> Security Profile (LWA)",
  },
  huawei_appgallery: {
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "e.g. 123456789012345678",
        type: "text",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        placeholder: "Client secret of your API client",
        type: "secret",
      },
      PACKAGE_NAMES_FIELD,
    ],
    where: "AppGallery Connect -> Users and permissions -> API client",
  },
  onestore: {
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "e.g. 0000123456",
        type: "text",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        placeholder: "Client secret issued for your app",
        type: "secret",
      },
    ],
    where: "ONE Store Developer Center -> API",
  },
  rustore: {
    fields: [
      {
        key: "keyId",
        label: "Key ID",
        placeholder: "e.g. 1234567",
        type: "text",
      },
      {
        key: "privateKey",
        label: "Private Key (PEM)",
        placeholder: PEM_PLACEHOLDER,
        type: "pem",
      },
    ],
    where: "RuStore Console -> API keys",
  },
  samsung_galaxy: {
    fields: [
      {
        key: "serviceAccountId",
        label: "Service Account ID",
        placeholder: "e.g. 1a2b3c4d-5e6f-7890-abcd-ef1234567890",
        type: "text",
      },
      {
        key: "privateKey",
        label: "Private Key (PEM)",
        placeholder: PEM_PLACEHOLDER,
        type: "pem",
      },
    ],
    where: "Samsung Seller Portal -> Assistant -> API Service",
  },
  xiaomi_getapps: {
    fields: [
      {
        key: "email",
        label: "Account Email",
        placeholder: "e.g. developer@example.com",
        type: "email",
      },
      {
        key: "privateKey",
        label: "Private Key (PEM)",
        placeholder: PEM_PLACEHOLDER,
        type: "pem",
      },
    ],
    where: "Xiaomi developer account",
  },
};

export function storeCredentialSchema(
  type: AlternativeStoreType,
): StoreCredentialSchema {
  return ALTERNATIVE_STORE_CREDENTIALS[type];
}

/** Splits the comma-separated `list` input into the string[] the backend expects. */
export function parseCredentialList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Every non-optional field is required - the connect button stays disabled
 * until all of them are filled.
 */
export function isCredentialFormComplete(
  type: AlternativeStoreType,
  values: Record<string, string>,
): boolean {
  return storeCredentialSchema(type)
    .fields.filter((field) => !field.optional)
    .every((field) => (values[field.key] ?? "").trim().length > 0);
}

/**
 * Trimmed payload holding only the fields this store declares. Optional fields
 * left empty are omitted entirely rather than sent as an empty value.
 */
export function buildCredentialPayload(
  type: AlternativeStoreType,
  values: Record<string, string>,
): Record<string, string | string[]> {
  const payload: Record<string, string | string[]> = {};
  for (const field of storeCredentialSchema(type).fields) {
    const raw = (values[field.key] ?? "").trim();
    if (field.type === "list") {
      const list = parseCredentialList(raw);
      if (list.length > 0) payload[field.key] = list;
      continue;
    }
    if (field.optional && raw.length === 0) continue;
    payload[field.key] = raw;
  }
  return payload;
}
