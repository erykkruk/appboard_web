import { describe, expect, test } from "bun:test";

import {
	useGroupAsoProfile,
	useUpdateGroupAsoProfile,
	useEnableSharedProfile,
} from "./use-group-aso-profile";

describe("use-group-aso-profile exports", () => {
	test("useGroupAsoProfile is exported as a function", () => {
		expect(typeof useGroupAsoProfile).toBe("function");
	});

	test("useUpdateGroupAsoProfile is exported as a function", () => {
		expect(typeof useUpdateGroupAsoProfile).toBe("function");
	});

	test("useEnableSharedProfile is exported as a function", () => {
		expect(typeof useEnableSharedProfile).toBe("function");
	});
});
