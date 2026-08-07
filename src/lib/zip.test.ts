import { describe, expect, test } from "bun:test";
import { unzipSync } from "fflate";

import { buildZip } from "./zip";

describe("buildZip", () => {
	test("produces a valid ZIP with every entry stored under its name", () => {
		const a = new Uint8Array([1, 2, 3]);
		const b = new Uint8Array([4, 5]);
		const bytes = buildZip([
			{ data: a, name: "shot-1of2.png" },
			{ data: b, name: "shot-2of2.png" },
		]);
		// Local-file-header magic "PK\x03\x04".
		expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
		const unpacked = unzipSync(bytes);
		expect(Object.keys(unpacked).sort()).toEqual([
			"shot-1of2.png",
			"shot-2of2.png",
		]);
		expect([...unpacked["shot-1of2.png"]]).toEqual([1, 2, 3]);
		expect([...unpacked["shot-2of2.png"]]).toEqual([4, 5]);
	});

	test("handles an empty entry list", () => {
		const bytes = buildZip([]);
		expect(bytes.length).toBeGreaterThan(0);
		expect(Object.keys(unzipSync(bytes))).toEqual([]);
	});
});
