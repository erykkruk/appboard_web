import { argon2id } from "hash-wasm";

/**
 * Client-side vault crypto. The vault passphrase NEVER leaves the browser:
 * here we derive the Key-Encryption-Key (KEK) with Argon2id, wrap/unwrap the
 * random Data-Encryption-Key (DEK), and produce a verifier the backend can use
 * to confirm a correct unlock. Only the unwrapped DEK (base64) is ever sent to
 * the server, and only to be held in volatile session memory.
 */

export interface KdfParams {
	algo: string;
	iterations: number;
	memoryKiB: number;
	parallelism: number;
}

export interface VaultParams {
	kdfParams: KdfParams;
	kdfSalt: string;
	wrappedDek: string;
	wrapNonce: string;
}

const DEFAULT_KDF: KdfParams = {
	algo: "argon2id",
	iterations: 3,
	memoryKiB: 65536,
	parallelism: 1,
};

const HASH_LEN = 32;
const IV_LEN = 16; // matches the backend AES-256-GCM IV length
const VERIFIER_PLAINTEXT = "appboard-vault-v1";

function toB64(bytes: Uint8Array): string {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
	const s = atob(b64);
	const out = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
	return out;
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function deriveKekRaw(
	passphrase: string,
	salt: Uint8Array<ArrayBuffer>,
	params: KdfParams,
): Promise<Uint8Array<ArrayBuffer>> {
	const out = await argon2id({
		hashLength: HASH_LEN,
		iterations: params.iterations,
		memorySize: params.memoryKiB,
		outputType: "binary",
		parallelism: params.parallelism,
		password: passphrase,
		salt,
	});
	// Copy into an ArrayBuffer-backed view for WebCrypto (BufferSource).
	return new Uint8Array(out);
}

async function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
}

/**
 * Encrypt a known constant under the DEK in the backend's `ivHex:tagHex:dataHex`
 * AES-256-GCM format, so the server can validate unlocks without the passphrase.
 */
async function makeVerifier(dek: Uint8Array<ArrayBuffer>): Promise<string> {
	const key = await importAesKey(dek);
	const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
	const ct = new Uint8Array(
		await crypto.subtle.encrypt(
			{ iv, name: "AES-GCM", tagLength: 128 },
			key,
			new TextEncoder().encode(VERIFIER_PLAINTEXT),
		),
	);
	const tag = ct.slice(ct.length - 16);
	const data = ct.slice(0, ct.length - 16);
	return `${toHex(iv)}:${toHex(tag)}:${toHex(data)}`;
}

export interface VaultSetupPayload extends VaultParams {
	dek: string;
	verifier: string;
}

/** Build everything needed to create a vault from a fresh passphrase. */
export async function buildSetupPayload(
	passphrase: string,
): Promise<VaultSetupPayload> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const dek = crypto.getRandomValues(new Uint8Array(32));
	const kek = await importAesKey(await deriveKekRaw(passphrase, salt, DEFAULT_KDF));
	const wrapNonce = crypto.getRandomValues(new Uint8Array(IV_LEN));
	const wrapped = new Uint8Array(
		await crypto.subtle.encrypt({ iv: wrapNonce, name: "AES-GCM" }, kek, dek),
	);
	return {
		dek: toB64(dek),
		kdfParams: { ...DEFAULT_KDF },
		kdfSalt: toB64(salt),
		verifier: await makeVerifier(dek),
		wrappedDek: toB64(wrapped),
		wrapNonce: toB64(wrapNonce),
	};
}

async function unwrapDek(
	passphrase: string,
	params: VaultParams,
): Promise<Uint8Array<ArrayBuffer>> {
	const kek = await importAesKey(
		await deriveKekRaw(passphrase, fromB64(params.kdfSalt), params.kdfParams),
	);
	return new Uint8Array(
		await crypto.subtle.decrypt(
			{ iv: fromB64(params.wrapNonce), name: "AES-GCM" },
			kek,
			fromB64(params.wrappedDek),
		),
	);
}

/**
 * Derive the DEK (base64) from a passphrase + the server's vault params.
 * Throws if the passphrase is wrong (AES-GCM auth failure on unwrap).
 */
export async function deriveDekForUnlock(
	passphrase: string,
	params: VaultParams,
): Promise<string> {
	return toB64(await unwrapDek(passphrase, params));
}

/**
 * Re-wrap the SAME DEK under a new passphrase (change-passphrase flow). Needs
 * the current passphrase to unwrap the DEK first; the DEK itself is unchanged so
 * no credential re-encryption is required.
 */
export async function rewrapForNewPassphrase(
	currentPassphrase: string,
	newPassphrase: string,
	params: VaultParams,
): Promise<VaultParams> {
	const dek = await unwrapDek(currentPassphrase, params);
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const kek = await importAesKey(await deriveKekRaw(newPassphrase, salt, DEFAULT_KDF));
	const wrapNonce = crypto.getRandomValues(new Uint8Array(IV_LEN));
	const wrapped = new Uint8Array(
		await crypto.subtle.encrypt({ iv: wrapNonce, name: "AES-GCM" }, kek, dek),
	);
	return {
		kdfParams: { ...DEFAULT_KDF },
		kdfSalt: toB64(salt),
		wrappedDek: toB64(wrapped),
		wrapNonce: toB64(wrapNonce),
	};
}
