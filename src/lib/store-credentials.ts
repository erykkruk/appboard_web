import type { AlternativeStoreType } from "@/lib/stores";

export type StoreCredentialFieldType = "text" | "secret" | "pem";

export interface StoreCredentialField {
  /** JSON key sent to the backend - must match the store provider contract. */
  key: string;
  label: string;
  type: StoreCredentialFieldType;
  placeholder: string;
}

export interface StoreCredentialSchema {
  fields: StoreCredentialField[];
  /** Where in the store's own console the user creates this key. */
  where: string;
}

const PEM_PLACEHOLDER = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----";

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
        type: "text",
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

/** Every field is required - the connect button stays disabled until all are filled. */
export function isCredentialFormComplete(
  type: AlternativeStoreType,
  values: Record<string, string>,
): boolean {
  return storeCredentialSchema(type).fields.every(
    (field) => (values[field.key] ?? "").trim().length > 0,
  );
}

/** Trimmed payload holding only the fields this store actually declares. */
export function buildCredentialPayload(
  type: AlternativeStoreType,
  values: Record<string, string>,
): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const field of storeCredentialSchema(type).fields) {
    payload[field.key] = (values[field.key] ?? "").trim();
  }
  return payload;
}
