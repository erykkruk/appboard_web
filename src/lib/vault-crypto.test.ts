import { createDecipheriv } from "node:crypto";
import { describe, expect, it } from "bun:test";
import { buildSetupPayload, deriveDekForUnlock } from "./vault-crypto";

/** Replicates the backend's decryptWithKey (`ivHex:tagHex:dataHex`, AES-256-GCM). */
function backendDecrypt(keyB64: string, ciphertext: string): string {
  const key = Buffer.from(keyB64, "base64");
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(dataHex, "hex")) + decipher.final("utf8");
}

describe("vault-crypto (client E2EE)", () => {
  it("round-trips wrap/unwrap of the DEK for the same passphrase", async () => {
    const payload = await buildSetupPayload("correct horse battery staple");
    const dek = await deriveDekForUnlock("correct horse battery staple", payload);
    expect(dek).toBe(payload.dek);
  });

  it("rejects a wrong passphrase on unwrap", async () => {
    const payload = await buildSetupPayload("passphrase-one");
    await expect(
      deriveDekForUnlock("passphrase-two", payload),
    ).rejects.toBeTruthy();
  });

  it("produces a verifier the backend AES-256-GCM format can decrypt", async () => {
    const payload = await buildSetupPayload("interop-pass");
    expect(payload.verifier).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(backendDecrypt(payload.dek, payload.verifier)).toBe(
      "appboard-vault-v1",
    );
  });
});
